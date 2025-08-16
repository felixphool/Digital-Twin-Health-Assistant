from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from fastapi.responses import FileResponse
from sqlmodel import select
from pydantic import BaseModel, Field
import re

from app.models.db import get_session
from app.models.entities import LabReport, ChatMessage
from app.services.agents.medical_agent import run_medical_agent
from app.utils.lang import tts_lang_from_ui

class ChatRequest(BaseModel):
    session_id: str = Field(min_length=6, max_length=128)
    message: str = Field(min_length=1, max_length=4000)
    language: str | None = Field(default=None, description="ISO language code for response, e.g., 'en', 'hi'")


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    sources: list[str] = []
    audio_url: str | None = None

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, background: BackgroundTasks):
    session_id = request.session_id.strip()
    message = request.message.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Build bounded context: last 20 messages + latest 3 reports (truncated)
    with get_session() as session:
        history = session.exec(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        ).all()
        recent_history = history[-20:] if history else []

        reports = session.exec(
            select(LabReport)
            .where(LabReport.session_id == session_id)
            .order_by(LabReport.created_at.desc())
            .limit(3)
        ).all()

    history_block = "\n".join(
        f"{msg.role.capitalize()}: {msg.content}" for msg in recent_history
    )
    report_block = "\n\n".join(
        f"## {r.original_filename or 'Report'}\n{(r.markdown_content or '')[:3000]}" for r in reports
    ) if reports else ""

    context_parts: list[str] = []
    if history_block:
        context_parts.append(f"Recent conversation (last {len(recent_history)} messages):\n{history_block}")
    if report_block:
        context_parts.append(f"Lab reports context (latest {len(reports)}):\n{report_block}")
    context_report = "\n\n".join(context_parts) if context_parts else None

    try:
        answer = run_medical_agent(
            session_id=session_id,
            user_text=message,
            context_report=context_report,
            language=request.language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    # Persist chat asynchronously using a fresh DB session in the task
    def _persist_chat(session_id: str, user: str, assistant: str) -> None:
        from app.models.entities import ChatMessage as _ChatMessage
        from app.models.db import get_session as _get_session
        with _get_session() as _s:
            _s.add(_ChatMessage(session_id=session_id, role="user", content=user))
            _s.add(_ChatMessage(session_id=session_id, role="assistant", content=assistant))
            _s.commit()

    background.add_task(_persist_chat, session_id, message, answer)

    # Extract sources (URLs) from the answer if any
    urls = list({m.group(1) for m in re.finditer(r"\((https?://[^)]+)\)", answer)}) if answer else []

    return ChatResponse(answer=answer, session_id=session_id, sources=urls)


@router.post("/tts")
async def tts(text: str = Body(..., embed=True), lang: str = Body("en", embed=True)):
    """Generate speech audio from text and return the MP3 audio as a file response."""
    try:
        from gtts import gTTS  # type: ignore
        import uuid, os
        tmp_name = f"tts_{uuid.uuid4().hex}.mp3"
        out_dir = "/tmp"
        out_path = os.path.join(out_dir, tmp_name)
        tts = gTTS(text=text, lang=tts_lang_from_ui(lang))
        tts.save(out_path)
        return FileResponse(path=out_path, media_type="audio/mpeg", filename=tmp_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {e}")


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    target_lang: str = Field(min_length=2, description="ISO code, e.g., en, hi, es")


@router.post("/translate")
async def translate(req: TranslateRequest):
    """Translate arbitrary text to the target language using Gemini."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage
        from app.config import get_settings
        _settings = get_settings()
        model = ChatGoogleGenerativeAI(
            model=_settings.gemini_model,
            temperature=0.2,
            api_key=_settings.google_api_key or None,
        )
        prompt = (
            f"Translate the following text to {req.target_lang}. "
            "Only output the translated text with no extras, no quotes, and preserve meaning and tone.\n\n" 
            f"Text:\n{req.text}"
        )
        resp = model.invoke([HumanMessage(content=prompt)])
        content = resp.content if hasattr(resp, 'content') else str(resp)
        return {"translated": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translate error: {e}")


@router.get("/ping")
async def ping():
    return {"ok": True}
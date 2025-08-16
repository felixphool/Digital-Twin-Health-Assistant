from typing import Any, Dict, List, TypedDict
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

from app.config import get_settings
from app.models.db import get_session
from app.models.entities import LabReport
from app.services.web_search import medical_search


_settings = get_settings()


@tool
def medical_web_search_tool(query: str) -> str:
    """Search trusted medical domains (NIH, CDC, WHO, Mayo Clinic, etc.) for evidence-based answers. Input is the search query."""
    results = medical_search(query, _settings.trusted_medical_domains, max_results=5)
    blocks = []
    for r in results:
        src = f"- [{r.get('title')}]({r.get('url')})\n\n{r.get('content') or r.get('snippet') or ''}"
        blocks.append(src)
    return "\n\n".join(blocks) if blocks else "No trusted sources found."


@tool
def latest_report_markdown_tool(session_id: str) -> str:
    """Return the latest uploaded lab report in markdown for the given session_id."""
    with get_session() as session:
        from sqlmodel import select
        report = session.exec(
            select(LabReport).where(LabReport.session_id == session_id).order_by(LabReport.created_at.desc())
        ).first()
        return report.markdown_content if report else ""


@tool
def simulate_intervention_tool(instruction: str) -> str:
    """Simulate outcomes based on an instruction like 'start Vitamin D daily' or 'CRP post-antibiotics'. Returns a qualitative projection and monitoring plan. This is educational, not medical advice."""
    return (
        "Simulation (educational): Based on typical clinical patterns and literature, here is a qualitative projection and monitoring plan for: "
        + instruction
        + "\n\n- Expected trend: modest improvement over 2-8 weeks depending on baseline and adherence.\n"
          "- Monitoring: repeat relevant labs in 4-8 weeks; track symptoms.\n"
          "- Safety: review contraindications and drug interactions with your clinician.\n"
          "- Note: Individual responses vary; this is not a diagnosis or medical advice."
    )


TOOLS = [medical_web_search_tool, latest_report_markdown_tool, simulate_intervention_tool]


class AgentState(TypedDict):
    messages: List[BaseMessage]


def _call_model(state: AgentState) -> Dict[str, Any]:
    model = ChatGoogleGenerativeAI(
        model=_settings.gemini_model,
        temperature=_settings.gemini_temperature,
        api_key=_settings.google_api_key or None,
    ).bind_tools(TOOLS)
    response = model.invoke(state["messages"])  # type: ignore[arg-type]
    return {"messages": state["messages"] + [response]}


def _should_continue(state: AgentState) -> str:
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return END


def _call_tools(state: AgentState) -> Dict[str, Any]:
    last = state["messages"][-1]
    tool_outputs: List[BaseMessage] = []
    if isinstance(last, AIMessage) and hasattr(last, 'tool_calls') and last.tool_calls:
        for tc in last.tool_calls:
            # Handle different tool call formats
            if hasattr(tc, 'name'):
                name = tc.name
                args = tc.args or {}
            elif isinstance(tc, dict):
                name = tc.get("name")
                args = tc.get("args") or {}
            else:
                continue
                
            for tool_fn in TOOLS:
                if tool_fn.name == name:
                    try:
                        result = tool_fn.invoke(args)  # type: ignore[arg-type]
                        tool_outputs.append(AIMessage(content=str(result)))
                    except Exception as e:
                        tool_outputs.append(AIMessage(content=f"Tool {name} failed: {str(e)}"))
                    break
    return {"messages": state["messages"] + tool_outputs}


# Build graph
_graph = StateGraph(AgentState)
_graph.add_node("model", _call_model)
_graph.add_node("tools", _call_tools)
_graph.set_entry_point("model")
_graph.add_conditional_edges("model", _should_continue, {"tools": "tools", END: END})
_graph.add_edge("tools", "model")
executor = _graph.compile()


def detect_language_from_text(text: str) -> str | None:
    """Auto-detect language from text content"""
    import re
    
    # Chinese characters (CJK Unified Ideographs)
    if re.search(r'[\u4e00-\u9fff]', text):
        # Simplified vs Traditional Chinese detection
        simplified_chars = re.search(r'[\u4e00-\u9fa5]', text)
        traditional_chars = re.search(r'[\u9fa6-\u9fff\uf900-\ufaff]', text)
        if traditional_chars or '臺' in text or '註' in text:
            return 'zh-TW'
        return 'zh-CN'
    
    # Japanese characters (Hiragana, Katakana, Kanji)
    if re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]', text):
        # Check for Hiragana/Katakana to distinguish from Chinese
        if re.search(r'[\u3040-\u309f\u30a0-\u30ff]', text):
            return 'ja'
    
    # Korean characters (Hangul)
    if re.search(r'[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]', text):
        return 'ko'
    
    # Arabic characters
    if re.search(r'[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]', text):
        return 'ar'
    
    return None

def get_language_name(lang_code: str) -> str:
    """Convert language code to full name for AI prompting"""
    language_map = {
        'zh-CN': 'Simplified Chinese (简体中文)',
        'zh-TW': 'Traditional Chinese (繁體中文)',
        'ja': 'Japanese (日本語)',
        'ko': 'Korean (한국어)',
        'ar': 'Arabic (العربية)',
        'en': 'English',
        'hi': 'Hindi (हिन्दी)',
        'es': 'Spanish (Español)',
        'fr': 'French (Français)',
        'de': 'German (Deutsch)',
        'it': 'Italian (Italiano)',
        'pt': 'Portuguese (Português)',
        'ru': 'Russian (Русский)'
    }
    return language_map.get(lang_code, lang_code)

def run_medical_agent(session_id: str, user_text: str, context_report: str | None = None, language: str | None = None) -> str:
    try:
        # Auto-detect language if not specified or if detected language differs
        detected_lang = detect_language_from_text(user_text)
        
        # Use detected language if available, otherwise use specified language
        active_language = detected_lang or language
        
        # Create enhanced language instruction
        if active_language:
            lang_name = get_language_name(active_language)
            lang_instr = (
                f"IMPORTANT: Respond ONLY in {lang_name}. "
                f"Use proper {lang_name} grammar, vocabulary, and cultural context. "
                f"Do not mix languages or add English translations unless specifically requested. "
                f"Maintain medical terminology accuracy in {lang_name}."
            )
        else:
            lang_instr = "Respond in the same language as the user's question, or English if unclear."

        prompt = f"""You are a clinical assistant helping patients and doctors understand lab reports and symptoms.

Context: Session ID: {session_id}
User Question: {user_text}

{f"Lab Report Context:\n{context_report[:4000]}" if context_report else "No lab report available."}

Instructions:
- Use trusted medical sources when searching: {', '.join(_settings.trusted_medical_domains)}
- Always explain uncertainty, recommend follow-up, and include clear actions
- If asked to simulate, provide qualitative trends and monitoring plan, with a medical disclaimer
- Do not provide definitive diagnoses or treatment. Encourage consulting a clinician
- Be helpful, educational, and supportive
- If user asks for nutrition advice, ask them about their age and medical history if not available with youa nd then create a chart 
 - {lang_instr}

Please provide a helpful response to the user's question:"""

        # Use the model directly
        model = ChatGoogleGenerativeAI(
            model=_settings.gemini_model,
            temperature=_settings.gemini_temperature,
            api_key=_settings.google_api_key or None,
        )
        
        response = model.invoke([HumanMessage(content=prompt)])
        answer = response.content if hasattr(response, 'content') else str(response)

        # Fallback: ensure output in target language by a second pass translation
        if language:
            try:
                translate_prompt = (
                    f"Translate the following answer into {language}. "
                    "Only output the translated text, with no extra commentary or quotes.\n\n" 
                    f"Answer:\n{answer}"
                )
                tr_resp = model.invoke([HumanMessage(content=translate_prompt)])
                tr_text = tr_resp.content if hasattr(tr_resp, 'content') else str(tr_resp)
                if tr_text:
                    return tr_text
            except Exception:
                pass
        return answer
        
    except Exception as e:
        return f"I encountered an error: {str(e)}. Please try again." 
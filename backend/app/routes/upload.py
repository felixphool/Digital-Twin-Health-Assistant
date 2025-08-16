from fastapi import APIRouter, UploadFile, HTTPException, Query, File
from sqlmodel import select
import uuid
from typing import List

from app.models.db import get_session
from app.models.entities import LabReport, PatientSession
from app.services.ocr import extract_text_from_pdf, to_markdown
from app.services.security import is_malicious_file

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/pdf")
async def upload_pdf(file: UploadFile = File(...), session_id: str | None = None, ocr_lang: str | None = Query(None, description="OCR language(s), e.g., 'eng', 'hin', or 'eng+hin'")):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    data = await file.read()

    # Security: scan file bytes for malware
    try:
        malicious, signature = is_malicious_file(data)
        if malicious:
            raise HTTPException(status_code=400, detail=f"Uploaded file failed security scan: {signature}")
    except HTTPException:
        raise
    except Exception:
        # If scanning fails unexpectedly, proceed but you may choose to block instead
        pass
    raw_text = extract_text_from_pdf(data, ocr_lang=ocr_lang or None)
    if not raw_text:
        # Fallback: store placeholder markdown so upload doesn't fail
        markdown = "# Lab Report\n(No extractable text found. For scanned PDFs, install Tesseract OCR.)"
    else:
        markdown = to_markdown(raw_text)

    # Create or reuse session
    sid = session_id or str(uuid.uuid4())
    with get_session() as session:
        existing = session.exec(select(PatientSession).where(PatientSession.session_id == sid)).first()
        if not existing:
            session.add(PatientSession(session_id=sid))
            session.commit()

        # Check for duplicate filename
        existing_filename = session.exec(
            select(LabReport).where(
                LabReport.session_id == sid,
                LabReport.original_filename == file.filename
            )
        ).first()
        if existing_filename:
            raise HTTPException(
                status_code=409, 
                detail=f"A document with the name '{file.filename}' has already been uploaded in this session."
            )

        # Check for duplicate content
        existing_content = session.exec(
            select(LabReport).where(
                LabReport.session_id == sid,
                LabReport.markdown_content == markdown
            )
        ).first()
        if existing_content:
            raise HTTPException(
                status_code=409, 
                detail="You have already uploaded the same content previously. Duplicate content is not allowed."
            )

        report = LabReport(session_id=sid, original_filename=file.filename, markdown_content=markdown)
        session.add(report)
        session.commit()
        session.refresh(report)

    return {"session_id": sid, "report_id": report.id, "markdown": markdown}


@router.post("/pdfs")
async def upload_multiple_pdfs(
    files: List[UploadFile] = File(...), 
    session_id: str | None = Query(None, description="Session ID to associate documents with"),
    ocr_lang: str | None = Query(None, description="OCR language(s), e.g., 'eng', 'hin', or 'eng+hin'")
):
    """Upload multiple PDF files and convert them to markdown"""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Validate all files are PDFs
    for file in files:
        if file.content_type not in ("application/pdf", "application/octet-stream"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF")
    
    # Create or reuse session
    sid = session_id or str(uuid.uuid4())
    uploaded_reports = []
    skipped_files = []
    
    with get_session() as session:
        existing = session.exec(select(PatientSession).where(PatientSession.session_id == sid)).first()
        if not existing:
            session.add(PatientSession(session_id=sid))
            session.commit()
        
        # Process each file
        for file in files:
            data = await file.read()

            # Security: scan each file
            try:
                malicious, signature = is_malicious_file(data)
                if malicious:
                    # Skip infected files
                    continue
            except Exception:
                pass
            raw_text = extract_text_from_pdf(data, ocr_lang=ocr_lang or None)
            if not raw_text:
                markdown = "# Lab Report\n(No extractable text found. For scanned PDFs, install Tesseract OCR.)"
            else:
                markdown = to_markdown(raw_text)
            
            # Check for duplicate filename
            existing_filename = session.exec(
                select(LabReport).where(
                    LabReport.session_id == sid,
                    LabReport.original_filename == file.filename
                )
            ).first()
            if existing_filename:
                skipped_files.append({
                    "filename": file.filename,
                    "reason": "Duplicate filename"
                })
                continue

            # Check for duplicate content
            existing_content = session.exec(
                select(LabReport).where(
                    LabReport.session_id == sid,
                    LabReport.markdown_content == markdown
                )
            ).first()
            if existing_content:
                skipped_files.append({
                    "filename": file.filename,
                    "reason": "Duplicate content"
                })
                continue
            
            report = LabReport(
                session_id=sid, 
                original_filename=file.filename, 
                markdown_content=markdown
            )
            session.add(report)
            session.commit()
            session.refresh(report)
            
            uploaded_reports.append({
                "report_id": report.id,
                "filename": file.filename,
                "markdown": markdown
            })
    
    if not uploaded_reports:
        if skipped_files:
            detail = f"No files were uploaded. {len(skipped_files)} file(s) were skipped due to duplicates."
        else:
            detail = "No files were accepted (possibly blocked by security scan)"
        raise HTTPException(status_code=422, detail=detail)
    
    return {
        "session_id": sid, 
        "reports": uploaded_reports,
        "total_reports": len(uploaded_reports),
        "skipped_files": skipped_files,
        "total_skipped": len(skipped_files)
    }


@router.get("/documents/{session_id}")
async def get_session_documents(session_id: str):
    """Get all documents for a session"""
    with get_session() as session:
        reports = session.exec(
            select(LabReport).where(LabReport.session_id == session_id).order_by(LabReport.created_at.desc())
        ).all()
        
        return {
            "session_id": session_id,
            "total_documents": len(reports),
            "documents": [
                {
                    "id": report.id,
                    "filename": report.original_filename,
                    "markdown": report.markdown_content,
                    "created_at": report.created_at.isoformat()
                }
                for report in reports
            ]
        } 
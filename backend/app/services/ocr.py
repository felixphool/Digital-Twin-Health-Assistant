from typing import Tuple, List, Optional
import io

import fitz  # PyMuPDF
from PIL import Image

try:
    import pytesseract
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False


def extract_text_from_pdf(pdf_bytes: bytes, ocr_lang: Optional[str] = None, ocr_dpi: int = 150) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    parts: List[str] = []

    # First pass: direct text extraction
    for page in doc:
        text = page.get_text("text")
        if text and text.strip():
            parts.append(text.strip())

    # If little/no text and OCR is available, OCR page images
    if OCR_AVAILABLE:
        need_ocr = len("\n\n".join(parts)) < 100
        if need_ocr:
            parts = []
            for page in doc:
                pix = page.get_pixmap(dpi=ocr_dpi)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                # Use provided language(s) if available, e.g., 'eng', 'hin', or 'eng+hin'
                try:
                    if ocr_lang:
                        ocr_text = pytesseract.image_to_string(img, lang=ocr_lang)
                    else:
                        ocr_text = pytesseract.image_to_string(img)
                except Exception:
                    ocr_text = pytesseract.image_to_string(img)
                if ocr_text and ocr_text.strip():
                    parts.append(ocr_text.strip())

    return "\n\n".join(parts).strip()


def to_markdown(raw_text: str) -> str:
    # Very naive markdown conversion: normalize lines, create sections for common lab patterns
    lines = [ln.strip() for ln in raw_text.splitlines()]
    lines = [ln for ln in lines if ln]

    md_parts: List[str] = ["# Lab Report\n"]
    for ln in lines:
        # Make obvious key:value look bold
        if ":" in ln and len(ln.split(":")) == 2:
            key, val = ln.split(":", 1)
            md_parts.append(f"- **{key.strip()}**: {val.strip()}")
        else:
            md_parts.append(ln)

    return "\n".join(md_parts).strip() 
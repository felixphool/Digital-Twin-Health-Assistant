from typing import Dict


UI_TO_TTS: Dict[str, str] = {
    # English + common Indian languages + some others
    "en": "en",
    "hi": "hi",  # Hindi
    "bn": "bn",  # Bengali
    "ta": "ta",  # Tamil
    "te": "te",  # Telugu
    "mr": "mr",  # Marathi
    "gu": "gu",  # Gujarati
    "pa": "pa",  # Punjabi
    "ur": "ur",  # Urdu
    "ml": "ml",  # Malayalam
    # Other examples used in UI
    "es": "es",
    "fr": "fr",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    "ja": "ja",
    "ko": "ko",
    "ar": "ar",
    "ru": "ru",
}


UI_TO_BCP47_SR: Dict[str, str] = {
    # Prefer Indian regional variants when possible
    "en": "en-IN",
    "hi": "hi-IN",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
    "ur": "ur-IN",
    "ml": "ml-IN",
    # Generic fallbacks
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "it": "it-IT",
    "pt": "pt-PT",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "ar": "ar-SA",
    "ru": "ru-RU",
}


def tts_lang_from_ui(ui_code: str) -> str:
    return UI_TO_TTS.get(ui_code, "en")


def sr_lang_from_ui(ui_code: str) -> str:
    return UI_TO_BCP47_SR.get(ui_code, "en-IN")



# Deepgram Integration Setup

This application now uses Deepgram for advanced speech-to-text and text-to-speech functionality instead of browser-based APIs.

## Setup Instructions

### 1. Get Deepgram API Key

1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Create an account or sign in
3. Create a new project
4. Get your API key from the project dashboard

### 2. Configure Backend

Add your Deepgram API key to the backend configuration:

**Option 1: Environment Variable**
```bash
export DEEPGRAM_API_KEY="your_deepgram_api_key_here"
```

**Option 2: Configuration File**
Create or update `backend/.env`:
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

**Option 3: Direct Configuration**
Update `backend/app/config.py`:
```python
deepgram_api_key: str = "your_deepgram_api_key_here"
```

### 3. Features

With Deepgram integration, you get:

- **Improved Speech Recognition**: More accurate transcription for voice input
- **Multi-language Support**: Better support for Indian languages and international languages
- **Professional TTS**: Higher quality text-to-speech output
- **Reduced Browser Dependency**: Works consistently across all browsers

### 4. API Endpoints

New endpoints available:
- `POST /deepgram/transcribe` - Convert audio to text
- `POST /deepgram/tts` - Convert text to speech
- `GET /deepgram/ping` - Check service status

### 5. Usage

The voice features in the chat interface now automatically use Deepgram:
- Click the microphone button to record voice questions
- Click the speaker button to hear AI responses read aloud
- Language selection affects both recognition and speech synthesis

### 6. Fallback

If Deepgram is not configured or fails, the system falls back to:
- Browser SpeechRecognition API for voice input
- Browser SpeechSynthesis API for text-to-speech

This ensures the application continues to work even without Deepgram.

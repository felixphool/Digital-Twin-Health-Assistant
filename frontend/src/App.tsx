import { useState } from 'react'
import './App.css'
import PDFUpload from './components/PDFUpload'
import ChatInterface from './components/ChatInterface'
import DigitalRepresentation from './components/DigitalRepresentation'
import { useTheme } from './contexts/ThemeContext'

function App() {
  const [sessionId, setSessionId] = useState<string>('')
  const [currentView, setCurrentView] = useState<'upload' | 'chat' | 'digital'>('upload')
  const { theme, toggleTheme } = useTheme()

  const generateNewSession = () => {
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    setSessionId(newSessionId)
    // Optionally redirect to upload view for fresh start
    setCurrentView('upload')
  }

  return (
    <div className="app fade-in-scale">
      <header className="app-header">
        <div>
          <h1>🏥 Digital Twin Health Assistant</h1>
          <p>Upload lab reports and get intelligent medical insights</p>
        </div>
        <div className="header-controls">
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={`nav-btn ${currentView === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentView('upload')}
        >
          📄 Upload Report
        </button>
        <button 
          className={`nav-btn ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentView('chat')}
          disabled={!sessionId}
        >
          💬 Chat with AI
        </button>
        <button 
          className={`nav-btn ${currentView === 'digital' ? 'active' : ''}`}
          onClick={() => setCurrentView('digital')}
        >
          🧬 Digital Representation
        </button>
      </nav>

      <main className="app-main">
        {currentView === 'upload' ? (
          <PDFUpload 
            onUploadSuccess={(sessionId) => {
              setSessionId(sessionId)
              setCurrentView('chat')
            }}
          />
        ) : currentView === 'chat' ? (
          <ChatInterface 
            sessionId={sessionId} 
            onSessionRefresh={generateNewSession}
          />
        ) : (
          <DigitalRepresentation sessionId={sessionId} />
        )}
      </main>

    
    </div>
  )
}

export default App

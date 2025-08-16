import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ChatInterface.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isEditing?: boolean
  originalContent?: string
}

interface Document {
  id: string
  filename: string
  markdown: string
  created_at: string
}

interface ChatInterfaceProps {
  sessionId: string
  onSessionRefresh?: () => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, onSessionRefresh }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [showDocuments, setShowDocuments] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [language, setLanguage] = useState<string>('en')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [autoSpeakNext, setAutoSpeakNext] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchDocuments()
  }, [sessionId])

  useEffect(() => {
    console.log('Documents state changed:', documents)
  }, [documents])

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents for session:', sessionId)
      const response = await fetch(`http://localhost:8000/upload/documents/${sessionId}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Documents fetched successfully:', result)
        setDocuments(result.documents)
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch documents:', response.status, errorText)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
      isEditing: false
    }
    setMessages(prev => [...prev, newMessage])
  }

  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const saveEditMessage = async (messageId: string) => {
    if (!editContent.trim() || editContent === messages.find(m => m.id === messageId)?.content) {
      cancelEditMessage()
      return
    }

    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    // Auto-detect language for edited content
    const detectedLang = detectLanguageFromText(editContent.trim())
    let currentLanguage = language
    
    if (detectedLang && detectedLang !== language) {
      setLanguage(detectedLang)
      currentLanguage = detectedLang
    }

    // Update the message content
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: editContent.trim(),
      originalContent: updatedMessages[messageIndex].content
    }

    // Remove all messages after this one (assistant responses)
    const messagesToKeep = updatedMessages.slice(0, messageIndex + 1)
    setMessages(messagesToKeep)
    
    cancelEditMessage()
    setIsLoading(true)

    // Regenerate assistant response
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: editContent.trim(),
          language: currentLanguage,
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Chat failed: ${response.status} ${errText}`)
      }

      const result = await response.json()
      addMessage('assistant', result.answer)

    } catch (error) {
      console.error('Chat error:', error)
      addMessage('assistant', 'Sorry, I encountered an error while regenerating the response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const stopSpeaking = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } catch {}
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
    } catch {}
    setIsSpeaking(false)
  }

  const speakText = async (text: string) => {
    if (!text) return
    // Toggle off if already speaking
    if (isSpeaking) {
      stopSpeaking()
      return
    }
    
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'hi' ? 'hi-IN' : language === 'es' ? 'es-ES' : 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1
        
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)
        
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      } else {
        console.warn('Speech synthesis not supported in this browser')
      }
    } catch (error) {
      setIsSpeaking(false)
      console.error('Speech synthesis failed:', error)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Auto-detect language and update if different
    const detectedLang = detectLanguageFromText(userMessage)
    let currentLanguage = language
    
    if (detectedLang && detectedLang !== language) {
      setLanguage(detectedLang)
      currentLanguage = detectedLang
      console.log(`Auto-detected language: ${detectedLang}`)
      
      // Show brief language detection notification
      const languageNames: { [key: string]: string } = {
        'en': 'English',
        'hi': 'Hindi',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian'
      }
      const langName = languageNames[detectedLang] || detectedLang
      
      // You could add a toast notification here if desired
      console.log(`Language automatically switched to ${langName}`)
    }

    // Add user message immediately
    addMessage('user', userMessage)

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
          language: currentLanguage,
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Chat failed: ${response.status} ${errText}`)
      }

      const result = await response.json()
      addMessage('assistant', result.answer)
      if (autoSpeakNext) {
        setAutoSpeakNext(false)
        await speakText(result.answer)
      }

    } catch (error) {
      console.error('Chat error:', error)
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading || editingMessageId !== null) return

    setIsLoading(true)

    // Auto-detect language for suggested questions too
    const detectedLang = detectLanguageFromText(question)
    let currentLanguage = language
    
    if (detectedLang && detectedLang !== language) {
      setLanguage(detectedLang)
      currentLanguage = detectedLang
    }

    // Add user message immediately
    addMessage('user', question)

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: question,
          language: currentLanguage,
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Chat failed: ${response.status} ${errText}`)
      }

      const result = await response.json()
      addMessage('assistant', result.answer)

    } catch (error) {
      console.error('Chat error:', error)
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const startVoiceInput = async () => {
    try {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = language === 'hi' ? 'hi-IN' : language === 'es' ? 'es-ES' : 'en-US'
        
        recognition.addEventListener('start', () => {
          setIsRecording(true)
        })
        
        recognition.addEventListener('result', (event) => {
          const speechEvent = event as SpeechRecognitionEvent
          const transcript = speechEvent.results[0][0].transcript
          if (transcript && transcript.trim()) {
            setInputValue(transcript)
            setAutoSpeakNext(true)
            // Auto-send
            setTimeout(() => handleSubmit(), 100)
          } else {
            alert('No speech detected. Please try again.')
          }
        })
        
        recognition.addEventListener('error', (event) => {
          const errorEvent = event as SpeechRecognitionErrorEvent
          console.error('Speech recognition error:', errorEvent.error)
          setIsRecording(false)
          if (errorEvent.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone access and try again.')
          } else if (errorEvent.error === 'no-speech') {
            alert('No speech detected. Please try speaking again.')
          } else {
            alert(`Speech recognition error: ${errorEvent.error}. Please try again.`)
          }
        })
        
        recognition.addEventListener('end', () => {
          setIsRecording(false)
        })
        
        recognition.start()
      } else {
        alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      }
    } catch (error) {
      console.error('Voice input failed:', error)
      alert('Speech recognition failed. Please try again.')
      setIsRecording(false)
    }
  }

  const stopVoiceInput = () => {
    // For browser speech recognition, we just set recording to false
    // The recognition will stop automatically or can be stopped by the browser
    setIsRecording(false)
  }

  const detectLanguageFromText = (_text: string): string | null => {
    // Auto-detect language from text content for supported languages only
    // Note: CJK and Arabic languages are no longer supported
    
    // Basic detection for supported European languages could be added here
    // For now, we'll rely on manual language selection
    
    return null
  }

  const clearChatScreen = () => {
    const hasMessages = messages.length > 0
    if (hasMessages) {
      const confirmed = window.confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')
      if (!confirmed) return
    }
    
    setMessages([])
    if (editingMessageId) {
      cancelEditMessage()
    }
  }

  const handleCompleteRefresh = () => {
    const hasData = messages.length > 0 || documents.length > 0
    if (hasData) {
      const confirmed = window.confirm(
        'This will start a fresh session and remove all chat messages and uploaded documents. Are you sure?'
      )
      if (!confirmed) return
    }
    
    // Clear all local state
    setMessages([])
    setDocuments([])
    setEditingMessageId(null)
    setEditContent('')
    setShowDocuments(false)
    
    // Call parent to generate new session
    if (onSessionRefresh) {
      onSessionRefresh()
    }
  }


  const uploadMoreDocuments = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf'
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      const pdfFiles = files.filter(file => file.type === 'application/pdf')
      
      if (pdfFiles.length > 0) {
        const formData = new FormData()
        pdfFiles.forEach(file => {
          formData.append('files', file)
        })

        try {
          const response = await fetch(`http://localhost:8000/upload/pdfs?session_id=${sessionId}`, {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            const result = await response.json()
            console.log('Upload successful:', result)
            
            // Refresh documents list
            await fetchDocuments()
            
            // Create success message with skipped files info
            let message = `Successfully uploaded ${result.total_reports} new document${result.total_reports !== 1 ? 's' : ''}!`
            
            if (result.total_skipped > 0) {
              message += ` ${result.total_skipped} file${result.total_skipped !== 1 ? 's were' : ' was'} skipped:`
              result.skipped_files.forEach((skipped: any) => {
                message += `\n• ${skipped.filename} (${skipped.reason})`
              })
            }
            
            if (result.total_reports > 0) {
              message += ` I can now answer questions about these additional files.`
            }
            
            addMessage('assistant', message)
            
            // Show the documents sidebar to confirm they're there
            if (result.total_reports > 0) {
              setShowDocuments(true)
            }
          } else {
            const errorText = await response.text()
            console.error('Upload failed:', response.status, errorText)
            
            // Handle specific error cases
            if (response.status === 409) {
              // Duplicate detection error
              const friendlyMessage = errorText.includes('same name') 
                ? `🚫 **Duplicate File Detected**\n\nA document with this name has already been uploaded in this session. Please rename the file or choose a different document.`
                : `🚫 **Duplicate Content Detected**\n\nYou have already uploaded the same content previously. Duplicate content is not allowed to keep your documents organized.`
              addMessage('assistant', friendlyMessage)
            } else if (response.status === 422) {
              // All files skipped or other validation errors - beautify the message
              let friendlyMessage = '📋 **Upload Status**\n\n'
              if (errorText.includes('skipped due to duplicates')) {
                const fileCount = errorText.match(/(\d+) file/)?.[1] || '1'
                friendlyMessage += `I couldn't upload ${fileCount} file${fileCount !== '1' ? 's' : ''} because ${fileCount !== '1' ? 'they are' : 'it is'} duplicates of documents you've already uploaded.\n\n`
                friendlyMessage += '💡 **What you can do:**\n'
                friendlyMessage += '• Rename the files and try again\n'
                friendlyMessage += '• Choose different documents\n'
                friendlyMessage += '• Check your existing documents in the sidebar'
              } else {
                friendlyMessage += `❌ Upload failed: ${errorText}`
              }
              addMessage('assistant', friendlyMessage)
            } else {
              throw new Error(`Upload failed: ${response.status} ${errorText}`)
            }
          }
        } catch (error) {
          console.error('Upload error:', error)
          addMessage('assistant', 'Failed to upload documents. Please try again.')
        }
      }
    }
    input.click()
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-header-top">
          <h2>💬 Chat with Medical AI</h2>
          <div className="chat-badge">Gemini</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="language-select" style={{ fontSize: '0.9rem' }}>Language:</label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              {[
                ['en','English'], ['hi','Hindi'],
                ['es','Spanish'], ['fr','French'], ['de','German'], ['it','Italian'], ['pt','Portuguese'], ['ru','Russian']
              ].map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <p>Ask questions about your lab results, symptoms, or get medical insights</p>
        {editingMessageId && (
          <div className="editing-indicator">
            ✏️ Editing message... (Ctrl+Enter to save, Esc to cancel)
          </div>
        )}
        <div className="session-info">
          <span>Session ID: {sessionId.slice(0, 8)}...</span>
          <button 
            className="documents-toggle-btn"
            onClick={() => setShowDocuments(!showDocuments)}
          >
            {showDocuments ? '📚' : '📄'} Documents ({documents.length})
          </button>
          <button 
            className="upload-more-btn"
            onClick={uploadMoreDocuments}
            title="Upload additional PDF documents"
          >
            ➕ Upload More Documents
          </button>
          <button 
            className="fresh-session-btn"
            onClick={handleCompleteRefresh}
            title="Start fresh session - clear all data"
          >
            🔄 New Session
          </button>
          <button 
            className="clear-chat-btn"
            onClick={clearChatScreen}
            title="Clear chat messages"
          >
            🗑️ Clear Chat
          </button>
        </div>
      </div>

      <div className="chat-content">
        {showDocuments && (
          <div className="documents-sidebar">
            <div className="documents-header">
              <h3>📚 Your Documents</h3>
              <button 
                className="close-docs-btn"
                onClick={() => setShowDocuments(false)}
              >
                ✕
              </button>
            </div>
            <div className="documents-list">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className={`document-item ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="document-icon">📄</div>
                  <div className="document-details">
                    <div className="document-name">{doc.filename}</div>
                    <div className="document-date">{formatDate(doc.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
            {selectedDocument && (
              <div className="document-preview">
                <h4>📄 {selectedDocument.filename}</h4>
                <div className="document-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedDocument.markdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="chat-main">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <h3>👋 Welcome! I'm your medical AI assistant.</h3>
                <p>I can help you understand your lab results and answer medical questions.</p>
                
                {/* Debug section */}
                <div className="debug-info" style={{background: '#f0f0f0', padding: '1rem', borderRadius: '8px', margin: '1rem 0', fontSize: '0.9rem'}}>
                  <h4>🔍 Debug Info:</h4>
                  <p><strong>Session ID:</strong> {sessionId}</p>
                  <p><strong>Documents loaded:</strong> {documents.length}</p>
                  <p><strong>Documents:</strong> {documents.map(d => d.filename).join(', ') || 'None'}</p>
                </div>
                
                {documents.length > 0 && (
                  <div className="documents-summary">
                    <h4>📚 I have access to {documents.length} document{documents.length !== 1 ? 's' : ''}:</h4>
                    <ul>
                      {documents.map((doc) => (
                        <li key={doc.id}>{doc.filename}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="suggested-questions">
                  <h4>Try asking: <span className="click-hint">(Click to send)</span></h4>
                  <ul>
                    <li onClick={() => handleSuggestedQuestion("What do these lab values mean?")}>
                      <span className="question-text">"What do these lab values mean?"</span>
                      <span className="click-icon">→</span>
                    </li>
                    <li onClick={() => handleSuggestedQuestion("Should I be concerned about these results?")}>
                      <span className="question-text">"Should I be concerned about these results?"</span>
                      <span className="click-icon">→</span>
                    </li>
                    <li onClick={() => handleSuggestedQuestion("What lifestyle changes might help?")}>
                      <span className="question-text">"What lifestyle changes might help?"</span>
                      <span className="click-icon">→</span>
                    </li>
                    <li onClick={() => handleSuggestedQuestion("What if I start taking Vitamin D daily?")}>
                      <span className="question-text">"What if I start taking Vitamin D daily?"</span>
                      <span className="click-icon">→</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role} ${editingMessageId === message.id ? 'editing' : ''}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? '🧑' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-meta">
                    <span className="message-role">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                    {message.role === 'user' && editingMessageId !== message.id && (
                      <button 
                        className="edit-button"
                        onClick={() => startEditMessage(message.id, message.content)}
                        title="Edit message"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                  <div className="message-text">
                    {editingMessageId === message.id ? (
                      <div className="edit-container">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="edit-textarea"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              cancelEditMessage()
                            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              saveEditMessage(message.id)
                            }
                          }}
                        />
                        <div className="edit-actions">
                          <button 
                            className="edit-save-btn"
                            onClick={() => saveEditMessage(message.id)}
                            disabled={!editContent.trim()}
                          >
                            ✓ Save & Regenerate
                          </button>
                          <button 
                            className="edit-cancel-btn"
                            onClick={cancelEditMessage}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="message-text-content">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        ) : (
                          message.content
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="message-meta">
                    <span className="message-role">AI Assistant</span>
                  </div>
                  <div className="message-text">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <div className="input-container">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about your lab results, symptoms, or medical questions... (Shift+Enter for newline)"
                disabled={isLoading || editingMessageId !== null}
                className="chat-input"
                rows={2}
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isLoading || editingMessageId !== null}
                className={`send-button ${editingMessageId !== null ? 'editing-mode' : ''}`}
                title={editingMessageId !== null ? 'Finish editing to send messages' : 'Send'}
              >
                {isLoading ? '⏳' : editingMessageId !== null ? '✏️' : '📤'}
              </button>
              <button
                type="button"
                className="send-button"
                title={editingMessageId !== null ? 'Finish editing first' : (isSpeaking ? 'Stop reading' : 'Read out loud')}
                disabled={editingMessageId !== null}
                onClick={async () => {
                  const textToSpeak = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || ''
                  if (!textToSpeak) return
                  if (isSpeaking) {
                    stopSpeaking()
                  } else {
                    await speakText(textToSpeak)
                  }
                }}
              >
                {isSpeaking ? '⏹️' : '🔊'}
              </button>
              <button
                type="button"
                className={`send-button ${isRecording ? 'recording' : ''}`}
                title={editingMessageId !== null ? 'Finish editing first' : (isRecording ? 'Stop recording' : 'Voice input')}
                disabled={editingMessageId !== null}
                onClick={() => {
                  if (isRecording) stopVoiceInput(); else startVoiceInput()
                }}
              >
                {isRecording ? '⏹️' : '🎙️'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="chat-disclaimer">
        <p>⚠️ <strong>Medical Disclaimer:</strong> This AI provides educational information only. 
        Always consult healthcare professionals for medical advice, diagnosis, or treatment.</p>
      </div>
    </div>
  )
}

export default ChatInterface 
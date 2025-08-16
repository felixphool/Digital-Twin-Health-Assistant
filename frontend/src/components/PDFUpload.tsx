import { useState, useCallback } from 'react'
import './PDFUpload.css'

interface PDFUploadProps {
  onUploadSuccess: (sessionId: string) => void
}

interface UploadedDocument {
  id: string
  filename: string
  markdown: string
}

const PDFUpload: React.FC<PDFUploadProps> = ({ onUploadSuccess }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [sessionId, setSessionId] = useState<string>('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const pdfFiles = files.filter(file => (
      file.type === 'application/pdf' ||
      file.type === 'application/octet-stream' ||
      file.name.toLowerCase().endsWith('.pdf')
    ))
    
    if (pdfFiles.length > 0) {
      uploadFiles(pdfFiles)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter(file => (
      file.type === 'application/pdf' ||
      file.type === 'application/octet-stream' ||
      file.name.toLowerCase().endsWith('.pdf')
    ))
    
    if (pdfFiles.length > 0) {
      uploadFiles(pdfFiles)
    }
  }, [])

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const base = (import.meta as any).env?.VITE_API_BASE_URL || '/api'
      const params = new URLSearchParams()
      if (sessionId) params.set('session_id', sessionId)
      // Default to English OCR
      params.set('ocr_lang', 'eng')
      const url = `${base}/upload/pdfs${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        
        // Handle specific duplicate errors
        if (response.status === 409) {
          const friendlyMessage = errText.includes('same name') 
            ? 'Duplicate File Detected!\n\nA document with this name has already been uploaded. Please rename the file or choose a different document.'
            : 'Duplicate Content Detected!\n\nYou have already uploaded the same content previously. Please choose a different document.'
          alert(friendlyMessage)
          return
        } else if (response.status === 422) {
          let friendlyMessage = 'Upload Status:\n\n'
          if (errText.includes('skipped due to duplicates')) {
            const fileCount = errText.match(/(\d+) file/)?.[1] || '1'
            friendlyMessage += `Could not upload ${fileCount} file${fileCount !== '1' ? 's' : ''} - ${fileCount !== '1' ? 'they are' : 'it is'} duplicates of documents already uploaded.\n\n`
            friendlyMessage += 'What you can do:\n• Rename the files and try again\n• Choose different documents'
          } else {
            friendlyMessage += `Upload failed: ${errText}`
          }
          alert(friendlyMessage)
          return
        }
        
        throw new Error(`Upload failed: ${response.status} ${errText || response.statusText}`)
      }

      const result = await response.json()
      setSessionId(result.session_id)
      setUploadedDocuments(result.reports.map((report: any) => ({
        id: report.report_id,
        filename: report.filename,
        markdown: report.markdown
      })))
      
      // Show info about skipped files if any
      if (result.total_skipped > 0) {
        let skippedMessage = `Upload Summary:\n\n`
        skippedMessage += `${result.total_reports} file${result.total_reports !== 1 ? 's' : ''} uploaded successfully\n`
        skippedMessage += `${result.total_skipped} file${result.total_skipped !== 1 ? 's were' : ' was'} skipped due to duplicates:\n\n`
        result.skipped_files.forEach((skipped: any) => {
          const reason = skipped.reason === 'Duplicate filename' ? 'Same filename' : 'Same content'
          skippedMessage += `• ${skipped.filename} (${reason})\n`
        })
        skippedMessage += '\nTip: Rename duplicates or choose different documents to upload them.'
        alert(skippedMessage)
      }
      
      setUploadProgress(100)
      
      // Small delay to show completion
      setTimeout(() => {
        onUploadSuccess(result.session_id)
      }, 500)

    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeDocument = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }

  const addMoreDocuments = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf'
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      const pdfFiles = files.filter(file => file.type === 'application/pdf')
      if (pdfFiles.length > 0) {
        uploadFiles(pdfFiles)
      }
    }
    input.click()
  }

  return (
    <div className="pdf-upload">
      <div className="upload-header">
        <h2>📋 Upload Your Lab Reports</h2>
        <p>Drag and drop multiple PDF files or click to browse</p>
      </div>

      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p>Processing your lab reports... {uploadProgress}%</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📄</div>
            <p>Drop multiple PDF lab reports here</p>
            <p className="upload-hint">or</p>
            <label className="file-input-label">
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="file-input"
              />
              Choose Files
            </label>
          </>
        )}
      </div>

      {uploadedDocuments.length > 0 && (
        <div className="uploaded-documents">
          <h3>📚 Uploaded Documents ({uploadedDocuments.length})</h3>
          <div className="document-list">
            {uploadedDocuments.map((doc) => (
              <div key={doc.id} className="document-item">
                <div className="document-info">
                  <span className="document-icon">📄</span>
                  <span className="document-name">{doc.filename}</span>
                </div>
                <button 
                  className="remove-document-btn"
                  onClick={() => removeDocument(doc.id)}
                  title="Remove document"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
          <button 
            className="add-more-btn"
            onClick={addMoreDocuments}
          >
            ➕ Add More Documents
          </button>
        </div>
      )}
    </div>
  )
}

export default PDFUpload 
import React, { useState, useRef } from 'react';
import './MedicalReportUpload.css';

interface MedicalReportUploadProps {
  onParametersExtracted: (params: any) => void;
  onBack: () => void;
  sessionId: string;
}

const MedicalReportUpload: React.FC<MedicalReportUploadProps> = ({
  onParametersExtracted,
  onBack,
  sessionId
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedParams, setExtractedParams] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('session_id', sessionId);

      const response = await fetch('/api/digital/parse-medical-report', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedParams(data.extracted_parameters);
      } else {
        throw new Error('Failed to parse medical report');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseExtractedParams = () => {
    if (extractedParams) {
      onParametersExtracted(extractedParams);
    }
  };

  const renderUploadSection = () => (
    <div className="upload-section">
      <h3>Upload Medical Report</h3>
      <p>Upload your lab results, medical reports, or health data to automatically extract parameters</p>
      
      <div className="file-upload-zone" onClick={() => fileInputRef.current?.click()}>
        <div className="upload-icon">📁</div>
        <p>Click to upload or drag and drop</p>
        <p className="upload-hint">Supports: PDF, TXT, CSV, JSON</p>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.csv,.json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {uploadedFile && (
        <div className="file-info">
          <p>Selected file: {uploadedFile.name}</p>
          <button 
            className="btn-primary"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Parsing...' : 'Parse Report'}
          </button>
        </div>
      )}
    </div>
  );

  const renderExtractedParams = () => (
    <div className="extracted-params">
      <h3>Extracted Parameters</h3>
      <p>Review the extracted parameters and fill in any missing values:</p>
      
      <div className="params-preview">
        <div className="param-group">
          <h4>Vital Signs</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.vitals).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input
                  type="number"
                  value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setExtractedParams((prev: any) => ({
                      ...prev,
                      vitals: {
                        ...prev.vitals,
                        [key]: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }));
                  }}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="param-group">
          <h4>Blood Count (CBC)</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.cbc).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setExtractedParams((prev: any) => ({
                      ...prev,
                      cbc: {
                        ...prev.cbc,
                        [key]: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }));
                  }}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="param-group">
          <h4>Metabolic Panel</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.metabolic).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setExtractedParams((prev: any) => ({
                      ...prev,
                      metabolic: {
                        ...prev.metabolic,
                        [key]: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }));
                  }}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="param-group">
          <h4>Lipid Panel</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.lipids).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input
                  type="number"
                  value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setExtractedParams((prev: any) => ({
                      ...prev,
                      lipids: {
                        ...prev.lipids,
                        [key]: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }));
                  }}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="param-group">
          <h4>Liver Function</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.liver).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setExtractedParams((prev: any) => ({
                      ...prev,
                      liver: {
                        ...prev.liver,
                        [key]: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }));
                  }}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="param-group">
          <h4>Thyroid Function</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.thyroid).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setExtractedParams((prev: any) => ({
                      ...prev,
                      thyroid: {
                        ...prev.thyroid,
                        [key]: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }));
                  }}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="param-group">
          <h4>Lifestyle</h4>
          <div className="param-grid">
            {Object.entries(extractedParams.lifestyle).map(([key, value]) => (
              <div key={key} className="param-item">
                <label>{key.replace(/_/g, ' ')}:</label>
                {key.includes('status') || key.includes('consumption') ? (
                  <select
                    value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                    onChange={(e) => {
                      setExtractedParams((prev: any) => ({
                        ...prev,
                        lifestyle: {
                          ...prev.lifestyle,
                          [key]: e.target.value
                        }
                      }));
                    }}
                  >
                    <option value="">Select...</option>
                    {key === 'smoking_status' ? (
                      <>
                        <option value="never">Never</option>
                        <option value="former">Former</option>
                        <option value="current">Current</option>
                      </>
                    ) : (
                      <>
                        <option value="none">None</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Heavy</option>
                      </>
                    )}
                  </select>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                    onChange={(e) => {
                      setExtractedParams((prev: any) => ({
                        ...prev,
                        lifestyle: {
                          ...prev.lifestyle,
                          [key]: e.target.value ? parseFloat(e.target.value) : null
                        }
                      }));
                    }}
                    placeholder="Enter value"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="actions">
        <button 
          className="btn-secondary"
          onClick={() => {
            setExtractedParams(null);
            setUploadedFile(null);
          }}
        >
          Upload New Report
        </button>
        
        <button 
          className="btn-primary"
          onClick={handleUseExtractedParams}
        >
          Use These Parameters
        </button>
      </div>
    </div>
  );

  return (
    <div className="medical-report-upload">
      <div className="header">
        <h2>Medical Report Upload & Parsing</h2>
        <p>Upload your medical reports to automatically extract physiological parameters</p>
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {!extractedParams ? renderUploadSection() : renderExtractedParams()}
      
      <button 
        className="btn-back"
        onClick={onBack}
      >
        Back to Setup
      </button>
    </div>
  );
};

export default MedicalReportUpload; 
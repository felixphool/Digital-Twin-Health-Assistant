import React, { useState, useEffect } from 'react';
import './DigitalRepresentation.css';
import { API_ENDPOINTS, createFormData } from '../config/api';
import DetailedParameterInput from './DetailedParameterInput';
import WeeklyProgressionCharts from './WeeklyProgressionCharts';
import ReportGenerator from '../services/reportGenerator';

interface PhysiologicalParameters {
  vitals: {
    heart_rate: number;
    blood_pressure_systolic: number;
    blood_pressure_diastolic: number;
    respiratory_rate: number;
    body_temperature: number;
    oxygen_saturation: number;
  };
  cbc: {
    hemoglobin: number;
    white_blood_cells: number;
    platelets: number;
    red_blood_cells: number;
  };
  metabolic: {
    glucose_fasting: number;
    glucose_random: number;
    hba1c: number;
    creatinine: number;
    bun: number;
    sodium: number;
    potassium: number;
    chloride: number;
    bicarbonate: number;
  };
  lipids: {
    total_cholesterol: number;
    ldl: number;
    hdl: number;
    triglycerides: number;
  };
  liver: {
    alt: number;
    ast: number;
    bilirubin: number;
    albumin: number;
  };
  thyroid: {
    tsh: number;
    t3: number;
    t4: number;
  };
  lifestyle: {
    diet_carbs_percent: number;
    diet_fats_percent: number;
    diet_protein_percent: number;
    calorie_intake: number;
    exercise_frequency: number;
    exercise_duration: number;
    sleep_duration: number;
    sleep_quality: number;
    stress_level: number;
    smoking_status: string;
    alcohol_consumption: string;
    age?: number;
    gender?: string;
  };
  physical?: {
    height_cm: number;
    weight_kg: number;
    bmi: number;
  };
}

interface VirtualLabReport {
  patient_info: {
    report_date: string;
    bmi: number;
    egfr: number;
  };
  vital_signs: Record<string, {
    value: number;
    unit: string;
    reference_range: string;
    flag: string;
  }>;
  complete_blood_count: Record<string, {
    value: number;
    unit: string;
    reference_range: string;
    flag: string;
  }>;
  comprehensive_metabolic_panel: Record<string, {
    value: number;
    unit: string;
    reference_range: string;
    flag: string;
  }>;
  lipid_panel: Record<string, {
    value: number;
    unit: string;
    reference_range: string;
    flag: string;
  }>;
  liver_function: Record<string, {
    value: number;
    unit: string;
    reference_range: string;
    flag: string;
  }>;
  thyroid_function: Record<string, {
    value: number;
    unit: string;
    reference_range: string;
    flag: string;
  }>;
  lifestyle_assessment: Record<string, any>;
  interpretation: {
    overall_health_score: number;
    risk_factors: string[];
    recommendations: string[];
    alerts: string[];
  };
}

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  interventions: {
    exercise?: {
      type: string;
      intensity: string;
      duration_minutes: number;
      frequency_per_week: number;
    };
    diet?: {
      type: string;
      sodium_reduction?: string;
      fiber_increase?: string;
    };
    lifestyle?: {
      stress_management?: string;
      sleep_optimization?: string;
    };
    medication?: {
  name: string;
      dose: string;
      frequency: string;
    };
  };
  duration_weeks: number;
  expected_outcomes: string[];
  risk_level: 'low' | 'medium' | 'high';
  is_custom: boolean;
}

interface SimulationResult {
  result_id: string;
  baseline_report: VirtualLabReport;
  projected_report: VirtualLabReport;
  improvements: string[];
  recommendations: string[];
  simulation_duration: string;
  // CSV simulation specific fields
  weekly_progression?: Array<{
    week: number;
    parameters: any;
    lab_report: VirtualLabReport;
    changes_from_baseline: any;
  }>;
  ai_progression_analysis?: string;
}

interface DigitalRepresentationProps {
  sessionId: string;
}

const DigitalRepresentation: React.FC<DigitalRepresentationProps> = ({ sessionId }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'simulations'>('create');
  const [currentView, setCurrentView] = useState<'setup' | 'detailed-input' | 'dashboard' | 'virtual-tests' | 'simulate' | 'results'>('setup');
  const [digitalTwin, setDigitalTwin] = useState<PhysiologicalParameters | null>(null);
  const [virtualLabReport, setVirtualLabReport] = useState<VirtualLabReport | null>(null);
  const [simulationScenarios, setSimulationScenarios] = useState<SimulationScenario[]>([]);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for digital twin setup
  const [setupForm, setSetupForm] = useState({
    age: 35,
    gender: 'M',
    height_cm: 175,
    weight_kg: 70,
    medical_conditions: [] as string[]
  });

  // CSV initialization state
  const [csvInitialization, setCsvInitialization] = useState({
    csvFile: null as File | null,
    useCSV: false
  });

  // Form states for CSV simulation
  const [csvSimulation, setCsvSimulation] = useState({
    name: '',
    description: '',
    duration_weeks: 12,
    csvFile: null as File | null
  });

  // Health consultancy state
  const [showConsultancy, setShowConsultancy] = useState(false);
  const [consultancyData, setConsultancyData] = useState<any>(null);
  const [consultancyType, setConsultancyType] = useState('general');
  const [specificConcerns, setSpecificConcerns] = useState<string[]>([]);
  const [currentSymptoms, setCurrentSymptoms] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [isConsultancyLoading, setIsConsultancyLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Medication prediction state
  const [medicationQuery, setMedicationQuery] = useState('');
  const [isMedicationLoading, setIsMedicationLoading] = useState(false);
  const [medicationChatHistory, setMedicationChatHistory] = useState<any[]>([]);
  const [currentTestView, setCurrentTestView] = useState<'overview' | 'medication-chat'>('overview');

  useEffect(() => {
    fetchSimulationScenarios();
  }, []);

  useEffect(() => {
    if (currentView === 'simulate') {
      console.log('Simulation view rendered');
      console.log('CSV simulation state:', csvSimulation);
    }
  }, [currentView, csvSimulation]);

  const fetchSimulationScenarios = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_SCENARIOS);
      if (response.ok) {
        const data = await response.json();
        setSimulationScenarios(data.scenarios);
      }
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    }
  };

  const initializeDigitalTwin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('age', setupForm.age.toString());
      formData.append('gender', setupForm.gender);
      formData.append('medical_conditions', JSON.stringify(setupForm.medical_conditions));
      formData.append('height_cm', setupForm.height_cm.toString());
      formData.append('weight_kg', setupForm.weight_kg.toString());
      
      // Add CSV file if provided
      if (csvInitialization.useCSV && csvInitialization.csvFile) {
        formData.append('csv_file', csvInitialization.csvFile);
      }

      const response = await fetch(API_ENDPOINTS.INITIALIZE_DIGITAL_TWIN, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setDigitalTwin(data.baseline_parameters);
        setVirtualLabReport(data.initial_lab_report);
        setCurrentView('dashboard');
        // Ensure we're on the create tab after initialization
        setActiveTab('create');
      } else {
        throw new Error('Failed to initialize digital twin');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWithDetailedParameters = async (detailedParams: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = createFormData({
        session_id: sessionId,
        age: setupForm.age,
        gender: setupForm.gender,
        medical_conditions: setupForm.medical_conditions,
        height_cm: setupForm.height_cm,
        weight_kg: setupForm.weight_kg,
        vitals: detailedParams.vitals,
        cbc: detailedParams.cbc,
        metabolic: detailedParams.metabolic,
        lipids: detailedParams.lipids,
        liver: detailedParams.liver,
        thyroid: detailedParams.thyroid,
        lifestyle: detailedParams.lifestyle
      });

      const response = await fetch(API_ENDPOINTS.UPLOAD_DETAILED_PARAMETERS, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setDigitalTwin(data.baseline_parameters);
        setVirtualLabReport(data.initial_lab_report);
        setCurrentView('dashboard');
        // Ensure we're on the create tab after initialization
        setActiveTab('create');
      } else {
        throw new Error('Failed to initialize digital twin with detailed parameters');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };





  const runCsvSimulation = async () => {
    if (!digitalTwin || !csvSimulation.csvFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('baseline_parameters', JSON.stringify(digitalTwin));
      formData.append('csv_file', csvSimulation.csvFile);
      formData.append('duration_weeks', csvSimulation.duration_weeks.toString());

      const response = await fetch(API_ENDPOINTS.RUN_SIMULATION_WITH_CSV, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSimulationResults(prev => [data, ...prev]);
        setActiveTab('simulations');
        setCurrentView('results');
      } else {
        throw new Error('Failed to run CSV-based simulation');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvSimulation(prev => ({ ...prev, csvFile: file }));
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleInitializationCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvInitialization(prev => ({ ...prev, csvFile: file }));
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const getHealthConsultancy = async () => {
    if (!digitalTwin) return;
    
    setIsConsultancyLoading(true);
    setError(null);
    
    try {
      const formData = createFormData({
        session_id: sessionId,
        baseline_parameters: digitalTwin,
        consultation_type: consultancyType,
        specific_concerns: specificConcerns,
        current_symptoms: currentSymptoms,
        goals: healthGoals
      });

      const response = await fetch(API_ENDPOINTS.GET_HEALTH_CONSULTANCY, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setConsultancyData(data);
        setShowConsultancy(true);
      } else {
        throw new Error('Failed to get health consultancy');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsConsultancyLoading(false);
    }
  };

  const addConcern = (concern: string) => {
    if (concern.trim() && !specificConcerns.includes(concern.trim())) {
      setSpecificConcerns(prev => [...prev, concern.trim()]);
    }
  };

  const removeConcern = (concern: string) => {
    setSpecificConcerns(prev => prev.filter(c => c !== concern));
  };

  const addSymptom = (symptom: string) => {
    if (symptom.trim() && !currentSymptoms.includes(symptom.trim())) {
      setCurrentSymptoms(prev => [...prev, symptom.trim()]);
    }
  };

  const removeSymptom = (symptom: string) => {
    setCurrentSymptoms(prev => prev.filter(s => s !== symptom));
  };

  const addGoal = (goal: string) => {
    if (goal.trim() && !healthGoals.includes(goal.trim())) {
      setHealthGoals(prev => [...prev, goal.trim()]);
    }
  };

  const removeGoal = (goal: string) => {
    setHealthGoals(prev => prev.filter(g => g !== goal));
  };

  const downloadReport = async (result: SimulationResult) => {
    setIsGeneratingReport(true);
    setError(null);

    try {
      const reportGenerator = new ReportGenerator();
      await reportGenerator.generateSimulationReport(result, true);
      
      const filename = `health-simulation-report-${result.result_id}-${new Date().toISOString().split('T')[0]}.pdf`;
      reportGenerator.downloadReport(filename);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const predictMedicationImpact = async (medication: string) => {
    if (!digitalTwin) return;
    
    setIsMedicationLoading(true);
    setError(null);
    
    try {
      const formData = createFormData({
        session_id: sessionId,
        baseline_parameters: digitalTwin,
        medication_name: medication,
        patient_profile: {
          age: setupForm.age,
          gender: setupForm.gender,
          medical_conditions: setupForm.medical_conditions,
          height_cm: setupForm.height_cm,
          weight_kg: setupForm.weight_kg
        }
      });

      const response = await fetch(API_ENDPOINTS.PREDICT_MEDICATION_IMPACT, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add to chat history
        const userMessage = {
          type: 'user',
          message: `How would ${medication} affect my health parameters?`,
          timestamp: new Date().toISOString()
        };
        
        const aiResponse = {
          type: 'ai',
          message: data.ai_analysis,
          prediction: data,
          timestamp: new Date().toISOString()
        };
        
        setMedicationChatHistory(prev => [...prev, userMessage, aiResponse]);
        setMedicationQuery('');
        
      } else {
        throw new Error('Failed to predict medication impact');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsMedicationLoading(false);
    }
  };

  const renderTabNavigation = () => (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
        onClick={() => {
          setActiveTab('create');
          if (activeTab !== 'create') {
            setCurrentView(digitalTwin ? 'dashboard' : 'setup');
          }
        }}
      >
        🧬 Create Digital Twin
      </button>
      <button
        className={`tab-button ${activeTab === 'simulations' ? 'active' : ''}`}
        onClick={() => {
          setActiveTab('simulations');
          if (activeTab !== 'simulations') {
            setCurrentView('simulate');
          }
        }}
      >
        🔬 Simulations
      </button>
    </div>
  );

  const formatAIResponse = (aiResponse: string) => {
    if (!aiResponse) return null;

    // Debug logging
    console.log('Full AI Response:', aiResponse);
    console.log('AI Response Length:', aiResponse.length);

    // Clean up markdown formatting
    let cleanedResponse = aiResponse
      .replace(/\*\*/g, '') // Remove **
      .replace(/\*/g, '')   // Remove single *
      .replace(/`/g, '')    // Remove backticks
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim();

    console.log('Cleaned AI Response:', cleanedResponse);
    console.log('Cleaned Response Length:', cleanedResponse.length);

    // Better content parsing - look for numbered sections with content
    const sections = [];
    const lines = cleanedResponse.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a numbered section header
      const numberedMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            type: 'numbered',
            number: currentSection.number,
            title: currentSection.title,
            content: currentContent.join('\n').trim()
          });
        }
        
        // Start new section
        currentSection = {
          number: numberedMatch[1],
          title: numberedMatch[2].replace(/:/g, '').trim()
        };
        currentContent = [];
      } else if (line && currentSection) {
        // Add content to current section
        currentContent.push(line);
      } else if (line && !currentSection) {
        // This is content before any numbered section
        if (sections.length === 0) {
          sections.push({
            type: 'intro',
            content: line
          });
        } else {
          // Add to the last section
          const lastSection = sections[sections.length - 1];
          if (lastSection.content) {
            lastSection.content += '\n' + line;
          } else {
            lastSection.content = line;
          }
        }
      }
    }

    // Add the last section
    if (currentSection) {
      sections.push({
        type: 'numbered',
        number: currentSection.number,
        title: currentSection.title,
        content: currentContent.join('\n').trim()
      });
    }

    console.log('Parsed Sections:', sections);

    return sections.map((section, index) => {
      if (section.type === 'intro') {
        return (
          <p key={index} style={{ 
            marginBottom: '1rem',
            lineHeight: '1.6',
            textAlign: 'justify'
          }}>
            {section.content}
          </p>
        );
      }

      if (section.type === 'numbered') {
        return (
          <div key={index} className="highlight-box">
            <h5 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
              {section.number}. {section.title}
            </h5>
            <div style={{ lineHeight: '1.6' }}>
              {section.content.split('\n').map((paragraph, pIndex) => {
                if (!paragraph.trim()) return null;
                
                // Check if this paragraph contains key-value pairs
                if (paragraph.includes(':')) {
                  const [key, ...valueParts] = paragraph.split(':');
                  const value = valueParts.join(':').trim();
                  
                  if (key.toLowerCase().includes('risk') || key.toLowerCase().includes('alert') || key.toLowerCase().includes('concern')) {
                    return (
                      <div key={pIndex} style={{
                        background: 'var(--accent-error-alpha)',
                        borderLeft: '4px solid var(--accent-error)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.75rem'
                      }}>
                        <strong style={{ color: 'var(--accent-error)' }}>{key}:</strong>
                        <span style={{ marginLeft: '0.5rem' }}>{value}</span>
                      </div>
                    );
                  }
                  
                  if (key.toLowerCase().includes('recommendation') || key.toLowerCase().includes('suggestion') || key.toLowerCase().includes('advice')) {
                    return (
                      <div key={pIndex} style={{
                        background: 'var(--accent-warning-alpha)',
                        borderLeft: '4px solid var(--accent-warning)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.75rem'
                      }}>
                        <strong style={{ color: 'var(--accent-warning)' }}>{key}:</strong>
                        <span style={{ marginLeft: '0.5rem' }}>{value}</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={pIndex} style={{
                      background: 'var(--bg-secondary)',
                      borderLeft: '4px solid var(--accent-primary)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '0.75rem'
                    }}>
                      <strong style={{ color: 'var(--accent-primary)' }}>{key}:</strong>
                      <span style={{ marginLeft: '0.5rem' }}>{value}</span>
                    </div>
                  );
                }
                
                // Regular paragraph
                return (
                  <p key={pIndex} style={{ marginBottom: '0.75rem' }}>
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        );
      }

      return null;
    });
  };

  const renderSetupView = () => (
    <div className="setup-container">
      <h2>Initialize Your Digital Twin</h2>
      <p>Create a comprehensive digital representation of your health profile</p>
      
      <div className="setup-form">
        <div className="form-group">
          <label>Age:</label>
          <input
            type="number"
            value={setupForm.age}
            onChange={(e) => setSetupForm(prev => ({ ...prev, age: parseInt(e.target.value) }))}
            min="18"
            max="120"
          />
        </div>
        
        <div className="form-group">
          <label>Gender:</label>
          <select
            value={setupForm.gender}
            onChange={(e) => setSetupForm(prev => ({ ...prev, gender: e.target.value }))}
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Height (cm):</label>
          <input
            type="number"
            value={setupForm.height_cm}
            onChange={(e) => setSetupForm(prev => ({ ...prev, height_cm: parseFloat(e.target.value) }))}
            min="100"
            max="250"
          />
        </div>
        
        <div className="form-group">
          <label>Weight (kg):</label>
          <input
            type="number"
            value={setupForm.weight_kg}
            onChange={(e) => setSetupForm(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) }))}
            min="30"
            max="300"
          />
        </div>
        
        <div className="form-group">
          <label>Medical Conditions:</label>
          <div className="checkbox-group">
            {['diabetes', 'hypertension', 'cardiovascular_disease', 'kidney_disease', 'liver_disease'].map(condition => (
              <label key={condition} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={setupForm.medical_conditions.includes(condition)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSetupForm(prev => ({
                        ...prev,
                        medical_conditions: [...prev.medical_conditions, condition]
                      }));
                    } else {
                      setSetupForm(prev => ({
                        ...prev,
                        medical_conditions: prev.medical_conditions.filter(c => c !== condition)
                      }));
                    }
                  }}
                />
                {condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            ))}
          </div>
        </div>

        {/* CSV Upload Option */}
        <div className="form-group">
          <div style={{ 
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--border-light)'
          }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>
              🔄 Alternative: Upload CSV with Health Data
            </h4>
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Skip manual entry and upload a CSV file containing your health parameters for quick initialization.
            </p>
            
            <div className="csv-upload-section">
              <label className="checkbox-label" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={csvInitialization.useCSV}
                  onChange={(e) => setCsvInitialization(prev => ({ 
                    ...prev, 
                    useCSV: e.target.checked,
                    csvFile: e.target.checked ? prev.csvFile : null
                  }))}
                />
                <span style={{ marginLeft: '0.5rem' }}>Initialize with CSV file instead of manual entry</span>
              </label>

              {csvInitialization.useCSV && (
                <div className="csv-file-input">
                  <label 
                    htmlFor="initialization-csv-file-input"
                    style={{
                      border: '2px dashed var(--accent-primary)',
                      display: 'block',
                      width: '100%',
                      padding: '1rem',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary-alpha)';
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                  >
                    {csvInitialization.csvFile ? `📁 ${csvInitialization.csvFile.name}` : '📁 Click to select CSV file with health data'}
                  </label>
                  <input
                    id="initialization-csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleInitializationCsvFileChange}
                    style={{ display: 'none' }}
                  />
                  <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    CSV should contain health parameters like heart_rate, blood_pressure_systolic, glucose_fasting, etc.
                  </small>
                  {csvInitialization.csvFile && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: 'var(--accent-success)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem'
                    }}>
                      ✅ File selected: {csvInitialization.csvFile.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="setup-actions">
          <button 
            className="btn-secondary"
            onClick={() => setCurrentView('detailed-input')}
            disabled={isLoading || csvInitialization.useCSV}
          >
            Enter Detailed Parameters
          </button>
          
          <button 
            className="btn-primary"
            onClick={initializeDigitalTwin}
            disabled={isLoading || (csvInitialization.useCSV && !csvInitialization.csvFile)}
          >
            {isLoading ? 'Initializing...' : csvInitialization.useCSV ? 'Initialize with CSV' : 'Create Digital Twin'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard-container">
      <h2>Digital Twin Dashboard</h2>
      
      {virtualLabReport && (
        <div className="health-summary">
          <h3>Health Summary</h3>
          <div className="health-score">
            <span className="score-label">Overall Health Score:</span>
            <span className={`score-value ${virtualLabReport.interpretation.overall_health_score >= 80 ? 'excellent' : 
              virtualLabReport.interpretation.overall_health_score >= 60 ? 'good' : 'needs-attention'}`}>
              {virtualLabReport.interpretation.overall_health_score}/100
            </span>
          </div>
          
          {virtualLabReport.interpretation.risk_factors.length > 0 && (
            <div className="risk-factors">
              <h4>Risk Factors:</h4>
              <ul>
                {virtualLabReport.interpretation.risk_factors.map((factor, index) => (
                  <li key={index} className="risk-factor">{factor}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* {virtualLabReport.interpretation.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>Recommendations:</h4>
              <ul>
                {virtualLabReport.interpretation.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation">{rec}</li>
                ))}
              </ul>
            </div>
          )} */}
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentView('virtual-tests')}
        >
          Run Virtual Tests
        </button>
        <button 
          className="btn-primary"
          onClick={() => setShowConsultancy(true)}
          disabled={isConsultancyLoading}
        >
          {isConsultancyLoading ? 'Getting Consultancy...' : 'Get Consultancy'}
        </button>
      </div>

      {/* Health Consultancy Modal */}
      {showConsultancy && (
        <div className="consultancy-modal-overlay">
          <div className="consultancy-modal">
            <div className="modal-header">
              <h3>🤖 AI Health Consultancy</h3>
              <button 
                className="close-button"
                onClick={() => setShowConsultancy(false)}
              >
                ×
              </button>
            </div>

            {!consultancyData ? (
              <div className="consultancy-form">
                <div className="form-group">
                  <label>Consultation Type:</label>
                  <select
                    value={consultancyType}
                    onChange={(e) => setConsultancyType(e.target.value)}
                    className="consultation-select"
                  >
                    <option value="general">General Health</option>
                    <option value="lifestyle">Lifestyle & Wellness</option>
                    <option value="nutrition">Nutrition & Diet</option>
                    <option value="exercise">Exercise & Fitness</option>
                    <option value="comprehensive">Comprehensive Health</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Specific Health Concerns:</label>
                  <div className="tag-input">
                    <input
                      type="text"
                      placeholder="e.g., weight management, stress, sleep issues"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addConcern((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('.tag-input input') as HTMLInputElement;
                        if (input) {
                          addConcern(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="tags">
                    {specificConcerns.map((concern, index) => (
                      <span key={index} className="tag">
                        {concern}
                        <button onClick={() => removeConcern(concern)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Current Symptoms:</label>
                  <div className="tag-input">
                    <input
                      type="text"
                      placeholder="e.g., fatigue, headaches, muscle pain"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addSymptom((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('.tag-input input:nth-of-type(2)') as HTMLInputElement;
                        if (input) {
                          addSymptom(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="tags">
                    {currentSymptoms.map((symptom, index) => (
                      <span key={index} className="tag">
                        {symptom}
                        <button onClick={() => removeSymptom(symptom)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Health Goals:</label>
                  <div className="tag-input">
                    <input
                      type="text"
                      placeholder="e.g., lose weight, improve energy, better sleep"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addGoal((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('.tag-input input:nth-of-type(3)') as HTMLInputElement;
                        if (input) {
                          addGoal(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="tags">
                    {healthGoals.map((goal, index) => (
                      <span key={index} className="tag">
                        {goal}
                        <button onClick={() => removeGoal(goal)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowConsultancy(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={getHealthConsultancy}
                    disabled={isConsultancyLoading}
                  >
                    {isConsultancyLoading ? 'Getting Consultancy...' : 'Get AI Consultancy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="consultancy-results">
                <div className="health-score">
                  <h4>Health Score: {consultancyData.health_score}/100</h4>
                  <div className="score-bar">
                    <div 
                      className="score-fill"
                      style={{ width: `${consultancyData.health_score}%` }}
                    ></div>
                  </div>
                </div>

                <div className="ai-consultation">
                  <h4>AI Health Consultation</h4>
                  <div className="consultation-content">
                    {formatAIResponse(consultancyData.ai_consultation)}
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setConsultancyData(null);
                      setShowConsultancy(false);
                    }}
                  >
                    Close
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setConsultancyData(null);
                      setSpecificConcerns([]);
                      setCurrentSymptoms([]);
                      setHealthGoals([]);
                    }}
                  >
                    New Consultation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderVirtualTests = () => (
    <div className="virtual-tests-container">
      <h2>🔬 Advanced Virtual Health Laboratory</h2>
      <p>Comprehensive health analysis with AI-powered medication impact predictions</p>
      
      {/* Tab Navigation for Virtual Tests */}
      <div className="virtual-test-tabs">
        <button
          className={`tab-button ${currentTestView === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentTestView('overview')}
        >
          📊 Health Overview
        </button>
        <button
          className={`tab-button ${currentTestView === 'medication-chat' ? 'active' : ''}`}
          onClick={() => setCurrentTestView('medication-chat')}
        >
          💊 Medication Impact AI
        </button>
      </div>

      {/* Health Overview Tab */}
      {currentTestView === 'overview' && (
        <>
          {/* Complete Baseline Parameters Display */}
          {digitalTwin && (
            <div className="complete-baseline-display">
              <h3>🧬 Complete Health Profile</h3>
              
              {/* Vital Signs */}
              <div className="parameter-section">
                <h4 className="section-title">💓 Vital Signs</h4>
                <div className="parameters-grid">
                  <div className="param-card">
                    <span className="param-label">Heart Rate</span>
                    <span className="param-value">{digitalTwin.vitals?.heart_rate || 'N/A'} BPM</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Blood Pressure</span>
                    <span className="param-value">
                      {digitalTwin.vitals?.blood_pressure_systolic || 'N/A'}/
                      {digitalTwin.vitals?.blood_pressure_diastolic || 'N/A'} mmHg
                    </span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Respiratory Rate</span>
                    <span className="param-value">{digitalTwin.vitals?.respiratory_rate || 'N/A'} /min</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Body Temperature</span>
                    <span className="param-value">{digitalTwin.vitals?.body_temperature || 'N/A'} °F</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Oxygen Saturation</span>
                    <span className="param-value">{digitalTwin.vitals?.oxygen_saturation || 'N/A'} %</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                </div>
              </div>

              {/* Blood Work */}
              <div className="parameter-section">
                <h4 className="section-title">🩸 Complete Blood Count</h4>
                <div className="parameters-grid">
                  <div className="param-card">
                    <span className="param-label">Hemoglobin</span>
                    <span className="param-value">{digitalTwin.cbc?.hemoglobin || 'N/A'} g/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">White Blood Cells</span>
                    <span className="param-value">{digitalTwin.cbc?.white_blood_cells || 'N/A'} K/µL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Platelets</span>
                    <span className="param-value">{digitalTwin.cbc?.platelets || 'N/A'} K/µL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Red Blood Cells</span>
                    <span className="param-value">{digitalTwin.cbc?.red_blood_cells || 'N/A'} M/µL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                </div>
              </div>

              {/* Metabolic Panel */}
              <div className="parameter-section">
                <h4 className="section-title">⚗️ Metabolic Panel</h4>
                <div className="parameters-grid">
                  <div className="param-card">
                    <span className="param-label">Glucose (Fasting)</span>
                    <span className="param-value">{digitalTwin.metabolic?.glucose_fasting || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">HbA1c</span>
                    <span className="param-value">{digitalTwin.metabolic?.hba1c || 'N/A'} %</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Creatinine</span>
                    <span className="param-value">{digitalTwin.metabolic?.creatinine || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">BUN</span>
                    <span className="param-value">{digitalTwin.metabolic?.bun || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Sodium</span>
                    <span className="param-value">{digitalTwin.metabolic?.sodium || 'N/A'} mmol/L</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Potassium</span>
                    <span className="param-value">{digitalTwin.metabolic?.potassium || 'N/A'} mmol/L</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                </div>
              </div>

              {/* Lipid Panel */}
              <div className="parameter-section">
                <h4 className="section-title">🫀 Lipid Panel</h4>
                <div className="parameters-grid">
                  <div className="param-card">
                    <span className="param-label">Total Cholesterol</span>
                    <span className="param-value">{digitalTwin.lipids?.total_cholesterol || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">LDL Cholesterol</span>
                    <span className="param-value">{digitalTwin.lipids?.ldl || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">HDL Cholesterol</span>
                    <span className="param-value">{digitalTwin.lipids?.hdl || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Triglycerides</span>
                    <span className="param-value">{digitalTwin.lipids?.triglycerides || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                </div>
              </div>

              {/* Liver Function */}
              <div className="parameter-section">
                <h4 className="section-title">🫁 Liver Function</h4>
                <div className="parameters-grid">
                  <div className="param-card">
                    <span className="param-label">ALT</span>
                    <span className="param-value">{digitalTwin.liver?.alt || 'N/A'} U/L</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">AST</span>
                    <span className="param-value">{digitalTwin.liver?.ast || 'N/A'} U/L</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Bilirubin</span>
                    <span className="param-value">{digitalTwin.liver?.bilirubin || 'N/A'} mg/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">Albumin</span>
                    <span className="param-value">{digitalTwin.liver?.albumin || 'N/A'} g/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                </div>
              </div>

              {/* Thyroid Function */}
              <div className="parameter-section">
                <h4 className="section-title">🦋 Thyroid Function</h4>
                <div className="parameters-grid">
                  <div className="param-card">
                    <span className="param-label">TSH</span>
                    <span className="param-value">{digitalTwin.thyroid?.tsh || 'N/A'} mIU/L</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">T3</span>
                    <span className="param-value">{digitalTwin.thyroid?.t3 || 'N/A'} pg/mL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                  <div className="param-card">
                    <span className="param-label">T4</span>
                    <span className="param-value">{digitalTwin.thyroid?.t4 || 'N/A'} ng/dL</span>
                    <span className="param-status normal">Normal</span>
                  </div>
                </div>
              </div>
            </div>
          )}


        </>
      )}

      {/* Medication Impact AI Chat Tab */}
      {currentTestView === 'medication-chat' && (
        <div className="medication-chat-section">
          <h3>💊 AI-Powered Medication Impact Predictor</h3>
          <p>Ask about how specific medications might affect your health parameters based on large population data</p>
          
          {/* Chat Interface */}
          <div className="medication-chat-container">
            {/* Chat History */}
            <div className="chat-history">
              {medicationChatHistory.length === 0 ? (
                <div className="chat-welcome">
                  <div className="welcome-content">
                    <h4>🤖 Welcome to Medication Impact AI</h4>
                    <p>Ask me about any medication and I'll predict how it might affect your health parameters based on:</p>
                    <ul>
                      <li>🎯 Your specific health profile</li>
                      <li>📊 Large population clinical data</li>
                      <li>🧠 Advanced AI analysis powered by Gemini</li>
                      <li>⚕️ Medical literature and studies</li>
                    </ul>
                    <div className="example-queries">
                      <p><strong>Example questions:</strong></p>
                      <div className="example-buttons">
                        <button 
                          className="example-btn"
                          onClick={() => setMedicationQuery("How would metformin affect my blood glucose levels?")}
                        >
                          "How would metformin affect my blood glucose?"
                        </button>
                        <button 
                          className="example-btn"
                          onClick={() => setMedicationQuery("What impact would lisinopril have on my blood pressure?")}
                        >
                          "What impact would lisinopril have on my blood pressure?"
                        </button>
                        <button 
                          className="example-btn"
                          onClick={() => setMedicationQuery("How might atorvastatin change my cholesterol levels?")}
                        >
                          "How might atorvastatin change my cholesterol?"
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chat-messages">
                  {medicationChatHistory.map((chat, index) => (
                    <div key={index} className={`chat-message ${chat.type}`}>
                      {chat.type === 'user' ? (
                        <div className="user-message">
                          <div className="message-avatar">👤</div>
                          <div className="message-content">
                            <p>{chat.message}</p>
                            <small>{new Date(chat.timestamp).toLocaleTimeString()}</small>
                          </div>
                        </div>
                      ) : (
                        <div className="ai-message">
                          <div className="message-avatar">🤖</div>
                          <div className="message-content">
                            <div className="ai-analysis">
                              {formatAIResponse(chat.message)}
                            </div>
                            
                            {/* Medication Prediction Visualization */}
                            {chat.prediction && (
                              <div className="medication-prediction-viz">
                                <h5>📊 Predicted Parameter Changes</h5>
                                <div className="prediction-comparison">
                                  {chat.prediction.parameter_changes && (
                                    <div className="parameter-changes">
                                      {Object.entries(chat.prediction.parameter_changes).map(([param, change]: [string, any]) => (
                                        <div key={param} className="parameter-change">
                                          <span className="param-name">{param.replace(/_/g, ' ')}</span>
                                          <div className="change-indicator">
                                            <span className="before-value">Before: {change.before} {change.unit}</span>
                                            <span className="arrow">→</span>
                                            <span className={`after-value ${change.direction}`}>
                                              After: {change.after} {change.unit} 
                                              <span className="change-percent">({change.percentage_change})</span>
                                            </span>
                                          </div>
                                          <div className="confidence">
                                            Confidence: {change.confidence}%
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <small>{new Date(chat.timestamp).toLocaleTimeString()}</small>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-section">
              <div className="chat-input-container">
                <input
                  type="text"
                  value={medicationQuery}
                  onChange={(e) => setMedicationQuery(e.target.value)}
                  placeholder="Ask about any medication... (e.g., 'How would metformin affect my blood sugar?')"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && medicationQuery.trim()) {
                      // Extract medication name (simplified - could be more sophisticated)
                      const medicationMatch = medicationQuery.match(/\b(\w+(?:statin|pril|formin|lol|pine|mycin|cillin))\b/i);
                      const medication = medicationMatch ? medicationMatch[1] : medicationQuery.split(' ').find(word => 
                        word.length > 4 && !['would', 'affect', 'blood', 'pressure', 'glucose', 'cholesterol'].includes(word.toLowerCase())
                      ) || medicationQuery;
                      predictMedicationImpact(medication);
                    }
                  }}
                  disabled={isMedicationLoading}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => {
                    if (medicationQuery.trim()) {
                      const medicationMatch = medicationQuery.match(/\b(\w+(?:statin|pril|formin|lol|pine|mycin|cillin))\b/i);
                      const medication = medicationMatch ? medicationMatch[1] : medicationQuery.split(' ').find(word => 
                        word.length > 4 && !['would', 'affect', 'blood', 'pressure', 'glucose', 'cholesterol'].includes(word.toLowerCase())
                      ) || medicationQuery;
                      predictMedicationImpact(medication);
                    }
                  }}
                  disabled={isMedicationLoading || !medicationQuery.trim()}
                >
                  {isMedicationLoading ? '🤔' : '🚀'}
                </button>
              </div>
              {isMedicationLoading && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <span>🧠 AI analyzing medication impact based on population data...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSimulationView = () => (
    <div className="simulation-container">
      <h2>Health Simulations</h2>
      <p>Predict health outcomes based on lifestyle changes and interventions</p>

      {isGeneratingReport && (
        <div className="report-generation-status">
          <div className="status-content">
            <div className="spinner"></div>
            <span>📊 Generating comprehensive health report with charts and AI analysis...</span>
          </div>
        </div>
      )}

      {!digitalTwin && (
        <div className="no-digital-twin-notice">
          <div className="notice-content">
            <h3>🧬 Create Your Digital Twin First</h3>
            <p>To run health simulations, you'll need to create your digital twin with baseline health parameters.</p>
            <button 
              className="btn-primary"
              onClick={() => {
                setActiveTab('create');
                setCurrentView('setup');
              }}
            >
              Create Digital Twin
            </button>
          </div>
        </div>
      )}

      <div className={`scenarios-section ${!digitalTwin ? 'disabled-section' : ''}`}>
        <h3>Predefined Scenarios</h3>
        <div className="scenarios-grid">
          {simulationScenarios.map(scenario => (
            <div key={scenario.id} className="scenario-card">
              <h4>{scenario.name}</h4>
              <p>{scenario.description}</p>
              <div className="scenario-details">
                <span className="duration">{scenario.duration_weeks} weeks</span>
                <span className={`risk-level ${scenario.risk_level}`}>{scenario.risk_level}</span>
              </div>
              <div className="expected-outcomes">
                <h5>Expected Outcomes:</h5>
                <ul>
                  {scenario.expected_outcomes.map((outcome, index) => (
                    <li key={index}>{outcome}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`csv-simulation ${!digitalTwin ? 'disabled-section' : ''}`} data-testid="csv-simulation">
        <h3>CSV-Based Simulation</h3>
        <p>Upload a CSV file with weekly health data to track progression over time</p>
        <div className="csv-form">
          <div className="form-group">
            <label>Simulation Name:</label>
            <input
              type="text"
              value={csvSimulation.name}
              onChange={(e) => setCsvSimulation(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., My Health Progression"
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={csvSimulation.description}
              onChange={(e) => setCsvSimulation(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your simulation goals..."
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Duration (weeks):</label>
            <input
              type="number"
              value={csvSimulation.duration_weeks}
              onChange={(e) => setCsvSimulation(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) }))}
              min="1"
              max="52"
            />
          </div>

          <div className="form-group">
            <label>
              📁 CSV File Upload: <span style={{color: 'var(--accent-primary)', fontWeight: 'bold'}}>*Required</span>
            </label>
            <label 
              htmlFor="csv-file-input"
              style={{
                border: '3px dashed var(--accent-primary)',
                display: 'block',
                width: '100%',
                padding: '1rem',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '1rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary-alpha)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
            >
              {csvSimulation.csvFile ? `📁 ${csvSimulation.csvFile.name}` : '📁 Click to select CSV file'}
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              style={{ display: 'none' }}
            />
            <small className="file-help">
              Upload a CSV file with weekly health parameters. Include columns for week number and health metrics.
            </small>
            {csvSimulation.csvFile && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'var(--accent-success)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}>
                ✅ File selected: {csvSimulation.csvFile.name}
              </div>
            )}
            {/* Debug info */}
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              Debug: File input should be visible above. If not, check CSS or browser console.
            </div>
          </div>

          <button 
            className="btn-primary"
            onClick={runCsvSimulation}
            disabled={isLoading || !csvSimulation.name || !csvSimulation.csvFile || !digitalTwin}
            title={!digitalTwin ? 'Create your digital twin first' : ''}
          >
            {isLoading ? 'Running...' : !digitalTwin ? 'Create Digital Twin First' : 'Run CSV Simulation'}
          </button>
        </div>
      </div>
      
      {digitalTwin && (
        <button 
          className="btn-back"
          onClick={() => {
            setActiveTab('create');
            setCurrentView('dashboard');
          }}
        >
          Back to Dashboard
        </button>
      )}
    </div>
  );

  const renderResults = () => {
    console.log('Rendering results view with:', simulationResults);
    
    if (simulationResults.length === 0) {
      return (
        <div className="results-container">
          <h2>Simulation Results</h2>
          <p>No simulation results available yet.</p>
                  <div className="results-actions">
          <button 
            className="btn-back"
            onClick={() => setCurrentView('simulate')}
          >
            Back to Simulations
          </button>
          {simulationResults.length > 0 && (
            <button 
              className="btn-primary"
              onClick={() => downloadReport(simulationResults[0])}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? '📊 Generating...' : '📥 Download Latest Report'}
            </button>
          )}
        </div>
        </div>
      );
    }

    return (
      <div className="results-container">
        <h2>Simulation Results</h2>
        
        <div className="results-list">
          {simulationResults.map((result, index) => {
            console.log('Rendering result:', result);
            
            // Check if this is a CSV simulation result
            const isCsvSimulation = result.weekly_progression && result.weekly_progression.length > 0;
            
            return (
              <div key={index} className="result-card">
                <div className="result-header">
                  <div className="result-title">
                    <h3>Simulation Result #{result.result_id || index + 1}</h3>
                    <p className="duration">{result.simulation_duration || 'Duration not specified'}</p>
                  </div>
                  <button
                    className="btn-download"
                    onClick={() => downloadReport(result)}
                    disabled={isGeneratingReport}
                    title="Download detailed PDF report"
                  >
                    {isGeneratingReport ? '📊 Generating...' : '📥 Download Report'}
                  </button>
                </div>
                
                {/* Weekly Progression for CSV Simulations */}
                {isCsvSimulation && result.weekly_progression && (
                  <div className="weekly-progression">
                    <h4>Weekly Progression Charts</h4>
                    <WeeklyProgressionCharts weeklyProgression={result.weekly_progression} />
                  </div>
                )}

                {/* For CSV simulations, show baseline vs final comparison */}
                {isCsvSimulation && result.weekly_progression ? (
                  <div className="csv-comparison">
                    <h4>Baseline vs Final Health Comparison</h4>
                    <div className="comparison">
                      <div className="baseline">
                        <h5>Baseline Health (Week 1)</h5>
                        <div className="health-metrics">
                          <div className="metric">
                            <span>Blood Pressure:</span>
                            <span>
                              {result.weekly_progression[0]?.lab_report?.vital_signs?.blood_pressure_systolic?.value || 'N/A'}/
                              {result.weekly_progression[0]?.lab_report?.vital_signs?.blood_pressure_diastolic?.value || 'N/A'} mmHg
                            </span>
                          </div>
                          <div className="metric">
                            <span>Heart Rate:</span>
                            <span>{result.weekly_progression[0]?.lab_report?.vital_signs?.heart_rate?.value || 'N/A'} BPM</span>
                          </div>
                          <div className="metric">
                            <span>Glucose:</span>
                            <span>{result.weekly_progression[0]?.lab_report?.comprehensive_metabolic_panel?.glucose_fasting?.value || 'N/A'} mg/dL</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="projected">
                        <h5>Final Health (Week {result.weekly_progression.length})</h5>
                        <div className="health-metrics">
                          <div className="metric">
                            <span>Blood Pressure:</span>
                            <span>
                              {result.weekly_progression[result.weekly_progression.length - 1]?.lab_report?.vital_signs?.blood_pressure_systolic?.value || 'N/A'}/
                              {result.weekly_progression[result.weekly_progression.length - 1]?.lab_report?.vital_signs?.blood_pressure_diastolic?.value || 'N/A'} mmHg
                            </span>
                          </div>
                          <div className="metric">
                            <span>Heart Rate:</span>
                            <span>{result.weekly_progression[result.weekly_progression.length - 1]?.lab_report?.vital_signs?.heart_rate?.value || 'N/A'} BPM</span>
                          </div>
                          <div className="metric">
                            <span>Glucose:</span>
                            <span>{result.weekly_progression[result.weekly_progression.length - 1]?.lab_report?.comprehensive_metabolic_panel?.glucose_fasting?.value || 'N/A'} mg/dL</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Regular simulation comparison */
                  <div className="comparison">
                    <div className="baseline">
                      <h4>Baseline Health</h4>
                      <div className="health-metrics">
                        <div className="metric">
                          <span>Blood Pressure:</span>
                          <span>{result.baseline_report?.vital_signs?.blood_pressure_systolic?.value || 'N/A'}/{result.baseline_report?.vital_signs?.blood_pressure_diastolic?.value || 'N/A'} mmHg</span>
                        </div>
                        <div className="metric">
                          <span>Heart Rate:</span>
                          <span>{result.baseline_report?.vital_signs?.heart_rate?.value || 'N/A'} BPM</span>
                        </div>
                        <div className="metric">
                          <span>Glucose:</span>
                          <span>{result.baseline_report?.comprehensive_metabolic_panel?.glucose_fasting?.value || 'N/A'} mg/dL</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="projected">
                      <h4>Projected Health</h4>
                      <div className="health-metrics">
                        <div className="metric">
                          <span>Blood Pressure:</span>
                          <span>{result.projected_report?.vital_signs?.blood_pressure_systolic?.value || 'N/A'}/{result.projected_report?.vital_signs?.blood_pressure_diastolic?.value || 'N/A'} mmHg</span>
                        </div>
                        <div className="metric">
                          <span>Heart Rate:</span>
                          <span>{result.projected_report?.vital_signs?.heart_rate?.value || 'N/A'} BPM</span>
                        </div>
                        <div className="metric">
                          <span>Glucose:</span>
                          <span>{result.projected_report?.comprehensive_metabolic_panel?.glucose_fasting?.value || 'N/A'} mg/dL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show improvements if available */}
                {result.improvements && result.improvements.length > 0 && (
                  <div className="improvements">
                    <h4>Improvements</h4>
                    <ul>
                      {result.improvements.map((improvement, idx) => (
                        <li key={idx}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Show recommendations if available */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h4>Recommendations</h4>
                    <ul>
                      {result.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Analysis for CSV Simulations */}
                {result.ai_progression_analysis && (
                  <div className="ai-analysis">
                    <h4>AI Analysis</h4>
                    <div className="analysis-content">
                      {formatAIResponse(result.ai_progression_analysis)}
                    </div>
                    
                    {/* Fallback raw display for debugging */}
                    {/* <details style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: '600' }}>
                        🔍 Show Raw AI Response (Debug)
                      </summary>
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                        {result.ai_progression_analysis}
                      </div>
                    </details> */}
                  </div>
                )}

                {/* Debug information */}
                {/* <div className="debug-info" style={{marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px', fontSize: '0.875rem'}}>
                  <strong>Debug Info:</strong>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div> */}
              </div>
            );
          })}
        </div>
        
        <div className="results-actions">
          <button 
            className="btn-back"
            onClick={() => setCurrentView('simulate')}
          >
            Back to Simulations
          </button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  // Show placeholder if no session
  if (!sessionId) {
    return (
      <div className="digital-representation">
        <div className="header">
          <h1>Digital Twin Health System</h1>
          <p>Comprehensive health modeling and prediction</p>
        </div>
        
        <div className="main-content">
          <div className="setup-container">
            <h2>🔍 No Session Available</h2>
            <p>Please upload your medical reports first to start using the Digital Twin feature.</p>
            <div className="setup-actions">
              <button 
                className="btn-secondary"
                onClick={() => window.location.reload()}
              >
                ← Back to Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="digital-representation">
      <div className="header">
        <h1>Digital Twin Health System</h1>
        <p>Comprehensive health modeling and prediction</p>
      </div>
      
      {renderTabNavigation()}
      
      <div className="main-content">
        {/* Create Digital Twin Tab Content */}
        {activeTab === 'create' && (
          <>
            {currentView === 'setup' && renderSetupView()}
            {currentView === 'detailed-input' && (
              <DetailedParameterInput
                onParametersSubmit={initializeWithDetailedParameters}
                onBack={() => setCurrentView('setup')}
                isLoading={isLoading}
              />
            )}
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'virtual-tests' && renderVirtualTests()}
          </>
        )}
        
        {/* Simulations Tab Content */}
        {activeTab === 'simulations' && (
          <>
            {currentView === 'simulate' && renderSimulationView()}
            {currentView === 'results' && renderResults()}
          </>
        )}
      </div>
    </div>
  );
};

export default DigitalRepresentation; 
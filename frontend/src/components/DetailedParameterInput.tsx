import React, { useState } from 'react';
import './DetailedParameterInput.css';

interface DetailedParameters {
  vitals: {
    heart_rate: number | null;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    respiratory_rate: number | null;
    body_temperature: number | null;
    oxygen_saturation: number | null;
  };
  cbc: {
    hemoglobin: number | null;
    white_blood_cells: number | null;
    platelets: number | null;
    red_blood_cells: number | null;
  };
  metabolic: {
    glucose_fasting: number | null;
    glucose_random: number | null;
    hba1c: number | null;
    creatinine: number | null;
    bun: number | null;
    sodium: number | null;
    potassium: number | null;
    chloride: number | null;
    bicarbonate: number | null;
  };
  lipids: {
    total_cholesterol: number | null;
    ldl: number | null;
    hdl: number | null;
    triglycerides: number | null;
  };
  liver: {
    alt: number | null;
    ast: number | null;
    bilirubin: number | null;
    albumin: number | null;
  };
  thyroid: {
    tsh: number | null;
    t3: number | null;
    t4: number | null;
  };
  lifestyle: {
    diet_carbs_percent: number | null;
    diet_fats_percent: number | null;
    diet_protein_percent: number | null;
    calorie_intake: number | null;
    exercise_frequency: number | null;
    exercise_duration: number | null;
    sleep_duration: number | null;
    sleep_quality: number | null;
    stress_level: number | null;
    smoking_status: string;
    alcohol_consumption: string;
  };
}

interface DetailedParameterInputProps {
  onParametersSubmit: (params: DetailedParameters) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const DetailedParameterInput: React.FC<DetailedParameterInputProps> = ({
  onParametersSubmit,
  onBack,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<'basic' | 'vitals' | 'cbc' | 'metabolic' | 'lipids' | 'liver' | 'thyroid' | 'lifestyle'>('basic');
  
  const [basicInfo, setBasicInfo] = useState({
    age: 35,
    gender: 'M',
    height_cm: 175,
    weight_kg: 70,
    medical_conditions: [] as string[]
  });

  const [parameters, setParameters] = useState<DetailedParameters>({
    vitals: {
      heart_rate: null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      respiratory_rate: null,
      body_temperature: null,
      oxygen_saturation: null
    },
    cbc: {
      hemoglobin: null,
      white_blood_cells: null,
      platelets: null,
      red_blood_cells: null
    },
    metabolic: {
      glucose_fasting: null,
      glucose_random: null,
      hba1c: null,
      creatinine: null,
      bun: null,
      sodium: null,
      potassium: null,
      chloride: null,
      bicarbonate: null
    },
    lipids: {
      total_cholesterol: null,
      ldl: null,
      hdl: null,
      triglycerides: null
    },
    liver: {
      alt: null,
      ast: null,
      bilirubin: null,
      albumin: null
    },
    thyroid: {
      tsh: null,
      t3: null,
      t4: null
    },
    lifestyle: {
      diet_carbs_percent: null,
      diet_fats_percent: null,
      diet_protein_percent: null,
      calorie_intake: null,
      exercise_frequency: null,
      exercise_duration: null,
      sleep_duration: null,
      sleep_quality: null,
      stress_level: null,
      smoking_status: 'never',
      alcohol_consumption: 'none'
    }
  });

  const updateParameter = (section: keyof DetailedParameters, field: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const renderBasicInfo = () => (
    <div className="parameter-section">
      <h3>Basic Information</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Age:</label>
          <input
            type="number"
            value={basicInfo.age}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, age: parseInt(e.target.value) }))}
            min="18"
            max="120"
          />
        </div>
        
        <div className="form-group">
          <label>Gender:</label>
          <select
            value={basicInfo.gender}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, gender: e.target.value }))}
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Height (cm):</label>
          <input
            type="number"
            value={basicInfo.height_cm}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, height_cm: parseFloat(e.target.value) }))}
            min="100"
            max="250"
          />
        </div>
        
        <div className="form-group">
          <label>Weight (kg):</label>
          <input
            type="number"
            value={basicInfo.weight_kg}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) }))}
            min="30"
            max="300"
          />
        </div>
        
        <div className="form-group full-width">
          <label>Medical Conditions:</label>
          <div className="checkbox-group">
            {['diabetes', 'hypertension', 'cardiovascular_disease', 'kidney_disease', 'liver_disease'].map(condition => (
              <label key={condition} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={basicInfo.medical_conditions.includes(condition)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setBasicInfo(prev => ({
                        ...prev,
                        medical_conditions: [...prev.medical_conditions, condition]
                      }));
                    } else {
                      setBasicInfo(prev => ({
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
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={onBack}
        >
          Back
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('vitals')}
        >
          Next: Vital Signs
        </button>
      </div>
    </div>
  );

  const renderVitals = () => (
    <div className="parameter-section">
      <h3>Vital Signs</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Heart Rate (BPM):</label>
          <input
            type="number"
            value={parameters.vitals.heart_rate || ''}
            onChange={(e) => updateParameter('vitals', 'heart_rate', e.target.value ? parseFloat(e.target.value) : null)}
            min="40"
            max="200"
            placeholder="60-100"
          />
        </div>
        
        <div className="form-group">
          <label>Blood Pressure Systolic (mmHg):</label>
          <input
            type="number"
            value={parameters.vitals.blood_pressure_systolic || ''}
            onChange={(e) => updateParameter('vitals', 'blood_pressure_systolic', e.target.value ? parseFloat(e.target.value) : null)}
            min="70"
            max="200"
            placeholder="90-140"
          />
        </div>
        
        <div className="form-group">
          <label>Blood Pressure Diastolic (mmHg):</label>
          <input
            type="number"
            value={parameters.vitals.blood_pressure_diastolic || ''}
            onChange={(e) => updateParameter('vitals', 'blood_pressure_diastolic', e.target.value ? parseFloat(e.target.value) : null)}
            min="40"
            max="120"
            placeholder="60-90"
          />
        </div>
        
        <div className="form-group">
          <label>Respiratory Rate (breaths/min):</label>
          <input
            type="number"
            value={parameters.vitals.respiratory_rate || ''}
            onChange={(e) => updateParameter('vitals', 'respiratory_rate', e.target.value ? parseFloat(e.target.value) : null)}
            min="8"
            max="30"
            placeholder="12-20"
          />
        </div>
        
        <div className="form-group">
          <label>Body Temperature (°C):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.vitals.body_temperature || ''}
            onChange={(e) => updateParameter('vitals', 'body_temperature', e.target.value ? parseFloat(e.target.value) : null)}
            min="35"
            max="42"
            placeholder="36.5-37.5"
          />
        </div>
        
        <div className="form-group">
          <label>Oxygen Saturation (%):</label>
          <input
            type="number"
            value={parameters.vitals.oxygen_saturation || ''}
            onChange={(e) => updateParameter('vitals', 'oxygen_saturation', e.target.value ? parseFloat(e.target.value) : null)}
            min="80"
            max="100"
            placeholder="95-100"
          />
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('basic')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('cbc')}
        >
          Next: Blood Count
        </button>
      </div>
    </div>
  );

  const renderCBC = () => (
    <div className="parameter-section">
      <h3>Complete Blood Count (CBC)</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Hemoglobin (g/dL):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.cbc.hemoglobin || ''}
            onChange={(e) => updateParameter('cbc', 'hemoglobin', e.target.value ? parseFloat(e.target.value) : null)}
            min="8"
            max="20"
            placeholder="12.0-16.0"
          />
        </div>
        
        <div className="form-group">
          <label>White Blood Cells (K/μL):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.cbc.white_blood_cells || ''}
            onChange={(e) => updateParameter('cbc', 'white_blood_cells', e.target.value ? parseFloat(e.target.value) : null)}
            min="2"
            max="20"
            placeholder="4.0-11.0"
          />
        </div>
        
        <div className="form-group">
          <label>Platelets (K/μL):</label>
          <input
            type="number"
            value={parameters.cbc.platelets || ''}
            onChange={(e) => updateParameter('cbc', 'platelets', e.target.value ? parseInt(e.target.value) : null)}
            min="50"
            max="600"
            placeholder="150-450"
          />
        </div>
        
        <div className="form-group">
          <label>Red Blood Cells (M/μL):</label>
          <input
            type="number"
            step="0.01"
            value={parameters.cbc.red_blood_cells || ''}
            onChange={(e) => updateParameter('cbc', 'red_blood_cells', e.target.value ? parseFloat(e.target.value) : null)}
            min="3"
            max="7"
            placeholder="4.0-5.5"
          />
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('vitals')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('metabolic')}
        >
          Next: Metabolic Panel
        </button>
      </div>
    </div>
  );

  const renderMetabolic = () => (
    <div className="parameter-section">
      <h3>Comprehensive Metabolic Panel</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Glucose Fasting (mg/dL):</label>
          <input
            type="number"
            value={parameters.metabolic.glucose_fasting || ''}
            onChange={(e) => updateParameter('metabolic', 'glucose_fasting', e.target.value ? parseFloat(e.target.value) : null)}
            min="40"
            max="400"
            placeholder="70-100"
          />
        </div>
        
        <div className="form-group">
          <label>Glucose Random (mg/dL):</label>
          <input
            type="number"
            value={parameters.metabolic.glucose_random || ''}
            onChange={(e) => updateParameter('metabolic', 'glucose_random', e.target.value ? parseFloat(e.target.value) : null)}
            min="40"
            max="400"
            placeholder="70-140"
          />
        </div>
        
        <div className="form-group">
          <label>HbA1c (%):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.metabolic.hba1c || ''}
            onChange={(e) => updateParameter('metabolic', 'hba1c', e.target.value ? parseFloat(e.target.value) : null)}
            min="3"
            max="15"
            placeholder="4.0-5.7"
          />
        </div>
        
        <div className="form-group">
          <label>Creatinine (mg/dL):</label>
          <input
            type="number"
            step="0.01"
            value={parameters.metabolic.creatinine || ''}
            onChange={(e) => updateParameter('metabolic', 'creatinine', e.target.value ? parseFloat(e.target.value) : null)}
            min="0.3"
            max="5"
            placeholder="0.6-1.2"
          />
        </div>
        
        <div className="form-group">
          <label>BUN (mg/dL):</label>
          <input
            type="number"
            value={parameters.metabolic.bun || ''}
            onChange={(e) => updateParameter('metabolic', 'bun', e.target.value ? parseFloat(e.target.value) : null)}
            min="3"
            max="50"
            placeholder="7-20"
          />
        </div>
        
        <div className="form-group">
          <label>Sodium (mEq/L):</label>
          <input
            type="number"
            value={parameters.metabolic.sodium || ''}
            onChange={(e) => updateParameter('metabolic', 'sodium', e.target.value ? parseFloat(e.target.value) : null)}
            min="120"
            max="160"
            placeholder="135-145"
          />
        </div>
        
        <div className="form-group">
          <label>Potassium (mEq/L):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.metabolic.potassium || ''}
            onChange={(e) => updateParameter('metabolic', 'potassium', e.target.value ? parseFloat(e.target.value) : null)}
            min="2.5"
            max="7"
            placeholder="3.5-5.0"
          />
        </div>
        
        <div className="form-group">
          <label>Chloride (mEq/L):</label>
          <input
            type="number"
            value={parameters.metabolic.chloride || ''}
            onChange={(e) => updateParameter('metabolic', 'chloride', e.target.value ? parseFloat(e.target.value) : null)}
            min="90"
            max="115"
            placeholder="96-106"
          />
        </div>
        
        <div className="form-group">
          <label>Bicarbonate (mEq/L):</label>
          <input
            type="number"
            value={parameters.metabolic.bicarbonate || ''}
            onChange={(e) => updateParameter('metabolic', 'bicarbonate', e.target.value ? parseFloat(e.target.value) : null)}
            min="15"
            max="35"
            placeholder="22-28"
          />
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('cbc')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('lipids')}
        >
          Next: Lipid Panel
        </button>
      </div>
    </div>
  );

  const renderLipids = () => (
    <div className="parameter-section">
      <h3>Lipid Panel</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Total Cholesterol (mg/dL):</label>
          <input
            type="number"
            value={parameters.lipids.total_cholesterol || ''}
            onChange={(e) => updateParameter('lipids', 'total_cholesterol', e.target.value ? parseFloat(e.target.value) : null)}
            min="100"
            max="400"
            placeholder="0-200"
          />
        </div>
        
        <div className="form-group">
          <label>LDL (mg/dL):</label>
          <input
            type="number"
            value={parameters.lipids.ldl || ''}
            onChange={(e) => updateParameter('lipids', 'ldl', e.target.value ? parseFloat(e.target.value) : null)}
            min="50"
            max="200"
            placeholder="0-100"
          />
        </div>
        
        <div className="form-group">
          <label>HDL (mg/dL):</label>
          <input
            type="number"
            value={parameters.lipids.hdl || ''}
            onChange={(e) => updateParameter('lipids', 'hdl', e.target.value ? parseFloat(e.target.value) : null)}
            min="20"
            max="100"
            placeholder="40-60"
          />
        </div>
        
        <div className="form-group">
          <label>Triglycerides (mg/dL):</label>
          <input
            type="number"
            value={parameters.lipids.triglycerides || ''}
            onChange={(e) => updateParameter('lipids', 'triglycerides', e.target.value ? parseFloat(e.target.value) : null)}
            min="30"
            max="500"
            placeholder="0-150"
          />
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('metabolic')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('liver')}
        >
          Next: Liver Function
        </button>
      </div>
    </div>
  );

  const renderLiver = () => (
    <div className="parameter-section">
      <h3>Liver Function Tests</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>ALT (U/L):</label>
          <input
            type="number"
            value={parameters.liver.alt || ''}
            onChange={(e) => updateParameter('liver', 'alt', e.target.value ? parseFloat(e.target.value) : null)}
            min="5"
            max="200"
            placeholder="7-55"
          />
        </div>
        
        <div className="form-group">
          <label>AST (U/L):</label>
          <input
            type="number"
            value={parameters.liver.ast || ''}
            onChange={(e) => updateParameter('liver', 'ast', e.target.value ? parseFloat(e.target.value) : null)}
            min="5"
            max="200"
            placeholder="8-48"
          />
        </div>
        
        <div className="form-group">
          <label>Bilirubin (mg/dL):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.liver.bilirubin || ''}
            onChange={(e) => updateParameter('liver', 'bilirubin', e.target.value ? parseFloat(e.target.value) : null)}
            min="0.1"
            max="5"
            placeholder="0.3-1.2"
          />
        </div>
        
        <div className="form-group">
          <label>Albumin (g/dL):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.liver.albumin || ''}
            onChange={(e) => updateParameter('liver', 'albumin', e.target.value ? parseFloat(e.target.value) : null)}
            min="2"
            max="7"
            placeholder="3.4-5.4"
          />
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('lipids')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('thyroid')}
        >
          Next: Thyroid Function
        </button>
      </div>
    </div>
  );

  const renderThyroid = () => (
    <div className="parameter-section">
      <h3>Thyroid Function Tests</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>TSH (μIU/mL):</label>
          <input
            type="number"
            step="0.01"
            value={parameters.thyroid.tsh || ''}
            onChange={(e) => updateParameter('thyroid', 'tsh', e.target.value ? parseFloat(e.target.value) : null)}
            min="0.1"
            max="10"
            placeholder="0.4-4.0"
          />
        </div>
        
        <div className="form-group">
          <label>T3 (pg/mL):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.thyroid.t3 || ''}
            onChange={(e) => updateParameter('thyroid', 't3', e.target.value ? parseFloat(e.target.value) : null)}
            min="1"
            max="6"
            placeholder="2.3-4.2"
          />
        </div>
        
        <div className="form-group">
          <label>T4 (ng/dL):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.thyroid.t4 || ''}
            onChange={(e) => updateParameter('thyroid', 't4', e.target.value ? parseFloat(e.target.value) : null)}
            min="0.5"
            max="3"
            placeholder="0.8-1.8"
          />
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('liver')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => setCurrentSection('lifestyle')}
        >
          Next: Lifestyle
        </button>
      </div>
    </div>
  );

  const renderLifestyle = () => (
    <div className="parameter-section">
      <h3>Lifestyle Assessment</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Diet Carbs (%):</label>
          <input
            type="number"
            value={parameters.lifestyle.diet_carbs_percent || ''}
            onChange={(e) => updateParameter('lifestyle', 'diet_carbs_percent', e.target.value ? parseFloat(e.target.value) : null)}
            min="0"
            max="100"
            placeholder="40-60"
          />
        </div>
        
        <div className="form-group">
          <label>Diet Fats (%):</label>
          <input
            type="number"
            value={parameters.lifestyle.diet_fats_percent || ''}
            onChange={(e) => updateParameter('lifestyle', 'diet_fats_percent', e.target.value ? parseFloat(e.target.value) : null)}
            min="0"
            max="100"
            placeholder="20-35"
          />
        </div>
        
        <div className="form-group">
          <label>Diet Protein (%):</label>
          <input
            type="number"
            value={parameters.lifestyle.diet_protein_percent || ''}
            onChange={(e) => updateParameter('lifestyle', 'diet_protein_percent', e.target.value ? parseFloat(e.target.value) : null)}
            min="0"
            max="100"
            placeholder="15-25"
          />
        </div>
        
        <div className="form-group">
          <label>Calorie Intake (kcal/day):</label>
          <input
            type="number"
            value={parameters.lifestyle.calorie_intake || ''}
            onChange={(e) => updateParameter('lifestyle', 'calorie_intake', e.target.value ? parseFloat(e.target.value) : null)}
            min="800"
            max="5000"
            placeholder="1800-2500"
          />
        </div>
        
        <div className="form-group">
          <label>Exercise Frequency (days/week):</label>
          <input
            type="number"
            value={parameters.lifestyle.exercise_frequency || ''}
            onChange={(e) => updateParameter('lifestyle', 'exercise_frequency', e.target.value ? parseFloat(e.target.value) : null)}
            min="0"
            max="7"
            placeholder="0-7"
          />
        </div>
        
        <div className="form-group">
          <label>Exercise Duration (minutes):</label>
          <input
            type="number"
            value={parameters.lifestyle.exercise_duration || ''}
            onChange={(e) => updateParameter('lifestyle', 'exercise_duration', e.target.value ? parseFloat(e.target.value) : null)}
            min="0"
            max="180"
            placeholder="0-60"
          />
        </div>
        
        <div className="form-group">
          <label>Sleep Duration (hours):</label>
          <input
            type="number"
            step="0.1"
            value={parameters.lifestyle.sleep_duration || ''}
            onChange={(e) => updateParameter('lifestyle', 'sleep_duration', e.target.value ? parseFloat(e.target.value) : null)}
            min="4"
            max="12"
            placeholder="6.0-9.0"
          />
        </div>
        
        <div className="form-group">
          <label>Sleep Quality (1-10):</label>
          <input
            type="number"
            value={parameters.lifestyle.sleep_quality || ''}
            onChange={(e) => updateParameter('lifestyle', 'sleep_quality', e.target.value ? parseFloat(e.target.value) : null)}
            min="1"
            max="10"
            placeholder="1-10"
          />
        </div>
        
        <div className="form-group">
          <label>Stress Level (1-10):</label>
          <input
            type="number"
            value={parameters.lifestyle.stress_level || ''}
            onChange={(e) => updateParameter('lifestyle', 'stress_level', e.target.value ? parseFloat(e.target.value) : null)}
            min="1"
            max="10"
            placeholder="1-10"
          />
        </div>
        
        <div className="form-group">
          <label>Smoking Status:</label>
          <select
            value={parameters.lifestyle.smoking_status}
            onChange={(e) => updateParameter('lifestyle', 'smoking_status', e.target.value)}
          >
            <option value="never">Never</option>
            <option value="former">Former</option>
            <option value="current">Current</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Alcohol Consumption:</label>
          <select
            value={parameters.lifestyle.alcohol_consumption}
            onChange={(e) => updateParameter('lifestyle', 'alcohol_consumption', e.target.value)}
          >
            <option value="none">None</option>
            <option value="moderate">Moderate</option>
            <option value="heavy">Heavy</option>
          </select>
        </div>
      </div>
      
      <div className="section-actions">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentSection('thyroid')}
        >
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={() => onParametersSubmit(parameters)}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Digital Twin...' : 'Create Digital Twin'}
        </button>
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'basic':
        return renderBasicInfo();
      case 'vitals':
        return renderVitals();
      case 'cbc':
        return renderCBC();
      case 'metabolic':
        return renderMetabolic();
      case 'lipids':
        return renderLipids();
      case 'liver':
        return renderLiver();
      case 'thyroid':
        return renderThyroid();
      case 'lifestyle':
        return renderLifestyle();
      default:
        return renderBasicInfo();
    }
  };

  return (
    <div className="detailed-parameter-input">
      <div className="progress-bar">
        <div className={`progress-step ${currentSection === 'basic' ? 'active' : ''}`}>Basic Info</div>
        <div className={`progress-step ${currentSection === 'vitals' ? 'active' : ''}`}>Vitals</div>
        <div className={`progress-step ${currentSection === 'cbc' ? 'active' : ''}`}>CBC</div>
        <div className={`progress-step ${currentSection === 'metabolic' ? 'active' : ''}`}>Metabolic</div>
        <div className={`progress-step ${currentSection === 'lipids' ? 'active' : ''}`}>Lipids</div>
        <div className={`progress-step ${currentSection === 'liver' ? 'active' : ''}`}>Liver</div>
        <div className={`progress-step ${currentSection === 'thyroid' ? 'active' : ''}`}>Thyroid</div>
        <div className={`progress-step ${currentSection === 'lifestyle' ? 'active' : ''}`}>Lifestyle</div>
      </div>
      
      <div className="parameter-content">
        {renderCurrentSection()}
      </div>
    </div>
  );
};

export default DetailedParameterInput; 
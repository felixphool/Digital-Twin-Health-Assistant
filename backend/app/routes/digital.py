from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import datetime, timedelta
import random
import math

from app.models.db import get_session
from app.models.entities import MedicalReport, SimulationScenario, SimulationResult
from sqlmodel import Session, select
from app.services.agents.medical_agent import run_medical_agent
from app.services.health_scoring import HealthScoringService, calculate_health_score

router = APIRouter(prefix="/digital", tags=["digital-representation"])


class PhysiologicalParameters:
    """Comprehensive physiological parameter management for digital twin simulations"""
    
    @staticmethod
    def generate_baseline_health(age: int, gender: str, medical_conditions: List[str]) -> Dict[str, Any]:
        """Generate realistic baseline health parameters based on age, gender, and medical history"""
        
        # Base values by age group and gender
        age_group = "young" if age < 30 else "middle" if age < 60 else "elderly"
        
        # Vital Signs
        vitals = {
            "heart_rate": random.randint(60, 100),
            "blood_pressure_systolic": random.randint(110, 140),
            "blood_pressure_diastolic": random.randint(70, 90),
            "respiratory_rate": random.randint(12, 20),
            "body_temperature": round(random.uniform(36.5, 37.5), 1),
            "oxygen_saturation": random.randint(95, 99)
        }
        
        # Blood Chemistry - Complete Blood Count
        cbc = {
            "hemoglobin": round(random.uniform(12.0, 16.0), 1) if gender == "F" else round(random.uniform(14.0, 18.0), 1),
            "white_blood_cells": round(random.uniform(4.0, 11.0), 1),
            "platelets": random.randint(150, 450),
            "red_blood_cells": round(random.uniform(4.0, 5.5), 2) if gender == "F" else round(random.uniform(4.5, 6.0), 2)
        }
        
        # Metabolic Panel
        metabolic = {
            "glucose_fasting": random.randint(70, 100),
            "glucose_random": random.randint(70, 140),
            "hba1c": round(random.uniform(4.0, 5.7), 1),
            "creatinine": round(random.uniform(0.6, 1.2), 2),
            "bun": random.randint(7, 20),
            "sodium": random.randint(135, 145),
            "potassium": round(random.uniform(3.5, 5.0), 1),
            "chloride": random.randint(96, 106),
            "bicarbonate": random.randint(22, 28)
        }
        
        # Lipid Profile
        lipids = {
            "total_cholesterol": random.randint(150, 200),
            "ldl": random.randint(70, 130),
            "hdl": random.randint(40, 60) if gender == "M" else random.randint(50, 70),
            "triglycerides": random.randint(50, 150)
        }
        
        # Liver Function
        liver = {
            "alt": random.randint(7, 55),
            "ast": random.randint(8, 48),
            "bilirubin": round(random.uniform(0.3, 1.2), 1),
            "albumin": round(random.uniform(3.4, 5.4), 1)
        }
        
        # Thyroid Function
        thyroid = {
            "tsh": round(random.uniform(0.4, 4.0), 2),
            "t3": round(random.uniform(2.3, 4.2), 1),
            "t4": round(random.uniform(0.8, 1.8), 1)
        }
        
        # Lifestyle Parameters
        lifestyle = {
            "diet_carbs_percent": random.randint(40, 60),
            "diet_fats_percent": random.randint(20, 35),
            "diet_protein_percent": random.randint(15, 25),
            "calorie_intake": random.randint(1800, 2500),
            "exercise_frequency": random.randint(0, 7),
            "exercise_duration": random.randint(0, 60),
            "sleep_duration": round(random.uniform(6.0, 9.0), 1),
            "sleep_quality": random.randint(1, 10),
            "stress_level": random.randint(1, 10),
            "smoking_status": random.choice(["never", "former", "current"]),
            "alcohol_consumption": random.choice(["none", "moderate", "heavy"])
        }
        
        # Apply medical condition modifiers
        if "diabetes" in medical_conditions:
            metabolic["glucose_fasting"] = random.randint(126, 200)
            metabolic["glucose_random"] = random.randint(200, 300)
            metabolic["hba1c"] = round(random.uniform(6.5, 9.0), 1)
            
        if "hypertension" in medical_conditions:
            vitals["blood_pressure_systolic"] = random.randint(140, 180)
            vitals["blood_pressure_diastolic"] = random.randint(90, 110)
            
        if "cardiovascular_disease" in medical_conditions:
            vitals["heart_rate"] = random.randint(70, 110)
            lipids["ldl"] = random.randint(100, 160)
            
        if "kidney_disease" in medical_conditions:
            metabolic["creatinine"] = round(random.uniform(1.3, 3.0), 2)
            metabolic["bun"] = random.randint(20, 40)
            
        return {
            "vitals": vitals,
            "cbc": cbc,
            "metabolic": metabolic,
            "lipids": lipids,
            "liver": liver,
            "thyroid": thyroid,
            "lifestyle": lifestyle
        }
    
    @staticmethod
    def simulate_parameter_changes(baseline: Dict[str, Any], intervention: Dict[str, Any], duration_weeks: int) -> Dict[str, Any]:
        """Simulate how parameters change over time based on interventions"""
        
        projected = baseline.copy()
        
        # Calculate change factors based on duration and intervention strength
        time_factor = min(duration_weeks / 12.0, 1.0)  # Max effect at 12 weeks
        
        # Exercise interventions
        if "exercise" in intervention:
            exercise_intensity = intervention["exercise"].get("intensity", "moderate")
            exercise_duration = intervention["exercise"].get("duration_minutes", 30)
            exercise_frequency = intervention["exercise"].get("frequency_per_week", 5)
            
            # Cardiovascular improvements
            if exercise_intensity in ["moderate", "vigorous"]:
                projected["vitals"]["heart_rate"] = max(
                    baseline["vitals"]["heart_rate"] - int(5 * time_factor),
                    baseline["vitals"]["heart_rate"] - 15
                )
                projected["vitals"]["blood_pressure_systolic"] = max(
                    baseline["vitals"]["blood_pressure_systolic"] - int(8 * time_factor),
                    baseline["vitals"]["blood_pressure_systolic"] - 20
                )
                projected["vitals"]["blood_pressure_diastolic"] = max(
                    baseline["vitals"]["blood_pressure_diastolic"] - int(5 * time_factor),
                    baseline["vitals"]["blood_pressure_diastolic"] - 12
                )
                
                # Lipid improvements
                projected["lipids"]["hdl"] = min(
                    baseline["lipids"]["hdl"] + int(5 * time_factor),
                    baseline["lipids"]["hdl"] + 15
                )
                projected["lipids"]["triglycerides"] = max(
                    baseline["lipids"]["triglycerides"] - int(20 * time_factor),
                    baseline["lipids"]["triglycerides"] - 50
                )
                
                # Metabolic improvements
                projected["metabolic"]["glucose_fasting"] = max(
                    baseline["metabolic"]["glucose_fasting"] - int(8 * time_factor),
                    baseline["metabolic"]["glucose_fasting"] - 20
                )
                if baseline["metabolic"]["hba1c"] > 5.7:
                    projected["metabolic"]["hba1c"] = max(
                        baseline["metabolic"]["hba1c"] - (0.3 * time_factor),
                        baseline["metabolic"]["hba1c"] - 0.8
                    )
        
        # Diet interventions
        if "diet" in intervention:
            diet_type = intervention["diet"].get("type", "balanced")
            
            if diet_type == "low_carb":
                projected["metabolic"]["glucose_fasting"] = max(
                    baseline["metabolic"]["glucose_fasting"] - int(10 * time_factor),
                    baseline["metabolic"]["glucose_fasting"] - 25
                )
                projected["lipids"]["triglycerides"] = max(
                    baseline["lipids"]["triglycerides"] - int(25 * time_factor),
                    baseline["lipids"]["triglycerides"] - 60
                )
                
            elif diet_type == "mediterranean":
                projected["lipids"]["ldl"] = max(
                    baseline["lipids"]["ldl"] - int(15 * time_factor),
                    baseline["lipids"]["ldl"] - 35
                )
                projected["lipids"]["hdl"] = min(
                    baseline["lipids"]["hdl"] + int(8 * time_factor),
                    baseline["lipids"]["hdl"] + 20
                )
                
            elif diet_type == "low_sodium":
                projected["vitals"]["blood_pressure_systolic"] = max(
                    baseline["vitals"]["blood_pressure_systolic"] - int(10 * time_factor),
                    baseline["vitals"]["blood_pressure_systolic"] - 25
                )
                projected["vitals"]["blood_pressure_diastolic"] = max(
                    baseline["vitals"]["blood_pressure_diastolic"] - int(6 * time_factor),
                    baseline["vitals"]["blood_pressure_diastolic"] - 15
                )
        
        # Medication interventions
        if "medication" in intervention:
            med_name = intervention["medication"].get("name", "").lower()
            med_dose = intervention["medication"].get("dose", "standard")
            
            if "statin" in med_name:
                projected["lipids"]["ldl"] = max(
                    baseline["lipids"]["ldl"] - int(30 * time_factor),
                    baseline["lipids"]["ldl"] - 70
                )
                projected["lipids"]["total_cholesterol"] = max(
                    baseline["lipids"]["total_cholesterol"] - int(25 * time_factor),
                    baseline["lipids"]["total_cholesterol"] - 60
                )
                
            elif "ace_inhibitor" in med_name or "arb" in med_name:
                projected["vitals"]["blood_pressure_systolic"] = max(
                    baseline["vitals"]["blood_pressure_systolic"] - int(15 * time_factor),
                    baseline["vitals"]["blood_pressure_systolic"] - 35
                )
                projected["vitals"]["blood_pressure_diastolic"] = max(
                    baseline["vitals"]["blood_pressure_diastolic"] - int(8 * time_factor),
                    baseline["vitals"]["blood_pressure_diastolic"] - 20
                )
                
            elif "metformin" in med_name:
                projected["metabolic"]["glucose_fasting"] = max(
                    baseline["metabolic"]["glucose_fasting"] - int(20 * time_factor),
                    baseline["metabolic"]["glucose_fasting"] - 45
                )
                if baseline["metabolic"]["hba1c"] > 5.7:
                    projected["metabolic"]["hba1c"] = max(
                        baseline["metabolic"]["hba1c"] - (0.8 * time_factor),
                        baseline["metabolic"]["hba1c"] - 1.5
                    )
        
        # Sleep interventions
        if "sleep" in intervention:
            sleep_improvement = intervention["sleep"].get("improvement", "moderate")
            
            if sleep_improvement in ["moderate", "significant"]:
                projected["vitals"]["blood_pressure_systolic"] = max(
                    baseline["vitals"]["blood_pressure_systolic"] - int(5 * time_factor),
                    baseline["vitals"]["blood_pressure_systolic"] - 12
                )
                projected["lifestyle"]["stress_level"] = max(
                    baseline["lifestyle"]["stress_level"] - int(2 * time_factor),
                    baseline["lifestyle"]["stress_level"] - 5
                )
        
        return projected
       
    
    @staticmethod
    def generate_virtual_lab_report(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a virtual lab report based on current parameters"""
        
        # Calculate derived values
        bmi = round(parameters.get("lifestyle", {}).get("bmi", 25.0), 1)
        eGFR = PhysiologicalParameters.calculate_egfr(
            parameters.get("metabolic", {}).get("creatinine", 1.0),
            parameters.get("lifestyle", {}).get("age", 45),
            parameters.get("lifestyle", {}).get("gender", "M")
        )
        
        # Generate reference ranges and flags
        report = {
            "patient_info": {
                "report_date": datetime.now().isoformat(),
                "bmi": bmi,
                "egfr": eGFR
            },
            "vital_signs": PhysiologicalParameters.add_reference_ranges(parameters["vitals"], "vitals"),
            "complete_blood_count": PhysiologicalParameters.add_reference_ranges(parameters["cbc"], "cbc"),
            "comprehensive_metabolic_panel": PhysiologicalParameters.add_reference_ranges(parameters["metabolic"], "metabolic"),
            "lipid_panel": PhysiologicalParameters.add_reference_ranges(parameters["lipids"], "lipids"),
            "liver_function": PhysiologicalParameters.add_reference_ranges(parameters["liver"], "liver"),
            "thyroid_function": PhysiologicalParameters.add_reference_ranges(parameters["thyroid"], "thyroid"),
            "lifestyle_assessment": parameters["lifestyle"],
            "interpretation": PhysiologicalParameters.generate_interpretation(parameters)
        }
        
        return report
    
    @staticmethod
    def add_reference_ranges(values: Dict[str, Any], test_type: str) -> Dict[str, Any]:
        """Add reference ranges and flags to test values"""
        reference_ranges = {
            "vitals": {
                "heart_rate": {"min": 60, "max": 100, "unit": "BPM"},
                "blood_pressure_systolic": {"min": 90, "max": 140, "unit": "mmHg"},
                "blood_pressure_diastolic": {"min": 60, "max": 90, "unit": "mmHg"},
                "respiratory_rate": {"min": 12, "max": 20, "unit": "breaths/min"},
                "body_temperature": {"min": 36.5, "max": 37.5, "unit": "°C"},
                "oxygen_saturation": {"min": 95, "max": 100, "unit": "%"}
            },
            "cbc": {
                "hemoglobin": {"min": 12.0, "max": 16.0, "unit": "g/dL"},
                "white_blood_cells": {"min": 4.0, "max": 11.0, "unit": "K/μL"},
                "platelets": {"min": 150, "max": 450, "unit": "K/μL"},
                "red_blood_cells": {"min": 4.0, "max": 5.5, "unit": "M/μL"}
            },
            "metabolic": {
                "glucose_fasting": {"min": 70, "max": 100, "unit": "mg/dL"},
                "glucose_random": {"min": 70, "max": 140, "unit": "mg/dL"},
                "hba1c": {"min": 4.0, "max": 5.7, "unit": "%"},
                "creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
                "bun": {"min": 7, "max": 20, "unit": "mg/dL"},
                "sodium": {"min": 135, "max": 145, "unit": "mEq/L"},
                "potassium": {"min": 3.5, "max": 5.0, "unit": "mEq/L"},
                "chloride": {"min": 96, "max": 106, "unit": "mEq/L"},
                "bicarbonate": {"min": 22, "max": 28, "unit": "mEq/L"}
            },
            "lipids": {
                "total_cholesterol": {"min": 0, "max": 200, "unit": "mg/dL"},
                "ldl": {"min": 0, "max": 100, "unit": "mg/dL"},
                "hdl": {"min": 40, "max": 60, "unit": "mg/dL"},
                "triglycerides": {"min": 0, "max": 150, "unit": "mg/dL"}
            },
            "liver": {
                "alt": {"min": 7, "max": 55, "unit": "U/L"},
                "ast": {"min": 8, "max": 48, "unit": "U/L"},
                "bilirubin": {"min": 0.3, "max": 1.2, "unit": "mg/dL"},
                "albumin": {"min": 3.4, "max": 5.4, "unit": "g/dL"}
            },
            "thyroid": {
                "tsh": {"min": 0.4, "max": 4.0, "unit": "μIU/mL"},
                "t3": {"min": 2.3, "max": 4.2, "unit": "pg/mL"},
                "t4": {"min": 0.8, "max": 1.8, "unit": "ng/dL"}
            }
        }
        
        result = {}
        for key, value in values.items():
            ref_range = reference_ranges[test_type].get(key, {})
            result[key] = {
                "value": value,
                "unit": ref_range.get("unit", ""),
                "reference_range": f"{ref_range.get('min', '')}-{ref_range.get('max', '')}",
                "flag": PhysiologicalParameters.get_flag(value, ref_range.get("min"), ref_range.get("max"))
            }
        
        return result
    
    @staticmethod
    def get_flag(value: float, min_val: float, max_val: float) -> str:
        """Get flag for abnormal values"""
        if value is None:
            return "N/A"  # Not Available
        if value < min_val:
            return "L"  # Low
        elif value > max_val:
            return "H"  # High
        else:
            return "N"  # Normal
    
    @staticmethod
    def calculate_egfr(creatinine: float, age: int, gender: str) -> float:
        """Calculate estimated GFR using MDRD formula"""
        if gender == "F":
            return round(175 * (creatinine ** -1.154) * (age ** -0.203) * 0.742, 1)
        else:
            return round(175 * (creatinine ** -1.154) * (age ** -0.203), 1)
    
    @staticmethod
    def generate_interpretation(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate clinical interpretation of the parameters using standardized health scoring"""
        # Use the new HealthScoringService for consistent scoring
        return calculate_health_score(parameters)


@router.post("/upload-report")
async def upload_medical_report(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """Upload a medical report for digital representation"""
    try:
        # Read file content
        content = await file.read()
        
        # Determine file type
        file_type = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
        
        # Create medical report record
        with get_session() as db:
            medical_report = MedicalReport(
                session_id=session_id,
                filename=file.filename,
                content=content.decode('utf-8', errors='ignore'),
                file_type=file_type,
                upload_date=datetime.utcnow()
            )
            db.add(medical_report)
            db.commit()
            db.refresh(medical_report)
            
        return {
            "success": True,
            "report_id": medical_report.id,
            "filename": file.filename,
            "message": "Medical report uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")


@router.post("/upload-detailed-parameters")
async def upload_detailed_parameters(
    session_id: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    height_cm: float = Form(...),
    weight_kg: float = Form(...),
    medical_conditions: str = Form("[]"),
    # Detailed physiological parameters
    vitals: str = Form(...),  # JSON string
    cbc: str = Form(...),  # JSON string
    metabolic: str = Form(...),  # JSON string
    lipids: str = Form(...),  # JSON string
    liver: str = Form(...),  # JSON string
    thyroid: str = Form(...),  # JSON string
    lifestyle: str = Form(...)  # JSON string
):
    """Upload detailed physiological parameters for digital twin initialization"""
    try:
        # Parse all parameters
        conditions = json.loads(medical_conditions) if medical_conditions else []
        vitals_data = json.loads(vitals)
        cbc_data = json.loads(cbc)
        metabolic_data = json.loads(metabolic)
        lipids_data = json.loads(lipids)
        liver_data = json.loads(liver)
        thyroid_data = json.loads(thyroid)
        lifestyle_data = json.loads(lifestyle)
        
        # Calculate BMI
        height_m = height_cm / 100
        bmi = round(weight_kg / (height_m ** 2), 1)
        
        # Create comprehensive baseline parameters
        baseline_params = {
            "vitals": vitals_data,
            "cbc": cbc_data,
            "metabolic": metabolic_data,
            "lipids": lipids_data,
            "liver": liver_data,
            "thyroid": thyroid_data,
            "lifestyle": lifestyle_data,
            "physical": {
                "height_cm": height_cm,
                "weight_kg": weight_kg,
                "bmi": bmi
            }
        }
        
        # Add age and gender to lifestyle
        baseline_params["lifestyle"]["age"] = age
        baseline_params["lifestyle"]["gender"] = gender
        
        # Generate virtual lab report
        initial_report = PhysiologicalParameters.generate_virtual_lab_report(baseline_params)
        
        # Generate personalized recommendations using Gemini medical agent
        gemini_prompt = f"""
        Based on the following health parameters, provide personalized health recommendations:
        
        Age: {age}, Gender: {gender}, BMI: {bmi}
        Medical Conditions: {', '.join(conditions) if conditions else 'None'}
        
        Vital Signs: {json.dumps(vitals_data, indent=2)}
        CBC: {json.dumps(cbc_data, indent=2)}
        Metabolic Panel: {json.dumps(metabolic_data, indent=2)}
        Lipid Profile: {json.dumps(lipids_data, indent=2)}
        Liver Function: {json.dumps(liver_data, indent=2)}
        Thyroid Function: {json.dumps(thyroid_data, indent=2)}
        Lifestyle: {json.dumps(lifestyle_data, indent=2)}
        
        Please provide:
        1. Overall health assessment
        2. Specific risk factors to address
        3. Personalized lifestyle recommendations
        4. Suggested monitoring frequency
        5. When to consult a healthcare provider
        
        Focus on actionable, evidence-based advice.
        """
        
        try:
            gemini_recommendations = run_medical_agent(
                session_id=session_id,
                user_text=gemini_prompt,
                context_report=None
            )
        except Exception as e:
            gemini_recommendations = f"Unable to generate AI recommendations: {str(e)}"
        
        return {
            "success": True,
            "session_id": session_id,
            "baseline_parameters": baseline_params,
            "initial_lab_report": initial_report,
            "ai_recommendations": gemini_recommendations,
            "message": "Digital twin initialized with detailed parameters and AI recommendations successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize digital twin with detailed parameters: {str(e)}")


@router.post("/parse-medical-report")
async def parse_medical_report(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """Parse medical report and extract physiological parameters"""
    try:
        # Read file content
        content = await file.read()
        
        # For now, we'll return a template structure
        # In a real implementation, you'd use OCR/NLP to extract values
        extracted_params = {
            "vitals": {
                "heart_rate": None,
                "blood_pressure_systolic": None,
                "blood_pressure_diastolic": None,
                "respiratory_rate": None,
                "body_temperature": None,
                "oxygen_saturation": None
            },
            "cbc": {
                "hemoglobin": None,
                "white_blood_cells": None,
                "platelets": None,
                "red_blood_cells": None
            },
            "metabolic": {
                "glucose_fasting": None,
                "glucose_random": None,
                "hba1c": None,
                "creatinine": None,
                "bun": None,
                "sodium": None,
                "potassium": None,
                "chloride": None,
                "bicarbonate": None
            },
            "lipids": {
                "total_cholesterol": None,
                "ldl": None,
                "hdl": None,
                "triglycerides": None
            },
            "liver": {
                "alt": None,
                "ast": None,
                "bilirubin": None,
                "albumin": None
            },
            "thyroid": {
                "tsh": None,
                "t3": None,
                "t4": None
            },
            "lifestyle": {
                "diet_carbs_percent": None,
                "diet_fats_percent": None,
                "diet_protein_percent": None,
                "calorie_intake": None,
                "exercise_frequency": None,
                "exercise_duration": None,
                "sleep_duration": None,
                "sleep_quality": None,
                "stress_level": None,
                "smoking_status": None,
                "alcohol_consumption": None
            }
        }
        
        # Save the uploaded file
        with get_session() as db:
            medical_report = MedicalReport(
                session_id=session_id,
                filename=file.filename,
                content=content.decode('utf-8', errors='ignore'),
                file_type=file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown',
                upload_date=datetime.utcnow()
            )
            db.add(medical_report)
            db.commit()
            db.refresh(medical_report)
        
        return {
            "success": True,
            "report_id": medical_report.id,
            "filename": file.filename,
            "extracted_parameters": extracted_params,
            "message": "Medical report parsed successfully. Please review and fill in the extracted parameters."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse medical report: {str(e)}")


@router.post("/initialize-digital-twin")
async def initialize_digital_twin(
    session_id: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    medical_conditions: str = Form("[]"),  # JSON string of conditions
    height_cm: float = Form(...),
    weight_kg: float = Form(...),
    # Optional detailed parameters - if provided, use these instead of generated ones
    vitals: str = Form("{}"),  # JSON string of vitals
    cbc: str = Form("{}"),  # JSON string of CBC
    metabolic: str = Form("{}"),  # JSON string of metabolic panel
    lipids: str = Form("{}"),  # JSON string of lipid panel
    liver: str = Form("{}"),  # JSON string of liver function
    thyroid: str = Form("{}"),  # JSON string of thyroid function
    lifestyle: str = Form("{}"),  # JSON string of lifestyle parameters
    # Optional CSV file upload
    csv_file: Optional[UploadFile] = File(None)
):
    """Initialize a digital twin with baseline physiological parameters (manual entry or CSV upload)"""
    try:
        # Parse medical conditions
        conditions = json.loads(medical_conditions) if medical_conditions else []
        
        # Calculate BMI
        height_m = height_cm / 100
        bmi = round(weight_kg / (height_m ** 2), 1)
        
        # Handle CSV file upload if provided
        csv_params = {}
        if csv_file and csv_file.filename:
            # Read and parse CSV file
            content = await csv_file.read()
            csv_content = content.decode('utf-8')
            
            # Parse CSV data
            import csv
            from io import StringIO
            
            csv_data = []
            csv_reader = csv.DictReader(StringIO(csv_content))
            
            for row in csv_reader:
                # Convert string values to appropriate types
                processed_row = {}
                for key, value in row.items():
                    if value.strip() == '':
                        processed_row[key] = None
                    elif value.lower() in ['true', 'false']:
                        processed_row[key] = value.lower() == 'true'
                    elif '.' in value and value.replace('.', '').replace('-', '').isdigit():
                        try:
                            processed_row[key] = float(value)
                        except ValueError:
                            processed_row[key] = value
                    elif value.replace('-', '').isdigit():
                        try:
                            processed_row[key] = int(value)
                        except ValueError:
                            processed_row[key] = value
                    else:
                        processed_row[key] = value
                csv_data.append(processed_row)
            
            if not csv_data:
                raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
            
            # Use the first row of CSV data for initialization (baseline)
            first_row = csv_data[0]
            
            # Map CSV data to parameter categories using the existing mapping
            csv_mapping = {
                # Vital signs
                "heart_rate": ("vitals", "heart_rate"),
                "blood_pressure_systolic": ("vitals", "blood_pressure_systolic"),
                "blood_pressure_diastolic": ("vitals", "blood_pressure_diastolic"),
                "respiratory_rate": ("vitals", "respiratory_rate"),
                "body_temperature": ("vitals", "body_temperature"),
                "oxygen_saturation": ("vitals", "oxygen_saturation"),
                
                # CBC
                "hemoglobin": ("cbc", "hemoglobin"),
                "white_blood_cells": ("cbc", "white_blood_cells"),
                "platelets": ("cbc", "platelets"),
                "red_blood_cells": ("cbc", "red_blood_cells"),
                
                # Metabolic parameters
                "glucose_fasting": ("metabolic", "glucose_fasting"),
                "glucose_random": ("metabolic", "glucose_random"),
                "hba1c": ("metabolic", "hba1c"),
                "creatinine": ("metabolic", "creatinine"),
                "bun": ("metabolic", "bun"),
                "sodium": ("metabolic", "sodium"),
                "potassium": ("metabolic", "potassium"),
                "chloride": ("metabolic", "chloride"),
                "bicarbonate": ("metabolic", "bicarbonate"),
                
                # Lipid parameters
                "total_cholesterol": ("lipids", "total_cholesterol"),
                "ldl": ("lipids", "ldl"),
                "hdl": ("lipids", "hdl"),
                "triglycerides": ("lipids", "triglycerides"),
                
                # Liver function
                "alt": ("liver", "alt"),
                "ast": ("liver", "ast"),
                "bilirubin": ("liver", "bilirubin"),
                "albumin": ("liver", "albumin"),
                
                # Thyroid function
                "tsh": ("thyroid", "tsh"),
                "t3": ("thyroid", "t3"),
                "t4": ("thyroid", "t4"),
                
                # Lifestyle parameters
                "diet_carbs_percent": ("lifestyle", "diet_carbs_percent"),
                "diet_fats_percent": ("lifestyle", "diet_fats_percent"),
                "diet_protein_percent": ("lifestyle", "diet_protein_percent"),
                "calorie_intake": ("lifestyle", "calorie_intake"),
                "exercise_frequency": ("lifestyle", "exercise_frequency"),
                "exercise_duration": ("lifestyle", "exercise_duration"),
                "sleep_duration": ("lifestyle", "sleep_duration"),
                "sleep_quality": ("lifestyle", "sleep_quality"),
                "stress_level": ("lifestyle", "stress_level"),
                "smoking_status": ("lifestyle", "smoking_status"),
                "alcohol_consumption": ("lifestyle", "alcohol_consumption"),
                
                # Physical parameters
                "weight_kg": ("physical", "weight_kg"),
                "height_cm": ("physical", "height_cm")
            }
            
            # Initialize parameter categories
            csv_params = {
                "vitals": {},
                "cbc": {},
                "metabolic": {},
                "lipids": {},
                "liver": {},
                "thyroid": {},
                "lifestyle": {},
                "physical": {}
            }
            
            # Map CSV data to parameters
            for csv_column, value in first_row.items():
                if csv_column in csv_mapping and value is not None:
                    category, param_name = csv_mapping[csv_column]
                    csv_params[category][param_name] = value
            
            # Update height and weight from CSV if provided
            if csv_params["physical"].get("height_cm"):
                height_cm = float(csv_params["physical"]["height_cm"])
            if csv_params["physical"].get("weight_kg"):
                weight_kg = float(csv_params["physical"]["weight_kg"])
                
            # Recalculate BMI
            height_m = float(height_cm) / 100
            bmi = round(float(weight_kg) / (height_m ** 2), 1)
        
        # Check if detailed parameters were provided (manual entry or CSV)
        has_detailed_params = any([
            vitals != "{}", cbc != "{}", metabolic != "{}", 
            lipids != "{}", liver != "{}", thyroid != "{}", lifestyle != "{}"
        ]) or bool(csv_params)
        
        if has_detailed_params:
            # Use provided parameters, fill in missing ones with generated values
            baseline_params = PhysiologicalParameters.generate_baseline_health(age, gender, conditions)
            
            # Override with manually provided values
            if vitals != "{}":
                baseline_params["vitals"].update(json.loads(vitals))
            if cbc != "{}":
                baseline_params["cbc"].update(json.loads(cbc))
            if metabolic != "{}":
                baseline_params["metabolic"].update(json.loads(metabolic))
            if lipids != "{}":
                baseline_params["lipids"].update(json.loads(lipids))
            if liver != "{}":
                baseline_params["liver"].update(json.loads(liver))
            if thyroid != "{}":
                baseline_params["thyroid"].update(json.loads(thyroid))
            if lifestyle != "{}":
                baseline_params["lifestyle"].update(json.loads(lifestyle))
            
            # Override with CSV values if provided (CSV takes precedence over manual for initialization)
            if csv_params:
                for category in ["vitals", "cbc", "metabolic", "lipids", "liver", "thyroid", "lifestyle"]:
                    if csv_params.get(category):
                        baseline_params[category].update(csv_params[category])
        else:
            # Generate baseline parameters
            baseline_params = PhysiologicalParameters.generate_baseline_health(age, gender, conditions)
        
        # Add physical measurements
        baseline_params["physical"] = {
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "bmi": bmi
        }
        baseline_params["lifestyle"]["age"] = age
        baseline_params["lifestyle"]["gender"] = gender
        
        # Generate initial virtual lab report
        initial_report = PhysiologicalParameters.generate_virtual_lab_report(baseline_params)
        
        # Generate personalized recommendations using Gemini medical agent
        gemini_prompt = f"""
        Based on the following health parameters, provide personalized health recommendations:
        
        Age: {age}, Gender: {gender}, BMI: {bmi}
        Medical Conditions: {', '.join(conditions) if conditions else 'None'}
        
        Vital Signs: {json.dumps(baseline_params.get('vitals', {}), indent=2)}
        CBC: {json.dumps(baseline_params.get('cbc', {}), indent=2)}
        Metabolic Panel: {json.dumps(baseline_params.get('metabolic', {}), indent=2)}
        Lipid Profile: {json.dumps(baseline_params.get('lipids', {}), indent=2)}
        Liver Function: {json.dumps(baseline_params.get('liver', {}), indent=2)}
        Thyroid Function: {json.dumps(baseline_params.get('thyroid', {}), indent=2)}
        Lifestyle: {json.dumps(baseline_params.get('lifestyle', {}), indent=2)}
        
        Please provide:
        1. Overall health assessment
        2. Specific risk factors to address
        3. Personalized lifestyle recommendations
        4. Suggested monitoring frequency
        5. When to consult a healthcare provider
        
        Focus on actionable, evidence-based advice.
        """
        
        try:
            gemini_recommendations = run_medical_agent(
                session_id=session_id,
                user_text=gemini_prompt,
                context_report=None
            )
        except Exception as e:
            gemini_recommendations = f"Unable to generate AI recommendations: {str(e)}"
        
        # Determine the initialization method
        init_method = "CSV data" if csv_params else "manual entry"
        
        return {
            "success": True,
            "session_id": session_id,
            "baseline_parameters": baseline_params,
            "initial_lab_report": initial_report,
            "ai_recommendations": gemini_recommendations,
            "initialization_method": init_method,
            "message": f"Digital twin initialized successfully with {init_method} and AI recommendations"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize digital twin: {str(e)}")


@router.post("/run-virtual-test")
async def run_virtual_test(
    session_id: str = Form(...),
    test_type: str = Form(...),  # "comprehensive", "vitals", "cbc", "metabolic", "lipids", "liver", "thyroid"
    current_parameters: str = Form(...)  # JSON string of current parameters
):
    """Run a virtual test and return results"""
    try:
        # Parse current parameters
        params = json.loads(current_parameters)
        
        # Generate virtual test results
        if test_type == "comprehensive":
            test_results = PhysiologicalParameters.generate_virtual_lab_report(params)
        else:
            # Generate specific test panel
            test_results = {
                "test_type": test_type,
                "test_date": datetime.now().isoformat(),
                "results": PhysiologicalParameters.add_reference_ranges(params.get(test_type, {}), test_type)
            }
        
        return {
            "success": True,
            "test_type": test_type,
            "test_results": test_results,
            "message": f"Virtual {test_type} test completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run virtual test: {str(e)}")


@router.post("/run-simulation")
async def run_simulation(
    session_id: str = Form(...),
    baseline_parameters: str = Form(...),  # JSON string of baseline parameters
    intervention: str = Form(...),  # JSON string of intervention details
    duration_weeks: int = Form(...)
):
    """Run a comprehensive simulation with detailed physiological modeling"""
    try:
        # Parse parameters
        baseline = json.loads(baseline_parameters)
        intervention_data = json.loads(intervention)
        
        # Simulate parameter changes over time
        projected_params = PhysiologicalParameters.simulate_parameter_changes(
            baseline, intervention_data, duration_weeks
        )
        
        # Generate before and after lab reports
        baseline_report = PhysiologicalParameters.generate_virtual_lab_report(baseline)
        projected_report = PhysiologicalParameters.generate_virtual_lab_report(projected_params)
        
        # Calculate improvements and changes
        improvements = calculate_improvements(baseline, projected_params)
        
        # Generate recommendations based on results
        recommendations = generate_recommendations(
            baseline, projected_params, intervention_data
        )
        
        # Generate AI recommendations based on simulation results
        simulation_prompt = f"""
        Analyze the following simulation results and provide comprehensive recommendations:
        
        Simulation Duration: {duration_weeks} weeks
        Intervention: {json.dumps(intervention_data, indent=2)}
        
        Baseline Health: {json.dumps(baseline, indent=2)}
        Projected Health: {json.dumps(projected_params, indent=2)}
        Improvements: {', '.join(improvements) if improvements else 'None'}
        
        Please provide:
        1. **Simulation Analysis**: Assessment of the intervention's effectiveness
        2. **Risk Assessment**: Any potential risks or side effects to monitor
        3. **Optimization Suggestions**: How to improve the intervention
        4. **Monitoring Plan**: What parameters to track and how often
        5. **Long-term Considerations**: Sustainability and maintenance strategies
        6. **Healthcare Provider Discussion Points**: What to discuss with medical professionals
        
        Focus on evidence-based insights and actionable next steps.
        """
        
        try:
            ai_simulation_recommendations = run_medical_agent(
                session_id=session_id,
                user_text=simulation_prompt,
                context_report=None
            )
        except Exception as e:
            ai_simulation_recommendations = f"Unable to generate AI simulation recommendations: {str(e)}"
        
        # Save simulation result
        with get_session() as db:
            simulation_result = SimulationResult(
                session_id=session_id,
                scenario_id=0,  # Custom simulation
                baseline_health=json.dumps(baseline),
                projected_health=json.dumps(projected_params),
                improvements=json.dumps(improvements),
                recommendations=json.dumps(recommendations),
                risks=json.dumps([]),  # Will be populated based on intervention
                created_at=datetime.utcnow()
            )
            db.add(simulation_result)
            db.commit()
            db.refresh(simulation_result)
        
        return {
            "success": True,
            "result_id": simulation_result.id,
            "baseline_report": baseline_report,
            "projected_report": projected_report,
            "improvements": improvements,
            "recommendations": recommendations,
            "ai_simulation_recommendations": ai_simulation_recommendations,
            "simulation_duration": f"{duration_weeks} weeks",
            "message": "Simulation completed successfully with AI analysis"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run simulation: {str(e)}")


@router.post("/run-simulation-with-csv")
async def run_simulation_with_csv(
    session_id: str = Form(...),
    baseline_parameters: str = Form(...),  # JSON string of baseline parameters
    csv_file: UploadFile = File(...),
    duration_weeks: int = Form(...)
):
    """Run a simulation using CSV data to track progression over weeks"""
    try:
        # Parse baseline parameters
        baseline = json.loads(baseline_parameters)
        
        # Read and parse CSV file
        content = await csv_file.read()
        csv_content = content.decode('utf-8')
        
        # Parse CSV data
        import csv
        from io import StringIO
        
        csv_data = []
        csv_reader = csv.DictReader(StringIO(csv_content))
        
        for row in csv_reader:
            # Convert string values to appropriate types
            processed_row = {}
            for key, value in row.items():
                if value.strip() == '':
                    processed_row[key] = None
                elif value.lower() in ['true', 'false']:
                    processed_row[key] = value.lower() == 'true'
                elif '.' in value and value.replace('.', '').replace('-', '').isdigit():
                    try:
                        processed_row[key] = float(value)
                    except ValueError:
                        processed_row[key] = value
                elif value.replace('-', '').isdigit():
                    try:
                        processed_row[key] = int(value)
                    except ValueError:
                        processed_row[key] = value
                else:
                    processed_row[key] = value
            csv_data.append(processed_row)
        
        if not csv_data:
            raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
        
        # Generate weekly progression data
        weekly_progression = []
        current_params = baseline.copy()
        
        for week in range(1, duration_weeks + 1):
            # Find corresponding CSV data for this week
            week_data = None
            for row in csv_data:
                if row.get('week') == week or row.get('week_number') == week:
                    week_data = row
                    break
            
            if week_data:
                # Apply weekly changes from CSV with proper parameter mapping
                current_params = apply_weekly_changes_from_csv(current_params, week_data)
            
            # Generate weekly report
            weekly_report = PhysiologicalParameters.generate_virtual_lab_report(current_params)
            
            weekly_progression.append({
                "week": week,
                "parameters": current_params.copy(),
                "lab_report": weekly_report,
                "changes_from_baseline": calculate_weekly_changes(baseline, current_params)
            })
        
        # Calculate overall improvements
        final_params = weekly_progression[-1]["parameters"]
        improvements = calculate_improvements(baseline, final_params)
        
        # Generate recommendations
        recommendations = generate_recommendations(baseline, final_params, {"csv_based": True})
        
        # Generate AI analysis of the progression
        progression_prompt = f"""
        Analyze the following health progression over {duration_weeks} weeks based on CSV data:
        
        Baseline Health: {json.dumps(baseline, indent=2)}
        Final Health: {json.dumps(final_params, indent=2)}
        Weekly Progression: {json.dumps(weekly_progression, indent=2)}
        
        Please provide:
        1. **Progression Analysis**: How health parameters changed over time
        2. **Trend Identification**: Positive and negative trends
        3. **Effectiveness Assessment**: How well the intervention worked
        4. **Risk Assessment**: Any concerning patterns or values
        5. **Optimization Suggestions**: How to improve the intervention
        6. **Maintenance Recommendations**: How to sustain improvements
        
        Focus on evidence-based insights and actionable recommendations.
        """
        
        try:
            ai_progression_analysis = run_medical_agent(
                session_id=session_id,
                user_text=progression_prompt,
                context_report=None
            )
        except Exception as e:
            ai_progression_analysis = f"Unable to generate AI progression analysis: {str(e)}"
        
        # Save simulation result
        with get_session() as db:
            simulation_result = SimulationResult(
                session_id=session_id,
                scenario_id=0,  # CSV-based simulation
                baseline_health=json.dumps(baseline),
                projected_health=json.dumps(final_params),
                improvements=json.dumps(improvements),
                recommendations=json.dumps(recommendations),
                risks=json.dumps([]),
                created_at=datetime.utcnow()
            )
            db.add(simulation_result)
            db.commit()
            db.refresh(simulation_result)
        
        return {
            "success": True,
            "result_id": simulation_result.id,
            "weekly_progression": weekly_progression,
            "baseline_report": weekly_progression[0]["lab_report"],
            "final_report": weekly_progression[-1]["lab_report"],
            "improvements": improvements,
            "recommendations": recommendations,
            "ai_progression_analysis": ai_progression_analysis,
            "simulation_duration": f"{duration_weeks} weeks",
            "message": "CSV-based simulation completed successfully with weekly progression tracking"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run CSV-based simulation: {str(e)}")


def apply_weekly_changes_from_csv(current_params: Dict[str, Any], week_data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply weekly changes from CSV data to current parameters with proper mapping"""
    updated_params = current_params.copy()
    
    # Map CSV columns to health parameter categories
    csv_mapping = {
        # Vital signs
        "heart_rate": ("vitals", "heart_rate"),
        "blood_pressure_systolic": ("vitals", "blood_pressure_systolic"),
        "blood_pressure_diastolic": ("vitals", "blood_pressure_diastolic"),
        
        # Metabolic parameters
        "glucose_fasting": ("metabolic", "glucose_fasting"),
        "hba1c": ("metabolic", "hba1c"),
        
        # Lipid parameters
        "ldl": ("lipids", "ldl"),
        "hdl": ("lipids", "hdl"),
        
        # Lifestyle parameters
        "exercise_frequency": ("lifestyle", "exercise_frequency"),
        "weight_kg": ("physical", "weight_kg"),
        
        # Additional parameters that might be in CSV
        "respiratory_rate": ("vitals", "respiratory_rate"),
        "body_temperature": ("vitals", "body_temperature"),
        "oxygen_saturation": ("vitals", "oxygen_saturation"),
        "hemoglobin": ("cbc", "hemoglobin"),
        "white_blood_cells": ("cbc", "white_blood_cells"),
        "platelets": ("cbc", "platelets"),
        "red_blood_cells": ("cbc", "red_blood_cells"),
        "glucose_random": ("metabolic", "glucose_random"),
        "creatinine": ("metabolic", "creatinine"),
        "bun": ("metabolic", "bun"),
        "sodium": ("metabolic", "sodium"),
        "potassium": ("metabolic", "potassium"),
        "chloride": ("metabolic", "chloride"),
        "bicarbonate": ("metabolic", "bicarbonate"),
        "total_cholesterol": ("lipids", "total_cholesterol"),
        "triglycerides": ("lipids", "triglycerides"),
        "alt": ("liver", "alt"),
        "ast": ("liver", "ast"),
        "bilirubin": ("liver", "bilirubin"),
        "albumin": ("liver", "albumin"),
        "tsh": ("thyroid", "tsh"),
        "t3": ("thyroid", "t3"),
        "t4": ("thyroid", "t4"),
        "diet_carbs_percent": ("lifestyle", "diet_carbs_percent"),
        "diet_fats_percent": ("lifestyle", "diet_fats_percent"),
        "diet_protein_percent": ("lifestyle", "diet_protein_percent"),
        "calorie_intake": ("lifestyle", "calorie_intake"),
        "exercise_duration": ("lifestyle", "exercise_duration"),
        "sleep_duration": ("lifestyle", "sleep_duration"),
        "sleep_quality": ("lifestyle", "sleep_quality"),
        "stress_level": ("lifestyle", "stress_level"),
        "smoking_status": ("lifestyle", "smoking_status"),
        "alcohol_consumption": ("lifestyle", "alcohol_consumption")
    }
    
    # Apply changes from CSV data
    for csv_column, value in week_data.items():
        if csv_column in csv_mapping and value is not None:
            category, param_name = csv_mapping[csv_column]
            
            # Ensure the category exists in parameters
            if category not in updated_params:
                updated_params[category] = {}
            
            # Update the parameter value
            if isinstance(value, (int, float)):
                updated_params[category][param_name] = value
            elif isinstance(value, str) and value.startswith(('+', '-')):
                # Handle relative changes like "+5" or "-2"
                try:
                    current_val = updated_params[category].get(param_name, 0)
                    change = float(value)
                    updated_params[category][param_name] = current_val + change
                except ValueError:
                    pass
    
    # Recalculate BMI if weight changed
    if "weight_kg" in week_data and "height_cm" in updated_params.get("physical", {}):
        weight_kg = updated_params["physical"]["weight_kg"]
        height_cm = updated_params["physical"]["height_cm"]
        height_m = height_cm / 100
        updated_params["physical"]["bmi"] = round(weight_kg / (height_m ** 2), 1)
    
    return updated_params


def calculate_weekly_changes(baseline: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate changes from baseline for a specific week"""
    changes = {}
    
    for category in ['vitals', 'cbc', 'metabolic', 'lipids', 'liver', 'thyroid']:
        if category in baseline and category in current:
            changes[category] = {}
            for param in baseline[category]:
                if param in current[category]:
                    baseline_val = baseline[category][param]
                    current_val = current[category][param]
                    if isinstance(baseline_val, (int, float)) and isinstance(current_val, (int, float)):
                        absolute_change = current_val - baseline_val
                        relative_change = (absolute_change / baseline_val * 100) if baseline_val != 0 else 0
                        changes[category][param] = {
                            "baseline": baseline_val,
                            "current": current_val,
                            "absolute_change": round(absolute_change, 2),
                            "relative_change": round(relative_change, 1)
                        }
    
    return changes


@router.get("/scenarios")
async def get_predefined_scenarios():
    """Get predefined simulation scenarios with detailed parameters"""
    predefined_scenarios = [
        {
            "id": "1",
            "name": "Cardiovascular Health Optimization",
            "description": "Comprehensive cardiovascular improvement program",
            "interventions": {
                "exercise": {
                    "type": "aerobic",
                    "intensity": "moderate",
                    "duration_minutes": 45,
                    "frequency_per_week": 5
                },
                "diet": {
                    "type": "mediterranean",
                    "sodium_reduction": "moderate",
                    "fiber_increase": "significant"
                },
                "lifestyle": {
                    "stress_management": "daily_meditation",
                    "sleep_optimization": "consistent_schedule"
                }
            },
            "duration_weeks": 12,
            "expected_outcomes": [
                "Blood pressure reduction: 8-15 mmHg systolic",
                "LDL cholesterol reduction: 15-25%",
                "HDL cholesterol increase: 8-15%",
                "Improved cardiovascular fitness",
                "Better stress management"
            ],
            "risk_level": "low",
            "is_custom": False
        },
        {
            "id": "2",
            "name": "Metabolic Syndrome Management",
            "description": "Comprehensive approach to metabolic health",
            "interventions": {
                "diet": {
                    "type": "low_carb",
                    "calorie_restriction": "moderate",
                    "meal_timing": "intermittent_fasting"
                },
                "exercise": {
                    "type": "strength_training",
                    "intensity": "moderate",
                    "duration_minutes": 30,
                    "frequency_per_week": 4
                },
                "medication": {
                    "name": "metformin",
                    "dose": "standard",
                    "frequency": "twice_daily"
                }
            },
            "duration_weeks": 16,
            "expected_outcomes": [
                "Fasting glucose reduction: 15-25 mg/dL",
                "HbA1c reduction: 0.5-1.2%",
                "Weight reduction: 5-10%",
                "Improved insulin sensitivity",
                "Better lipid profile"
            ],
            "risk_level": "medium",
            "is_custom": False
        },
        {
            "id": "3",
            "name": "Anti-Aging & Longevity",
            "description": "Comprehensive wellness optimization program",
            "interventions": {
                "diet": {
                    "type": "calorie_restriction",
                    "antioxidant_rich": True,
                    "omega3_increase": "significant"
                },
                "exercise": {
                    "type": "mixed",
                    "intensity": "varied",
                    "duration_minutes": 60,
                    "frequency_per_week": 6
                },
                "lifestyle": {
                    "sleep_optimization": "optimal_duration",
                    "stress_management": "comprehensive",
                    "social_connection": "enhanced"
                },
                "supplements": {
                    "vitamin_d": "2000_IU",
                    "omega3": "2000_mg",
                    "antioxidants": "comprehensive"
                }
            },
            "duration_weeks": 24,
            "expected_outcomes": [
                "Improved cellular health markers",
                "Enhanced cognitive function",
                "Better sleep quality",
                "Reduced inflammation markers",
                "Improved energy levels",
                "Enhanced immune function"
            ],
            "risk_level": "low",
            "is_custom": False
        }
    ]
    
    return {
        "success": True,
        "scenarios": predefined_scenarios
    }


@router.post("/create-custom-scenario")
async def create_custom_scenario(
    session_id: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    intervention: str = Form(...),  # JSON string of intervention details
    duration_weeks: int = Form(...),
    expected_outcomes: str = Form(...),  # JSON string of expected outcomes
    risk_level: str = Form(...)
):
    """Create a custom simulation scenario"""
    try:
        intervention_data = json.loads(intervention)
        outcomes = json.loads(expected_outcomes)
        
        with get_session() as db:
            custom_scenario = SimulationScenario(
                session_id=session_id,
                name=name,
                description=description,
                treatment=json.dumps(intervention_data),
                duration=f"{duration_weeks} weeks",
                expected_outcome=json.dumps(outcomes),
                risk_level=risk_level,
                is_custom=True,
                created_at=datetime.utcnow()
            )
            db.add(custom_scenario)
            db.commit()
            db.refresh(custom_scenario)
            
        return {
            "success": True,
            "scenario_id": custom_scenario.id,
            "message": "Custom scenario created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create custom scenario: {str(e)}")


@router.get("/reports/{session_id}")
async def get_medical_reports(session_id: str):
    """Get all medical reports for a session"""
    try:
        with get_session() as db:
            reports = db.exec(
                select(MedicalReport)
                .where(MedicalReport.session_id == session_id)
                .order_by(MedicalReport.upload_date.desc())
            ).all()
        
        return {
            "success": True,
            "reports": [
                {
                    "id": report.id,
                    "filename": report.filename,
                    "file_type": report.file_type,
                    "upload_date": report.upload_date.isoformat(),
                    "content_preview": report.content[:200] + "..." if len(report.content) > 200 else report.content
                }
                for report in reports
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(e)}")


@router.get("/simulation-results/{session_id}")
async def get_simulation_results(session_id: str):
    """Get all simulation results for a session"""
    try:
        with get_session() as db:
            results = db.exec(
                select(SimulationResult)
                .where(SimulationResult.session_id == session_id)
                .order_by(SimulationResult.created_at.desc())
            ).all()
            
        return {
            "success": True,
            "results": [
                {
                    "id": result.id,
                    "scenario_id": result.scenario_id,
                    "baseline_health": json.loads(result.baseline_health),
                    "projected_health": json.loads(result.projected_health),
                    "improvements": json.loads(result.improvements),
                    "recommendations": json.loads(result.recommendations),
                    "risks": json.loads(result.risks),
                    "created_at": result.created_at.isoformat()
                }
                for result in results
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch simulation results: {str(e)}")


@router.delete("/delete-report/{report_id}")
async def delete_medical_report(report_id: int):
    """Delete a medical report"""
    try:
        with get_session() as db:
            report = db.get(MedicalReport, report_id)
            if not report:
                raise HTTPException(status_code=404, detail="Report not found")
            
            db.delete(report)
            db.commit()
            
        return {
            "success": True,
            "message": "Report deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")


@router.delete("/delete-simulation/{result_id}")
async def delete_simulation_result(result_id: int):
    """Delete a simulation result"""
    try:
        with get_session() as db:
            result = db.get(SimulationResult, result_id)
            if not result:
                raise HTTPException(status_code=404, detail="Simulation result not found")
            
            db.delete(result)
            db.commit()
            
        return {
            "success": True,
            "message": "Simulation result deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete simulation result: {str(e)}") 


# Helper methods for the PhysiologicalParameters class
def calculate_improvements(baseline: Dict[str, Any], projected: Dict[str, Any]) -> List[str]:
    """Calculate improvements between baseline and projected parameters"""
    improvements = []
    
    # Vital signs improvements
    if projected.get("vitals", {}).get("blood_pressure_systolic", 0) < baseline.get("vitals", {}).get("blood_pressure_systolic", 0):
        reduction = baseline["vitals"]["blood_pressure_systolic"] - projected["vitals"]["blood_pressure_systolic"]
        improvements.append(f"Blood pressure reduced by {reduction} mmHg systolic")
    
    if projected.get("vitals", {}).get("blood_pressure_diastolic", 0) < baseline.get("vitals", {}).get("blood_pressure_diastolic", 0):
        reduction = baseline["vitals"]["blood_pressure_diastolic"] - projected["vitals"]["blood_pressure_diastolic"]
        improvements.append(f"Blood pressure reduced by {reduction} mmHg diastolic")
    
    # Metabolic improvements
    if projected.get("metabolic", {}).get("glucose_fasting", 0) < baseline.get("metabolic", {}).get("glucose_fasting", 0):
        reduction = baseline["metabolic"]["glucose_fasting"] - projected["metabolic"]["glucose_fasting"]
        improvements.append(f"Fasting glucose reduced by {reduction} mg/dL")
    
    if projected.get("metabolic", {}).get("hba1c", 0) < baseline.get("metabolic", {}).get("hba1c", 0):
        reduction = baseline["metabolic"]["hba1c"] - projected["metabolic"]["hba1c"]
        improvements.append(f"HbA1c reduced by {reduction:.1f}%")
    
    # Lipid improvements
    if projected.get("lipids", {}).get("ldl", 0) < baseline.get("lipids", {}).get("ldl", 0):
        reduction = baseline["lipids"]["ldl"] - projected["lipids"]["ldl"]
        improvements.append(f"LDL cholesterol reduced by {reduction} mg/dL")
    
    if projected.get("lipids", {}).get("hdl", 0) > baseline.get("lipids", {}).get("hdl", 0):
        increase = projected["lipids"]["hdl"] - baseline["lipids"]["hdl"]
        improvements.append(f"HDL cholesterol increased by {increase} mg/dL")
    
    return improvements


def generate_recommendations(baseline: Dict[str, Any], projected: Dict[str, Any], intervention: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on simulation results"""
    recommendations = []
    
    # Exercise recommendations
    if "exercise" in intervention:
        recommendations.append("Continue with the prescribed exercise program for optimal results")
        recommendations.append("Monitor heart rate and blood pressure during exercise")
        recommendations.append("Gradually increase intensity as fitness improves")
    
    # Diet recommendations
    if "diet" in intervention:
        recommendations.append("Maintain the dietary changes consistently")
        recommendations.append("Monitor portion sizes and meal timing")
        recommendations.append("Stay hydrated throughout the day")
    
    # Medication recommendations
    if "medication" in intervention:
        recommendations.append("Take medications as prescribed")
        recommendations.append("Monitor for any side effects")
        recommendations.append("Regular follow-up with healthcare provider")
    
    # Lifestyle recommendations
    if "lifestyle" in intervention:
        recommendations.append("Maintain consistent sleep schedule")
        recommendations.append("Practice stress management techniques regularly")
        recommendations.append("Stay socially connected and engaged")
    
    # General recommendations
    recommendations.append("Schedule regular health check-ups")
    recommendations.append("Track progress and maintain a health journal")
    recommendations.append("Celebrate improvements and stay motivated")
    
    return recommendations 


@router.post("/get-ai-recommendations")
async def get_ai_recommendations(
    session_id: str = Form(...),
    current_parameters: str = Form(...)  # JSON string of current parameters
):
    """Get AI-powered health recommendations based on current parameters"""
    try:
        # Parse current parameters
        params = json.loads(current_parameters)
        
        # Extract key information for the prompt
        age = params.get("lifestyle", {}).get("age", "Unknown")
        gender = params.get("lifestyle", {}).get("gender", "Unknown")
        bmi = params.get("physical", {}).get("bmi", "Unknown")
        medical_conditions = params.get("medical_conditions", [])
        
        # Create a comprehensive prompt for Gemini
        gemini_prompt = f"""
        As a medical AI assistant, analyze the following health parameters and provide personalized recommendations:
        
        Patient Profile:
        - Age: {age}
        - Gender: {gender}
        - BMI: {bmi}
        - Medical Conditions: {', '.join(medical_conditions) if medical_conditions else 'None'}
        
        Current Health Parameters:
        Vital Signs: {json.dumps(params.get('vitals', {}), indent=2)}
        Complete Blood Count: {json.dumps(params.get('cbc', {}), indent=2)}
        Comprehensive Metabolic Panel: {json.dumps(params.get('metabolic', {}), indent=2)}
        Lipid Profile: {json.dumps(params.get('lipids', {}), indent=2)}
        Liver Function: {json.dumps(params.get('liver', {}), indent=2)}
        Thyroid Function: {json.dumps(params.get('thyroid', {}), indent=2)}
        Lifestyle Factors: {json.dumps(params.get('lifestyle', {}), indent=2)}
        
        Please provide a comprehensive analysis including:
        
        1. **Overall Health Assessment**: Current health status and score
        2. **Risk Factor Analysis**: Identify specific health risks and their severity
        3. **Personalized Recommendations**: 
           - Lifestyle modifications (diet, exercise, sleep, stress management)
           - Preventive measures
           - Monitoring suggestions
        4. **Priority Actions**: What should be addressed first
        5. **Follow-up Timeline**: When to recheck parameters
        6. **Healthcare Provider Consultation**: When to seek medical advice
        
        Focus on:
        - Evidence-based recommendations
        - Actionable, specific advice
        - Risk stratification
        - Preventive health measures
        - Individualized approach based on the data provided
        
        Format your response in a clear, structured manner that patients can easily understand and act upon.
        """
        
        try:
            ai_recommendations = run_medical_agent(
                session_id=session_id,
                user_text=gemini_prompt,
                context_report=None
            )
        except Exception as e:
            ai_recommendations = f"Unable to generate AI recommendations: {str(e)}"
        
        return {
            "success": True,
            "session_id": session_id,
            "ai_recommendations": ai_recommendations,
            "analysis_timestamp": datetime.now().isoformat(),
            "message": "AI recommendations generated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI recommendations: {str(e)}") 


@router.post("/get-lab-report-recommendations")
async def get_lab_report_recommendations(
    session_id: str = Form(...),
    lab_report: str = Form(...)  # JSON string of lab report
):
    """Get AI-powered recommendations based on lab report interpretation"""
    try:
        # Parse lab report
        report = json.loads(lab_report)
        
        # Extract key information for the prompt
        patient_info = report.get("patient_info", {})
        interpretation = report.get("interpretation", {})
        
        # Create a comprehensive prompt for Gemini
        gemini_prompt = f"""
        As a medical AI assistant, analyze the following lab report and provide personalized recommendations:
        
        Lab Report Analysis:
        {json.dumps(report, indent=2)}
        
        Key Findings:
        - Overall Health Score: {interpretation.get('overall_health_score', 'Unknown')}
        - Risk Factors: {', '.join(interpretation.get('risk_factors', [])) if interpretation.get('risk_factors') else 'None'}
        - Current Recommendations: {', '.join(interpretation.get('recommendations', [])) if interpretation.get('recommendations') else 'None'}
        - Alerts: {', '.join(interpretation.get('alerts', [])) if interpretation.get('alerts') else 'None'}
        
        Please provide:
        
        1. **Comprehensive Health Assessment**: 
           - Overall health status interpretation
           - Critical values analysis
           - Trend analysis if applicable
        
        2. **Risk Stratification**: 
           - High, medium, low risk categorization
           - Specific risk factors and their implications
           - Preventive measures for each risk
        
        3. **Personalized Action Plan**:
           - Immediate actions (next 24-48 hours)
           - Short-term goals (1-4 weeks)
           - Long-term health strategies (3-12 months)
        
        4. **Lifestyle Modifications**:
           - Diet recommendations based on lab values
           - Exercise recommendations considering current health status
           - Sleep and stress management
           - Smoking/alcohol considerations
        
        5. **Monitoring and Follow-up**:
           - Which parameters to monitor most closely
           - Recommended testing frequency
           - Warning signs to watch for
        
        6. **Healthcare Provider Consultation**:
           - When to seek immediate medical attention
           - What to discuss with your doctor
           - Questions to ask during appointments
        
        7. **Educational Resources**:
           - Understanding your lab values
           - Health literacy improvements
        
        Focus on:
        - Evidence-based, actionable advice
        - Individualized recommendations based on the specific lab values
        - Clear, understandable language
        - Prioritized action items
        - Safety considerations and red flags
        
        Format your response in a structured, easy-to-follow manner.
        """
        
        try:
            ai_lab_recommendations = run_medical_agent(
                session_id=session_id,
                user_text=gemini_prompt,
                context_report=None
            )
        except Exception as e:
            ai_lab_recommendations = f"Unable to generate AI lab report recommendations: {str(e)}"
        
        return {
            "success": True,
            "session_id": session_id,
            "ai_lab_recommendations": ai_lab_recommendations,
            "analysis_timestamp": datetime.now().isoformat(),
            "lab_report_summary": {
                "health_score": interpretation.get('overall_health_score', 'Unknown'),
                "risk_factors": interpretation.get('risk_factors', []),
                "current_recommendations": interpretation.get('recommendations', []),
                "alerts": interpretation.get('alerts', [])
            },
            "message": "AI lab report recommendations generated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI lab report recommendations: {str(e)}") 


@router.post("/get-health-consultancy")
async def get_health_consultancy(
    session_id: str = Form(...),
    baseline_parameters: str = Form(...),
    consultation_type: str = Form("general"),
    specific_concerns: str = Form("[]"),
    current_symptoms: str = Form("[]"),
    goals: str = Form("[]")
):
    """Get AI-powered health consultancy based on baseline or detailed parameters"""
    try:
        # Parse parameters
        baseline = json.loads(baseline_parameters)
        concerns = json.loads(specific_concerns) if specific_concerns else []
        symptoms = json.loads(current_symptoms) if current_symptoms else []
        health_goals = json.loads(goals) if goals else []
        
        # Extract key information
        age = baseline.get("lifestyle", {}).get("age", "Unknown")
        gender = baseline.get("lifestyle", {}).get("gender", "Unknown")
        bmi = baseline.get("physical", {}).get("bmi", "Unknown")
        medical_conditions = baseline.get("medical_conditions", [])
        
        # Generate health assessment
        health_assessment = PhysiologicalParameters.generate_virtual_lab_report(baseline)
        health_score = health_assessment.get("interpretation", {}).get("overall_health_score", 0)
        
        # Create consultation prompt
        consultation_prompt = f"""
        As a medical AI consultant, provide comprehensive health consultation:
        
        Patient Profile: Age {age}, Gender {gender}, BMI {bmi}
        Medical Conditions: {', '.join(medical_conditions) if medical_conditions else 'None'}
        Consultation Type: {consultation_type}
        
        Health Parameters: {json.dumps(baseline, indent=2)}
        Specific Concerns: {', '.join(concerns) if concerns else 'None'}
        Current Symptoms: {', '.join(symptoms) if symptoms else 'None'}
        Health Goals: {', '.join(health_goals) if health_goals else 'None'}
        
        Please provide:
        
        1. Personalized recommendations for {consultation_type} focus and  understund what is the current health status of the patient with thier concerns and goals.
        2. Specific lifestyle modifications
        3. what medicine to take if required.
        
        
        Focus on actionable, evidence-based advice.
        """
        
        try:
            ai_consultation = run_medical_agent(
                session_id=session_id,
                user_text=consultation_prompt,
                context_report=None
            )
        except Exception as e:
            ai_consultation = f"Unable to generate AI consultation: {str(e)}"
        
        return {
            "success": True,
            "session_id": session_id,
            "consultation_type": consultation_type,
            "health_score": health_score,
            "ai_consultation": ai_consultation,
            "consultation_timestamp": datetime.now().isoformat(),
            "message": f"AI health consultation completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate health consultation: {str(e)}")


def generate_consultation_summary(baseline: Dict[str, Any], health_assessment: Dict[str, Any], consultation_type: str) -> Dict[str, Any]:
    """Generate summary insights for the consultation"""
    summary = {
        "key_metrics": {},
        "risk_factors": [],
        "strengths": [],
        "immediate_actions": [],
        "consultation_focus": consultation_type
    }
    
    # Analyze key metrics
    vitals = baseline.get("vitals", {})
    metabolic = baseline.get("metabolic", {})
    lipids = baseline.get("lipids", {})
    
    # Blood pressure analysis
    if vitals.get("blood_pressure_systolic", 0) > 140:
        summary["risk_factors"].append("Elevated systolic blood pressure")
        summary["immediate_actions"].append("Monitor blood pressure daily")
    elif vitals.get("blood_pressure_systolic", 0) < 120:
        summary["strengths"].append("Normal blood pressure")
    
    # Glucose analysis
    if metabolic.get("glucose_fasting", 0) > 100:
        summary["risk_factors"].append("Elevated fasting glucose")
        summary["immediate_actions"].append("Focus on carbohydrate management")
    elif metabolic.get("glucose_fasting", 0) < 90:
        summary["strengths"].append("Healthy glucose levels")
    
    # Lipid analysis
    if lipids.get("ldl", 0) > 100:
        summary["risk_factors"].append("Elevated LDL cholesterol")
        summary["immediate_actions"].append("Implement heart-healthy diet")
    elif lipids.get("hdl", 0) > 50:
        summary["strengths"].append("Good HDL cholesterol")
    
    # Lifestyle analysis
    lifestyle = baseline.get("lifestyle", {})
    if lifestyle.get("exercise_frequency", 0) < 3:
        summary["risk_factors"].append("Insufficient physical activity")
        summary["immediate_actions"].append("Start with 3 days/week exercise")
    elif lifestyle.get("exercise_frequency", 0) >= 5:
        summary["strengths"].append("Regular exercise routine")
    
    if lifestyle.get("sleep_duration", 0) < 7:
        summary["risk_factors"].append("Insufficient sleep")
        summary["immediate_actions"].append("Aim for 7-9 hours sleep")
    
    return summary


def generate_next_steps(consultation_type: str, health_score: int) -> List[str]:
    """Generate next steps based on consultation type and health score"""
    next_steps = []
    
    if consultation_type == "general":
        next_steps.extend([
            "Review consultation recommendations",
            "Implement priority lifestyle changes",
            "Schedule follow-up consultation in 2-4 weeks"
        ])
    elif consultation_type == "lifestyle":
        next_steps.extend([
            "Start with one lifestyle change this week",
            "Track progress in a health journal",
            "Gradually add more changes over time"
        ])
    elif consultation_type == "nutrition":
        next_steps.extend([
            "Plan meals for the upcoming week",
            "Create a shopping list",
            "Start with one dietary change"
        ])
    elif consultation_type == "exercise":
        next_steps.extend([
            "Begin with light exercise routine",
            "Focus on consistency over intensity",
            "Monitor how your body responds"
        ])
    elif consultation_type == "comprehensive":
        next_steps.extend([
            "Review all recommendations thoroughly",
            "Create a personalized action plan",
            "Set specific, measurable goals",
            "Schedule regular progress reviews"
        ])
    
    # Add health score specific recommendations
    if health_score < 50:
        next_steps.append("Consider consulting healthcare provider soon")
    elif health_score < 70:
        next_steps.append("Focus on high-impact lifestyle changes")
    else:
        next_steps.append("Maintain current healthy habits")
    
    return next_steps


@router.post("/predict-medication-impact")
async def predict_medication_impact(
    session_id: str = Form(...),
    baseline_parameters: str = Form(...),  # JSON string of baseline parameters
    medication_name: str = Form(...),
    patient_profile: str = Form(...)  # JSON string with age, gender, medical_conditions, height_cm, weight_kg
):
    """Predict medication impact on health parameters using AI analysis based on population data"""
    try:
        # Parse parameters
        baseline = json.loads(baseline_parameters)
        profile = json.loads(patient_profile)
        
        # Extract patient information
        age = profile.get("age", "Unknown")
        gender = profile.get("gender", "Unknown")
        medical_conditions = profile.get("medical_conditions", [])
        height_cm = profile.get("height_cm", "Unknown")
        weight_kg = profile.get("weight_kg", "Unknown")
        
        # Calculate BMI if height and weight are available
        bmi = "Unknown"
        if height_cm != "Unknown" and weight_kg != "Unknown":
            height_m = float(height_cm) / 100
            bmi = round(float(weight_kg) / (height_m ** 2), 1)
        
        # Simulate medication effects based on known pharmacological profiles
        predicted_changes = simulate_medication_effects(baseline, medication_name, profile)
        
        # Create comprehensive AI prompt for medication analysis
        medication_prompt = f"""
        As a medical AI specialist with access to large population clinical data, analyze the potential impact of {medication_name} on this patient's health parameters:
        
        **Patient Profile:**
        - Age: {age}
        - Gender: {gender}
        - BMI: {bmi}
        - Medical Conditions: {', '.join(medical_conditions) if medical_conditions else 'None'}
        
        **Current Health Parameters:**
        Vital Signs: {json.dumps(baseline.get('vitals', {}), indent=2)}
        Complete Blood Count: {json.dumps(baseline.get('cbc', {}), indent=2)}
        Metabolic Panel: {json.dumps(baseline.get('metabolic', {}), indent=2)}
        Lipid Profile: {json.dumps(baseline.get('lipids', {}), indent=2)}
        Liver Function: {json.dumps(baseline.get('liver', {}), indent=2)}
        Thyroid Function: {json.dumps(baseline.get('thyroid', {}), indent=2)}
        
        **Medication:** {medication_name}
        
        Based on large population clinical data, clinical trials, and medical literature, please provide:
        
        1. **Mechanism of Action**: How {medication_name} works in the body
        
        2. **Expected Parameter Changes**: 
           - Which lab values are likely to change and by how much
           - Timeline for expected changes
           - Dose-dependent effects
        
        3. **Population-Based Predictions**:
           - Expected response rates in similar patient populations
           - Typical magnitude of effects
           - Variability in response
        
        4. **Patient-Specific Considerations**:
           - How age, gender, BMI, and existing conditions affect response
           - Potential interactions with current health status
           - Personalized risk assessment
        
        5. **Monitoring Requirements**:
           - Which parameters to monitor most closely
           - Recommended monitoring frequency
           - Warning signs to watch for
        
        6. **Side Effects & Precautions**:
           - Common side effects and their likelihood
           - Serious adverse effects to monitor
           - Contraindications and precautions
        
        7. **Optimization Strategies**:
           - How to maximize therapeutic benefit
           - Lifestyle modifications that enhance effectiveness
           - Timing and dosing considerations
        
        8. **Expected Timeline**:
           - When to expect initial effects
           - Time to maximum benefit
           - Long-term considerations
        
        Focus on:
        - Evidence-based predictions from clinical data
        - Population statistics and response rates
        - Individualized assessment for this patient
        - Practical monitoring and safety guidance
        - Clear, actionable information
        
        Provide specific numerical predictions where possible (e.g., "typically reduces LDL by 25-40% in 6-8 weeks").
        """
        
        try:
            ai_analysis = run_medical_agent(
                session_id=session_id,
                user_text=medication_prompt,
                context_report=None
            )
        except Exception as e:
            ai_analysis = f"Unable to generate AI medication analysis: {str(e)}"
        
        return {
            "success": True,
            "session_id": session_id,
            "medication_name": medication_name,
            "patient_profile": profile,
            "parameter_changes": predicted_changes,
            "ai_analysis": ai_analysis,
            "prediction_timestamp": datetime.now().isoformat(),
            "confidence_level": "Based on population data and clinical evidence",
            "message": f"Medication impact prediction for {medication_name} completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to predict medication impact: {str(e)}")


def simulate_medication_effects(baseline: Dict[str, Any], medication_name: str, patient_profile: Dict[str, Any]) -> Dict[str, Any]:
    """Simulate medication effects on health parameters based on known pharmacological profiles"""
    
    # Get baseline values
    vitals = baseline.get("vitals", {})
    metabolic = baseline.get("metabolic", {})
    lipids = baseline.get("lipids", {})
    liver = baseline.get("liver", {})
    
    # Initialize parameter changes dictionary
    changes = {}
    
    # Normalize medication name for analysis
    med_name_lower = medication_name.lower()
    
    # Statins (cholesterol medications)
    if any(statin in med_name_lower for statin in ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin", "statin"]):
        if "total_cholesterol" in lipids:
            baseline_chol = lipids["total_cholesterol"]
            predicted_chol = max(baseline_chol * 0.7, baseline_chol - 60)  # 20-30% reduction
            changes["total_cholesterol"] = {
                "before": baseline_chol,
                "after": round(predicted_chol, 1),
                "unit": "mg/dL",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_chol - predicted_chol) / baseline_chol * 100, 1)}%",
                "confidence": 85
            }
        
        if "ldl" in lipids:
            baseline_ldl = lipids["ldl"]
            predicted_ldl = max(baseline_ldl * 0.6, baseline_ldl - 50)  # 30-40% reduction
            changes["ldl_cholesterol"] = {
                "before": baseline_ldl,
                "after": round(predicted_ldl, 1),
                "unit": "mg/dL",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_ldl - predicted_ldl) / baseline_ldl * 100, 1)}%",
                "confidence": 90
            }
            
        # Potential liver enzyme elevation
        if "alt" in liver:
            baseline_alt = liver["alt"]
            predicted_alt = min(baseline_alt * 1.2, baseline_alt + 10)  # Slight increase possible
            changes["alt"] = {
                "before": baseline_alt,
                "after": round(predicted_alt, 1),
                "unit": "U/L",
                "direction": "positive",
                "percentage_change": f"+{round((predicted_alt - baseline_alt) / baseline_alt * 100, 1)}%",
                "confidence": 70
            }
    
    # ACE Inhibitors (blood pressure medications)
    elif any(ace in med_name_lower for ace in ["lisinopril", "enalapril", "captopril", "ramipril", "benazepril", "pril"]):
        if "blood_pressure_systolic" in vitals:
            baseline_sys = vitals["blood_pressure_systolic"]
            predicted_sys = max(baseline_sys - 15, 110)  # 10-20 mmHg reduction
            changes["blood_pressure_systolic"] = {
                "before": baseline_sys,
                "after": round(predicted_sys, 1),
                "unit": "mmHg",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_sys - predicted_sys) / baseline_sys * 100, 1)}%",
                "confidence": 85
            }
            
        if "blood_pressure_diastolic" in vitals:
            baseline_dia = vitals["blood_pressure_diastolic"]
            predicted_dia = max(baseline_dia - 10, 70)  # 5-10 mmHg reduction
            changes["blood_pressure_diastolic"] = {
                "before": baseline_dia,
                "after": round(predicted_dia, 1),
                "unit": "mmHg",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_dia - predicted_dia) / baseline_dia * 100, 1)}%",
                "confidence": 85
            }
        
        # Potential slight potassium increase
        if "potassium" in metabolic:
            baseline_k = metabolic["potassium"]
            predicted_k = min(baseline_k + 0.3, 5.0)
            changes["potassium"] = {
                "before": baseline_k,
                "after": round(predicted_k, 1),
                "unit": "mEq/L",
                "direction": "positive",
                "percentage_change": f"+{round((predicted_k - baseline_k) / baseline_k * 100, 1)}%",
                "confidence": 75
            }
    
    # Metformin (diabetes medication)
    elif any(met in med_name_lower for met in ["metformin", "glucophage"]):
        if "glucose_fasting" in metabolic:
            baseline_glucose = metabolic["glucose_fasting"]
            predicted_glucose = max(baseline_glucose * 0.8, baseline_glucose - 30)  # 15-25% reduction
            changes["glucose_fasting"] = {
                "before": baseline_glucose,
                "after": round(predicted_glucose, 1),
                "unit": "mg/dL",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_glucose - predicted_glucose) / baseline_glucose * 100, 1)}%",
                "confidence": 90
            }
            
        if "hba1c" in metabolic:
            baseline_a1c = metabolic["hba1c"]
            predicted_a1c = max(baseline_a1c - 0.8, 5.0)  # 0.5-1.2% reduction
            changes["hba1c"] = {
                "before": baseline_a1c,
                "after": round(predicted_a1c, 1),
                "unit": "%",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_a1c - predicted_a1c) / baseline_a1c * 100, 1)}%",
                "confidence": 85
            }
    
    # Beta Blockers (heart rate and blood pressure)
    elif any(beta in med_name_lower for beta in ["metoprolol", "atenolol", "propranolol", "carvedilol", "olol"]):
        if "heart_rate" in vitals:
            baseline_hr = vitals["heart_rate"]
            predicted_hr = max(baseline_hr - 15, 55)  # 10-20 bpm reduction
            changes["heart_rate"] = {
                "before": baseline_hr,
                "after": round(predicted_hr, 1),
                "unit": "BPM",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_hr - predicted_hr) / baseline_hr * 100, 1)}%",
                "confidence": 90
            }
            
        if "blood_pressure_systolic" in vitals:
            baseline_sys = vitals["blood_pressure_systolic"]
            predicted_sys = max(baseline_sys - 12, 110)  # 8-15 mmHg reduction
            changes["blood_pressure_systolic"] = {
                "before": baseline_sys,
                "after": round(predicted_sys, 1),
                "unit": "mmHg",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_sys - predicted_sys) / baseline_sys * 100, 1)}%",
                "confidence": 80
            }
    
    # Thyroid medications
    elif any(thyroid in med_name_lower for thyroid in ["levothyroxine", "synthroid", "armour"]):
        if "tsh" in baseline.get("thyroid", {}):
            baseline_tsh = baseline["thyroid"]["tsh"]
            predicted_tsh = 2.5  # Target normal range
            changes["tsh"] = {
                "before": baseline_tsh,
                "after": predicted_tsh,
                "unit": "μIU/mL",
                "direction": "normalize",
                "percentage_change": f"{round((predicted_tsh - baseline_tsh) / baseline_tsh * 100, 1)}%",
                "confidence": 85
            }
    
    # Diuretics
    elif any(diuretic in med_name_lower for diuretic in ["hydrochlorothiazide", "furosemide", "spironolactone", "thiazide"]):
        if "blood_pressure_systolic" in vitals:
            baseline_sys = vitals["blood_pressure_systolic"]
            predicted_sys = max(baseline_sys - 10, 110)
            changes["blood_pressure_systolic"] = {
                "before": baseline_sys,
                "after": round(predicted_sys, 1),
                "unit": "mmHg",
                "direction": "negative",
                "percentage_change": f"-{round((baseline_sys - predicted_sys) / baseline_sys * 100, 1)}%",
                "confidence": 80
            }
            
        # Potential electrolyte changes
        if "potassium" in metabolic:
            baseline_k = metabolic["potassium"]
            if "spironolactone" in med_name_lower:
                predicted_k = min(baseline_k + 0.4, 5.0)  # K-sparing
            else:
                predicted_k = max(baseline_k - 0.3, 3.5)  # K-wasting
            changes["potassium"] = {
                "before": baseline_k,
                "after": round(predicted_k, 1),
                "unit": "mEq/L",
                "direction": "positive" if "spironolactone" in med_name_lower else "negative",
                "percentage_change": f"{'+' if predicted_k > baseline_k else ''}{round((predicted_k - baseline_k) / baseline_k * 100, 1)}%",
                "confidence": 75
            }
    
    # If no specific medication pattern matched, provide general information
    if not changes:
        changes = {
            "general_note": {
                "message": f"Specific predictions for {medication_name} require more detailed pharmacological analysis. Please consult the AI analysis for comprehensive information.",
                "confidence": 50
            }
        }
    
    return changes 
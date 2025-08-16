"""
Health Scoring Service
Provides consistent health score calculations across the digital twin system
"""

from typing import Dict, Any, List, Tuple
import math
from dataclasses import dataclass
from enum import Enum


class HealthScoreCategory(Enum):
    """Health score categories with color coding and descriptions"""
    EXCELLENT = (90, 100, "excellent", "🟢", "Optimal health status")
    GOOD = (75, 89, "good", "🟡", "Good health with minor areas for improvement")
    FAIR = (60, 74, "fair", "🟠", "Moderate health concerns requiring attention")
    POOR = (40, 59, "poor", "🔴", "Significant health issues needing intervention")
    CRITICAL = (0, 39, "critical", "⚫", "Critical health status requiring immediate care")


@dataclass
class HealthScoreResult:
    """Comprehensive health score result"""
    overall_score: int
    category: HealthScoreCategory
    risk_factors: List[str]
    recommendations: List[str]
    alerts: List[str]
    strengths: List[str]
    detailed_breakdown: Dict[str, Dict[str, Any]]
    improvement_opportunities: List[str]
    next_review_date: str


class HealthScoringService:
    """Centralized health scoring service for consistent calculations"""
    
    # Scoring weights for different health categories
    CATEGORY_WEIGHTS = {
        "vitals": 0.25,        # 25% of total score
        "metabolic": 0.25,     # 25% of total score
        "lipids": 0.20,        # 20% of total score
        "lifestyle": 0.20,     # 20% of total score
        "cbc": 0.05,          # 5% of total score
        "liver": 0.03,        # 3% of total score
        "thyroid": 0.02       # 2% of total score
    }
    
    @staticmethod
    def calculate_overall_health_score(parameters: Dict[str, Any]) -> HealthScoreResult:
        """Calculate comprehensive health score with detailed breakdown"""
        
        # Initialize scoring components
        category_scores = {}
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        detailed_breakdown = {}
        
        # Calculate scores for each category
        for category, weight in HealthScoringService.CATEGORY_WEIGHTS.items():
            if category in parameters:
                category_score, category_details = HealthScoringService._score_category(
                    category, parameters[category], parameters
                )
                category_scores[category] = category_score
                detailed_breakdown[category] = category_details
                
                # Collect insights from category scoring
                risk_factors.extend(category_details.get("risk_factors", []))
                recommendations.extend(category_details.get("recommendations", []))
                alerts.extend(category_details.get("alerts", []))
                strengths.extend(category_details.get("strengths", []))
        
        # Calculate weighted overall score
        overall_score = 0
        total_weight = 0
        
        for category, score in category_scores.items():
            weight = HealthScoringService.CATEGORY_WEIGHTS[category]
            overall_score += score * weight
            total_weight += weight
        
        if total_weight > 0:
            overall_score = round(overall_score / total_weight)
        
        # Ensure score is within bounds
        overall_score = max(0, min(100, overall_score))
        
        # Determine health category
        health_category = HealthScoringService._get_health_category(overall_score)
        
        # Generate improvement opportunities
        improvement_opportunities = HealthScoringService._generate_improvement_opportunities(
            detailed_breakdown, overall_score
        )
        
        # Calculate next review date based on score
        next_review_date = HealthScoringService._calculate_next_review_date(overall_score)
        
        return HealthScoreResult(
            overall_score=overall_score,
            category=health_category,
            risk_factors=list(set(risk_factors)),  # Remove duplicates
            recommendations=list(set(recommendations)),
            alerts=list(set(alerts)),
            strengths=list(set(strengths)),
            detailed_breakdown=detailed_breakdown,
            improvement_opportunities=improvement_opportunities,
            next_review_date=next_review_date
        )
    
    @staticmethod
    def _score_category(category: str, category_data: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score individual health category"""
        
        if category == "vitals":
            return HealthScoringService._score_vitals(category_data, all_parameters)
        elif category == "metabolic":
            return HealthScoringService._score_metabolic(category_data, all_parameters)
        elif category == "lipids":
            return HealthScoringService._score_lipids(category_data, all_parameters)
        elif category == "lifestyle":
            return HealthScoringService._score_lifestyle(category_data, all_parameters)
        elif category == "cbc":
            return HealthScoringService._score_cbc(category_data, all_parameters)
        elif category == "liver":
            return HealthScoringService._score_liver(category_data, all_parameters)
        elif category == "thyroid":
            return HealthScoringService._score_thyroid(category_data, all_parameters)
        else:
            return 100, {"score": 100, "risk_factors": [], "recommendations": [], "alerts": [], "strengths": []}
    
    @staticmethod
    def _get_health_category(score: int) -> HealthScoreCategory:
        """Determine health category based on score"""
        for category in HealthScoreCategory:
            if category.value[0] <= score <= category.value[1]:
                return category
        return HealthScoreCategory.CRITICAL
    
    @staticmethod
    def _score_vitals(vitals: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score vital signs"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # Blood pressure scoring
        systolic = vitals.get("blood_pressure_systolic", 120)
        diastolic = vitals.get("blood_pressure_diastolic", 80)
        
        # Systolic scoring
        if systolic <= 120:
            strengths.append("Optimal systolic blood pressure")
        elif systolic <= 129:
            pass  # No penalty for normal
        elif systolic <= 139:
            score -= 10
            risk_factors.append("Elevated systolic blood pressure")
            recommendations.append("Monitor blood pressure regularly")
        elif systolic <= 159:
            score -= 20
            risk_factors.append("High systolic blood pressure (Stage 1)")
            alerts.append("Consider lifestyle modifications")
        elif systolic <= 179:
            score -= 35
            risk_factors.append("High systolic blood pressure (Stage 2)")
            alerts.append("Consult healthcare provider")
        else:
            score -= 50
            risk_factors.append("Hypertensive crisis")
            alerts.append("Seek immediate medical attention")
        
        # Diastolic scoring
        if diastolic <= 80:
            strengths.append("Optimal diastolic blood pressure")
        elif diastolic <= 89:
            pass  # No penalty for normal
        elif diastolic <= 99:
            score -= 15
            risk_factors.append("High diastolic blood pressure (Stage 1)")
            recommendations.append("Reduce sodium intake and increase exercise")
        elif diastolic <= 109:
            score -= 25
            risk_factors.append("High diastolic blood pressure (Stage 2)")
            alerts.append("Consult healthcare provider")
        else:
            score -= 40
            risk_factors.append("Diastolic hypertensive crisis")
            alerts.append("Seek immediate medical attention")
        
        # Heart rate scoring
        heart_rate = vitals.get("heart_rate", 70)
        if 60 <= heart_rate <= 100:
            strengths.append("Normal heart rate")
        else:
            score -= 15
            if heart_rate < 60:
                risk_factors.append("Bradycardia (slow heart rate)")
            else:
                risk_factors.append("Tachycardia (fast heart rate)")
            recommendations.append("Monitor heart rate and consult if persistent")
        
        # BMI scoring (if available in physical parameters)
        physical = all_parameters.get("physical", {})
        bmi = physical.get("bmi", 22)
        if 18.5 <= bmi <= 24.9:
            strengths.append("Healthy BMI")
        elif bmi < 18.5:
            score -= 10
            risk_factors.append("Underweight")
            recommendations.append("Consult nutritionist for healthy weight gain")
        elif bmi <= 29.9:
            score -= 15
            risk_factors.append("Overweight")
            recommendations.append("Focus on balanced diet and regular exercise")
        elif bmi <= 34.9:
            score -= 25
            risk_factors.append("Obesity (Class 1)")
            alerts.append("Consider weight management program")
        elif bmi <= 39.9:
            score -= 35
            risk_factors.append("Obesity (Class 2)")
            alerts.append("Consult healthcare provider for weight management")
        else:
            score -= 45
            risk_factors.append("Severe obesity (Class 3)")
            alerts.append("Seek specialized medical care")
        
        return max(0, score), {
            "score": max(0, score),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _score_metabolic(metabolic: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score metabolic parameters"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # Glucose scoring
        glucose_fasting = metabolic.get("glucose_fasting", 90)
        if glucose_fasting <= 99:
            strengths.append("Normal fasting glucose")
        elif glucose_fasting <= 125:
            score -= 25
            risk_factors.append("Prediabetes (elevated fasting glucose)")
            recommendations.append("Implement lifestyle modifications")
            alerts.append("Monitor glucose levels regularly")
        else:
            score -= 45
            risk_factors.append("Diabetes (elevated fasting glucose)")
            alerts.append("Consult healthcare provider immediately")
        
        # HbA1c scoring
        hba1c = metabolic.get("hba1c", 5.0)
        if hba1c <= 5.6:
            strengths.append("Normal HbA1c")
        elif hba1c <= 6.4:
            score -= 30
            risk_factors.append("Prediabetes (elevated HbA1c)")
            recommendations.append("Focus on diet and exercise")
            alerts.append("Regular diabetes screening")
        else:
            score -= 50
            risk_factors.append("Diabetes (elevated HbA1c)")
            alerts.append("Immediate medical consultation required")
        
        # Creatinine scoring
        creatinine = metabolic.get("creatinine", 1.0)
        if creatinine <= 1.2:
            strengths.append("Normal kidney function")
        else:
            score -= 20
            risk_factors.append("Elevated creatinine")
            recommendations.append("Monitor kidney function")
            alerts.append("Consult nephrologist if persistent")
        
        return max(0, score), {
            "score": max(0, score),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _score_lipids(lipids: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score lipid profile"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # LDL scoring
        ldl = lipids.get("ldl", 100)
        if ldl <= 99:
            strengths.append("Optimal LDL cholesterol")
        elif ldl <= 129:
            pass  # Near optimal, no penalty
        elif ldl <= 159:
            score -= 20
            risk_factors.append("Borderline high LDL cholesterol")
            recommendations.append("Implement heart-healthy diet")
        elif ldl <= 189:
            score -= 30
            risk_factors.append("High LDL cholesterol")
            recommendations.append("Consider medication consultation")
            alerts.append("Monitor cardiovascular risk")
        else:
            score -= 45
            risk_factors.append("Very high LDL cholesterol")
            alerts.append("Immediate medical consultation required")
        
        # HDL scoring (higher is better)
        hdl = lipids.get("hdl", 50)
        if hdl >= 60:
            score += 10  # Bonus points for high HDL
            strengths.append("High HDL cholesterol (protective)")
        elif hdl >= 40:
            strengths.append("Normal HDL cholesterol")
        else:
            score -= 20
            risk_factors.append("Low HDL cholesterol")
            recommendations.append("Increase physical activity and healthy fats")
        
        # Triglycerides scoring
        triglycerides = lipids.get("triglycerides", 100)
        if triglycerides <= 149:
            strengths.append("Normal triglyceride levels")
        elif triglycerides <= 199:
            score -= 15
            risk_factors.append("Borderline high triglycerides")
            recommendations.append("Reduce refined carbohydrates and alcohol")
        elif triglycerides <= 499:
            score -= 25
            risk_factors.append("High triglycerides")
            recommendations.append("Implement comprehensive lifestyle changes")
            alerts.append("Monitor for metabolic syndrome")
        else:
            score -= 40
            risk_factors.append("Very high triglycerides")
            alerts.append("Immediate medical consultation required")
        
        return max(0, min(100, score)), {
            "score": max(0, min(100, score)),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _score_lifestyle(lifestyle: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score lifestyle factors"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # Exercise frequency scoring
        exercise_freq = lifestyle.get("exercise_frequency", 0)
        if exercise_freq >= 5:
            score += 10  # Bonus for excellent exercise
            strengths.append("Excellent exercise routine")
        elif exercise_freq >= 3:
            strengths.append("Good exercise routine")
        elif exercise_freq >= 1:
            score -= 15
            risk_factors.append("Insufficient physical activity")
            recommendations.append("Increase exercise to 3+ times per week")
        else:
            score -= 25
            risk_factors.append("Sedentary lifestyle")
            recommendations.append("Start with walking 30 minutes daily")
            alerts.append("High risk for chronic diseases")
        
        # Sleep duration scoring
        sleep_duration = lifestyle.get("sleep_duration", 7)
        if 7 <= sleep_duration <= 9:
            strengths.append("Optimal sleep duration")
        elif 6 <= sleep_duration < 7:
            score -= 10
            risk_factors.append("Slightly insufficient sleep")
            recommendations.append("Aim for 7-9 hours of sleep")
        else:
            score -= 25
            risk_factors.append("Insufficient sleep")
            recommendations.append("Prioritize sleep hygiene and schedule")
            alerts.append("Sleep deprivation affects all health markers")
        
        # Stress level scoring
        stress_level = lifestyle.get("stress_level", 5)
        if stress_level <= 3:
            strengths.append("Low stress levels")
        elif stress_level <= 6:
            score -= 10
            risk_factors.append("Moderate stress levels")
            recommendations.append("Implement stress management techniques")
        else:
            score -= 20
            risk_factors.append("High stress levels")
            recommendations.append("Consider counseling or stress management programs")
            alerts.append("Chronic stress impacts overall health")
        
        # Smoking status
        smoking_status = lifestyle.get("smoking_status", "never")
        if smoking_status == "current":
            score -= 30
            risk_factors.append("Current smoker")
            recommendations.append("Consider smoking cessation program")
            alerts.append("Smoking significantly increases health risks")
        elif smoking_status == "former":
            score -= 5
            risk_factors.append("Former smoker")
            recommendations.append("Maintain smoke-free lifestyle")
        
        # Alcohol consumption
        alcohol = lifestyle.get("alcohol_consumption", "none")
        if alcohol == "heavy":
            score -= 25
            risk_factors.append("Heavy alcohol consumption")
            recommendations.append("Reduce alcohol intake")
            alerts.append("Consult healthcare provider about alcohol use")
        elif alcohol == "moderate":
            score -= 5
            risk_factors.append("Moderate alcohol consumption")
            recommendations.append("Monitor alcohol intake")
        
        return max(0, min(100, score)), {
            "score": max(0, min(100, score)),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _score_cbc(cbc: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score complete blood count"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # Basic CBC scoring (simplified)
        hemoglobin = cbc.get("hemoglobin", 14)
        if hemoglobin < 12:
            score -= 15
            risk_factors.append("Low hemoglobin (possible anemia)")
            recommendations.append("Consult healthcare provider for evaluation")
        
        return max(0, score), {
            "score": max(0, score),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _score_liver(liver: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score liver function"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # Basic liver scoring
        alt = liver.get("alt", 25)
        if alt > 55:
            score -= 15
            risk_factors.append("Elevated ALT")
            recommendations.append("Monitor liver function")
        
        return max(0, score), {
            "score": max(0, score),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _score_thyroid(thyroid: Dict[str, Any], all_parameters: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        """Score thyroid function"""
        score = 100
        risk_factors = []
        recommendations = []
        alerts = []
        strengths = []
        
        # Basic thyroid scoring
        tsh = thyroid.get("tsh", 2.5)
        if tsh > 4.0:
            score -= 15
            risk_factors.append("Elevated TSH")
            recommendations.append("Monitor thyroid function")
        
        return max(0, score), {
            "score": max(0, score),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "alerts": alerts,
            "strengths": strengths
        }
    
    @staticmethod
    def _generate_improvement_opportunities(breakdown: Dict[str, Any], current_score: int) -> List[str]:
        """Generate actionable improvement opportunities"""
        opportunities = []
        
        # Analyze each category for improvement potential
        for category, details in breakdown.items():
            category_score = details.get("score", 100)
            if category_score < 80:
                opportunities.append(f"Focus on {category} improvements (current: {category_score}/100)")
        
        # Add general recommendations based on score
        if current_score < 60:
            opportunities.append("Consider comprehensive health evaluation")
        elif current_score < 80:
            opportunities.append("Focus on high-impact lifestyle changes")
        else:
            opportunities.append("Maintain current healthy habits")
        
        return opportunities
    
    @staticmethod
    def _calculate_next_review_date(score: int) -> str:
        """Calculate recommended next review date based on health score"""
        from datetime import datetime, timedelta
        
        if score >= 90:
            return (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")  # 6 months
        elif score >= 75:
            return (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")   # 3 months
        elif score >= 60:
            return (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")   # 1 month
        else:
            return (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")    # 1 week


# Convenience functions for backward compatibility
def calculate_health_score(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Legacy function for backward compatibility"""
    result = HealthScoringService.calculate_overall_health_score(parameters)
    
    return {
        "overall_health_score": result.overall_score,
        "risk_factors": result.risk_factors,
        "recommendations": result.recommendations,
        "alerts": result.alerts,
        "strengths": result.strengths,
        "health_category": result.category.value[2],
        "next_review_date": result.next_review_date
    }


def get_health_score_category(score: int) -> str:
    """Get health category string for a given score"""
    category = HealthScoringService._get_health_category(score)
    return category.value[2] 
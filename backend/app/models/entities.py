from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class PatientSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LabReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    original_filename: Optional[str] = None
    markdown_content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    role: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MedicalReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    filename: str
    content: str
    file_type: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)


class SimulationScenario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    name: str
    description: str
    treatment: str
    duration: str
    expected_outcome: str
    risk_level: str
    is_custom: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SimulationResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    scenario_id: int = Field(foreign_key="simulationscenario.id")
    baseline_health: str  # JSON string
    projected_health: str  # JSON string
    improvements: str  # JSON string
    recommendations: str  # JSON string
    risks: str  # JSON string
    created_at: datetime = Field(default_factory=datetime.utcnow) 
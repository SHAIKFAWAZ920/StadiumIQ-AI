import logging
from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import Incident, User, CrowdZone
from backend.api.auth import get_current_user
from backend.ai.gemini_client import (
    summarize_incident,
    generate_volunteer_instructions
)
from backend.services.firestore_sync import sync_to_firestore

logger = logging.getLogger("stadium_iq.incidents")
router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# Schemas
class IncidentCreate(BaseModel):
    category: str # medical, fire, security, trash, obstacle
    title: str
    description: str
    location: str # zone name
    severity: str = "low" # low, medium, high

class UserSummary(BaseModel):
    id: int
    username: str
    role_name: str

    class Config:
        from_attributes = True

class IncidentResponse(BaseModel):
    id: int
    category: str
    title: str
    description: str
    location: str
    status: str
    severity: str
    timestamp: datetime.datetime
    ai_summary: Optional[str] = None
    ai_volunteer_instructions: Optional[str] = None
    reporter: Optional[UserSummary] = None
    assigned_to: Optional[UserSummary] = None

    class Config:
        from_attributes = True

class StatusUpdate(BaseModel):
    status: str # reported, resolving, resolved

class AssignRequest(BaseModel):
    assigned_to_id: int

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if category:
        query = query.filter(Incident.category == category.lower())
    if status:
        query = query.filter(Incident.status == status.lower())
    return query.order_by(Incident.timestamp.desc()).all()

@router.post("", response_model=IncidentResponse, status_code=201)
def create_incident(
    req: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate location
    zone = db.query(CrowdZone).filter(CrowdZone.name == req.location).first()
    if not zone:
        logger.warning(f"Incident location '{req.location}' is not a registered crowd zone.")

    # Call Gemini to summarize and generate safety actions
    ai_sum = summarize_incident(req.title, req.description)
    ai_instructions = generate_volunteer_instructions(req.category, req.description)

    new_incident = Incident(
        reporter_id=current_user.id,
        category=req.category.lower(),
        title=req.title,
        description=req.description,
        location=req.location,
        status="reported",
        severity=req.severity.lower(),
        ai_summary=ai_sum,
        ai_volunteer_instructions=ai_instructions
    )
    
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    # Sync to Firestore
    sync_to_firestore("incidents", new_incident.id, {
        "id": new_incident.id,
        "category": new_incident.category,
        "title": new_incident.title,
        "description": new_incident.description,
        "location": new_incident.location,
        "status": new_incident.status,
        "severity": new_incident.severity,
        "reporter_name": current_user.username,
        "ai_summary": new_incident.ai_summary,
        "ai_volunteer_instructions": new_incident.ai_volunteer_instructions,
        "timestamp": new_incident.timestamp.isoformat()
    })

    return new_incident

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incident

@router.put("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    req: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    incident.status = req.status.lower()
    db.commit()
    db.refresh(incident)

    # Sync status change to Firestore
    sync_to_firestore("incidents", incident.id, {
        "status": incident.status
    })

    return incident

@router.put("/{incident_id}/assign", response_model=IncidentResponse)
def assign_incident(
    incident_id: int,
    req: AssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    assignee = db.query(User).filter(User.id == req.assigned_to_id).first()
    if not assignee:
        raise HTTPException(status_code=400, detail="Assignee user not found.")
        
    incident.assigned_to_id = req.assigned_to_id
    incident.status = "resolving"
    
    db.commit()
    db.refresh(incident)

    # Sync assignment details to Firestore
    sync_to_firestore("incidents", incident.id, {
        "status": incident.status,
        "assigned_to_name": assignee.username
    })

    return incident

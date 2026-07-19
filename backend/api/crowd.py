import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import CrowdZone
from backend.ai.gemini_client import client, API_KEY

logger = logging.getLogger("stadium_iq.crowd")
router = APIRouter(prefix="/api/crowd", tags=["crowd"])

# Schemas
class CrowdZoneResponse(BaseModel):
    id: int
    name: str
    current_count: int
    max_capacity: int
    status: str # low, medium, high, critical

    class Config:
        from_attributes = True

class RouteRecommendationRequest(BaseModel):
    start_zone: str
    end_zone: str

class RouteRecommendationResponse(BaseModel):
    recommended_path: List[str]
    estimated_time_minutes: int
    alternative_route_reason: str
    carbon_savings_kg: float

@router.get("", response_model=List[CrowdZoneResponse])
def get_crowd_zones(db: Session = Depends(get_db)):
    return db.query(CrowdZone).all()

@router.get("/{name}", response_model=CrowdZoneResponse)
def get_crowd_zone_by_name(name: str, db: Session = Depends(get_db)):
    zone = db.query(CrowdZone).filter(CrowdZone.name == name).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Crowd zone '{name}' not found.")
    return zone

@router.post("/recommend-route", response_model=RouteRecommendationResponse)
def recommend_route(req: RouteRecommendationRequest, db: Session = Depends(get_db)):
    # 1. Fetch zones to determine congested areas
    zones = db.query(CrowdZone).all()
    congested_zones = [z.name for z in zones if z.status in ["high", "critical"]]
    
    # 2. Basic offline routing logic
    # Assume a standard ring/graph: Gate A (North) <-> Concourse North <-> Section 102/108 <-> Food Court 1
    # We will generate a mock path but filter out congested zones if possible.
    path = [req.start_zone]
    
    # Simple path builder
    if "Gate" in req.start_zone and "Section" in req.end_zone:
        path.append(f"Concourse {req.start_zone[-1]}") # e.g. Concourse A
        path.append(req.end_zone)
    else:
        path.extend(["Main Concourse Central", req.end_zone])
        
    # Check if any zone in our simple path is congested
    congested_hits = [z for z in path if z in congested_zones]
    reason = "Standard shortest path selected. Traffic levels normal."
    est_time = 5
    
    if congested_hits:
        # Suggest alternative detour
        original_congested = congested_hits[0]
        detour_zone = f"{original_congested} Detour Lane"
        path = [req.start_zone, "Auxiliary Walkway", detour_zone, req.end_zone]
        reason = f"Detoured to avoid high-congestion zone at {original_congested}."
        est_time = 8
        
    # GenAI enhancement if API is online
    if client and API_KEY:
        try:
            prompt = (
                f"A visitor wants to walk from {req.start_zone} to {req.end_zone}. "
                f"The following zones are highly congested: {', '.join(congested_zones)}. "
                f"Provide a brief, 15-word reason why they should use this path: {path}."
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            reason = response.text.strip()
        except Exception as e:
            logger.error(f"Error calling Gemini for routing: {e}")
            
    # Calculate carbon savings (encourage walking over taking shuttle inside premises)
    # 0.05kg CO2 saved per minute of walking
    carbon_savings = round(est_time * 0.05, 2)
    
    return RouteRecommendationResponse(
        recommended_path=path,
        estimated_time_minutes=est_time,
        alternative_route_reason=reason,
        carbon_savings_kg=carbon_savings
    )

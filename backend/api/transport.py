import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import Transport
from backend.services.firestore_sync import sync_to_firestore

logger = logging.getLogger("stadium_iq.transport")
router = APIRouter(prefix="/api/transport", tags=["transport"])

# Schemas
class TransportResponse(BaseModel):
    id: int
    route_name: str
    type: str # metro, bus, taxi, rideshare, parking
    delay_minutes: int
    status: str # On Time, Delayed, Suspended
    carbon_savings_kg: float
    estimated_time_minutes: int

    class Config:
        from_attributes = True

class TransportUpdate(BaseModel):
    delay_minutes: int
    status: str

@router.get("", response_model=List[TransportResponse])
def get_transports(db: Session = Depends(get_db)):
    return db.query(Transport).all()

@router.put("/{route_id}", response_model=TransportResponse)
def update_transport(
    route_id: int, 
    req: TransportUpdate, 
    db: Session = Depends(get_db)
):
    transport = db.query(Transport).filter(Transport.id == route_id).first()
    if not transport:
        raise HTTPException(status_code=404, detail="Transport route not found.")
        
    transport.delay_minutes = req.delay_minutes
    transport.status = req.status
    
    # Recalculate estimated transit time based on base + delay
    base_times = {"metro": 22, "bus": 25, "taxi": 18, "rideshare": 20}
    base = base_times.get(transport.type, 20)
    transport.estimated_time_minutes = base + req.delay_minutes
    
    db.commit()
    db.refresh(transport)

    # Sync transit line update to Firestore
    sync_to_firestore("transport", transport.id, {
        "id": transport.id,
        "route_name": transport.route_name,
        "type": transport.type,
        "delay_minutes": transport.delay_minutes,
        "status": transport.status,
        "estimated_time_minutes": transport.estimated_time_minutes,
        "carbon_savings_kg": transport.carbon_savings_kg
    })

    return transport

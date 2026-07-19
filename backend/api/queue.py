import logging
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import CrowdZone

logger = logging.getLogger("stadium_iq.queue")
router = APIRouter(prefix="/api/queue", tags=["queue"])

# Schemas
class QueueDetail(BaseModel):
    name: str
    category: str # gates, food, restrooms, parking, merchandise
    queue_length: int
    wait_time_minutes: int
    status: str # green, yellow, red
    alternative_facility_name: Optional[str] = None
    alternative_wait_time: Optional[int] = None

class QueueSummary(BaseModel):
    queues: List[QueueDetail]

# Helper function to map wait times
def get_wait_time_status(wait_time: int) -> str:
    if wait_time < 5:
        return "green"
    elif wait_time < 15:
        return "yellow"
    return "red"

@router.get("", response_model=QueueSummary)
def get_queues(db: Session = Depends(get_db)):
    # 1. Fetch crowd zones to map queue statuses dynamically
    # This ties our queue predictions directly to the live simulated database state!
    zones = db.query(CrowdZone).all()
    zone_map = {z.name: z for z in zones}
    
    queues = []
    
    # Define facilities and link them to crowd zones for dynamic updates
    facilities = [
        # GATES
        {"name": "Gate A Entrance", "zone": "Gate A", "category": "gates", "default_wait": 15, "alt": "Gate B Entrance"},
        {"name": "Gate B Entrance", "zone": "Gate B", "category": "gates", "default_wait": 4, "alt": "Gate D Entrance"},
        {"name": "Gate C Entrance", "zone": "Gate C", "category": "gates", "default_wait": 22, "alt": "Gate B Entrance"},
        {"name": "Gate D Entrance", "zone": "Gate D", "category": "gates", "default_wait": 8, "alt": "Gate B Entrance"},
        
        # RESTROOMS
        {"name": "Restroom Section 102", "zone": "Section 102", "category": "restrooms", "default_wait": 12, "alt": "Restroom Section 112"},
        {"name": "Restroom Section 112", "zone": "Section 112", "category": "restrooms", "default_wait": 2, "alt": "Restroom Section 204"},
        {"name": "Restroom Section 204", "zone": "Section 204", "category": "restrooms", "default_wait": 6, "alt": "Restroom Section 112"},
        {"name": "Restroom Section 218", "zone": "Section 218", "category": "restrooms", "default_wait": 18, "alt": "Restroom Section 204"},
        
        # FOOD
        {"name": "Green FIFA Grills (Sec 108)", "zone": "Section 108", "category": "food", "default_wait": 25, "alt": "EcoBites (Sec 112)"},
        {"name": "EcoBites (Sec 112)", "zone": "Section 112", "category": "food", "default_wait": 5, "alt": "Main Food Court East"},
        {"name": "Main Food Court East", "zone": "Food Court East", "category": "food", "default_wait": 14, "alt": "EcoBites (Sec 112)"},
        
        # SHOP
        {"name": "FIFA Superstore (East Concourse)", "zone": "Concourse East", "category": "merchandise", "default_wait": 30, "alt": "Fan Shop (West Concourse)"},
        {"name": "Fan Shop (West Concourse)", "zone": "Concourse West", "category": "merchandise", "default_wait": 8, "alt": "FIFA Superstore (East Concourse)"},
        
        # PARKING
        {"name": "Parking Lot A", "zone": "Parking Lot A", "category": "parking", "default_wait": 20, "alt": "Parking Lot B"},
        {"name": "Parking Lot B", "zone": "Parking Lot B", "category": "parking", "default_wait": 10, "alt": "Metro Transit Park & Ride"}
    ]
    
    for fac in facilities:
        # Dynamically calculate queue parameters based on the live crowd_zone status
        zone = zone_map.get(fac["zone"])
        
        if zone:
            # Let's compute queue size proportional to capacity
            ratio = zone.current_count / max(zone.max_capacity, 1)
            # wait time formula
            wait_time = int(ratio * fac["default_wait"] * 2.5) + 1
            queue_len = int(zone.current_count * 0.05)
        else:
            wait_time = fac["default_wait"]
            queue_len = wait_time * 3
            
        # Get alternative wait time
        alt_wait = None
        for a_fac in facilities:
            if a_fac["name"] == fac["alt"]:
                a_zone = zone_map.get(a_fac["zone"])
                if a_zone:
                    alt_ratio = a_zone.current_count / max(a_zone.max_capacity, 1)
                    alt_wait = int(alt_ratio * a_fac["default_wait"] * 2.5) + 1
                else:
                    alt_wait = a_fac["default_wait"]
                break
                
        queues.append(QueueDetail(
            name=fac["name"],
            category=fac["category"],
            queue_length=queue_len,
            wait_time_minutes=wait_time,
            status=get_wait_time_status(wait_time),
            alternative_facility_name=fac["alt"],
            alternative_wait_time=alt_wait
        ))
        
    return QueueSummary(queues=queues)

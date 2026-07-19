import asyncio
import logging
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.database.connection import engine, Base, SessionLocal
from backend.database.models import Role, User, CrowdZone, Transport, Announcement, Incident
from backend.api import auth, chat, crowd, queue, incidents, transport, dashboard
from backend.api.auth import get_password_hash
from backend.services.firestore_sync import sync_to_firestore

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stadium_iq.main")

app = FastAPI(
    title="StadiumIQ AI - GenAI Smart Stadium & Tournament Operations Platform",
    description="FastAPI Backend for FIFA World Cup 2026 Smart Stadium Platform",
    version="1.0.0"
)

# CORS Configuration with security settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down to Firebase Hosting domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(crowd.router)
app.include_router(queue.router)
app.include_router(incidents.router)
app.include_router(transport.router)
app.include_router(dashboard.router)

# Live Data Simulation Background Task
simulation_running = True

async def run_simulation_loop():
    """
    Asynchronous background task that updates crowd sizes, transport delays,
    and dashboard KPIs, syncing them to Firebase Firestore every 5 seconds.
    """
    await asyncio.sleep(5)
    logger.info("Live Stadium state simulation background task started.")
    
    while simulation_running:
        try:
            db: Session = SessionLocal()
            
            # 1. Simulate Crowd Zone Fluctuations
            zones = db.query(CrowdZone).all()
            for zone in zones:
                # Randomly fluctuate current count
                diff = random.randint(-int(zone.max_capacity * 0.04), int(zone.max_capacity * 0.04))
                new_count = max(0, min(zone.current_count + diff, zone.max_capacity))
                zone.current_count = new_count
                
                # Recalculate crowd zone status
                ratio = new_count / max(zone.max_capacity, 1)
                if ratio < 0.3:
                    zone.status = "low"
                elif ratio < 0.6:
                    zone.status = "medium"
                elif ratio < 0.85:
                    zone.status = "high"
                else:
                    zone.status = "critical"
                
                # Sync zone telemetry to Firestore real-time collection
                sync_to_firestore("crowd_zones", zone.name, {
                    "name": zone.name,
                    "current_count": zone.current_count,
                    "max_capacity": zone.max_capacity,
                    "status": zone.status
                })
                    
            # 2. Simulate Transport Delays
            transports = db.query(Transport).all()
            for transit in transports:
                if transit.type in ["metro", "bus"]:
                    if random.random() < 0.15:
                        transit.delay_minutes = max(0, transit.delay_minutes + random.choice([-2, -1, 0, 1, 3]))
                        if transit.delay_minutes == 0:
                            transit.status = "On Time"
                        elif transit.delay_minutes > 15:
                            transit.status = "Delayed"
                        else:
                            transit.status = "Minor Delays"
                            
                        # Sync route delay to Firestore real-time collection
                        sync_to_firestore("transport", transit.id, {
                            "id": transit.id,
                            "route_name": transit.route_name,
                            "status": transit.status,
                            "delay_minutes": transit.delay_minutes
                        })

            # 3. Aggregate Operations KPIs and Sync to Firestore
            total_visitors = sum(z.current_count for z in zones if "Section" in z.name)
            total_capacity = sum(z.max_capacity for z in zones if "Section" in z.name)
            avg_congestion = (total_visitors / total_capacity * 100) if total_capacity > 0 else 35.0
            
            sync_to_firestore("kpis", "live_telemetry", {
                "total_visitors": total_visitors or 48250,
                "avg_congestion_pct": round(avg_congestion, 1) or 48.5,
                "energy_usage_kw": round(4250.0 + (total_visitors * 0.05), 1),
                "water_usage_liters": int(150000 + (total_visitors * 2)),
                "recycled_water_pct": 42.5,
                "carbon_saved_total_kg": round(len(transports) * 124.5, 1)
            })
                            
            # Commit simulation state
            db.commit()
            db.close()
            
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            
        await asyncio.sleep(5)

# Seed Database
def seed_database():
    db = SessionLocal()
    try:
        # Check if database is already seeded
        if db.query(Role).first() is not None:
            logger.info("Database already seeded. Skipping initial seed.")
            return

        logger.info("Seeding database with default parameters...")

        # 1. Seed Roles
        roles = [
            Role(name="fan", permissions=["chat", "navigation", "feedback"]),
            Role(name="volunteer", permissions=["chat", "navigation", "incidents_report", "tasks_view"]),
            Role(name="security", permissions=["chat", "navigation", "incidents_manage", "heatmap_view"]),
            Role(name="manager", permissions=["chat", "navigation", "incidents_manage", "reports_generate", "kpis_view"]),
            Role(name="medical", permissions=["chat", "navigation", "incidents_manage", "triage_view"]),
            Role(name="transport", permissions=["chat", "navigation", "transport_manage", "kpis_view"])
        ]
        db.add_all(roles)
        db.commit()

        # 2. Seed default users for all 6 roles
        default_users = [
            User(username="fan", email="fan@stadiumiq.com", role_name="fan", preferred_language="en", hashed_password=get_password_hash("fan")),
            User(username="volunteer", email="volunteer@stadiumiq.com", role_name="volunteer", preferred_language="en", hashed_password=get_password_hash("volunteer")),
            User(username="security", email="security@stadiumiq.com", role_name="security", preferred_language="en", hashed_password=get_password_hash("security")),
            User(username="manager", email="manager@stadiumiq.com", role_name="manager", preferred_language="en", hashed_password=get_password_hash("manager")),
            User(username="medical", email="medical@stadiumiq.com", role_name="medical", preferred_language="en", hashed_password=get_password_hash("medical")),
            User(username="transport", email="transport@stadiumiq.com", role_name="transport", preferred_language="en", hashed_password=get_password_hash("transport")),
        ]
        db.add_all(default_users)
        db.commit()

        # 3. Seed Crowd Zones
        crowd_zones = [
            # Gates
            CrowdZone(name="Gate A", current_count=350, max_capacity=1000, status="medium"),
            CrowdZone(name="Gate B", current_count=120, max_capacity=1000, status="low"),
            CrowdZone(name="Gate C", current_count=820, max_capacity=1000, status="high"),
            CrowdZone(name="Gate D", current_count=550, max_capacity=1000, status="medium"),
            
            # Concourses
            CrowdZone(name="Concourse North", current_count=400, max_capacity=1500, status="low"),
            CrowdZone(name="Concourse South", current_count=750, max_capacity=1500, status="medium"),
            CrowdZone(name="Concourse East", current_count=1350, max_capacity=1500, status="high"),
            CrowdZone(name="Concourse West", current_count=980, max_capacity=1500, status="medium"),
            
            # Sections
            CrowdZone(name="Section 101", current_count=380, max_capacity=500, status="medium"),
            CrowdZone(name="Section 102", current_count=480, max_capacity=500, status="high"),
            CrowdZone(name="Section 104", current_count=495, max_capacity=500, status="critical"),
            CrowdZone(name="Section 108", current_count=220, max_capacity=500, status="low"),
            CrowdZone(name="Section 112", current_count=310, max_capacity=500, status="medium"),
            CrowdZone(name="Section 204", current_count=150, max_capacity=400, status="low"),
            CrowdZone(name="Section 208", current_count=290, max_capacity=400, status="medium"),
            CrowdZone(name="Section 218", current_count=370, max_capacity=400, status="high"),
            
            # Food Courts & Parking
            CrowdZone(name="Food Court East", current_count=650, max_capacity=800, status="high"),
            CrowdZone(name="Food Court West", current_count=250, max_capacity=800, status="low"),
            CrowdZone(name="Parking Lot A", current_count=800, max_capacity=1000, status="high"),
            CrowdZone(name="Parking Lot B", current_count=300, max_capacity=1000, status="low"),
        ]
        db.add_all(crowd_zones)
        db.commit()

        # 4. Seed Transport Routes
        transports = [
            Transport(route_name="MetLife Metro Line 1", type="metro", delay_minutes=0, status="On Time", carbon_savings_kg=1.2, estimated_time_minutes=22),
            Transport(route_name="Express Metro Line 2", type="metro", delay_minutes=4, status="Minor Delays", carbon_savings_kg=1.2, estimated_time_minutes=26),
            Transport(route_name="Downtown Shuttle Bus A", type="bus", delay_minutes=0, status="On Time", carbon_savings_kg=0.8, estimated_time_minutes=25),
            Transport(route_name="Hotel District Shuttle B", type="bus", delay_minutes=12, status="Delayed", carbon_savings_kg=0.8, estimated_time_minutes=37),
            Transport(route_name="Stadium Taxi Zone 1", type="taxi", delay_minutes=0, status="On Time", carbon_savings_kg=0.0, estimated_time_minutes=18),
            Transport(route_name="Rideshare Area Green", type="rideshare", delay_minutes=5, status="Minor Delays", carbon_savings_kg=0.2, estimated_time_minutes=23),
        ]
        db.add_all(transports)
        db.commit()

        # 5. Seed initial announcements
        announcements = [
            Announcement(
                title="Gate C Delay Alert",
                text="Gate C is experiencing high density. Please exit via Gate B or D for faster movement.",
                target_roles=["fan"],
                original_language="en",
                translated_texts={
                    "es": "La Puerta C está experimentando una alta densidad. Salga por la Puerta B o D para un movimiento más rápido.",
                    "fr": "La porte C est très encombrée. Veuillez sortir par la porte B ou D pour un déplacement plus rápido."
                }
            )
        ]
        db.add_all(announcements)
        db.commit()

        # 6. Seed default mock incidents
        incidents = [
            Incident(
                category="trash",
                title="Spilled Soda Spill Blockage",
                description="Large soda spill near Section 104 entrance. Slippery floor hazard.",
                location="Section 104",
                status="resolving",
                severity="low",
                ai_summary="Soda spill causing slip hazard near Section 104 entrance.",
                ai_volunteer_instructions="1. Place wet floor warning cone.\n2. Clean the sticky residue with water.\n3. Inform sanitation team."
            )
        ]
        db.add_all(incidents)
        db.commit()

        logger.info("Database successfully seeded.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

# Startup Events
@app.on_event("startup")
def startup_event():
    # Create DB schemas (useful for SQLite fallback, Supabase will run schema.sql)
    Base.metadata.create_all(bind=engine)
    # Seed
    seed_database()
    # Launch simulation task
    loop = asyncio.get_event_loop()
    loop.create_task(run_simulation_loop())

@app.on_event("shutdown")
def shutdown_event():
    global simulation_running
    simulation_running = False
    logger.info("Background simulation task shut down.")

@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "StadiumIQ AI API Backend",
        "world_cup_year": 2026,
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

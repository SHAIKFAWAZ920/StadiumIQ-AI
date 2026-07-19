import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add root folder to python path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.connection import Base
from backend.database.models import Role, User, CrowdZone, Transport, Announcement, Incident

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is missing.")
    sys.exit(1)

print(f"Connecting to database to initialize tables & seed data...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def get_password_hash(password: str) -> str:
    import hashlib
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'stadium_iq_fifa_2026_salt', 100000).hex()

def seed():
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Role).first() is not None:
            print("Database already seeded. Exiting.")
            return
            
        print("Seeding roles...")
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

        print("Seeding default accounts...")
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

        print("Seeding crowd zones...")
        crowd_zones = [
            CrowdZone(name="Gate A", current_count=350, max_capacity=1000, status="medium"),
            CrowdZone(name="Gate B", current_count=120, max_capacity=1000, status="low"),
            CrowdZone(name="Gate C", current_count=820, max_capacity=1000, status="high"),
            CrowdZone(name="Gate D", current_count=550, max_capacity=1000, status="medium"),
            CrowdZone(name="Concourse North", current_count=400, max_capacity=1500, status="low"),
            CrowdZone(name="Concourse South", current_count=750, max_capacity=1500, status="medium"),
            CrowdZone(name="Concourse East", current_count=1350, max_capacity=1500, status="high"),
            CrowdZone(name="Concourse West", current_count=980, max_capacity=1500, status="medium"),
            CrowdZone(name="Section 101", current_count=380, max_capacity=500, status="medium"),
            CrowdZone(name="Section 102", current_count=480, max_capacity=500, status="high"),
            CrowdZone(name="Section 104", current_count=495, max_capacity=500, status="critical"),
            CrowdZone(name="Section 108", current_count=220, max_capacity=500, status="low"),
            CrowdZone(name="Section 112", current_count=310, max_capacity=500, status="medium"),
            CrowdZone(name="Section 204", current_count=150, max_capacity=400, status="low"),
            CrowdZone(name="Section 208", current_count=290, max_capacity=400, status="medium"),
            CrowdZone(name="Section 218", current_count=370, max_capacity=400, status="high"),
            CrowdZone(name="Food Court East", current_count=650, max_capacity=800, status="high"),
            CrowdZone(name="Food Court West", current_count=250, max_capacity=800, status="low"),
            CrowdZone(name="Parking Lot A", current_count=800, max_capacity=1000, status="high"),
            CrowdZone(name="Parking Lot B", current_count=300, max_capacity=1000, status="low"),
        ]
        db.add_all(crowd_zones)
        db.commit()

        print("Seeding transit links...")
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

        print("Seeding announcements...")
        announcements = [
            Announcement(
                title="Gate C Delay Alert",
                text="Gate C is experiencing high density. Please exit via Gate B or D for faster movement.",
                target_roles=["fan"],
                original_language="en",
                translated_texts={
                    "es": "La Puerta C está experimentando una alta densidad. Salga por la Puerta B o D para un movimiento más rápido.",
                    "fr": "La porte C est très encombrée. Veuillez sortir par la porte B ou D pour un déplacement plus rapide."
                }
            )
        ]
        db.add_all(announcements)
        db.commit()

        print("Seeding default incidents...")
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

        print("Database successfully seeded.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()

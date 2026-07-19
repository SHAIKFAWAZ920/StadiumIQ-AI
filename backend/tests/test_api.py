import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database.connection import Base, get_db
from backend.database.models import Role, User, CrowdZone, Transport
from backend.api.auth import get_password_hash

from sqlalchemy.pool import StaticPool

# Setup test DB with StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add roles
    db.add(Role(name="fan", permissions=[]))
    db.add(Role(name="manager", permissions=[]))
    
    # Add user
    user = User(
        username="testuser",
        email="test@test.com",
        hashed_password=get_password_hash("testpassword"),
        role_name="fan",
        preferred_language="en"
    )
    db.add(user)
    
    # Add crowd zones
    db.add(CrowdZone(name="Gate A", current_count=200, max_capacity=1000, status="low"))
    db.add(CrowdZone(name="Section 104", current_count=450, max_capacity=500, status="critical"))
    
    # Add transport
    db.add(Transport(route_name="Metro 1", type="metro", delay_minutes=0, status="On Time", carbon_savings_kg=1.2, estimated_time_minutes=22))
    
    db.commit()
    db.close()
    
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def get_auth_headers():
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# 1. Test Chatbot API
def test_chatbot_text_query():
    headers = get_auth_headers()
    response = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "Where is Gate C?", "location": "Main Concourse"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["language_detected"] == "en"
    assert data["incident_created"] is False

# 2. Test Crowd API
def test_get_crowd_zones():
    response = client.get("/api/crowd")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert any(zone["name"] == "Section 104" for zone in data)

def test_recommend_route():
    response = client.post(
        "/api/crowd/recommend-route",
        json={"start_zone": "Gate A", "end_zone": "Section 104"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommended_path" in data
    assert "estimated_time_minutes" in data
    assert "alternative_route_reason" in data

# 3. Test Queue API
def test_get_queues():
    response = client.get("/api/queue")
    assert response.status_code == 200
    data = response.json()
    assert "queues" in data
    assert len(data["queues"]) > 0

# 4. Test Incidents API
def test_incident_create_and_fetch():
    headers = get_auth_headers()
    # Create incident
    create_resp = client.post(
        "/api/incidents",
        headers=headers,
        json={
            "category": "medical",
            "title": "Heat Stroke near Gate A",
            "description": "Fan is fainting due to hot temperatures.",
            "location": "Gate A",
            "severity": "high"
        }
    )
    assert create_resp.status_code == 201
    inc_data = create_resp.json()
    assert inc_data["category"] == "medical"
    assert inc_data["status"] == "reported"
    assert inc_data["ai_summary"] is not None
    assert inc_data["ai_volunteer_instructions"] is not None

    # Fetch incident list
    list_resp = client.get("/api/incidents")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

# 5. Test Transport API
def test_get_transport():
    response = client.get("/api/transport")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["route_name"] == "Metro 1"

# 6. Test Dashboard API
def test_get_dashboard_kpis():
    response = client.get("/api/dashboard/kpis")
    assert response.status_code == 200
    data = response.json()
    assert "total_visitors" in data
    assert "energy_usage_kw" in data
    assert "solar_contribution_pct" in data

def test_generate_report():
    response = client.post("/api/dashboard/generate-report")
    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert "generated_at" in data

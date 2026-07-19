import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database.connection import Base, get_db
from backend.database.models import Role, User
from backend.api.auth import get_password_hash

from sqlalchemy.pool import StaticPool

# 1. Setup in-memory test database with StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Override get_db dependency function
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    # Set override inside fixture
    app.dependency_overrides[get_db] = override_get_db
    
    # Setup database schema before each test
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add roles
    roles = [
        Role(name="fan", permissions=[]),
        Role(name="volunteer", permissions=[]),
        Role(name="security", permissions=[]),
        Role(name="manager", permissions=[]),
        Role(name="medical", permissions=[]),
        Role(name="transport", permissions=[])
    ]
    db.add_all(roles)
    
    # Add a mock user
    db.add(User(
        username="testuser",
        email="test@test.com",
        hashed_password=get_password_hash("testpassword"),
        role_name="fan",
        preferred_language="en"
    ))
    db.commit()
    db.close()
    
    yield
    
    # Tear down database schema after each test
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

# 3. Test signup
def test_signup():
    response = client.post(
        "/api/auth/signup",
        json={
            "username": "newfan",
            "email": "newfan@stadium.com",
            "role_name": "fan",
            "password": "fanpassword",
            "preferred_language": "es"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newfan"
    assert data["email"] == "newfan@stadium.com"
    assert data["role_name"] == "fan"

def test_signup_invalid_role():
    response = client.post(
        "/api/auth/signup",
        json={
            "username": "badroleuser",
            "email": "bad@stadium.com",
            "role_name": "superman",
            "password": "fanpassword"
        }
    )
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]

# 4. Test login
def test_login_success():
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testuser",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "fan"
    assert data["username"] == "testuser"

def test_login_wrong_credentials():
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testuser",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

# 5. Test retrieve current profile
def test_get_me():
    # Login first
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    token = login_resp.json()["access_token"]
    
    # Get profile with bearer header
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@test.com"

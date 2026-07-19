import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.database.connection import Base

class Role(Base):
    __tablename__ = "roles"

    name = Column(String, primary_key=True, index=True) # e.g. fan, volunteer, security, manager, medical, transport
    permissions = Column(JSON, nullable=True) # JSON list of permissions

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role_name = Column(String, ForeignKey("roles.name"), nullable=False)
    preferred_language = Column(String, default="en") # en, es, fr, ar, hi, ur, pt

    role = relationship("Role")
    volunteer_profile = relationship("VolunteerProfile", back_populates="user", uselist=False)

class CrowdZone(Base):
    __tablename__ = "crowd_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # e.g. Gate A, Section 102, Concourse North
    current_count = Column(Integer, default=0)
    max_capacity = Column(Integer, default=1000)
    status = Column(String, default="low") # low, medium, high, critical
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    category = Column(String, nullable=False) # medical, fire, security, trash, obstacle
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    location = Column(String, nullable=False) # name of crowd zone
    status = Column(String, default="reported") # reported, resolving, resolved
    severity = Column(String, default="low") # low, medium, high
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ai_summary = Column(String, nullable=True) # GenAI generated summary
    ai_volunteer_instructions = Column(String, nullable=True) # GenAI generated instructions for volunteers
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    reporter = relationship("User", foreign_keys=[reporter_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

class Transport(Base):
    __tablename__ = "transport"

    id = Column(Integer, primary_key=True, index=True)
    route_name = Column(String, unique=True, index=True, nullable=False) # e.g. Metro Line 1, Shuttle Bus A
    type = Column(String, nullable=False) # metro, bus, taxi, rideshare, parking
    delay_minutes = Column(Integer, default=0)
    status = Column(String, default="On Time") # On Time, Delayed, Suspended
    carbon_savings_kg = Column(Float, default=0.0) # carbon saved vs taxi per visitor
    estimated_time_minutes = Column(Integer, default=20)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    text = Column(String, nullable=False)
    target_roles = Column(JSON, nullable=True) # e.g. ["fan", "volunteer"] (null for all)
    original_language = Column(String, default="en")
    translated_texts = Column(JSON, nullable=True) # JSON map: {lang_code: text}
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class VolunteerProfile(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_task = Column(String, nullable=True)
    status = Column(String, default="idle") # idle, active, off-duty
    assigned_zone = Column(String, nullable=True)

    user = relationship("User", back_populates="volunteer_profile")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sentiment = Column(String, nullable=True) # positive, neutral, negative
    text = Column(String, nullable=False)
    rating = Column(Integer, default=5) # 1-5 stars
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

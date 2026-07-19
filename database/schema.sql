-- StadiumIQ AI PostgreSQL DB Schema (Supabase ready)

-- 1. Create Roles table
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(50) PRIMARY KEY,
    permissions JSONB
);

-- 2. Create Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    role_name VARCHAR(50) NOT NULL REFERENCES roles(name),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Crowd Zones table
CREATE TABLE IF NOT EXISTS crowd_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    current_count INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 1000,
    status VARCHAR(50) DEFAULT 'low',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- medical, fire, security, trash, obstacle
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'reported', -- reported, resolving, resolved
    severity VARCHAR(50) DEFAULT 'low', -- low, medium, high
    assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ai_summary TEXT,
    ai_volunteer_instructions TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Transport table
CREATE TABLE IF NOT EXISTS transport (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(150) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- metro, bus, taxi, rideshare, parking
    delay_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'On Time',
    carbon_savings_kg FLOAT DEFAULT 0.0,
    estimated_time_minutes INTEGER DEFAULT 20,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    text TEXT NOT NULL,
    target_roles JSONB, -- JSON array e.g. ["fan", "volunteer"]
    original_language VARCHAR(10) DEFAULT 'en',
    translated_texts JSONB, -- JSON map: {es: '...', fr: '...'}
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Volunteers Profile table
CREATE TABLE IF NOT EXISTS volunteers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_task VARCHAR(255),
    status VARCHAR(50) DEFAULT 'idle', -- idle, active, off-duty
    assigned_zone VARCHAR(100)
);

-- 8. Create Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sentiment VARCHAR(50), -- positive, neutral, negative
    text TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

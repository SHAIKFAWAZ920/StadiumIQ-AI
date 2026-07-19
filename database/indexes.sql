-- Indexing constraints for high performance query routing

-- 1. Index users email for quick login checks and auth joins
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_name);

-- 2. Index incidents status and severity for dashboard filters
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assignee ON incidents(assigned_to_id);

-- 3. Index crowd zones status for density heatmaps
CREATE INDEX IF NOT EXISTS idx_crowd_zones_status ON crowd_zones(status);

-- 4. Index transport types and status for schedules
CREATE INDEX IF NOT EXISTS idx_transport_type ON transport(type);
CREATE INDEX IF NOT EXISTS idx_transport_status ON transport(status);

-- 5. Index volunteers user link
CREATE INDEX IF NOT EXISTS idx_volunteers_user ON volunteers(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 1. Roles Policies
CREATE POLICY "Allow read-only access to roles for all users" 
ON roles FOR SELECT TO public USING (true);

-- 2. Users Policies
CREATE POLICY "Allow users to read their own profile" 
ON users FOR SELECT TO authenticated 
USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Allow managers to read all profiles" 
ON users FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM users u WHERE u.email = (auth.jwt() ->> 'email') AND u.role_name = 'manager'));

-- 3. Crowd Zones Policies
CREATE POLICY "Allow public read access to crowd zones" 
ON crowd_zones FOR SELECT TO public USING (true);

CREATE POLICY "Allow managers to modify crowd zones" 
ON crowd_zones FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM users u WHERE u.email = (auth.jwt() ->> 'email') AND u.role_name = 'manager'));

-- 4. Incidents Policies
CREATE POLICY "Allow staff to manage all incidents" 
ON incidents FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.email = (auth.jwt() ->> 'email') 
        AND u.role_name IN ('manager', 'security', 'medical', 'volunteer')
    )
);

CREATE POLICY "Allow fans to view only their reported incidents" 
ON incidents FOR SELECT TO authenticated 
USING (
    reporter_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);

CREATE POLICY "Allow fans to create incidents" 
ON incidents FOR INSERT TO authenticated 
WITH CHECK (
    reporter_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);

-- 5. Transport Policies
CREATE POLICY "Allow public read access to transport routes" 
ON transport FOR SELECT TO public USING (true);

CREATE POLICY "Allow transport crew or managers to manage routes" 
ON transport FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.email = (auth.jwt() ->> 'email') 
        AND u.role_name IN ('manager', 'transport')
    )
);

-- 6. Announcements Policies
CREATE POLICY "Allow public read access to announcements" 
ON announcements FOR SELECT TO public USING (true);

CREATE POLICY "Allow security or managers to publish announcements" 
ON announcements FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.email = (auth.jwt() ->> 'email') 
        AND u.role_name IN ('manager', 'security')
    )
);

-- 7. Volunteers Policies
CREATE POLICY "Allow volunteers to view and update their own record" 
ON volunteers FOR ALL TO authenticated 
USING (
    user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);

CREATE POLICY "Allow managers to view all volunteers" 
ON volunteers FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.email = (auth.jwt() ->> 'email') 
        AND u.role_name = 'manager'
    )
);

-- 8. Feedback Policies
CREATE POLICY "Allow users to log feedback" 
ON feedback FOR INSERT TO authenticated 
WITH CHECK (
    user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);

CREATE POLICY "Allow managers to audit feedback" 
ON feedback FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.email = (auth.jwt() ->> 'email') 
        AND u.role_name = 'manager'
    )
);

-- Event-Desk Supabase Schema & Initial Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Super Admin & Moderators)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'moderator')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB DEFAULT '{"can_register":true,"can_view_records":true,"can_scan":true,"can_view_analytics":false,"can_export_csv":false}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure permissions column exists if table was created previously
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_register":true,"can_view_records":true,"can_scan":true,"can_view_analytics":false,"can_export_csv":false}'::jsonb;

-- Index for fast user authentication lookup
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users (LOWER(username));

-- 3. Batches / Sessions Table (Dynamic from DB)
CREATE TABLE IF NOT EXISTS batches (
    year TEXT PRIMARY KEY, -- e.g. 2023, 2024, 2025, 2026
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Sports & Events Table
CREATE TABLE IF NOT EXISTS sports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    formats JSONB NOT NULL DEFAULT '["Single (1v1)"]'::jsonb,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Student Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    reg_no TEXT PRIMARY KEY, -- e.g. 2024-BBA-300 (strictly UPPERCASE)
    student_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    session_year TEXT NOT NULL,
    department_code TEXT NOT NULL REFERENCES departments(code) ON UPDATE CASCADE,
    sport_id UUID NOT NULL REFERENCES sports(id) ON UPDATE CASCADE,
    sport_name TEXT NOT NULL,
    category_format TEXT NOT NULL,
    partner_name TEXT,
    partner_reg_no TEXT,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('PAID', 'PARTIAL', 'FREE', 'UNPAID')),
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    qr_token TEXT UNIQUE NOT NULL,
    checked_in BOOLEAN NOT NULL DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    notes TEXT,
    created_by_id UUID REFERENCES app_users(id),
    created_by_username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Auto UPPERCASE trigger
CREATE OR REPLACE FUNCTION clean_registration_record()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reg_no := UPPER(TRIM(NEW.reg_no));
    IF NEW.partner_reg_no IS NOT NULL THEN
        NEW.partner_reg_no := UPPER(TRIM(NEW.partner_reg_no));
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clean_registration ON registrations;
CREATE TRIGGER trg_clean_registration
BEFORE INSERT OR UPDATE ON registrations
FOR EACH ROW
EXECUTE FUNCTION clean_registration_record();

-- 7. Audit & Activity Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    performed_by_id UUID REFERENCES app_users(id),
    performed_by_username TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous public policies for app interaction
CREATE POLICY "Public app_users" ON app_users FOR ALL USING (true);
CREATE POLICY "Public batches" ON batches FOR ALL USING (true);
CREATE POLICY "Public departments" ON departments FOR ALL USING (true);
CREATE POLICY "Public sports" ON sports FOR ALL USING (true);
CREATE POLICY "Public registrations" ON registrations FOR ALL USING (true);
CREATE POLICY "Public audit_logs" ON audit_logs FOR ALL USING (true);

-- Default Initial Batches
INSERT INTO batches (year) VALUES
('2023'), ('2024'), ('2025'), ('2026')
ON CONFLICT (year) DO NOTHING;

-- Default Initial Departments
INSERT INTO departments (name, code, description) VALUES
('Computer Science', 'CS', 'Department of CS'),
('Electrical Engineering', 'EE', 'Department of Electrical'),
('Mechanical Engineering', 'ME', 'Department of Mechanical'),
('Civil Engineering', 'CE', 'Department of Civil'),
('Chemical Engineering', 'CH', 'Department of Chemical'),
('Business Administration', 'BBA', 'School of Business')
ON CONFLICT (code) DO NOTHING;

-- Default Initial Sports
INSERT INTO sports (name, code, formats, fee) VALUES
('Badminton', 'BADM', '["Single (1v1)", "Doubles (2v2)"]'::jsonb, 500.00),
('Cricket', 'CRIC', '["Tape Ball (8v8)"]'::jsonb, 3000.00),
('Futsal', 'FUTS', '["Team (7v7)"]'::jsonb, 2500.00),
('Table Tennis', 'TT', '["Single (1v1)", "Doubles (2v2)"]'::jsonb, 300.00),
('Chess', 'CHESS', '["Single (1v1)"]'::jsonb, 250.00),
('Ludo', 'LUDO', '["Single (1v1)", "Doubles (2v2)"]'::jsonb, 200.00)
ON CONFLICT (code) DO NOTHING;

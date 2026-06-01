-- Consultorio System — inicialización PostgreSQL multi-schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- btree_gist omitido (no requerido por el MVP; puede no estar habilitado en Supabase)
-- "auth" está reservado por Supabase Auth → usamos app_auth
CREATE SCHEMA IF NOT EXISTS app_auth;
CREATE SCHEMA IF NOT EXISTS employees;
CREATE SCHEMA IF NOT EXISTS patients;
CREATE SCHEMA IF NOT EXISTS appointments;
CREATE SCHEMA IF NOT EXISTS professionals;

-- APP AUTH (usuarios del consultorio)
CREATE TABLE IF NOT EXISTS app_auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin','recepcion','profesional')),
    employee_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON app_auth.users(email) WHERE deleted_at IS NULL;

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    address TEXT,
    phone VARCHAR(40),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS employees.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    document VARCHAR(20),
    phone VARCHAR(40),
    branch_id UUID REFERENCES employees.branches(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- PROFESSIONALS
CREATE TABLE IF NOT EXISTS professionals.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS professionals.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    license_number VARCHAR(40),
    default_slot_minutes INT NOT NULL DEFAULT 30,
    user_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS professionals.professional_specialties (
    professional_id UUID REFERENCES professionals.professionals(id) ON DELETE CASCADE,
    specialty_id UUID REFERENCES professionals.specialties(id) ON DELETE CASCADE,
    PRIMARY KEY (professional_id, specialty_id)
);

CREATE TABLE IF NOT EXISTS professionals.weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals.professionals(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE (professional_id, branch_id, day_of_week, start_time)
);

-- PATIENTS
CREATE TABLE IF NOT EXISTS patients.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(10) NOT NULL DEFAULT 'DNI',
    document_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    phone VARCHAR(40),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (document_type, document_number)
);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'programado',
    payment_status VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    attendance_status VARCHAR(16),
    cancel_reason TEXT,
    cancelled_by UUID,
    cancelled_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_payment CHECK (payment_status IN ('pendiente','pagado','parcial'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_start
    ON appointments.appointments(professional_id, branch_id, start_at)
    WHERE deleted_at IS NULL AND status != 'cancelado';

CREATE TABLE IF NOT EXISTS appointments.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(48) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT,
    entity_type VARCHAR(32),
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON appointments.notifications(user_id, is_read, created_at DESC);

-- SEED especialidades
INSERT INTO professionals.specialties (code, name) VALUES
    ('CLINICA', 'Clínica médica'),
    ('PEDIATRIA', 'Pediatría'),
    ('GINECOLOGIA', 'Ginecología'),
    ('CARDIOLOGIA', 'Cardiología'),
    ('DERMATOLOGIA', 'Dermatología'),
    ('TRAUMATOLOGIA', 'Traumatología'),
    ('PSIQUIATRIA', 'Psiquiatría'),
    ('ODONTOLOGIA', 'Odontología')
ON CONFLICT (code) DO NOTHING;

-- College Event Management Portal
-- Final Schema Version
-- UUID + Soft Delete Strategy
-- FK Policy: ON DELETE RESTRICT, ON UPDATE CASCADE (applied to every foreign key)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- MASTER TABLES
-- =====================================================

CREATE TABLE school (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(200) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

CREATE TABLE owner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_name VARCHAR(200) NOT NULL,
    owner_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(owner_name, owner_type)
);

CREATE TABLE event_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(200) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(category_name, category_type)
);

CREATE TABLE event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_name VARCHAR(200) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT','STAFF','ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

CREATE TABLE student_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    registration_id VARCHAR(50) UNIQUE NOT NULL,
    school_id UUID NOT NULL REFERENCES school(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

CREATE TABLE staff_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

CREATE TABLE admin_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

CREATE TABLE file_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    storage_path TEXT UNIQUE NOT NULL,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

-- =====================================================
-- EVENTS
-- =====================================================

CREATE TABLE event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_series_id UUID NOT NULL REFERENCES event_series(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    short_description TEXT,
    detailed_description TEXT,
    poster_file_id UUID REFERENCES file_store(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    details_pdf_file_id UUID REFERENCES file_store(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    venue VARCHAR(255),
    owner_id UUID NOT NULL REFERENCES owner(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    event_category_id UUID NOT NULL REFERENCES event_category(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    participation_type VARCHAR(20) NOT NULL CHECK (participation_type IN ('INDIVIDUAL','GROUP')),
    registration_start_date TIMESTAMP,
    registration_end_date TIMESTAMP,
    event_start_date TIMESTAMP,
    event_end_date TIMESTAMP,
    participant_cap INTEGER CHECK (participant_cap > 0),
    min_team_size INTEGER,
    max_team_size INTEGER,
    result_positions INTEGER DEFAULT 3 CHECK (result_positions >= 0),
    created_by_staff_id UUID NOT NULL REFERENCES staff_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    event_status VARCHAR(30) NOT NULL,
    visibility_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

CREATE TABLE coordinator_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    coordinator_type VARCHAR(20) NOT NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(event_id, user_id)
);

-- =====================================================
-- REGISTRATION
-- =====================================================

CREATE TABLE registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    registration_status VARCHAR(30) NOT NULL,
    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(event_id, student_profile_id)
);

CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    created_by_student_id UUID NOT NULL REFERENCES student_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    team_status VARCHAR(30) NOT NULL,
    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(event_id, team_name)
);

CREATE TABLE team_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(team_id, student_profile_id)
);

-- =====================================================
-- ATTENDANCE & RESULTS
-- =====================================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    attendance_status VARCHAR(20) NOT NULL,
    marked_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    marked_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(event_id, student_profile_id)
);

CREATE TABLE result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    position_name VARCHAR(100) NOT NULL,
    position_rank INTEGER NOT NULL,
    published_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    published_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL,
    UNIQUE(event_id, position_rank)
);

CREATE TABLE result_recipient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES result(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    student_profile_id UUID REFERENCES student_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    team_id UUID REFERENCES team(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID NULL
);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    action VARCHAR(255),
    entity_name VARCHAR(255),
    entity_id UUID,
    old_value TEXT,
    new_value TEXT,
    action_time TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_student_registration_id ON student_profile(registration_id);
CREATE INDEX idx_event_status ON event(event_status);
CREATE INDEX idx_event_series ON event(event_series_id);
CREATE INDEX idx_event_owner ON event(owner_id);
CREATE INDEX idx_event_category ON event(event_category_id);
CREATE INDEX idx_registration_event ON registration(event_id);
CREATE INDEX idx_team_event ON team(event_id);
CREATE INDEX idx_attendance_event ON attendance(event_id);

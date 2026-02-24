-- Recruitment Examination System - Database Schema Setup
-- Database: Test

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS "Admins" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) DEFAULT 'admin'
);

-- 2. Exams Table
CREATE TABLE IF NOT EXISTS "Exams" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "department_id" VARCHAR(255) NOT NULL,
    "candidate_type_id" VARCHAR(255) NOT NULL,
    "duration_minutes" INTEGER DEFAULT 60
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS "Questions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "exam_id" UUID REFERENCES "Exams"("id") ON DELETE CASCADE,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" INTEGER NOT NULL
);

-- 4. Invitations Table
CREATE TABLE IF NOT EXISTS "Invitations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "exam_id" UUID REFERENCES "Exams"("id") ON DELETE CASCADE,
    "token" VARCHAR(255) UNIQUE NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending'
);

-- 5. Candidates Table
CREATE TABLE IF NOT EXISTS "Candidates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(20) NOT NULL,
    "qualification" VARCHAR(255),
    "registered_by" UUID REFERENCES "Admins"("id") ON DELETE SET NULL
);

-- 6. Attempts Table
CREATE TABLE IF NOT EXISTS "Attempts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "candidate_id" UUID REFERENCES "Candidates"("id") ON DELETE CASCADE,
    "exam_id" UUID REFERENCES "Exams"("id") ON DELETE CASCADE,
    "candidate_email" VARCHAR(255),
    "candidate_mobile" VARCHAR(20),
    "score" INTEGER DEFAULT 0,
    "total_questions" INTEGER DEFAULT 0,
    "percentage" DECIMAL(5, 2) DEFAULT 0.00,
    "status" VARCHAR(50) DEFAULT 'ongoing',
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "tab_switch_count" INTEGER DEFAULT 0,
    "fullscreen_exit_count" INTEGER DEFAULT 0,
    "face_detection_violations" INTEGER DEFAULT 0,
    "multi_face_violations" INTEGER DEFAULT 0,
    "mic_violations" INTEGER DEFAULT 0
);

-- Seed Initial Admin User (Password: admin)
INSERT INTO "Admins" ("name", "email", "password", "role") 
VALUES ('HR Manager', 'hr@company.com', 'admin', 'admin')
ON CONFLICT ("email") DO NOTHING;

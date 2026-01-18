-- =============================================
-- ITC Student Management System - Database Schema
-- Version: 2.0 (Professional & Dynamic)
-- =============================================

-- Enable UUID extension for more secure IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments (Lookup Table)
-- Stores the various departments within the institute.
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE, -- e.g., 'GIC', 'GCI'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Authentication & Authorization)
-- Centralized user management for Admins, Lecturers, and Students.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'lecturer', 'student')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Students (Profile Data)
-- Extended profile information for students, linked to their User account.
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Link to login credentials
    student_id_card VARCHAR(20) UNIQUE NOT NULL, -- Physical ID Card Number (e.g., e20201234)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female')),
    dob DATE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    generation VARCHAR(20), -- e.g., "Gen 43"
    address TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Lecturers (Profile Data)
-- Profile information for lecturers.
CREATE TABLE IF NOT EXISTS lecturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id),
    title VARCHAR(50), -- e.g., "Dr.", "Mr.", "Ms."
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Academic Years & Semesters (Time Periods)
-- Dynamic management of school years to avoid hardcoding.
CREATE TABLE IF NOT EXISTS academic_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- e.g., "2024-2025"
    semester INTEGER CHECK (semester IN (1, 2)) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE, -- Only one period should be active at a time
    UNIQUE(name, semester)
);

-- 6. Courses (Subjects)
-- Subjects offered by departments.
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "I3.01"
    credits INTEGER DEFAULT 3,
    department_id UUID REFERENCES departments(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Course Offerings (Classes)
-- A specific instance of a course taught by a lecturer in a specific period.
-- This allows the same course to be taught by different people in different years.
CREATE TABLE IF NOT EXISTS course_offerings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    room VARCHAR(50), -- e.g., "A-201"
    schedule_info VARCHAR(100), -- e.g., "Mon 8:00-11:00"
    UNIQUE(course_id, period_id)
);

-- 8. Enrollments (Student -> Course Offering)
-- Records which student is taking which specific class instance.
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    UNIQUE(student_id, offering_id)
);

-- 9. Marks (Grades)
-- Stores the scores for a specific enrollment.
CREATE TABLE IF NOT EXISTS marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    attendance_score DECIMAL(5, 2) DEFAULT 0 CHECK (attendance_score <= 10),
    midterm_score DECIMAL(5, 2) DEFAULT 0 CHECK (midterm_score <= 30),
    final_score DECIMAL(5, 2) DEFAULT 0 CHECK (final_score <= 60),
    -- Total score is calculated dynamically in views or application logic, 
    -- but storing a cached value can be useful for performance if triggers are used.
    total_score DECIMAL(5, 2) GENERATED ALWAYS AS (attendance_score + midterm_score + final_score) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TRIGGERS (Automation)
-- =============================================

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_marks_modtime BEFORE UPDATE ON marks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- VIEWS (Reporting & Analytics)
-- =============================================

-- 1. Student Transcript View
-- A comprehensive view to see a student's performance across all courses.
CREATE OR REPLACE VIEW view_student_transcripts AS
SELECT 
    s.student_id_card,
    s.first_name,
    s.last_name,
    c.name AS course_name,
    c.code AS course_code,
    c.credits,
    ap.name AS academic_year,
    ap.semester,
    m.attendance_score,
    m.midterm_score,
    m.final_score,
    m.total_score,
    CASE 
        WHEN m.total_score >= 85 THEN 'A'
        WHEN m.total_score >= 80 THEN 'B+'
        WHEN m.total_score >= 70 THEN 'B'
        WHEN m.total_score >= 65 THEN 'C+'
        WHEN m.total_score >= 50 THEN 'C'
        WHEN m.total_score >= 45 THEN 'D'
        WHEN m.total_score >= 0 THEN 'F'
        ELSE 'N/A'
    END AS letter_grade,
    CASE 
        WHEN m.total_score >= 85 THEN 4.0
        WHEN m.total_score >= 80 THEN 3.5
        WHEN m.total_score >= 70 THEN 3.0
        WHEN m.total_score >= 65 THEN 2.5
        WHEN m.total_score >= 50 THEN 2.0
        WHEN m.total_score >= 45 THEN 1.5
        WHEN m.total_score >= 0 THEN 0.0
        ELSE 0.0
    END AS grade_point
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN course_offerings co ON e.offering_id = co.id
JOIN courses c ON co.course_id = c.id
JOIN academic_periods ap ON co.period_id = ap.id
LEFT JOIN marks m ON e.id = m.enrollment_id;

-- =============================================
-- SEED DATA (Initial Setup)
-- =============================================

-- Insert Departments
INSERT INTO departments (name, code) VALUES 
('Génie Informatique et Communication', 'GIC'),
('Génie Electrique et Energétique', 'GEE'),
('Génie Civil', 'GCI')
ON CONFLICT (code) DO NOTHING;

-- Insert Academic Year
INSERT INTO academic_periods (name, semester, is_active) VALUES
('2024-2025', 1, TRUE)
ON CONFLICT (name, semester) DO NOTHING;

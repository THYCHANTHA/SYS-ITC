-- =============================================
-- PHASE 6-10: ADVANCED FEATURES SCHEMA
-- =============================================

-- =============================================
-- PHASE 6: ATTENDANCE MANAGEMENT
-- =============================================

-- Class Sessions (for attendance tracking)
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    topic VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'absent',
    marked_by UUID REFERENCES users(id),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(enrollment_id, session_id)
);

-- =============================================
-- PHASE 7: EXAMINATION & ASSESSMENT SYSTEM
-- =============================================

-- Exams
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    exam_type VARCHAR(50) CHECK (exam_type IN ('midterm', 'final', 'quiz', 'practical')) NOT NULL,
    exam_date DATE,
    start_time TIME,
    duration INTEGER, -- minutes
    room VARCHAR(100),
    max_score DECIMAL(5,2) DEFAULT 100,
    weight DECIMAL(5,2) DEFAULT 0, -- percentage of final grade
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    max_score DECIMAL(5,2) DEFAULT 100,
    weight DECIMAL(5,2) DEFAULT 0,
    allow_late BOOLEAN DEFAULT false,
    late_penalty DECIMAL(5,2) DEFAULT 10, -- percentage penalty per day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(500),
    content TEXT,
    score DECIMAL(5,2),
    feedback TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id, student_id)
);

-- =============================================
-- PHASE 8: FINANCIAL MANAGEMENT SYSTEM
-- =============================================

-- Fee Structures
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id),
    academic_year VARCHAR(20),
    semester INTEGER,
    tuition_fee DECIMAL(10,2) DEFAULT 0,
    per_credit_fee DECIMAL(10,2) DEFAULT 0,
    registration_fee DECIMAL(10,2) DEFAULT 0,
    lab_fee DECIMAL(10,2) DEFAULT 0,
    library_fee DECIMAL(10,2) DEFAULT 0,
    other_fees JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Fees
CREATE TABLE IF NOT EXISTS student_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id),
    period_id UUID REFERENCES academic_periods(id),
    total_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    due_date DATE,
    status VARCHAR(50) CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'mobile_payment')),
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(100) UNIQUE,
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scholarships
CREATE TABLE IF NOT EXISTS scholarships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('merit', 'need_based', 'sports', 'other')),
    criteria TEXT,
    available_slots INTEGER DEFAULT 1,
    application_deadline DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scholarship Applications
CREATE TABLE IF NOT EXISTS scholarship_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    application_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    documents JSONB,
    essay TEXT,
    decision_date DATE,
    decision_by UUID REFERENCES users(id),
    decision_notes TEXT,
    UNIQUE(scholarship_id, student_id)
);

-- =============================================
-- PHASE 9: COMMUNICATION & NOTIFICATION SYSTEM
-- =============================================

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    target_audience VARCHAR(50) CHECK (target_audience IN ('all', 'department', 'course', 'students', 'lecturers')),
    target_id UUID, -- department_id or offering_id
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    published_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    attachments JSONB,
    is_active BOOLEAN DEFAULT true
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    sent_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_date TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID REFERENCES messages(id), -- for threading
    attachments JSONB
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('grade', 'payment', 'announcement', 'message', 'enrollment', 'attendance', 'exam')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Queue (for automated emails)
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    template_name VARCHAR(100),
    status VARCHAR(50) CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PHASE 10: DOCUMENT MANAGEMENT & REPORTING
-- =============================================

-- Documents (Certificates, ID Cards, etc.)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    document_type VARCHAR(100) CHECK (document_type IN ('id_card', 'transcript', 'certificate', 'enrollment_cert', 'recommendation')),
    document_number VARCHAR(100) UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    file_path VARCHAR(500),
    issued_by UUID REFERENCES users(id),
    verification_code VARCHAR(100) UNIQUE,
    status VARCHAR(50) CHECK (status IN ('active', 'expired', 'revoked')) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    language VARCHAR(10) CHECK (language IN ('km', 'en')) DEFAULT 'km',
    template_content TEXT NOT NULL,
    variables JSONB, -- list of variables used in template
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report Schedules (Automated Reports)
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'semester')) NOT NULL,
    recipients JSONB NOT NULL, -- array of email addresses
    parameters JSONB,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_offering ON class_sessions(offering_id);

-- Exam & Assignment indexes
CREATE INDEX IF NOT EXISTS idx_exams_offering ON exams(offering_id);
CREATE INDEX IF NOT EXISTS idx_assignments_offering ON assignments(offering_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_fee ON payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_apps_student ON scholarship_applications(student_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification ON documents(verification_code);

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- Attendance Summary View
CREATE OR REPLACE VIEW view_attendance_summary AS
SELECT 
    s.id as student_id,
    s.student_id_card,
    s.first_name || ' ' || s.last_name as student_name,
    c.code as course_code,
    c.name as course_name,
    COUNT(a.id) as total_sessions,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
    ROUND((SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100, 2) as attendance_percentage
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN course_offerings co ON e.offering_id = co.id
JOIN courses c ON co.course_id = c.id
LEFT JOIN attendance a ON e.id = a.enrollment_id
GROUP BY s.id, s.student_id_card, s.first_name, s.last_name, c.code, c.name;

-- Financial Summary View
CREATE OR REPLACE VIEW view_financial_summary AS
SELECT 
    s.id as student_id,
    s.student_id_card,
    s.first_name || ' ' || s.last_name as student_name,
    d.name as department_name,
    SUM(sf.total_amount) as total_fees,
    SUM(sf.paid_amount) as total_paid,
    SUM(sf.balance) as total_balance,
    STRING_AGG(DISTINCT sf.status, ', ') as payment_status
FROM students s
JOIN departments d ON s.department_id = d.id
LEFT JOIN student_fees sf ON s.id = sf.student_id
GROUP BY s.id, s.student_id_card, s.first_name, s.last_name, d.name;

-- =============================================
-- SEED DATA FOR NEW TABLES
-- =============================================

-- Insert default fee structure
INSERT INTO fee_structures (department_id, academic_year, semester, tuition_fee, per_credit_fee, registration_fee, lab_fee, library_fee)
SELECT id, '2024-2025', 1, 500.00, 50.00, 100.00, 50.00, 25.00
FROM departments
ON CONFLICT DO NOTHING;

-- Insert sample scholarship
INSERT INTO scholarships (name, description, amount, type, available_slots, is_active)
VALUES 
('Excellence Scholarship', 'For students with GPA above 3.5', 1000.00, 'merit', 10, true),
('Need-Based Aid', 'For students with financial difficulties', 500.00, 'need_based', 20, true)
ON CONFLICT DO NOTHING;

import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const stats: any = {};

    if (user?.role === 'admin' || user?.role === 'lecturer') {
        // 1. Counts
        const students = await pool.query('SELECT COUNT(*) FROM students');
        const courses = await pool.query('SELECT COUNT(*) FROM courses');
        const lecturers = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['lecturer']);
        
        stats.counts = {
            students: parseInt(students.rows[0].count),
            courses: parseInt(courses.rows[0].count),
            lecturers: parseInt(lecturers.rows[0].count)
        };

        // 2. Recent Activities (Enrollments)
        const recentEnrollments = await pool.query(`
            SELECT s.first_name, s.last_name, c.code
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN course_offerings co ON e.offering_id = co.id
            JOIN courses c ON co.course_id = c.id
            ORDER BY e.enrolled_at DESC LIMIT 5
        `);
        stats.recentEnrollments = recentEnrollments.rows;

        // 3. Financial Overview (Admin only)
        if (user.role === 'admin') {
            const finance = await pool.query(`
                SELECT 
                    SUM(total_amount) as total_expected,
                    SUM(paid_amount) as total_collected
                FROM student_fees
            `);
            stats.finance = finance.rows[0];
        }
    }

    if (user?.role === 'student') {
        // Student specific stats
        const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
        if (studentRes.rows.length > 0) {
            const studentId = studentRes.rows[0].id;

            // Enrolled Courses
            const enrollments = await pool.query('SELECT COUNT(*) FROM enrollments WHERE student_id = $1', [studentId]);
            stats.enrolledCourses = parseInt(enrollments.rows[0].count);

            // Upcoming Exams
            const exams = await pool.query(`
                SELECT e.exam_date, e.start_time, c.name as course_name
                FROM exams e
                JOIN course_offerings co ON e.offering_id = co.id
                JOIN courses c ON co.course_id = c.id
                JOIN enrollments en ON co.id = en.offering_id
                WHERE en.student_id = $1 AND e.exam_date >= CURRENT_DATE
                ORDER BY e.exam_date ASC LIMIT 3
            `, [studentId]);
            stats.upcomingExams = exams.rows;

            // Unpaid Fees
            const fees = await pool.query(`
                SELECT SUM(balance) as total_due FROM student_fees WHERE student_id = $1
            `, [studentId]);
            stats.totalDue = fees.rows[0].total_due || 0;
        }
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

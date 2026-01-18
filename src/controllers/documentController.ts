import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get Full Transcript Data
export const getTranscriptData = async (req: AuthRequest, res: Response) => {
  try {
    const { student_id } = req.params;
    const user = req.user;

    // Security check
    if (user?.role === 'student') {
        const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
        if (studentRes.rows.length === 0 || studentRes.rows[0].id !== student_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }

    // 1. Student Info
    const studentInfo = await pool.query(
        `SELECT s.*, d.name as department_name 
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.id = $1`,
        [student_id]
    );

    if (studentInfo.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    // 2. Academic History (Grades)
    const grades = await pool.query(
        `SELECT m.total_score, c.name as course_name, c.code as course_code, c.credits,
                ap.name as academic_year, ap.semester
         FROM marks m
         JOIN enrollments e ON m.enrollment_id = e.id
         JOIN course_offerings co ON e.offering_id = co.id
         JOIN courses c ON co.course_id = c.id
         JOIN academic_periods ap ON co.period_id = ap.id
         WHERE e.student_id = $1
         ORDER BY ap.name, ap.semester, c.code`,
        [student_id]
    );

    res.json({
        student: studentInfo.rows[0],
        grades: grades.rows
    });

  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

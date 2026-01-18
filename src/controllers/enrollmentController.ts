import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get enrollments (Admin sees all, Student sees own)
export const getEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, period_id } = req.query;
    const user = req.user;

    let query = `
      SELECT e.*, 
             s.first_name as student_first_name, s.last_name as student_last_name, s.student_id_card,
             c.name as course_name, c.code as course_code, c.credits,
             ap.name as period_name, ap.semester,
             l.last_name as lecturer_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN course_offerings co ON e.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN academic_periods ap ON co.period_id = ap.id
      LEFT JOIN lecturers l ON co.lecturer_id = l.id
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    let whereClause = [];

    // Role-based filtering
    if (user?.role === 'student') {
        // First get the student profile ID from the user ID
        const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
        if (studentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        const studentProfileId = studentRes.rows[0].id;
        whereClause.push(`e.student_id = $${paramCount}`);
        params.push(studentProfileId);
        paramCount++;
    } else if (student_id) {
        // Admin filtering by student
        whereClause.push(`e.student_id = $${paramCount}`);
        params.push(student_id);
        paramCount++;
    }

    if (period_id) {
        whereClause.push(`co.period_id = $${paramCount}`);
        params.push(period_id);
        paramCount++;
    }

    if (whereClause.length > 0) {
        query += ' WHERE ' + whereClause.join(' AND ');
    }
    
    query += ` ORDER BY ap.name DESC, s.last_name, c.code`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Enroll a student
export const createEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, offering_id } = req.body;
    const user = req.user;
    
    let targetStudentId = student_id;

    // If student is self-enrolling
    if (user?.role === 'student') {
        const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
        if (studentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        targetStudentId = studentRes.rows[0].id;
    } else if (!targetStudentId) {
        return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check if already enrolled
    const check = await pool.query(
        'SELECT * FROM enrollments WHERE student_id = $1 AND offering_id = $2',
        [targetStudentId, offering_id]
    );

    if (check.rows.length > 0) {
        return res.status(400).json({ error: 'Student is already enrolled in this course' });
    }

    // Create enrollment
    const result = await pool.query(
      `INSERT INTO enrollments (student_id, offering_id, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
      [targetStudentId, offering_id]
    );
    
    // Initialize marks record for this enrollment (Phase 5 prep)
    await pool.query(
        `INSERT INTO marks (enrollment_id) VALUES ($1)`,
        [result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Drop/Update enrollment
export const updateEnrollmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'dropped', 'completed'
    
    const result = await pool.query(
      `UPDATE enrollments SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete enrollment (Admin only - hard delete)
export const deleteEnrollment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM enrollments WHERE id = $1', [id]);
        res.json({ message: 'Enrollment deleted' });
    } catch (error) {
        console.error('Error deleting enrollment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

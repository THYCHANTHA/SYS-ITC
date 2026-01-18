import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get grades for a specific offering (Lecturer view) or student (Student view)
export const getGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { offering_id, student_id } = req.query;
    const user = req.user;

    let query = `
      SELECT m.*, 
             e.student_id, e.offering_id,
             s.first_name, s.last_name, s.student_id_card,
             c.name as course_name, c.code as course_code, c.credits
      FROM marks m
      JOIN enrollments e ON m.enrollment_id = e.id
      JOIN students s ON e.student_id = s.id
      JOIN course_offerings co ON e.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    let whereClause = [];

    if (user?.role === 'student') {
        // Student sees their own grades
        const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
        if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
        whereClause.push(`e.student_id = $${paramCount}`);
        params.push(studentRes.rows[0].id);
        paramCount++;
    } else if (user?.role === 'lecturer') {
        // Lecturer sees grades for their offerings
        // Ideally we check if they teach this offering, but for now we trust the offering_id filter
        if (!offering_id) {
             // If no offering specified, show all courses they teach? 
             // Or maybe just require offering_id. Let's require offering_id for now or filter by lecturer.
             const lecturerRes = await pool.query('SELECT id FROM lecturers WHERE user_id = $1', [user.userId]);
             if (lecturerRes.rows.length > 0) {
                 whereClause.push(`co.lecturer_id = $${paramCount}`);
                 params.push(lecturerRes.rows[0].id);
                 paramCount++;
             }
        }
    }

    if (offering_id) {
        whereClause.push(`e.offering_id = $${paramCount}`);
        params.push(offering_id);
        paramCount++;
    }

    if (student_id && user?.role === 'admin') {
        whereClause.push(`e.student_id = $${paramCount}`);
        params.push(student_id);
        paramCount++;
    }

    if (whereClause.length > 0) {
        query += ' WHERE ' + whereClause.join(' AND ');
    }
    
    query += ` ORDER BY s.last_name, s.first_name`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update grades (Admin or Lecturer)
export const updateGrades = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // marks id
    const { attendance_score, midterm_score, final_score } = req.body;
    
    // Validate scores
    if (attendance_score > 10 || midterm_score > 30 || final_score > 60) {
        return res.status(400).json({ error: 'Invalid score range. Attendance(10), Midterm(30), Final(60).' });
    }

    const result = await pool.query(
      `UPDATE marks 
       SET attendance_score = $1, midterm_score = $2, final_score = $3
       WHERE id = $4
       RETURNING *`,
      [attendance_score || 0, midterm_score || 0, final_score || 0, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating grades:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

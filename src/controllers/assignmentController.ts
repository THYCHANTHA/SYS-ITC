import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get Assignments
export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { offering_id } = req.query;
    
    let query = `
      SELECT a.*, 
             c.name as course_name, c.code as course_code
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
    `;
    
    const params: any[] = [];
    if (offering_id) {
        query += ` WHERE a.offering_id = $1`;
        params.push(offering_id);
    }
    
    query += ` ORDER BY a.due_date`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create Assignment
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { offering_id, title, description, due_date, max_score, weight } = req.body;
    
    const result = await pool.query(
      `INSERT INTO assignments (offering_id, title, description, due_date, max_score, weight)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [offering_id, title, description, due_date, max_score, weight]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Submit Assignment
export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { assignment_id, content, file_path } = req.body;
    const user = req.user;

    // Get Student ID
    const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
    const studentId = studentRes.rows[0].id;

    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, content, file_path, submission_date)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (assignment_id, student_id) 
       DO UPDATE SET content = EXCLUDED.content, file_path = EXCLUDED.file_path, submission_date = NOW()
       RETURNING *`,
      [assignment_id, studentId, content, file_path]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Submissions (for Lecturer)
export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const { assignment_id } = req.params;
    
    const result = await pool.query(
      `SELECT s.*, st.first_name, st.last_name, st.student_id_card
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       WHERE s.assignment_id = $1
       ORDER BY s.submission_date DESC`,
      [assignment_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

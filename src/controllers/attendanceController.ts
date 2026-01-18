import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get all sessions for an offering
export const getSessions = async (req: Request, res: Response) => {
  try {
    const { offering_id } = req.query;
    
    if (!offering_id) {
        return res.status(400).json({ error: 'Offering ID is required' });
    }

    const result = await pool.query(
      `SELECT * FROM class_sessions 
       WHERE offering_id = $1 
       ORDER BY session_date DESC, start_time DESC`,
      [offering_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create a new class session
export const createSession = async (req: Request, res: Response) => {
  try {
    const { offering_id, session_date, start_time, topic } = req.body;
    
    const result = await pool.query(
      `INSERT INTO class_sessions (offering_id, session_date, start_time, topic)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [offering_id, session_date, start_time, topic]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get attendance for a specific session
export const getSessionAttendance = async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;

    // We need to get all students enrolled in the offering associated with this session
    // AND their attendance status if it exists.
    const result = await pool.query(
      `SELECT 
         s.id as student_id, s.first_name, s.last_name, s.student_id_card,
         e.id as enrollment_id,
         a.id as attendance_id, a.status, a.notes
       FROM class_sessions cs
       JOIN enrollments e ON cs.offering_id = e.offering_id
       JOIN students s ON e.student_id = s.id
       LEFT JOIN attendance a ON a.session_id = cs.id AND a.enrollment_id = e.id
       WHERE cs.id = $1 AND e.status = 'active'
       ORDER BY s.last_name, s.first_name`,
      [session_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching session attendance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Mark attendance (Bulk update or single)
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, attendance_data } = req.body; 
    // attendance_data should be an array: [{ enrollment_id, status, notes }]
    const userId = req.user?.userId;

    if (!Array.isArray(attendance_data)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of attendance_data) {
            // Upsert attendance record
            await client.query(
                `INSERT INTO attendance (enrollment_id, session_id, status, notes, marked_by)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (enrollment_id, session_id) 
                 DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, marked_at = NOW(), marked_by = EXCLUDED.marked_by`,
                [item.enrollment_id, session_id, item.status, item.notes || '', userId]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Attendance saved successfully' });
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Student Attendance Report
export const getStudentAttendanceReport = async (req: AuthRequest, res: Response) => {
    try {
        const { student_id, offering_id } = req.query;
        
        // Basic summary stats
        const result = await pool.query(
            `SELECT 
                status, COUNT(*) as count
             FROM attendance a
             JOIN enrollments e ON a.enrollment_id = e.id
             WHERE e.student_id = $1 AND e.offering_id = $2
             GROUP BY status`,
            [student_id, offering_id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

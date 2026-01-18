import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get Exams
export const getExams = async (req: AuthRequest, res: Response) => {
  try {
    const { offering_id } = req.query;
    const user = req.user;

    let query = `
      SELECT e.*, 
             c.name as course_name, c.code as course_code,
             ap.name as period_name
      FROM exams e
      JOIN course_offerings co ON e.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN academic_periods ap ON co.period_id = ap.id
    `;
    
    const params: any[] = [];
    
    if (offering_id) {
        query += ` WHERE e.offering_id = $1`;
        params.push(offering_id);
    }
    
    query += ` ORDER BY e.exam_date, e.start_time`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create Exam
export const createExam = async (req: Request, res: Response) => {
  try {
    const { offering_id, exam_type, exam_date, start_time, duration, room, max_score, weight, instructions } = req.body;
    
    const result = await pool.query(
      `INSERT INTO exams (offering_id, exam_type, exam_date, start_time, duration, room, max_score, weight, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [offering_id, exam_type, exam_date, start_time, duration, room, max_score, weight, instructions]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Allocate Seats (Simple Random Allocation)
export const allocateSeats = async (req: Request, res: Response) => {
  try {
    const { exam_id } = req.params;
    
    // 1. Get Exam Details
    const examRes = await pool.query('SELECT * FROM exams WHERE id = $1', [exam_id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRes.rows[0];

    // 2. Get Enrolled Students
    const studentsRes = await pool.query(
        `SELECT student_id FROM enrollments WHERE offering_id = $1 AND status = 'active'`,
        [exam.offering_id]
    );
    const students = studentsRes.rows;

    // 3. Generate Seat Numbers (e.g., A1, A2, ... B1, B2...)
    // This is a simplified logic. In real world, we'd check room capacity.
    const seats = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let rowIdx = 0;
    let seatNum = 1;

    for (let i = 0; i < students.length; i++) {
        if (seatNum > 10) { seatNum = 1; rowIdx++; } // 10 seats per row
        const seatLabel = `${rows[rowIdx % rows.length]}${seatNum}`;
        seats.push({ student_id: students[i].student_id, seat: seatLabel });
        seatNum++;
    }

    // 4. Return allocation (In a real system, we would save this to an 'exam_seats' table)
    // For now, we'll just return the generated map for the frontend to display/print
    res.json({
        exam: exam,
        allocations: seats
    });

  } catch (error) {
    console.error('Error allocating seats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

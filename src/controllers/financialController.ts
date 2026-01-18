import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get Fee Structures
export const getFeeStructures = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT fs.*, d.name as department_name 
       FROM fee_structures fs
       LEFT JOIN departments d ON fs.department_id = d.id
       ORDER BY fs.academic_year DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create Fee Structure
export const createFeeStructure = async (req: Request, res: Response) => {
  try {
    const { department_id, academic_year, semester, tuition_fee, registration_fee } = req.body;
    
    const result = await pool.query(
      `INSERT INTO fee_structures (department_id, academic_year, semester, tuition_fee, registration_fee)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [department_id, academic_year, semester, tuition_fee, registration_fee]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating fee structure:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Student Fees (Invoice)
export const getStudentFees = async (req: AuthRequest, res: Response) => {
  try {
    const { student_id } = req.query;
    const user = req.user;
    
    let targetStudentId = student_id;

    // Student can only see their own fees
    if (user?.role === 'student') {
        const studentRes = await pool.query('SELECT id FROM students WHERE user_id = $1', [user.userId]);
        if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
        targetStudentId = studentRes.rows[0].id;
    }

    if (!targetStudentId) {
        // Admin viewing all? Or require filter? Let's return all for admin if no filter
        if (user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT sf.*, 
             s.first_name, s.last_name, s.student_id_card,
             fs.academic_year, fs.semester, fs.tuition_fee
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN fee_structures fs ON sf.fee_structure_id = fs.id
    `;
    
    const params = [];
    if (targetStudentId) {
        query += ` WHERE sf.student_id = $1`;
        params.push(targetStudentId);
    }
    
    query += ` ORDER BY sf.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Assign Fee to Student (Generate Invoice)
export const assignFee = async (req: Request, res: Response) => {
  try {
    const { student_id, fee_structure_id, due_date } = req.body;
    
    // Get fee amount
    const feeStruct = await pool.query('SELECT * FROM fee_structures WHERE id = $1', [fee_structure_id]);
    if (feeStruct.rows.length === 0) return res.status(404).json({ error: 'Fee structure not found' });
    
    const total = parseFloat(feeStruct.rows[0].tuition_fee) + parseFloat(feeStruct.rows[0].registration_fee);

    const result = await pool.query(
      `INSERT INTO student_fees (student_id, fee_structure_id, total_amount, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, fee_structure_id, total, due_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning fee:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Record Payment
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { student_fee_id, amount, payment_method, notes } = req.body;
    const userId = req.user?.userId;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Payment Record
        const paymentRes = await client.query(
            `INSERT INTO payments (student_fee_id, amount, payment_method, notes, processed_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [student_fee_id, amount, payment_method, notes, userId]
        );

        // 2. Update Student Fee Balance & Status
        // Get current paid amount
        const feeRes = await client.query('SELECT total_amount, paid_amount FROM student_fees WHERE id = $1', [student_fee_id]);
        const currentPaid = parseFloat(feeRes.rows[0].paid_amount);
        const total = parseFloat(feeRes.rows[0].total_amount);
        const newPaid = currentPaid + parseFloat(amount);
        
        let status = 'partial';
        if (newPaid >= total) status = 'paid';
        else if (newPaid === 0) status = 'unpaid';

        await client.query(
            `UPDATE student_fees SET paid_amount = $1, status = $2 WHERE id = $3`,
            [newPaid, status, student_fee_id]
        );

        await client.query('COMMIT');
        res.status(201).json(paymentRes.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

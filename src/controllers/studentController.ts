import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getAllStudents called by user:', req.user);
    
    let query = `
      SELECT s.*, d.name as department_name, d.code as department_code 
      FROM students s 
      LEFT JOIN departments d ON s.department_id = d.id
    `;
    
    const params: any[] = [];
    
    // If student, only return their own profile
    if (req.user && req.user.role === 'student') {
        console.log('Filtering for student with userId:', req.user.userId);
        query += ` WHERE s.user_id = $1`;
        params.push(req.user.userId);
    }
    
    query += ` ORDER BY s.created_at DESC`;

    console.log('Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    console.log('Query result:', result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  const { first_name, last_name, gender, dob, department_id, email, phone, student_id_card, generation } = req.body;
  
  // Basic validation
  if (!first_name || !last_name || !student_id_card) {
      return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Create User (Default password: student123)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('student123', 10);
    
    const userResult = await pool.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [student_id_card, email || `${student_id_card}@itc.edu.kh`, hashedPassword, 'student']
    );
    const userId = userResult.rows[0].id;

    // 2. Create Student Profile
    const result = await pool.query(
      `INSERT INTO students (user_id, student_id_card, first_name, last_name, gender, dob, department_id, phone, generation) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [userId, student_id_card, first_name, last_name, gender, dob, department_id, phone, generation]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error(error);
    if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Student ID or Email already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const student = await pool.query('SELECT user_id FROM students WHERE id = $1', [id]);
        if (student.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const userId = student.rows[0].user_id;
        
        if (userId) {
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        } else {
            await pool.query('DELETE FROM students WHERE id = $1', [id]);
        }

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { first_name, last_name, gender, department_id, phone, generation } = req.body;
    
    try {
        const result = await pool.query(
            `UPDATE students 
             SET first_name = $1, last_name = $2, gender = $3, department_id = $4, phone = $5, generation = $6, updated_at = NOW()
             WHERE id = $7 
             RETURNING *`,
            [first_name, last_name, gender, department_id, phone, generation, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getStudentById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT s.*, d.name as department_name, d.code as department_code 
            FROM students s 
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE s.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error in getStudentById:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

import { Request, Response } from 'express';
import pool from '../config/db';

// Get all lecturers
export const getAllLecturers = async (req: Request, res: Response) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT l.*, d.name as department_name, d.code as department_code,
             u.email, u.username,
             (SELECT COUNT(*) FROM course_offerings co WHERE co.lecturer_id = l.id) as course_count
      FROM lecturers l
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users u ON l.user_id = u.id
    `;
    
    const params: any[] = [];
    
    if (department_id) {
      query += ` WHERE l.department_id = $1`;
      params.push(department_id);
    }
    
    query += ` ORDER BY l.last_name, l.first_name`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lecturers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get single lecturer
export const getLecturerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT l.*, d.name as department_name, u.email, u.username
       FROM lecturers l
       LEFT JOIN departments d ON l.department_id = d.id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching lecturer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create lecturer
export const createLecturer = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, title, position, department_id, email, username } = req.body;
    
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Create user account
    const bcrypt = require('bcrypt');
    const defaultPassword = await bcrypt.hash('lecturer123', 10);
    
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [username || email, email, defaultPassword, 'lecturer']
    );
    
    const userId = userResult.rows[0].id;
    
    // Create lecturer profile
    const result = await pool.query(
      `INSERT INTO lecturers (user_id, first_name, last_name, title, position, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, first_name, last_name, title, position, department_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating lecturer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update lecturer
export const updateLecturer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, title, position, department_id } = req.body;
    
    const result = await pool.query(
      `UPDATE lecturers
       SET first_name = $1, last_name = $2, title = $3, position = $4, department_id = $5
       WHERE id = $6
       RETURNING *`,
      [first_name, last_name, title, position, department_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lecturer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete lecturer
export const deleteLecturer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if lecturer has course offerings
    const offeringCheck = await pool.query(
      'SELECT COUNT(*) FROM course_offerings WHERE lecturer_id = $1',
      [id]
    );
    
    const offeringCount = parseInt(offeringCheck.rows[0].count);
    
    if (offeringCount > 0) {
      return res.status(400).json({
        error: `Cannot delete lecturer with ${offeringCount} course assignments. Please reassign courses first.`
      });
    }
    
    // Get user_id before deleting
    const lecturer = await pool.query('SELECT user_id FROM lecturers WHERE id = $1', [id]);
    
    if (lecturer.rows.length === 0) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    const userId = lecturer.rows[0].user_id;
    
    // Delete user (will cascade to lecturer)
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    res.json({ message: 'Lecturer deleted successfully' });
  } catch (error) {
    console.error('Error deleting lecturer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

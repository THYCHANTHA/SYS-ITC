import { Request, Response } from 'express';
import pool from '../config/db';

export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) as student_count
      FROM departments d 
      ORDER BY code
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  const { name, code } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *',
      [name, code]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE departments SET name = $1, code = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, code, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Check if department has students
    const studentCheck = await pool.query('SELECT COUNT(*) FROM students WHERE department_id = $1', [id]);
    const studentCount = parseInt(studentCheck.rows[0].count);
    
    if (studentCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department with ${studentCount} students. Please reassign students first.` 
      });
    }
    
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

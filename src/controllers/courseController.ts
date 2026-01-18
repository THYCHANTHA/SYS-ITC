import { Request, Response } from 'express';
import pool from '../config/db';

// Get all courses
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT c.*, d.name as department_name, d.code as department_code,
             (SELECT COUNT(*) FROM course_offerings co WHERE co.course_id = c.id) as offering_count
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
    `;
    
    const params: any[] = [];
    
    if (department_id) {
      query += ` WHERE c.department_id = $1`;
      params.push(department_id);
    }
    
    query += ` ORDER BY c.code`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get single course
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, d.name as department_name 
       FROM courses c 
       LEFT JOIN departments d ON c.department_id = d.id 
       WHERE c.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create course
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { name, code, credits, department_id, description } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO courses (name, code, credits, department_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, credits || 3, department_id, description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating course:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Course code already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update course
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, credits, department_id, description } = req.body;
    
    const result = await pool.query(
      `UPDATE courses 
       SET name = $1, code = $2, credits = $3, department_id = $4, description = $5
       WHERE id = $6
       RETURNING *`,
      [name, code, credits, department_id, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating course:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Course code already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete course
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if course has offerings
    const offeringCheck = await pool.query(
      'SELECT COUNT(*) FROM course_offerings WHERE course_id = $1',
      [id]
    );
    
    const offeringCount = parseInt(offeringCheck.rows[0].count);
    
    if (offeringCount > 0) {
      return res.status(400).json({
        error: `Cannot delete course with ${offeringCount} offerings. Please remove offerings first.`
      });
    }
    
    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

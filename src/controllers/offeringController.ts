import { Request, Response } from 'express';
import pool from '../config/db';

// Get all course offerings
export const getAllOfferings = async (req: Request, res: Response) => {
  try {
    const { period_id, department_id } = req.query;
    
    let query = `
      SELECT co.*, 
             c.name as course_name, c.code as course_code, c.credits,
             l.first_name as lecturer_first_name, l.last_name as lecturer_last_name, l.title as lecturer_title,
             ap.name as period_name, ap.semester
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      JOIN academic_periods ap ON co.period_id = ap.id
      LEFT JOIN lecturers l ON co.lecturer_id = l.id
    `;
    
    const params: any[] = [];
    let paramCount = 1;

    if (period_id) {
      query += ` WHERE co.period_id = $${paramCount}`;
      params.push(period_id);
      paramCount++;
    }

    // Filter by department if needed (requires joining departments via courses)
    if (department_id) {
      query += period_id ? ` AND` : ` WHERE`;
      query += ` c.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }
    
    query += ` ORDER BY ap.name DESC, ap.semester DESC, c.code ASC`;
    
    console.log('Offerings Query:', query);
    console.log('Offerings Params:', params);
    
    const result = await pool.query(query, params);
    
    console.log('Offerings Result Count:', result.rows.length);
    console.log('Offerings Result:', result.rows);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching offerings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get single offering
export const getOfferingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT co.*, 
              c.name as course_name, c.code as course_code,
              l.first_name as lecturer_first_name, l.last_name as lecturer_last_name,
              ap.name as period_name, ap.semester
       FROM course_offerings co
       JOIN courses c ON co.course_id = c.id
       JOIN academic_periods ap ON co.period_id = ap.id
       LEFT JOIN lecturers l ON co.lecturer_id = l.id
       WHERE co.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offering not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching offering:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create offering
export const createOffering = async (req: Request, res: Response) => {
  try {
    const { course_id, period_id, lecturer_id, room, schedule_info } = req.body;
    
    if (!course_id || !period_id) {
      return res.status(400).json({ error: 'Course and Academic Period are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO course_offerings (course_id, period_id, lecturer_id, room, schedule_info)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [course_id, period_id, lecturer_id || null, room, schedule_info]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating offering:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This course is already offered in this period' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update offering
export const updateOffering = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { course_id, period_id, lecturer_id, room, schedule_info } = req.body;
    
    const result = await pool.query(
      `UPDATE course_offerings 
       SET course_id = $1, period_id = $2, lecturer_id = $3, room = $4, schedule_info = $5
       WHERE id = $6
       RETURNING *`,
      [course_id, period_id, lecturer_id || null, room, schedule_info, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offering not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating offering:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This course is already offered in this period' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete offering
export const deleteOffering = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for enrollments before deleting
    const enrollmentCheck = await pool.query(
        'SELECT COUNT(*) FROM enrollments WHERE offering_id = $1',
        [id]
    );

    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
        return res.status(400).json({ error: 'Cannot delete offering with active enrollments.' });
    }

    const result = await pool.query(
      'DELETE FROM course_offerings WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offering not found' });
    }
    
    res.json({ message: 'Offering deleted successfully' });
  } catch (error) {
    console.error('Error deleting offering:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Academic Periods
export const getAcademicPeriods = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM academic_periods ORDER BY start_date DESC, name DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching academic periods:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

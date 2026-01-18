import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Get Messages (Inbox/Sent)
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { type } = req.query; // 'inbox' or 'sent'

    let query = '';
    if (type === 'sent') {
        query = `
          SELECT m.*, u.username as recipient_name, u.role as recipient_role
          FROM messages m
          JOIN users u ON m.recipient_id = u.id
          WHERE m.sender_id = $1
          ORDER BY m.sent_date DESC`;
    } else {
        query = `
          SELECT m.*, u.username as sender_name, u.role as sender_role
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.recipient_id = $1
          ORDER BY m.sent_date DESC`;
    }
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Send Message
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { recipient_username, subject, content } = req.body;
    const senderId = req.user?.userId;

    // Find recipient ID
    const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [recipient_username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Recipient not found' });
    const recipientId = userRes.rows[0].id;

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, subject, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, recipientId, subject, content]
    );

    // Create Notification
    await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'message', 'New Message', $2, '/messages.html')`,
        [recipientId, `You have a new message from ${req.user?.role}`]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Announcements
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.username as author_name 
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       WHERE a.is_active = true
       ORDER BY a.priority DESC, a.published_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create Announcement
export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, target_audience, priority } = req.body;
    const authorId = req.user?.userId;
    
    const result = await pool.query(
      `INSERT INTO announcements (title, content, author_id, target_audience, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, authorId, target_audience, priority]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

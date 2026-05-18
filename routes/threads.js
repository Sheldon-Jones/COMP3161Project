const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// ─── GET ALL THREADS IN A FORUM ───────────────────────────────────────────────
router.get('/forums/:forumId/threads', authenticate, async (req, res) => {
  const { forumId } = req.params;
  try {
    const [threads] = await pool.query(
      `SELECT dt.*, u.name AS author_name
       FROM discussion_thread dt
       JOIN \`User\` u ON dt.user_id = u.user_id
       WHERE dt.forum_id = ? AND dt.parent_thread_id IS NULL
       ORDER BY dt.created_date DESC`,
      [forumId]
    );
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve threads' });
  }
});

// ─── GET A SINGLE THREAD WITH ALL NESTED REPLIES ─────────────────────────────
router.get('/:threadId', authenticate, async (req, res) => {
  const { threadId } = req.params;
  try {
    const [rows] = await pool.query(
      `WITH RECURSIVE thread_tree AS (
          SELECT dt.*, u.name AS author_name
          FROM discussion_thread dt
          JOIN \`User\` u ON dt.user_id = u.user_id
          WHERE dt.thread_id = ?
          UNION ALL
          SELECT dt.*, u.name AS author_name
          FROM discussion_thread dt
          JOIN \`User\` u ON dt.user_id = u.user_id
          JOIN thread_tree tt ON dt.parent_thread_id = tt.thread_id
       )
       SELECT * FROM thread_tree ORDER BY created_date`,
      [threadId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve thread' });
  }
});

// ─── CREATE THREAD (MATCHES YOUR SCHEMA PERFECTLY) ───────────────────────────
router.post('/forums/:forumId/threads', authenticate, async (req, res) => {
  const { forumId }        = req.params;
  const { title, content } = req.body;
  
  // Guard checking for the user object from the authentication token payload
  const user_id = req.user ? req.user.user_id : null; 

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  try {
    // 1. Fixed table name to lowercase 'discussion_forum'
    const [forumRows] = await pool.query(
      'SELECT course_id FROM discussion_forum WHERE forum_id = ?',
      [forumId]
    );
    
    if (!forumRows || forumRows.length === 0) {
      return res.status(404).json({ error: `Forum with ID ${forumId} not found.` });
    }

    const course_id = forumRows[0].course_id;

    // 2. Fixed query table destination name to lowercase 'discussion_thread'
    const [result] = await pool.query(
      `INSERT INTO discussion_thread 
          (course_id, forum_id, user_id, title, content, created_date) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [course_id, forumId, user_id, title, content]
    );
    
    return res.status(201).json({ 
      message: 'Thread created successfully', 
      thread_id: result.insertId 
    });

  } catch (err) {
    console.error("Database Error details:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── REPLY TO A THREAD ───────────────────────────────────────────────────────
router.post('/:threadId/reply', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const { content }  = req.body;
  const user_id      = req.user ? req.user.user_id : null;

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    const [parent] = await pool.query(
      'SELECT forum_id, course_id FROM discussion_thread WHERE thread_id = ?',
      [threadId]
    );
    if (parent.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { forum_id, course_id } = parent[0];
    const [result] = await pool.query(
      `INSERT INTO discussion_thread 
          (course_id, forum_id, user_id, parent_thread_id, content, created_date) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [course_id, forum_id, user_id, threadId, content]
    );
    res.status(201).json({ message: 'Reply added successfully', thread_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

module.exports = router;
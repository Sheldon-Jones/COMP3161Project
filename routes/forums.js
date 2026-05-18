const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// ─── GET ALL FORUMS FOR A SPECIFIC COURSE ────────────────────────────────────
router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM discussion_forum WHERE course_id = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// CREATE A NEW DISCUSSION FORUM FOR A COURSE. 
router.post('/course/:id', authenticate, async (req, res) => {
  const course_id = req.params.id;
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  
  try {
    const [rows] = await pool.query(
      `INSERT INTO discussion_forum (course_id, title, description) VALUES (?, ?, ?)`,
      [course_id, title, description]
    );
    res.status(201).json({ message: "Forum created", forum_id: rows.insertId });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

//GET ALL  THREADS IN A FORUM 
router.get('/:id/threads', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dt.*, u.name AS author_name
       FROM discussion_thread dt
       JOIN User u ON dt.user_id = u.user_id
       WHERE dt.forum_id = ? AND dt.parent_thread_id IS NULL
       ORDER BY dt.created_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

//CREATE A NEW THREAD INSIDE A FORUM 
router.post('/:id/threads', authenticate, async (req, res) => {
  const { title, content } = req.body;
  const forum_id = req.params.id;
  const user_id = req.user ? req.user.user_id : null;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  try {
    // 1. Check if the forum exists and grab its course_id
    const [forum] = await pool.query(
      `SELECT course_id FROM discussion_forum WHERE forum_id = ?`, 
      [forum_id]
    );
    
    if (forum.length === 0) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // 2. FIXED: course_id is now explicitly defined in this scope!
    const course_id = forum[0].course_id;

    // 3. Insert using the correct lowercase table name
    const [result] = await pool.query(
      `INSERT INTO discussion_thread
          (course_id, forum_id, user_id, title, content, created_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
       [course_id, forum_id, user_id, title, content]
    );

    res.status(201).json({ 
      message: 'Thread created successfully', 
      thread_id: result.insertId 
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ─── REPLY TO A THREAD OR REPLIES ────────────────────────────────────────────
router.post('/threads/:id/replies', authenticate, async (req, res) => {
  const { body, parent_reply_id } = req.body;
  
  if (!body) {
    return res.status(400).json({ error: 'body is required' });
  }
  
  try {
    // Look up the parent thread context to inherit its forum and course IDs
    const [parentRows] = await pool.query(
      `SELECT forum_id, course_id FROM discussion_thread WHERE thread_id = ?`,
      [req.params.id]
    );
    
    if (parentRows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { forum_id, course_id } = parentRows[0];
    const parentId = parent_reply_id || req.params.id;
    const user_id = req.user ? req.user.user_id : null;

    const [result] = await pool.query(
      `INSERT INTO discussion_thread 
          (course_id, forum_id, user_id, parent_thread_id, title, content, created_date)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [course_id, forum_id, user_id, parentId, 'Re: Reply', body]
    );

    res.status(201).json({ 
      message: "Reply added successfully", 
      thread_id: result.insertId 
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});


//Get all replies to a thread id
router.get('/threads/:id/replies', authenticate, async (req, res) => {
  const threadId = req.params.id;
  
  try {
    // Queries the discussion_thread table for entries where parent_thread_id matches
    const [replies] = await pool.query(
      `SELECT dt.*, u.name AS author_name
       FROM discussion_thread dt
       JOIN User u ON dt.user_id = u.user_id
       WHERE dt.parent_thread_id = ?
       ORDER BY dt.created_date ASC`,
      [threadId]
    );

    // Even if there are 0 replies, return an empty array [] with a 200 OK status
    return res.json(replies);

  } catch (err) {
    console.error("Error retrieving thread replies:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
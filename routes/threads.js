const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// ─── GET THREADS ──────────────────────────────────────────────────────────────

// GET /api/threads/forum/:forumId  –  All top-level threads in a forum
router.get('/forum/:forumId', authenticate, async (req, res) => {
  const { forumId } = req.params;
  try {
    const [threads] = await pool.query(
      `SELECT dt.*, u.name AS author_name
       FROM Discussion_Thread dt
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

// GET /api/threads/:threadId  –  A single thread and all nested replies (recursive)
router.get('/:threadId', authenticate, async (req, res) => {
  const { threadId } = req.params;
  try {
    // Recursive CTE: requires MySQL 8.0+
    const [rows] = await pool.query(
      `WITH RECURSIVE thread_tree AS (
         SELECT dt.*, u.name AS author_name
         FROM Discussion_Thread dt
         JOIN \`User\` u ON dt.user_id = u.user_id
         WHERE dt.thread_id = ?
         UNION ALL
         SELECT dt.*, u.name AS author_name
         FROM Discussion_Thread dt
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

// ─── CREATE THREAD ────────────────────────────────────────────────────────────

// POST /api/threads/forum/:forumId  –  Start a new top-level thread (any authenticated user)
router.post('/forum/:forumId', authenticate, async (req, res) => {
  const { forumId }     = req.params;
  const { course_name, content } = req.body;
  const user_id         = req.user.user_id;

  if (!course_name || !content) {
    return res.status(400).json({ error: 'course_name and content are required' });
  }

  try {
    // Derive course_id from the forum
    const [forum] = await pool.query(
      'SELECT course_id FROM Discussion_Forum WHERE forum_id = ?',
      [forumId]
    );
    if (forum.length === 0) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    const course_id = forum[0].course_id;
    const [result]  = await pool.query(
      `INSERT INTO Discussion_Thread
         (course_id, forum_id, user_id, parent_thread_id, course_name, content)
       VALUES (?, ?, ?, NULL, ?, ?)`,
      [course_id, forumId, user_id, course_name, content]
    );
    res.status(201).json({ message: 'Thread created successfully', thread_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// ─── REPLY TO THREAD ─────────────────────────────────────────────────────────

// POST /api/threads/:threadId/reply  –  Reply to any thread (supports nested Reddit-style replies)
router.post('/:threadId/reply', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const { content }  = req.body;
  const user_id      = req.user.user_id;

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    // Inherit forum_id and course_id from the parent thread
    const [parent] = await pool.query(
      'SELECT thread_id, forum_id, course_id FROM Discussion_Thread WHERE thread_id = ?',
      [threadId]
    );
    if (parent.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { forum_id, course_id } = parent[0];
    const [result] = await pool.query(
      `INSERT INTO Discussion_Thread
         (course_id, forum_id, user_id, parent_thread_id, course_name, content)
       VALUES (?, ?, ?, ?, NULL, ?)`,
      [course_id, forum_id, user_id, threadId, content]
    );
    res.status(201).json({ message: 'Reply added successfully', thread_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "Discussion_Forum" WHERE course_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id', authenticate, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO "Discussion_Forum" (course_id, title, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, title, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/threads', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dt.*, u.name AS author_name
       FROM "Discussion_Thread" dt
       JOIN "User" u ON dt.user_id = u.user_id
       WHERE dt.forum_id = $1 AND dt.parent_thread_id IS NULL
       ORDER BY dt.created_date DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/threads', authenticate, async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  try {
    const forum = await pool.query(
      `SELECT course_id FROM "Discussion_Forum" WHERE forum_id = $1`, [req.params.id]
    );
    if (forum.rows.length === 0) return res.status(404).json({ error: 'Forum not found' });

    const result = await pool.query(
      `INSERT INTO "Discussion_Thread" (course_id, forum_id, user_id, parent_thread_id, title, content)
       VALUES ($1, $2, $3, NULL, $4, $5) RETURNING *`,
      [forum.rows[0].course_id, req.params.id, req.user.user_id, title, body]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/threads/:id/replies', authenticate, async (req, res) => {
  const { body, parent_reply_id } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });
  try {
    const parent = await pool.query(
      `SELECT forum_id, course_id FROM "Discussion_Thread" WHERE thread_id = $1`,
      [req.params.id]
    );
    if (parent.rows.length === 0) return res.status(404).json({ error: 'Thread not found' });

    const { forum_id, course_id } = parent.rows[0];
    const parentId = parent_reply_id || req.params.id;

    const result = await pool.query(
      `INSERT INTO "Discussion_Thread" (course_id, forum_id, user_id, parent_thread_id, title, content)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [course_id, forum_id, req.user.user_id, parentId, 'Re: reply', body]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
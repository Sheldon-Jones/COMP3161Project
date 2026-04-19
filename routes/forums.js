const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM Discussion_Forum WHERE course_id = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id', authenticate, async (req, res) => {
  const { course_name, description } = req.body;
  if (!course_name) return res.status(400).json({ error: 'course_name is required' });
  try {
    const [rows] = await pool.query(
      `INSERT INTO Discussion_Forum (course_id, course_name, description)
       VALUES (?, ?, ?) RETURNING *`,
      [req.params.id, course_name, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/threads', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dt.*, u.name AS author_name
       FROM Discussion_Thread dt
       JOIN User u ON dt.user_id = u.user_id
       WHERE dt.forum_id = ? AND dt.parent_thread_id IS NULL
       ORDER BY dt.created_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/threads', authenticate, async (req, res) => {
  const { course_name, body } = req.body;
  if (!course_name || !body) return res.status(400).json({ error: 'course_name and body are required' });
  try {
    const forum = await pool.query(
      `SELECT course_id FROM Discussion_Forum WHERE forum_id = ?`, [req.params.id]
    );
    if (forum.rows.length === 0) return res.status(404).json({ error: 'Forum not found' });

    const [rows] = await pool.query(
      `INSERT INTO Discussion_Thread (course_id, forum_id, user_id, parent_thread_id, course_name, content)
       VALUES (?, ?, ?, NULL, ?, ?) RETURNING *`,
      [forum.rows[0].course_id, req.params.id, req.user.user_id, course_name, body]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/threads/:id/replies', authenticate, async (req, res) => {
  const { body, parent_reply_id } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });
  try {
    const parent = await pool.query(
      `SELECT forum_id, course_id FROM Discussion_Thread WHERE thread_id = ?`,
      [req.params.id]
    );
    if (parent.rows.length === 0) return res.status(404).json({ error: 'Thread not found' });

    const { forum_id, course_id } = parent.rows[0];
    const parentId = parent_reply_id || req.params.id;

    const [rows] = await pool.query(
      `INSERT INTO Discussion_Thread (course_id, forum_id, user_id, parent_thread_id, course_name, content)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      [course_id, forum_id, req.user.user_id, parentId, 'Re: reply', body]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
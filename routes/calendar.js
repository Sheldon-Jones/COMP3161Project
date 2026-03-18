const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "Calendar_Event" WHERE course_id = $1 ORDER BY event_date`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:id/date/:date', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.* FROM "Calendar_Event" ce
       JOIN "Assigned_To" a ON ce.course_id = a.course_id
       WHERE a.user_id = $1 AND ce.event_date = $2
       ORDER BY ce.event_type`,
      [req.params.id, req.params.date]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { title, description, event_date, event_type } = req.body;
  if (!title || !event_date)
    return res.status(400).json({ error: 'title and event_date are required' });
  try {
    const result = await pool.query(
      `INSERT INTO "Calendar_Event" (course_id, title, description, event_date, event_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, title, description, event_date, event_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  try {
    await pool.query(`DELETE FROM "Calendar_Event" WHERE event_id = $1`, [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
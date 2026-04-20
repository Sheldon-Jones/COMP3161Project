const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM Calendar_Event WHERE course_id = ? ORDER BY event_date`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:id/date/:date', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ce.* FROM Calendar_Event ce
       JOIN Assigned_To a ON ce.course_id = a.course_id
       WHERE a.user_id = ? AND ce.event_date = ?
       ORDER BY ce.event_type`,
      [req.params.id, req.params.date]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { course_id, title, description, event_date, event_type } = req.body;
  if (!course_id || !event_date)
    return res.status(400).json({ error: 'course_id and event_date are required' });
    try {
    const result = await pool.query(
      `INSERT INTO Calendar_Event (course_id, title, description, event_date, event_type)
       VALUES (?, ?, ?, ?, ?) `,
      [course_id, title, description, event_date, event_type]
    );
    res.status(201).json({ 
      message: "Event created successfully",
      eventId: result.insertId 
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  try {
    await pool.query(`DELETE FROM Calendar_Event WHERE event_id = ?`, [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/students/:userId/events  –  Calendar events for a student across all enrolled courses
// Optional query param: ?date=YYYY-MM-DD  to filter by a specific date
router.get('/:userId/events', authenticate, async (req, res) => {
  const { userId } = req.params;
  const { date }   = req.query;

  try {
    let query =
      `SELECT ce.*
       FROM Calendar_Event ce
       JOIN Assigned_To at ON ce.course_id = at.course_id
       WHERE at.user_id = ?`;
    const params = [userId];

    if (date) {
      query += ' AND ce.event_date = ?';
      params.push(date);
    }

    query += ' ORDER BY ce.event_date, ce.course_name';

    const [events] = await pool.query(query, params);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve calendar events' });
  }
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/courses — all courses
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "Course" ORDER BY course_id`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/courses — admin only
router.post('/', authenticate, requireRole('Admin'), async (req, res) => {
  const { course_id, course_name, description } = req.body;
  if (!course_id || !course_name)
    return res.status(400).json({ error: 'course_id and course_name are required' });
  try {
    await pool.query(
      `INSERT INTO "Course" (course_id, course_name, description) VALUES ($1, $2, $3)`,
      [course_id, course_name, description]
    );
    res.status(201).json({ message: 'Course created', course_id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Course ID already exists' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/student/:id — courses for a student
router.get('/student/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.* FROM "Course" c
       JOIN "Assigned_To" a ON c.course_id = a.course_id
       WHERE a.user_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/courses/lecturer/:id — courses for a lecturer
router.get('/lecturer/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.* FROM "Course" c
       JOIN "Maintains" m ON c.course_id = m.course_id
       WHERE m.user_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/courses/:id/assign-lecturer — admin only
router.post('/:id/assign-lecturer', authenticate, requireRole('Admin'), async (req, res) => {
  const { lecturer_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO "Maintains" (user_id, course_id) VALUES ($1, $2)`,
      [lecturer_id, req.params.id]
    );
    res.status(201).json({ message: 'Lecturer assigned to course' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already assigned' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/enroll', authenticate, requireRole('Student'), async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO "Assigned_To" (user_id, course_id, enrollment_date) VALUES ($1, $2, CURRENT_DATE)`,
      [req.user.user_id, req.params.id]
    );
    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already enrolled' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/enroll', authenticate, requireRole('Student'), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM "Assigned_To" WHERE user_id = $1 AND course_id = $2`,
      [req.user.user_id, req.params.id]
    );
    res.json({ message: 'Unenrolled successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/members', authenticate, async (req, res) => {
  try {
    const students = await pool.query(
      `SELECT u.user_id, u.name, u.email, 'Student' AS role
       FROM "User" u JOIN "Assigned_To" a ON u.user_id = a.user_id
       WHERE a.course_id = $1`,
      [req.params.id]
    );
    const lecturers = await pool.query(
      `SELECT u.user_id, u.name, u.email, 'Lecturer' AS role
       FROM "User" u JOIN "Maintains" m ON u.user_id = m.user_id
       WHERE m.course_id = $1`,
      [req.params.id]
    );
    res.json({ lecturers: lecturers.rows, students: students.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
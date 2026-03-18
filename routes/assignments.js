const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "Assignment" WHERE course_id = $1 ORDER BY due_date`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { title, description, due_date, max_grade } = req.body;
  if (!title || !due_date) return res.status(400).json({ error: 'title and due_date required' });
  try {
    const result = await pool.query(
      `INSERT INTO "Assignment" (course_id, title, description, due_date, max_marks)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, title, description, due_date, max_grade || 100]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/submit', authenticate, requireRole('Student'), async (req, res) => {
  const { submission_text, submission_url } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "Submission" (user_id, assignment_id, submission_date)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [req.user.user_id, req.params.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already submitted' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/submissions', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name AS student_name
       FROM "Submission" s
       JOIN "User" u ON s.user_id = u.user_id
       WHERE s.assignment_id = $1
       ORDER BY s.submission_date`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/grade/:student_id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { grade } = req.body;
  if (grade === undefined) return res.status(400).json({ error: 'grade is required' });
  try {
    await pool.query(
      `UPDATE "Submission" SET grade = $1
       WHERE assignment_id = $2 AND user_id = $3`,
      [grade, req.params.id, req.params.student_id]
    );
    res.json({ message: 'Grade submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:id/averages', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.course_id, c.course_name,
              ROUND(AVG(s.grade), 2) AS average,
              COUNT(s.submission_id) AS submissions
       FROM "Submission" s
       JOIN "Assignment" a ON s.assignment_id = a.assignment_id
       JOIN "Course" c ON a.course_id = c.course_id
       WHERE s.user_id = $1 AND s.grade IS NOT NULL
       GROUP BY a.course_id, c.course_name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
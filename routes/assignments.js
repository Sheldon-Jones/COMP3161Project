const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM Assignment WHERE course_id = ? ORDER BY due_date`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { course_name, title, description, due_date, max_grade } = req.body;
  if (!course_name || !due_date)
    return res.status(400).json({ error: 'course_name and due_date required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO Assignment (course_id, title, description, due_date, max_marks)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, title, description, due_date, max_grade || 100]
    );
    const [newAssignment] = await pool.query('SELECT * FROM `Assignment` WHERE assignment_id = ?', [result.insertId]);
    res.status(201).json(newAssignment[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/submit', authenticate, requireRole('Student'), async (req, res) => {
  const { submission_text} = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO Submission (user_id, assignment_id, submission_text, submission_date)
       VALUES (?, ?, ?, NOW())`,
      [req.user.user_id, req.params.id, submission_text]
    );
    const [newSubmission] = await pool.query ('SELECT * FROM Submission WHERE submission_id = ?', [result.insertId]);
    res.status(201).json(newSubmission[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already submitted' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/submissions', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name AS student_name
       FROM Submission s
       JOIN User u ON s.user_id = u.user_id
       WHERE s.assignment_id = ?
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
    const [result] = await pool.query(
      `UPDATE Submission SET grade = ?
       WHERE assignment_id = ? AND user_id = ?`,
       
      [grade, req.params.id, req.params.student_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Grade submitted', grade: grade });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:id/averages', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.course_id, c.course_name,
              ROUND(AVG(s.grade), 2) AS average,
              COUNT(s.submission_id) AS submissions
       FROM Submission s
       JOIN Assignment a ON s.assignment_id = a.assignment_id
       JOIN Course c ON a.course_id = c.course_id
       WHERE s.user_id = ? AND s.grade IS NOT NULL
       GROUP BY a.course_id, c.course_name`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
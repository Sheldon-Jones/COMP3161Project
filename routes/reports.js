const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.use(authenticate, requireRole('Admin'));

router.get('/courses-50-plus-students', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vw_courses_50_plus`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/students-5-plus-courses', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vw_students_5_plus`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/lecturers-3-plus-courses', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vw_lecturers_3_plus`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/top-10-enrolled-courses', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vw_top_10_enrolled`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/top-10-students', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vw_top_10_students`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
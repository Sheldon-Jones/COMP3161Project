const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.get('/course/:id', authenticate, async (req, res) => {
  try {
    const sections = await pool.query(
      `SELECT * FROM Section WHERE course_id = ? ORDER BY sec_order`,
      [req.params.id]
    );
    for (const section of sections.rows) {
      const items = await pool.query(
        `SELECT * FROM Section_Item
         WHERE course_id = ? AND section_num = ?`,
        [req.params.id, section.section_num]
      );
      section.items = items.rows;
    }
    res.json(sections.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/course/:id/sections', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { course_name, position } = req.body;
  if (!course_name) return res.status(400).json({ error: 'course_name is required' });
  try {
    const count = await pool.query(
      `SELECT COUNT(*) FROM Section WHERE course_id = ?`, [req.params.id]
    );
    const section_num = parseInt(count.rows[0].count) + 1;
    await pool.query(
      `INSERT INTO Section (course_id, section_num, course_name, sec_order)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, section_num, course_name, position || section_num]
    );
    res.status(201).json({ message: 'Section created', section_num });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/sections/:num', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { course_name, position, course_id } = req.body;
  try {
    await pool.query(
      `UPDATE Section SET course_name = ?, sec_order = ?
       WHERE section_num = ? AND course_id = ?`,
      [course_name, position, req.params.num, course_id]
    );
    res.json({ message: 'Section updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sections/:num', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { course_id } = req.body;
  try {
    await pool.query(
      `DELETE FROM Section WHERE section_num = ? AND course_id = ?`,
      [req.params.num, course_id]
    );
    res.json({ message: 'Section deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sections/:num/items', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  const { course_name, content_type, url, description, course_id } = req.body;
  if (!course_name || !course_id) return res.status(400).json({ error: 'course_name and course_id are required' });
  try {
    const result = await pool.query(
      `INSERT INTO Section_Item (course_id, section_num, course_name, type, content)
       VALUES (?, ?, ?, ?, ?) `,
      [course_id, req.params.num, course_name, content_type, url || description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/items/:id', authenticate, requireRole('Lecturer', 'Admin'), async (req, res) => {
  try {
    await pool.query(`DELETE FROM Section_Item WHERE item_id = ?`, [req.params.id]);
    res.json({ message: 'Item deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
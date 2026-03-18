const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { name, email, password, user_type, department, date_enrolled } = req.body;
  if (!name || !email || !password || !user_type)
    return res.status(400).json({ error: 'name, email, password, user_type are required' });

  const validTypes = ['Admin', 'Lecturer', 'Student'];
  if (!validTypes.includes(user_type))
    return res.status(400).json({ error: 'user_type must be Admin, Lecturer, or Student' });

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO "User" (name, email, password, user_type)
       VALUES ($1, $2, $3, $4) RETURNING user_id`,
      [name, email, hashed, user_type]
    );
    const user_id = result.rows[0].user_id;

    if (user_type === 'Admin') {
      await pool.query(`INSERT INTO "Admin" (user_id) VALUES ($1)`, [user_id]);
    } else if (user_type === 'Lecturer') {
      if (!department)
        return res.status(400).json({ error: 'department is required for Lecturer' });
      await pool.query(
        `INSERT INTO "Lecturer" (user_id, department) VALUES ($1, $2)`,
        [user_id, department]
      );
    } else if (user_type === 'Student') {
      const enrolled = date_enrolled || new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO "Student" (user_id, date_enrolled) VALUES ($1, $2)`,
        [user_id, enrolled]
      );
    }

    res.status(201).json({ message: 'User registered successfully', user_id });
  } catch (err) {
    if (err.code === '23505') 
      return res.status(409).json({ error: 'Email already in use' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    const result = await pool.query(
      `SELECT * FROM "User" WHERE email = $1`, [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { user_id: user.user_id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user_id: user.user_id, user_type: user.user_type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, user_type FROM "User" WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

module.exports = router;
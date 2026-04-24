const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');

// testing if route is working
/*  router.get('/whoami', (req, res) => {
  res.json({ message: "I am the ROUTES file" });
}); 
 */

const { authenticate } = require('../middleware/authMiddleware');


//route to create a new user
router.post('/register', async (req, res) => {
  const { name, email, password, user_type, department, date_enrolled } = req.body;
  if (!name || !email || !password || !user_type)
    return res.status(400).json({ error: 'name, email, password, user_type are required' });

  const validTypes = ['Admin', 'Lecturer', 'Student'];
  if (!validTypes.includes(user_type))
    return res.status(400).json({ error: 'user_type must be Admin, Lecturer, or Student' });

  try {
    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO user (name, email, password, user_type)
       VALUES (?, ?, ?, ?)`,
      [name, email, hashed, user_type]
    );
    const user_id = result.insertId;
    console.log("Newly created User ID:", user_id);

    if (user_type === 'Admin') {
      await pool.query(`INSERT INTO Admin (user_id) VALUES (?)`, [user_id]);
    } else if (user_type === 'Lecturer') {
      if (!department)
        return res.status(400).json({ error: 'department is required for Lecturer' });
      await pool.query(
        `INSERT INTO Lecturer (user_id, department) VALUES (?, ?)`,
        [user_id, department]
      );
    } else if (user_type === 'Student') {
      const enrolled = date_enrolled || new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO Student (user_id, date_enrolled) VALUES (?, ?)`,
        [user_id, enrolled]
      );
    }

    res.status(201).json({ message: 'User registered successfully', user_id });
  } catch (err) {
    if (err.errno === '1062') 
      return res.status(409).json({ error: 'Email already in use' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// the route for logging in user account. It requires id and password
router.post('/login', async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password)
    return res.status(400).json({ error: 'user_id and password are required' });

  try {
    const [rows] = await pool.query(      
      `SELECT * FROM User WHERE user_id = ?`, [user_id]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
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
    const [rows] = await pool.query(
      `SELECT user_id, name, email, user_type FROM User WHERE user_id = ?`,
      [req.user.user_id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

module.exports = router;
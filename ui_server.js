const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

// 1. Load environment variables (JWT_SECRET, DB_HOST, etc.)
dotenv.config();

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Import your modular routes
// Assuming your shared code is saved in ./routes/auth.js
const authRoutes = require('./routes/auth');

// 4. Use the routes
// This prefix means all routes in auth.js start with /auth (e.g., /auth/login)
app.use('/auth', authRoutes);

// 5. Example: Protected Course Route (Move to a separate course router later if preferred)
const pool = require('./db'); // Ensure your db.js exports the promise pool
const { authenticate } = require('./middleware/authMiddleware');

app.get('/api/student/:id/courses', authenticate, async (req, res) => {
    try {
        const [courses] = await pool.query(
            `SELECT c.course_id, c.course_name 
             FROM Enrollment e 
             JOIN Course c ON e.course_id = c.course_id 
             WHERE e.user_id = ?`, 
            [req.params.id]
        );
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
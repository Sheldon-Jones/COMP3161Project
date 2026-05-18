/**
 * ui_server.js
 * Serves the Fi Wi VLE frontend (public/) and all API routes on one port.
 * Run: node ui_server.js
 */

require('dotenv').config();
require('./db');

const express  = require('express');
const path     = require('path');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const app = express();

/* ── MIDDLEWARE ──────────────────────────────────────────────── */
app.use(helmet({ contentSecurityPolicy: false }));  // CSP off so inline scripts work
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

/* ── STATIC FILES — serves public/index.html + public/app.js ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── API ROUTES ──────────────────────────────────────────────── */
const authRoutes       = require('./routes/auth');
const courseRoutes     = require('./routes/courses');
const calendarRoutes   = require('./routes/calendar');
const forumRoutes      = require('./routes/forums');
const threadRoutes     = require('./routes/threads');  // ← ADD THIS LINE
const contentRoutes    = require('./routes/content');
const assignmentRoutes = require('./routes/assignments');
const reportRoutes     = require('./routes/reports');

app.use('/api/auth',        authRoutes);
app.use('/api/courses',     courseRoutes);
app.use('/api/calendar',    calendarRoutes);
app.use('/api/forums',      forumRoutes);
app.use('/api/threads',     threadRoutes);  // ← ADD THIS LINE - mounts threads routes
app.use('/api/content',     contentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reports',     reportRoutes);

/* ── HEALTH CHECK ─────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── SPA FALLBACK — send index.html for any unhandled path ───── */
app.use((req, res, next) => {
  // If the request is a data request meant for the backend API controllers, pass it on
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Otherwise, cleanly hand over your HTML frontend layout dashboard!
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── ERROR HANDLER ────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  🌴  Fi Wi VLE running at http://localhost:${PORT}\n`);
  console.log(`  📚 Mounted routes:`);
  console.log(`     - /api/auth`);
  console.log(`     - /api/courses`);
  console.log(`     - /api/calendar`);
  console.log(`     - /api/forums`);
  console.log(`     - /api/threads  ← Thread routes`);
  console.log(`     - /api/content`);
  console.log(`     - /api/assignments`);
  console.log(`     - /api/reports\n`);
});

module.exports = app;
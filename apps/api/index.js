require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const { sendWelcomeEmail, sendOtpEmail, sendPasswordUpdatedEmail } = require('./email');

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,          // e.g. https://vendor-apex.vercel.app
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3000',
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowed.some(a => origin.startsWith(a))) return callback(null, true);
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));
app.use(express.json());


// ─── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.connect((err, client, release) => {
  if (err) return console.error('DB connect error:', err.stack);
  console.log('✅ PostgreSQL connected');
  release();
});

// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'vb-dev-secret-change-in-prod';
const SALT_ROUNDS = 10;

// ─── In-memory OTP store  { email → { code, expiry, name } } ─────────────────
const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function clearExpiredOtps() {
  const now = Date.now();
  for (const [key, val] of otpStore) {
    if (val.expiry < now) otpStore.delete(key);
  }
}
setInterval(clearExpiredOtps, 60_000);

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}
function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  // Attach full user to request (including vendorId)
  try {
    const { rows } = await pool.query('SELECT id, email, name, role, label, vendor_id FROM accounts WHERE id = $1', [payload.id]);
    if (!rows.length) return res.status(401).json({ error: 'Account not found' });
    req.user = { ...rows[0], vendorId: rows[0].vendor_id };
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Auth check failed' });
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────
const LABELS = {
  officer: 'Procurement Officer',
  manager: 'Manager / Approver',
  vendor:  'Vendor',
  admin:   'Administrator',
};

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN  ─  POST /api/auth/login
//  Body: { email, password }
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { rows } = await pool.query('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase()]);
  const acc = rows[0];

  if (!acc) return res.status(401).json({ error: 'NO_ACCOUNT', message: 'No account found with this email' });

  // Support both bcrypt hashes (new accounts) and plain-text demo passwords
  let valid = false;
  if (acc.pass && acc.pass.startsWith('$2')) {
    valid = await bcrypt.compare(password, acc.pass);
  } else {
    valid = acc.pass === password; // legacy plain-text (demo seed)
  }

  if (!valid) return res.status(401).json({ error: 'WRONG_PASSWORD', message: 'Incorrect password' });

  const token = signToken({ id: acc.id, email: acc.email, role: acc.role });
  res.json({
    token,
    user: {
      id: acc.id,
      email: acc.email,
      name: acc.name,
      role: acc.role,
      label: acc.label,
      vendorId: acc.vendor_id || null,
    },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SIGNUP  ─  POST /api/auth/signup
//  Body: { name, email, password, role, gst? }
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, gst } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'name, email, password and role are required' });

  const validRoles = ['officer', 'manager', 'vendor'];
  if (!validRoles.includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  if (role === 'vendor') {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gst || !gstRegex.test(gst.toUpperCase()))
      return res.status(400).json({ error: 'Invalid GST number (15 chars)' });
  }

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Check existing account
  const existing = await pool.query('SELECT id FROM accounts WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0)
    return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'This email is already registered' });

  const label = LABELS[role] || role;
  const hash  = await bcrypt.hash(password, SALT_ROUNDS);
  let vendorId = null;

  // Create vendor record if needed
  if (role === 'vendor') {
    const vRes = await pool.query(
      `INSERT INTO vendors (name, cat, gst, email, phone, status, rating)
       VALUES ($1, 'Services', $2, $3, '—', 'active', 4.0) RETURNING id`,
      [name, gst.toUpperCase(), email.toLowerCase()]
    );
    vendorId = vRes.rows[0].id;
  }

  // Insert account
  const { rows: [acc] } = await pool.query(
    `INSERT INTO accounts (email, pass, name, role, label, vendor_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email.toLowerCase(), hash, name, role, label, vendorId]
  );

  // Fire welcome email (non-blocking)
  sendWelcomeEmail({ to: email.toLowerCase(), name, role, label }).catch(console.error);

  const token = signToken({ id: acc.id, email: acc.email, role: acc.role });
  res.status(201).json({
    token,
    user: { id: acc.id, email: acc.email, name: acc.name, role: acc.role, label: acc.label, vendorId },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  FORGOT — STEP 1: Send OTP
//  POST /api/auth/forgot/send
//  Body: { email }
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/forgot/send', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { rows } = await pool.query('SELECT name FROM accounts WHERE email = $1', [email.toLowerCase()]);
  if (!rows.length) return res.status(404).json({ error: 'NO_ACCOUNT', message: 'No account found with this email' });

  const otp = generateOtp();
  otpStore.set(email.toLowerCase(), {
    code:   otp,
    name:   rows[0].name,
    expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  // Send OTP email (non-blocking)
  sendOtpEmail({ to: email.toLowerCase(), otp }).catch(console.error);

  res.json({ ok: true, message: 'OTP sent to your email' });
});

// ══════════════════════════════════════════════════════════════════════════════
//  FORGOT — STEP 2: Verify OTP
//  POST /api/auth/forgot/verify
//  Body: { email, otp }
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/forgot/verify', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return res.status(400).json({ error: 'EXPIRED', message: 'OTP expired or not requested' });
  if (Date.now() > entry.expiry) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'EXPIRED', message: 'OTP has expired. Please request a new one.' });
  }
  if (entry.code !== otp.trim()) return res.status(400).json({ error: 'WRONG_OTP', message: 'Incorrect OTP' });

  // Mark as verified (keep in store for the reset step, extend 5 min)
  entry.verified = true;
  entry.expiry   = Date.now() + 5 * 60 * 1000;
  otpStore.set(email.toLowerCase(), entry);

  res.json({ ok: true, message: 'OTP verified' });
});

// ══════════════════════════════════════════════════════════════════════════════
//  FORGOT — STEP 3: Reset Password
//  POST /api/auth/forgot/reset
//  Body: { email, newPassword }
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/forgot/reset', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const entry = otpStore.get(email.toLowerCase());
  if (!entry || !entry.verified || Date.now() > entry.expiry)
    return res.status(400).json({ error: 'SESSION_EXPIRED', message: 'OTP session expired. Please start over.' });

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { rows } = await pool.query(
    `UPDATE accounts SET pass = $1 WHERE email = $2 RETURNING name`,
    [hash, email.toLowerCase()]
  );

  if (!rows.length) return res.status(404).json({ error: 'Account not found' });

  otpStore.delete(email.toLowerCase());

  // Send "password updated" notification (non-blocking)
  sendPasswordUpdatedEmail({ to: email.toLowerCase(), name: rows[0].name }).catch(console.error);

  res.json({ ok: true, message: 'Password updated successfully' });
});

// ══════════════════════════════════════════════════════════════════════════════
//  ME  ─  GET /api/auth/me  (restore session on page load)
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/auth/me', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

  const { rows } = await pool.query('SELECT * FROM accounts WHERE id = $1', [payload.id]);
  if (!rows.length) return res.status(404).json({ error: 'Account not found' });

  const acc = rows[0];
  res.json({
    user: { id: acc.id, email: acc.email, name: acc.name, role: acc.role, label: acc.label, vendorId: acc.vendor_id || null },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() as t');
    res.json({ status: 'ok', time: rows[0].t });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PROCUREMENT ROUTES
// ══════════════════════════════════════════════════════════════════════════════
require('./routes/state')(app, pool, requireAuth);
require('./routes/vendors')(app, pool, requireAuth);
require('./routes/rfqs')(app, pool, requireAuth);
require('./routes/quotes')(app, pool, requireAuth);
require('./routes/billing')(app, pool, requireAuth);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const { execSync } = require('child_process');

function startServer(retries = 3) {
  const server = app.listen(PORT, () =>
    console.log(`🚀 API running at http://localhost:${PORT}`)
  );

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.warn(`⚠️  Port ${PORT} busy — killing blocking process and retrying…`);
      try {
        // Windows: find and kill the PID using that port
        const result = execSync(
          `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTEN') do @echo %a`,
          { shell: 'cmd.exe', encoding: 'utf8' }
        ).trim();
        if (result) {
          result.split('\n').forEach(pid => {
            pid = pid.trim();
            if (pid) {
              try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); }
              catch (e) { /* already gone */ }
            }
          });
        }
      } catch (e) { /* netstat failed — port may have freed itself */ }

      setTimeout(() => startServer(retries - 1), 1000);
    } else {
      console.error('❌ Server failed to start:', err.message);
      process.exit(1);
    }
  });

  // Graceful shutdown on hot-reload (node --watch sends SIGTERM)
  process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
}

startServer();

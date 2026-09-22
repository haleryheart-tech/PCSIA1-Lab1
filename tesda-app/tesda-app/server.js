/**
 * TESDA STVET Portal — Backend (Node.js / Express / MySQL)
 * ---------------------------------------------------------------
 * This file owns everything the frontend needs:
 * - accounts (signup/signin) for STVET Admin + Greenprints
 * - scholar self-service login (search by name, set/enter a password)
 * - scholar records, Greenprints material payables
 * - clearance status (derived) and LandBank check release
 *
 * All of that now lives in MySQL (see TESDA.sql for the schema, db.js
 * for the connection pool) instead of in-memory arrays. Only active
 * sign-in sessions (bearer tokens) stay in memory — that's normal for
 * this kind of token, not a database concern, and it's fine that they
 * reset when the server restarts.
 *
 * Run:
 *   1. Import TESDA.sql in MySQL Workbench (creates the tesda_stvet DB)
 *   2. Copy .env.example to .env and fill in your MySQL password
 *   3. npm install
 *   4. npm start
 * Then open http://localhost:3000
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
   ACTIVE SESSIONS (in memory — bearer tokens, not app data)
   token -> { accountId, role, name, loginId }  (admin/greenprints)
   token -> { scholarId, role: 'student', name }  (scholar)
   ========================================================= */
const sessions = new Map();

/* =========================================================
   CONSTANTS
   ========================================================= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only STVET Admin and Greenprints staff sign up for accounts through
// /api/auth/*. Scholar Student is intentionally NOT here — a scholar
// never creates an "account"; they unlock their existing scholar record
// with a password they set themselves the first time (see the
// scholar-auth routes below).
const ACCOUNT_ROLES = ['admin', 'greenprints'];
const GRANTS = ['TWSP', 'STEP', 'PESFA', 'UAQTEA'];

// Fixed instructional-materials fee every scholar is expected to settle
// with Greenprints. The Scholar Student dashboard tracks progress against
// this constant (paid-so-far vs. this amount), regardless of how many or
// how few individual items make up their own payables list.
const INSTRUCTIONAL_MATERIALS_FEE = 5500;

/* =========================================================
   SHAPING HELPERS (unchanged whether the data came from MySQL or an
   array — they only ever look at plain camelCase JS objects)
   ========================================================= */

function scholarStatus(scholar) {
  const allPaid = scholar.payables.every((p) => p.status === 'PAID');
  return allPaid ? 'CLEARED' : 'ON_HOLD';
}

function paidTotal(scholar) {
  return scholar.payables.reduce((sum, p) => sum + (p.status === 'PAID' ? p.amount : 0), 0);
}

function toSummary(scholar) {
  const paid = paidTotal(scholar);
  return {
    id: scholar.id,
    name: scholar.name,
    program: scholar.program,
    grant: scholar.grant,
    allowance: scholar.allowance,
    checkStatus: scholar.checkStatus,
    checkReceived: !!scholar.checkReceived,
    status: scholarStatus(scholar),
    claimed: !!scholar.claimed,
    materialsFee: INSTRUCTIONAL_MATERIALS_FEE,
    materialsPaid: paid,
    materialsRemaining: Math.max(INSTRUCTIONAL_MATERIALS_FEE - paid, 0)
  };
}

function toDetail(scholar) {
  return { ...toSummary(scholar), payables: scholar.payables };
}

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Wraps an async route handler so a rejected promise (e.g. a DB error)
// reaches Express's error handler instead of crashing/hanging silently.
function asyncRoute(handler) {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

/* =========================================================
   DATA-ACCESS HELPERS (this is the only layer that knows about
   MySQL's snake_case columns — everything above/below this only ever
   sees the same camelCase scholar shape the old in-memory version used)
   ========================================================= */

function mapPayableRow(p) {
  return {
    id: p.id,
    item: p.item,
    amount: p.amount,
    status: p.status,
    orNo: p.or_no || undefined,
    date: p.payment_date || undefined,
    cashier: p.cashier || undefined
  };
}

function mapScholarRow(s, payables) {
  return {
    id: s.id,
    name: s.name,
    program: s.program,
    grant: s.grant_program,
    allowance: s.allowance,
    checkStatus: s.check_status,
    checkReceived: !!s.check_received,
    claimed: !!s.claimed,
    payables
  };
}

async function fetchScholarWithPayables(id) {
  const [scholarRows] = await pool.query('SELECT * FROM scholars WHERE id = ?', [id]);
  if (scholarRows.length === 0) return null;
  const [payableRows] = await pool.query('SELECT * FROM payables WHERE scholar_id = ? ORDER BY id', [id]);
  return mapScholarRow(scholarRows[0], payableRows.map(mapPayableRow));
}

// Every scholar + every payable, grouped in JS. Small demo dataset, so
// two simple queries here is plenty fast and keeps every caller (stats,
// greenprints stats, the scholar list/search) sharing one code path.
async function fetchAllScholarsWithPayables() {
  const [scholarRows] = await pool.query('SELECT * FROM scholars ORDER BY id');
  const [payableRows] = await pool.query('SELECT * FROM payables ORDER BY id');
  const byScholar = new Map();
  payableRows.forEach((p) => {
    const list = byScholar.get(p.scholar_id) || [];
    list.push(mapPayableRow(p));
    byScholar.set(p.scholar_id, list);
  });
  return scholarRows.map((s) => mapScholarRow(s, byScholar.get(s.id) || []));
}

async function fetchScholarSummaries(query) {
  const all = await fetchAllScholarsWithPayables();
  const q = query.toLowerCase();
  const rows = q
    ? all.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.program.toLowerCase().includes(q))
    : all;
  return rows.map(toSummary);
}

// Next sequential scholar ID in the same SCH-2026-XXXX shape as the seed
// data, so newly enrolled scholars fit right in alongside them.
async function nextScholarId() {
  const [rows] = await pool.query('SELECT id FROM scholars');
  let max = 0;
  rows.forEach((r) => {
    const m = /SCH-(\d{4})-(\d+)/.exec(r.id);
    if (m) max = Math.max(max, parseInt(m[2], 10));
  });
  return `SCH-${new Date().getFullYear()}-${String(max + 1).padStart(4, '0')}`;
}

// Next payable id for one scholar (SCH-...-P1, -P2, ...), based on the
// highest existing suffix so a deleted-then-re-added item never collides.
async function nextPayableId(scholarId) {
  const [rows] = await pool.query('SELECT id FROM payables WHERE scholar_id = ?', [scholarId]);
  let max = 0;
  const re = new RegExp('-P(\\d+)$');
  rows.forEach((r) => {
    const m = re.exec(r.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${scholarId}-P${max + 1}`;
}

async function nextAccountId() {
  const [rows] = await pool.query('SELECT id FROM accounts');
  let max = 0;
  rows.forEach((r) => {
    const m = /ACC-(\d+)/.exec(r.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'ACC-' + String(max + 1).padStart(4, '0');
}

/**
 * Auth middleware. Reads "Authorization: Bearer <token>", attaches
 * req.user, and optionally enforces one or more required roles.
 */
function requireAuth(requiredRoles) {
  const allowed = !requiredRoles ? null : Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const session = token && sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
    }
    if (allowed && !allowed.includes(session.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource.' });
    }
    req.user = session;
    next();
  };
}

/* =========================================================
   AUTH ROUTES (STVET Admin + Greenprints accounts)
   ========================================================= */

// POST /api/auth/signup  { role, name, loginId, password }
app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const { role, name, loginId, password } = req.body || {};

  if (!ACCOUNT_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ field: 'name', error: 'Enter your full name.' });
  }
  if (!loginId) {
    return res.status(400).json({ field: 'loginId', error: 'Email address is required.' });
  }
  if (!EMAIL_RE.test(loginId)) {
    return res.status(400).json({ field: 'loginId', error: 'Enter a valid email address.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ field: 'password', error: 'Password must be at least 8 characters.' });
  }

  const [dupRows] = await pool.query(
    'SELECT id FROM accounts WHERE role = ? AND LOWER(login_id) = LOWER(?)',
    [role, loginId]
  );
  if (dupRows.length > 0) {
    return res.status(409).json({ field: 'loginId', error: `An account with this email already exists for ${role}.` });
  }

  const id = await nextAccountId();
  // Demo-only: plaintext password storage. Use bcrypt/argon2 in production.
  await pool.query(
    'INSERT INTO accounts (id, role, name, login_id, password) VALUES (?, ?, ?, ?, ?)',
    [id, role, name.trim(), loginId, password]
  );

  res.status(201).json({ message: 'Account created. Please sign in to continue.' });
}));

// POST /api/auth/signin  { role, loginId, password }
app.post('/api/auth/signin', asyncRoute(async (req, res) => {
  const { role, loginId, password } = req.body || {};

  if (!ACCOUNT_ROLES.includes(role) || !loginId || !password) {
    return res.status(400).json({ error: 'Role, email, and password are all required.' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM accounts WHERE role = ? AND LOWER(login_id) = LOWER(?) AND password = ?',
    [role, loginId, password]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: `No matching ${role} account for that email and password.` });
  }

  const account = rows[0];
  const token = newToken();
  sessions.set(token, { accountId: account.id, role: account.role, name: account.name, loginId: account.login_id });
  res.json({ token, user: { name: account.name, role: account.role, loginId: account.login_id } });
}));

// POST /api/auth/signout
app.post('/api/auth/signout', requireAuth(), (req, res) => {
  const header = req.headers.authorization || '';
  sessions.delete(header.slice(7));
  res.status(204).end();
});

// GET /api/me  (any signed-in role)
// Handles both account-based sessions (admin/greenprints) and scholar
// self-service sessions (student), which carry different shapes.
app.get('/api/me', requireAuth(), (req, res) => {
  if (req.user.scholarId) {
    return res.json({ role: 'student', name: req.user.name, scholarId: req.user.scholarId });
  }
  res.json({ name: req.user.name, role: req.user.role, loginId: req.user.loginId });
});

/* =========================================================
   SCHOLAR PORTAL LOGIN
   ---------------------------------------------------------
   A scholar finds their own record via an open name search (below) that
   returns only their name/ID/program — never financial data. From
   there:
     - First time ever: they SET their own password (self-claim).
     - After that: they SIGN IN with the password they chose.
   ========================================================= */

// GET /api/scholar-auth/search?name=...  (no auth — deliberately minimal)
app.get('/api/scholar-auth/search', asyncRoute(async (req, res) => {
  const query = String(req.query.name || '').trim();
  if (query.length < 2) return res.json([]);
  const [rows] = await pool.query(
    'SELECT id, name, program, claimed FROM scholars WHERE name LIKE ? ORDER BY name',
    [`%${query}%`]
  );
  res.json(rows.map((r) => ({ id: r.id, name: r.name, program: r.program, claimed: !!r.claimed })));
}));

// POST /api/scholar-auth/set-password  { id, password, confirmPassword }
// First-time claim: only works if this scholar record has no password yet.
app.post('/api/scholar-auth/set-password', asyncRoute(async (req, res) => {
  const { id, password, confirmPassword } = req.body || {};
  const [rows] = await pool.query('SELECT * FROM scholars WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Scholar not found.' });
  const s = rows[0];
  if (s.claimed) {
    return res.status(400).json({ error: 'This record already has a password set. Please sign in instead.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ field: 'password', error: 'Password must be at least 8 characters.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ field: 'confirmPassword', error: 'Passwords do not match.' });
  }

  await pool.query('UPDATE scholars SET password = ?, claimed = 1 WHERE id = ?', [password, id]);

  const token = newToken();
  sessions.set(token, { role: 'student', scholarId: id, name: s.name });
  const detail = await fetchScholarWithPayables(id);
  res.status(201).json({ token, scholar: toDetail(detail) });
}));

// POST /api/scholar-auth/signin  { id, password }
// Returning scholar: record must already be claimed.
app.post('/api/scholar-auth/signin', asyncRoute(async (req, res) => {
  const { id, password } = req.body || {};
  const [rows] = await pool.query('SELECT * FROM scholars WHERE id = ?', [id]);
  const s = rows[0];

  if (!s || !s.claimed || !password || s.password !== password) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  const token = newToken();
  sessions.set(token, { role: 'student', scholarId: s.id, name: s.name });
  const detail = await fetchScholarWithPayables(id);
  res.json({ token, scholar: toDetail(detail) });
}));

// GET /api/scholar/me  (student sessions only)
app.get('/api/scholar/me', requireAuth('student'), asyncRoute(async (req, res) => {
  const scholar = await fetchScholarWithPayables(req.user.scholarId);
  if (!scholar) return res.status(404).json({ error: 'Your scholar record could not be found. Please contact STVET Admin.' });
  res.json(toDetail(scholar));
}));

/* =========================================================
   DASHBOARD STATS
   ========================================================= */

// GET /api/stats  (admin only)
app.get('/api/stats', requireAuth('admin'), asyncRoute(async (req, res) => {
  const all = await fetchAllScholarsWithPayables();
  let cleared = 0, hold = 0, released = 0;
  all.forEach((s) => {
    if (scholarStatus(s) === 'CLEARED') cleared++; else hold++;
    if (s.checkStatus === 'RELEASED') released++;
  });
  res.json({ total: all.length, cleared, hold, released });
}));

// GET /api/greenprints/stats  (admin + greenprints)
app.get('/api/greenprints/stats', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const all = await fetchAllScholarsWithPayables();
  let unpaidItems = 0, unpaidAmount = 0, chequesToDeliver = 0;
  all.forEach((s) => {
    s.payables.forEach((p) => { if (p.status !== 'PAID') { unpaidItems++; unpaidAmount += p.amount; } });
    if (s.checkStatus === 'RELEASED' && !s.checkReceived) chequesToDeliver++;
  });
  res.json({ totalScholars: all.length, unpaidItems, unpaidAmount, chequesToDeliver });
}));

/* =========================================================
   ACCOUNTS (admin only)
   ========================================================= */

// GET /api/accounts
app.get('/api/accounts', requireAuth('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT id, role, name, login_id FROM accounts ORDER BY id');
  res.json(rows.map((a) => ({ id: a.id, role: a.role, name: a.name, loginId: a.login_id })));
}));

// PUT /api/accounts/:id
app.put('/api/accounts/:id', requireAuth('admin'), asyncRoute(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  if (existingRows.length === 0) return res.status(404).json({ error: 'Account not found.' });

  const { name, loginId, role } = req.body || {};
  if (!ACCOUNT_ROLES.includes(role)) {
    return res.status(400).json({ field: 'role', error: 'Invalid role.' });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ field: 'name', error: 'Enter the account holder\u2019s full name.' });
  }
  if (!loginId || !EMAIL_RE.test(loginId)) {
    return res.status(400).json({ field: 'loginId', error: 'Enter a valid email address.' });
  }

  const [dupRows] = await pool.query(
    'SELECT id FROM accounts WHERE id <> ? AND role = ? AND LOWER(login_id) = LOWER(?)',
    [req.params.id, role, loginId]
  );
  if (dupRows.length > 0) {
    return res.status(409).json({ field: 'loginId', error: `An account with this email already exists for ${role}.` });
  }

  await pool.query('UPDATE accounts SET name = ?, login_id = ?, role = ? WHERE id = ?', [name.trim(), loginId, role, req.params.id]);
  res.json({ id: req.params.id, role, name: name.trim(), loginId });
}));

// DELETE /api/accounts/:id
app.delete('/api/accounts/:id', requireAuth('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT id FROM accounts WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
  if (req.user.accountId === req.params.id) {
    return res.status(400).json({ error: 'You cannot delete the account you\u2019re currently signed in with.' });
  }

  await pool.query('DELETE FROM accounts WHERE id = ?', [req.params.id]);
  for (const [token, session] of sessions.entries()) {
    if (session.accountId === req.params.id) sessions.delete(token);
  }
  res.status(204).end();
}));

/* =========================================================
   GREENPRINTS PAYABLES — flattened cross-scholar view (admin only)
   ========================================================= */

// GET /api/payables
app.get('/api/payables', requireAuth('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.scholar_id AS scholarId, s.name AS scholarName, p.item, p.amount, p.status,
            p.or_no AS orNo, p.payment_date AS date, p.cashier
     FROM payables p JOIN scholars s ON s.id = p.scholar_id
     ORDER BY p.id`
  );
  res.json(rows.map((r) => ({ ...r, orNo: r.orNo || null, date: r.date || null, cashier: r.cashier || null })));
}));

/* =========================================================
   SCHOLAR / CLEARANCE ROUTES
   ========================================================= */

// GET /api/scholars?search=...  (admin + greenprints)
app.get('/api/scholars', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const rows = await fetchScholarSummaries(String(req.query.search || '').trim());
  res.json(rows);
}));

// GET /api/scholars/:id  (admin + greenprints)
app.get('/api/scholars/:id', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const scholar = await fetchScholarWithPayables(req.params.id);
  if (!scholar) return res.status(404).json({ error: 'Scholar not found.' });
  res.json(toDetail(scholar));
}));

// POST /api/scholars  (admin only) — add a new actual enrollee to track.
// New scholars start unclaimed (no password) — they set one themselves
// the first time they use the Scholar Student sign-in, same as seed data.
app.post('/api/scholars', requireAuth('admin'), asyncRoute(async (req, res) => {
  const { name, program, grant, allowance } = req.body || {};

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ field: 'name', error: 'Enter the scholar\u2019s full name.' });
  }
  if (!program || program.trim().length < 2) {
    return res.status(400).json({ field: 'program', error: 'Enter the enrolled program/course.' });
  }
  if (!GRANTS.includes(grant)) {
    return res.status(400).json({ field: 'grant', error: 'Choose a valid grant program.' });
  }
  const allowanceNum = Number(allowance);
  if (!Number.isFinite(allowanceNum) || allowanceNum <= 0) {
    return res.status(400).json({ field: 'allowance', error: 'Enter a valid allowance amount greater than 0.' });
  }

  const id = await nextScholarId();
  await pool.query(
    'INSERT INTO scholars (id, name, program, grant_program, allowance, check_status, check_received, claimed) VALUES (?, ?, ?, ?, ?, \'PENDING\', 0, 0)',
    [id, name.trim(), program.trim(), grant, Math.round(allowanceNum)]
  );

  const scholar = await fetchScholarWithPayables(id);
  res.status(201).json(toDetail(scholar));
}));

// PUT /api/scholars/:id  (admin only) — edit a scholar's core info.
app.put('/api/scholars/:id', requireAuth('admin'), asyncRoute(async (req, res) => {
  const existing = await fetchScholarWithPayables(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Scholar not found.' });

  const { name, program, grant, allowance } = req.body || {};
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ field: 'name', error: 'Enter the scholar\u2019s full name.' });
  }
  if (!program || program.trim().length < 2) {
    return res.status(400).json({ field: 'program', error: 'Enter the enrolled program/course.' });
  }
  if (!GRANTS.includes(grant)) {
    return res.status(400).json({ field: 'grant', error: 'Choose a valid grant program.' });
  }
  const allowanceNum = Number(allowance);
  if (!Number.isFinite(allowanceNum) || allowanceNum <= 0) {
    return res.status(400).json({ field: 'allowance', error: 'Enter a valid allowance amount greater than 0.' });
  }

  await pool.query(
    'UPDATE scholars SET name = ?, program = ?, grant_program = ?, allowance = ? WHERE id = ?',
    [name.trim(), program.trim(), grant, Math.round(allowanceNum), req.params.id]
  );

  const scholar = await fetchScholarWithPayables(req.params.id);
  res.json(toDetail(scholar));
}));

// DELETE /api/scholars/:id  (admin only)
app.delete('/api/scholars/:id', requireAuth('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT id FROM scholars WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Scholar not found.' });

  // ON DELETE CASCADE on payables.scholar_id takes care of their payables.
  await pool.query('DELETE FROM scholars WHERE id = ?', [req.params.id]);
  for (const [token, session] of sessions.entries()) {
    if (session.scholarId === req.params.id) sessions.delete(token);
  }
  res.status(204).end();
}));

// POST /api/scholars/:id/payables  (admin + greenprints)
// Greenprints encodes a new instructional-materials item a scholar received.
app.post('/api/scholars/:id/payables', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const [scholarRows] = await pool.query('SELECT id FROM scholars WHERE id = ?', [req.params.id]);
  if (scholarRows.length === 0) return res.status(404).json({ error: 'Scholar not found.' });

  const { item, amount } = req.body || {};
  if (!item || item.trim().length < 2) {
    return res.status(400).json({ field: 'item', error: 'Enter the material/item name.' });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ field: 'amount', error: 'Enter a valid amount greater than 0.' });
  }

  const payableId = await nextPayableId(req.params.id);
  await pool.query(
    "INSERT INTO payables (id, scholar_id, item, amount, status) VALUES (?, ?, ?, ?, 'UNPAID')",
    [payableId, req.params.id, item.trim(), Math.round(amountNum)]
  );

  const scholar = await fetchScholarWithPayables(req.params.id);
  res.status(201).json(toDetail(scholar));
}));

// PUT /api/scholars/:id/payables/:payableId  (admin + greenprints)
// Correct a material item's name/amount after it was encoded.
app.put('/api/scholars/:id/payables/:payableId', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const [payableRows] = await pool.query('SELECT * FROM payables WHERE id = ? AND scholar_id = ?', [req.params.payableId, req.params.id]);
  if (payableRows.length === 0) return res.status(404).json({ error: 'Payable item not found.' });

  const { item, amount } = req.body || {};
  if (!item || item.trim().length < 2) {
    return res.status(400).json({ field: 'item', error: 'Enter the material/item name.' });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ field: 'amount', error: 'Enter a valid amount greater than 0.' });
  }

  await pool.query('UPDATE payables SET item = ?, amount = ? WHERE id = ?', [item.trim(), Math.round(amountNum), req.params.payableId]);

  const scholar = await fetchScholarWithPayables(req.params.id);
  res.json(toDetail(scholar));
}));

// DELETE /api/scholars/:id/payables/:payableId  (admin + greenprints)
app.delete('/api/scholars/:id/payables/:payableId', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const [payableRows] = await pool.query('SELECT id FROM payables WHERE id = ? AND scholar_id = ?', [req.params.payableId, req.params.id]);
  if (payableRows.length === 0) return res.status(404).json({ error: 'Payable item not found.' });

  await pool.query('DELETE FROM payables WHERE id = ?', [req.params.payableId]);
  res.status(204).end();
}));

// POST /api/scholars/:id/payables/:payableId/liquidate  (admin + greenprints)
// Liquidates (settles) a cash payment: records the Official Receipt
// number, date, and cashier, and marks the item PAID.
app.post('/api/scholars/:id/payables/:payableId/liquidate', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const [payableRows] = await pool.query('SELECT * FROM payables WHERE id = ? AND scholar_id = ?', [req.params.payableId, req.params.id]);
  if (payableRows.length === 0) return res.status(404).json({ error: 'Payable item not found.' });
  if (payableRows[0].status === 'PAID') {
    return res.status(400).json({ error: 'This item is already marked paid.' });
  }

  const { orNo, date, cashier } = req.body || {};
  if (!orNo || orNo.trim().length < 3) {
    return res.status(400).json({ field: 'orNo', error: 'Enter a valid Official Receipt number.' });
  }
  if (!date || !date.trim()) {
    return res.status(400).json({ field: 'date', error: 'Enter the payment date.' });
  }
  if (!cashier || cashier.trim().length < 2) {
    return res.status(400).json({ field: 'cashier', error: 'Enter the cashier\u2019s name.' });
  }

  await pool.query(
    "UPDATE payables SET status = 'PAID', or_no = ?, payment_date = ?, cashier = ? WHERE id = ?",
    [orNo.trim(), date.trim(), cashier.trim(), req.params.payableId]
  );

  const scholar = await fetchScholarWithPayables(req.params.id);
  res.json(toDetail(scholar));
}));

// POST /api/scholars/:id/receive-check  (admin + greenprints)
// Confirms the scholar physically picked up their released LandBank
// check — a separate step from the admin's release authorization.
app.post('/api/scholars/:id/receive-check', requireAuth(['admin', 'greenprints']), asyncRoute(async (req, res) => {
  const scholar = await fetchScholarWithPayables(req.params.id);
  if (!scholar) return res.status(404).json({ error: 'Scholar not found.' });

  if (scholar.checkStatus !== 'RELEASED') {
    return res.status(400).json({ error: 'This check has not been released by STVET Admin yet.' });
  }
  if (scholar.checkReceived) {
    return res.status(400).json({ error: 'This scholar has already received their check.' });
  }

  await pool.query('UPDATE scholars SET check_received = 1 WHERE id = ?', [req.params.id]);
  const updated = await fetchScholarWithPayables(req.params.id);
  res.json(toDetail(updated));
}));

// POST /api/scholars/:id/release-check  (admin only)
app.post('/api/scholars/:id/release-check', requireAuth('admin'), asyncRoute(async (req, res) => {
  const scholar = await fetchScholarWithPayables(req.params.id);
  if (!scholar) return res.status(404).json({ error: 'Scholar not found.' });

  if (scholarStatus(scholar) !== 'CLEARED') {
    return res.status(400).json({ error: 'Unpaid Greenprints items are blocking check release.' });
  }
  if (scholar.checkStatus === 'RELEASED') {
    return res.status(400).json({ error: 'LandBank check already released to this scholar.' });
  }

  await pool.query("UPDATE scholars SET check_status = 'RELEASED' WHERE id = ?", [req.params.id]);
  const updated = await fetchScholarWithPayables(req.params.id);
  res.json(toDetail(updated));
}));

/* =========================================================
   FALLBACK: serve the SPA shell for any non-API route
   ========================================================= */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generic error handler — catches anything asyncRoute() passed along
// (most commonly a MySQL connection/query error) so the frontend gets a
// clean JSON error instead of a hung request or a raw stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong talking to the database. Check the server terminal for details.' });
});

app.listen(PORT, () => {
  console.log(`TESDA STVET Portal backend running at http://localhost:${PORT}`);
  console.log(`Connected to MySQL database: ${process.env.DB_NAME || 'tesda_stvet'}`);
});

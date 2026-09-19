/**
 * TESDA STVET Portal — Backend (Node.js / Express)
 * ---------------------------------------------------------------
 * This file owns everything that used to be faked in the browser:
 * - accounts (signup/signin)
 * - scholar records, Greenprints material payables
 * - clearance status (derived) and LandBank check release
 *
 * It exposes a small JSON REST API under /api/* and serves the
 * static frontend (public/) that consumes it via fetch().
 *
 * Run:
 *   npm install
 *   npm start
 * Then open http://localhost:3000
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
   IN-MEMORY "DATABASE"
   Swap these arrays/maps for a real database in production.
   ========================================================= */

// Registered accounts. Demo admin seeded so the dashboard is reachable
// without signing up first.
const accounts = [
  { id: 'ACC-0001', role: 'admin', name: 'Demo Admin', loginId: 'admin@tesda.gov.ph', password: 'admin123' }
];

// Active sessions: token -> { accountId, role, name, loginId }
const sessions = new Map();

// Scholar records: allowance grants + Greenprints material payables/receipts
const scholars = [
  {
    id: 'SCH-2026-0148',
    name: 'Maria Dela Cruz',
    program: 'NC II Cookery',
    grant: 'TWSP',
    allowance: 6000,
    checkStatus: 'PENDING',
    payables: [
      { item: 'Chef Uniform Set (2 pcs)', amount: 950, status: 'PAID', orNo: 'OR-GP-10231', date: 'Aug 04, 2026', cashier: 'J. Ramos' },
      { item: 'Cookery Tool Kit', amount: 1450, status: 'PAID', orNo: 'OR-GP-10233', date: 'Aug 05, 2026', cashier: 'J. Ramos' },
      { item: 'NC II Cookery Textbook Bundle', amount: 780, status: 'PAID', orNo: 'OR-GP-10240', date: 'Aug 07, 2026', cashier: 'L. Bautista' }
    ]
  },
  {
    id: 'SCH-2026-0212',
    name: 'Jomar Santos',
    program: 'NC II Automotive Servicing',
    grant: 'STEP',
    allowance: 5500,
    checkStatus: 'PENDING',
    payables: [
      { item: 'Automotive Coverall Uniform', amount: 890, status: 'PAID', orNo: 'OR-GP-10188', date: 'Jul 29, 2026', cashier: 'L. Bautista' },
      { item: 'Basic Hand Tool Kit', amount: 2100, status: 'UNPAID' },
      { item: 'Automotive Servicing Manual', amount: 620, status: 'UNPAID' }
    ]
  },
  {
    id: 'SCH-2026-0267',
    name: 'Angeline Reyes',
    program: 'NC II Dressmaking',
    grant: 'PESFA',
    allowance: 4800,
    checkStatus: 'PENDING',
    payables: [
      { item: 'Sewing Kit & Notions Set', amount: 640, status: 'PAID', orNo: 'OR-GP-10099', date: 'Jul 22, 2026', cashier: 'J. Ramos' },
      { item: 'Pattern-Making Textbook', amount: 510, status: 'PAID', orNo: 'OR-GP-10101', date: 'Jul 22, 2026', cashier: 'J. Ramos' }
    ]
  },
  {
    id: 'SCH-2026-0304',
    name: 'Kevin Mendoza',
    program: 'NC II Electrical Installation',
    grant: 'UAQTEA',
    allowance: 6200,
    checkStatus: 'RELEASED',
    payables: [
      { item: 'Electrical PPE Set', amount: 1100, status: 'PAID', orNo: 'OR-GP-09876', date: 'Jul 10, 2026', cashier: 'L. Bautista' },
      { item: 'Wiring & Installation Tool Kit', amount: 1980, status: 'PAID', orNo: 'OR-GP-09880', date: 'Jul 11, 2026', cashier: 'L. Bautista' },
      { item: 'NC II EIM Reviewer', amount: 450, status: 'PAID', orNo: 'OR-GP-09890', date: 'Jul 13, 2026', cashier: 'J. Ramos' }
    ]
  },
  {
    id: 'SCH-2026-0355',
    name: 'Precious Villanueva',
    program: 'NC III Bread & Pastry Production',
    grant: 'TWSP',
    allowance: 6000,
    checkStatus: 'PENDING',
    payables: [
      { item: 'Baker Uniform & Apron', amount: 780, status: 'UNPAID' },
      { item: 'Baking Tool Kit', amount: 1650, status: 'UNPAID' }
    ]
  },
  {
    id: 'SCH-2026-0391',
    name: 'Ronel Aquino',
    program: 'NC II Shielded Metal Arc Welding',
    grant: 'STEP',
    allowance: 5800,
    checkStatus: 'PENDING',
    payables: [
      { item: 'Welding Helmet & Gloves', amount: 1350, status: 'PAID', orNo: 'OR-GP-10305', date: 'Aug 12, 2026', cashier: 'J. Ramos' },
      { item: 'Welding Rod Starter Pack', amount: 920, status: 'PAID', orNo: 'OR-GP-10307', date: 'Aug 12, 2026', cashier: 'J. Ramos' },
      { item: 'SMAW NC II Reviewer', amount: 400, status: 'UNPAID' }
    ]
  }
];

/* =========================================================
   HELPERS
   ========================================================= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['admin', 'greenprints', 'student'];

function scholarStatus(scholar) {
  const allPaid = scholar.payables.every((p) => p.status === 'PAID');
  return allPaid ? 'CLEARED' : 'ON_HOLD';
}

// Summary shape used in list views (no payables detail)
function toSummary(scholar) {
  return {
    id: scholar.id,
    name: scholar.name,
    program: scholar.program,
    grant: scholar.grant,
    allowance: scholar.allowance,
    checkStatus: scholar.checkStatus,
    status: scholarStatus(scholar)
  };
}

function toDetail(scholar) {
  return { ...toSummary(scholar), payables: scholar.payables };
}

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Auth middleware. Reads "Authorization: Bearer <token>", attaches
 * req.user, and optionally enforces a required role.
 */
function requireAuth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const session = token && sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
    }
    if (requiredRole && session.role !== requiredRole) {
      return res.status(403).json({ error: 'You do not have access to this resource.' });
    }
    req.user = session;
    next();
  };
}

/* =========================================================
   AUTH ROUTES
   ========================================================= */

// POST /api/auth/signup  { role, name, loginId, password }
app.post('/api/auth/signup', (req, res) => {
  const { role, name, loginId, password } = req.body || {};

  if (!ROLES.includes(role)) {
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

  const isDuplicate = accounts.some(
    (acc) => acc.role === role && acc.loginId.toLowerCase() === loginId.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(409).json({
      field: 'loginId',
      error: `An account with this email already exists for ${role}.`
    });
  }

  // Demo-only: plaintext password storage. Use bcrypt/argon2 in production.
  accounts.push({
    id: 'ACC-' + String(accounts.length + 1).padStart(4, '0'),
    role,
    name: name.trim(),
    loginId,
    password
  });

  res.status(201).json({ message: 'Account created. Please sign in to continue.' });
});

// POST /api/auth/signin  { role, loginId, password }
app.post('/api/auth/signin', (req, res) => {
  const { role, loginId, password } = req.body || {};

  if (!ROLES.includes(role) || !loginId || !password) {
    return res.status(400).json({ error: 'Role, email, and password are all required.' });
  }

  const account = accounts.find(
    (acc) =>
      acc.role === role &&
      acc.loginId.toLowerCase() === String(loginId).toLowerCase() &&
      acc.password === password
  );

  if (!account) {
    return res.status(401).json({ error: `No matching ${role} account for that email and password.` });
  }

  const token = newToken();
  sessions.set(token, { accountId: account.id, role: account.role, name: account.name, loginId: account.loginId });

  res.json({ token, user: { name: account.name, role: account.role, loginId: account.loginId } });
});

// POST /api/auth/signout
app.post('/api/auth/signout', requireAuth(), (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.slice(7);
  sessions.delete(token);
  res.status(204).end();
});

/* =========================================================
   PUBLIC SCHOLAR LOOKUP (no auth — used by the Scholar Student
   search-by-name panel instead of a login).
   ========================================================= */

// GET /api/public/scholars/search?name=...
app.get('/api/public/scholars/search', (req, res) => {
  const query = String(req.query.name || '').trim().toLowerCase();
  if (query.length < 2) return res.json([]);

  const rows = scholars.filter((s) => s.name.toLowerCase().includes(query));
  res.json(rows.map(toSummary));
});

// GET /api/public/scholars/:id
app.get('/api/public/scholars/:id', (req, res) => {
  const scholar = scholars.find((s) => s.id === req.params.id);
  if (!scholar) return res.status(404).json({ error: 'Scholar not found.' });
  res.json(toDetail(scholar));
});

/* =========================================================
   SCHOLAR / CLEARANCE ROUTES (admin only)
   ========================================================= */

// GET /api/stats
app.get('/api/stats', requireAuth('admin'), (req, res) => {
  const total = scholars.length;
  let cleared = 0;
  let hold = 0;
  let released = 0;
  scholars.forEach((s) => {
    if (scholarStatus(s) === 'CLEARED') cleared++; else hold++;
    if (s.checkStatus === 'RELEASED') released++;
  });
  res.json({ total, cleared, hold, released });
});

// GET /api/scholars?search=...
app.get('/api/scholars', requireAuth('admin'), (req, res) => {
  const query = String(req.query.search || '').trim().toLowerCase();
  const rows = scholars.filter((s) => {
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query) ||
      s.program.toLowerCase().includes(query)
    );
  });
  res.json(rows.map(toSummary));
});

// GET /api/scholars/:id
app.get('/api/scholars/:id', requireAuth('admin'), (req, res) => {
  const scholar = scholars.find((s) => s.id === req.params.id);
  if (!scholar) return res.status(404).json({ error: 'Scholar not found.' });
  res.json(toDetail(scholar));
});

// POST /api/scholars/:id/release-check
app.post('/api/scholars/:id/release-check', requireAuth('admin'), (req, res) => {
  const scholar = scholars.find((s) => s.id === req.params.id);
  if (!scholar) return res.status(404).json({ error: 'Scholar not found.' });

  if (scholarStatus(scholar) !== 'CLEARED') {
    return res.status(400).json({ error: 'Unpaid Greenprints items are blocking check release.' });
  }
  if (scholar.checkStatus === 'RELEASED') {
    return res.status(400).json({ error: 'LandBank check already released to this scholar.' });
  }

  scholar.checkStatus = 'RELEASED';
  res.json(toDetail(scholar));
});

/* =========================================================
   FALLBACK: serve the SPA shell for any non-API route
   ========================================================= */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TESDA STVET Portal backend running at http://localhost:${PORT}`);
});

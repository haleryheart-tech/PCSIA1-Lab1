-- =========================================================
-- TESDA STVET Portal — MySQL schema + seed data
-- ---------------------------------------------------------
-- Import this in MySQL Workbench: File > Open SQL Script > select this
-- file > click the lightning-bolt "Execute" button. It creates the
-- `tesda_stvet` database, all tables, and the same demo data the app
-- used to keep in memory (6 scholars with payables, 1 demo admin
-- account). The Node backend (server.js) reads/writes this database
-- through the `mysql2` package — see db.js and the .env.example file.
-- =========================================================

CREATE DATABASE IF NOT EXISTS tesda_stvet
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tesda_stvet;

-- ---------------------------------------------------------
-- accounts — STVET Admin / Greenprints sign-in accounts.
-- Scholar Student is intentionally NOT here; scholars authenticate
-- against their own row in `scholars` instead (see below).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id          VARCHAR(20)  NOT NULL PRIMARY KEY,
  role        ENUM('admin','greenprints') NOT NULL,
  name        VARCHAR(100) NOT NULL,
  login_id    VARCHAR(150) NOT NULL,   -- email address
  password    VARCHAR(255) NOT NULL,   -- plaintext for this school demo only — hash before real use
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_accounts_role_login (role, login_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- scholars — one row per enrolled scholar being monitored.
-- `password`/`claimed` back the self-service scholar login: NULL/0
-- until the scholar sets their own password the first time.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholars (
  id              VARCHAR(20)  NOT NULL PRIMARY KEY,   -- e.g. SCH-2026-0148
  name            VARCHAR(100) NOT NULL,
  program         VARCHAR(150) NOT NULL,
  grant_program   VARCHAR(20)  NOT NULL,                -- TWSP / STEP / PESFA / UAQTEA ('grant' is a reserved SQL word)
  allowance       INT          NOT NULL,
  check_status    ENUM('PENDING','RELEASED') NOT NULL DEFAULT 'PENDING',
  check_received  TINYINT(1)   NOT NULL DEFAULT 0,
  password        VARCHAR(255) NULL,                    -- set by the scholar themselves; NULL = not claimed yet
  claimed         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- payables — Greenprints instructional-materials items per scholar.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS payables (
  id            VARCHAR(30)  NOT NULL PRIMARY KEY,      -- e.g. SCH-2026-0148-P1
  scholar_id    VARCHAR(20)  NOT NULL,
  item          VARCHAR(150) NOT NULL,
  amount        INT          NOT NULL,
  status        ENUM('PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  or_no         VARCHAR(50)  NULL,
  payment_date  VARCHAR(50)  NULL,                      -- kept as display text (e.g. "Aug 04, 2026") to match the UI
  cashier       VARCHAR(100) NULL,
  CONSTRAINT fk_payables_scholar
    FOREIGN KEY (scholar_id) REFERENCES scholars(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- SEED DATA — same demo dataset the app shipped with in memory
-- =========================================================

INSERT INTO accounts (id, role, name, login_id, password) VALUES
  ('ACC-0001', 'admin', 'Demo Admin', 'admin@tesda.gov.ph', 'admin123');

INSERT INTO scholars (id, name, program, grant_program, allowance, check_status, check_received) VALUES
  ('SCH-2026-0148', 'Maria Dela Cruz',     'NC II Cookery',                     'TWSP',   6000, 'PENDING',  0),
  ('SCH-2026-0212', 'Jomar Santos',        'NC II Automotive Servicing',        'STEP',   5500, 'PENDING',  0),
  ('SCH-2026-0267', 'Angeline Reyes',      'NC II Dressmaking',                 'PESFA',  4800, 'PENDING',  0),
  ('SCH-2026-0304', 'Kevin Mendoza',       'NC II Electrical Installation',     'UAQTEA', 6200, 'RELEASED', 1),
  ('SCH-2026-0355', 'Precious Villanueva', 'NC III Bread & Pastry Production',  'TWSP',   6000, 'PENDING',  0),
  ('SCH-2026-0391', 'Ronel Aquino',        'NC II Shielded Metal Arc Welding',  'STEP',   5800, 'PENDING',  0);

INSERT INTO payables (id, scholar_id, item, amount, status, or_no, payment_date, cashier) VALUES
  ('SCH-2026-0148-P1', 'SCH-2026-0148', 'Chef Uniform Set (2 pcs)',          950,  'PAID',   'OR-GP-10231', 'Aug 04, 2026', 'J. Ramos'),
  ('SCH-2026-0148-P2', 'SCH-2026-0148', 'Cookery Tool Kit',                  1450, 'PAID',   'OR-GP-10233', 'Aug 05, 2026', 'J. Ramos'),
  ('SCH-2026-0148-P3', 'SCH-2026-0148', 'NC II Cookery Textbook Bundle',     780,  'PAID',   'OR-GP-10240', 'Aug 07, 2026', 'L. Bautista'),

  ('SCH-2026-0212-P1', 'SCH-2026-0212', 'Automotive Coverall Uniform',       890,  'PAID',   'OR-GP-10188', 'Jul 29, 2026', 'L. Bautista'),
  ('SCH-2026-0212-P2', 'SCH-2026-0212', 'Basic Hand Tool Kit',               2100, 'UNPAID', NULL, NULL, NULL),
  ('SCH-2026-0212-P3', 'SCH-2026-0212', 'Automotive Servicing Manual',       620,  'UNPAID', NULL, NULL, NULL),

  ('SCH-2026-0267-P1', 'SCH-2026-0267', 'Sewing Kit & Notions Set',          640,  'PAID',   'OR-GP-10099', 'Jul 22, 2026', 'J. Ramos'),
  ('SCH-2026-0267-P2', 'SCH-2026-0267', 'Pattern-Making Textbook',           510,  'PAID',   'OR-GP-10101', 'Jul 22, 2026', 'J. Ramos'),

  ('SCH-2026-0304-P1', 'SCH-2026-0304', 'Electrical PPE Set',                1100, 'PAID',   'OR-GP-09876', 'Jul 10, 2026', 'L. Bautista'),
  ('SCH-2026-0304-P2', 'SCH-2026-0304', 'Wiring & Installation Tool Kit',    1980, 'PAID',   'OR-GP-09880', 'Jul 11, 2026', 'L. Bautista'),
  ('SCH-2026-0304-P3', 'SCH-2026-0304', 'NC II EIM Reviewer',                450,  'PAID',   'OR-GP-09890', 'Jul 13, 2026', 'J. Ramos'),

  ('SCH-2026-0355-P1', 'SCH-2026-0355', 'Baker Uniform & Apron',             780,  'UNPAID', NULL, NULL, NULL),
  ('SCH-2026-0355-P2', 'SCH-2026-0355', 'Baking Tool Kit',                   1650, 'UNPAID', NULL, NULL, NULL),

  ('SCH-2026-0391-P1', 'SCH-2026-0391', 'Welding Helmet & Gloves',           1350, 'PAID',   'OR-GP-10305', 'Aug 12, 2026', 'J. Ramos'),
  ('SCH-2026-0391-P2', 'SCH-2026-0391', 'Welding Rod Starter Pack',          920,  'PAID',   'OR-GP-10307', 'Aug 12, 2026', 'J. Ramos'),
  ('SCH-2026-0391-P3', 'SCH-2026-0391', 'SMAW NC II Reviewer',               400,  'UNPAID', NULL, NULL, NULL);

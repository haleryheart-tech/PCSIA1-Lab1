# TESDA STVET Portal — Node.js + MySQL + HTML split

Your original file was a single `.html` with all logic (including the
scholar records, accounts, and clearance rules) hardcoded in an inline
`<script>`. This version splits it into clear layers, backed by a real
MySQL database:

```
tesda-app/
├── server.js          Node.js/Express backend — owns the REST API
├── db.js               MySQL connection pool (reads .env for credentials)
├── TESDA.sql            Database schema + seed data — import this in MySQL Workbench
├── .env.example         Template for your DB credentials — copy to .env and fill in
├── package.json
└── public/             The plain HTML/CSS/JS frontend
    ├── index.html       your original markup, with the inline <script> swapped for app.js
    ├── styles.css        your original stylesheet, unchanged
    └── app.js            all client logic, talks to the backend via fetch()
```

## Set up the database (MySQL Workbench)

1. Open **MySQL Workbench**, connect to your local MySQL Server.
2. **File → Open SQL Script…** and select `TESDA.sql` from this project.
3. Click the lightning-bolt **Execute** button (or Ctrl+Shift+Enter) to
   run the whole script. This creates a `tesda_stvet` database with
   `accounts`, `scholars`, and `payables` tables, plus the same demo
   data the app used to keep in memory (6 scholars with payables, 1
   demo admin account).
4. In the Navigator panel on the left, refresh **Schemas** — you should
   see `tesda_stvet` listed with those three tables inside it.

## Set up your credentials

In the project folder, copy `.env.example` to a new file named `.env`
and fill in your MySQL password (leave it blank if your local MySQL
root user has no password):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=tesda_stvet
PORT=3000
```

`.env` is listed in `.gitignore`, so this file — and your real password
— never gets committed or pushed to GitHub. Only `.env.example` (with
no real password in it) is meant to be shared/pushed.

## Run it

```bash
cd tesda-app
npm install
npm start
```

You should see two lines printed:
```
TESDA STVET Portal backend running at http://localhost:3000
Connected to MySQL database: tesda_stvet
```

If instead you see a database error, double-check: MySQL Server is
actually running, the `tesda_stvet` database exists (step above), and
`.env` has the right password.

Then open **http://localhost:3000**.

Demo admin login: `admin@tesda.gov.ph` / `admin123`

## What moved where

**Backend (`server.js`)** now owns:
- The `scholars` and `payables` tables (previously a hardcoded JS array in the page, now MySQL — see [Set up the database](#set-up-the-database-mysql-workbench) above)
- The `accounts` table and signup/signin logic (previously an in-memory array + form handler in the page, now a MySQL table)
- Clearance-status computation (`CLEARED` vs `ON_HOLD`) and the LandBank check-release rule
- A simple bearer-token session system (`sessions` map) protecting the admin routes

**REST API:**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an account for a role |
| POST | `/api/auth/signin` | Sign in, returns a token |
| POST | `/api/auth/signout` | Invalidate the current token |
| GET | `/api/me` | Who's currently signed in (any role) — used to resume the right dashboard after a refresh |
| GET | `/api/stats` | Dashboard totals (admin only) |
| GET | `/api/greenprints/stats` | Unpaid items/amount, cheques awaiting pickup (admin + greenprints) |
| GET | `/api/accounts` | List all registered accounts, no passwords (admin only) |
| GET | `/api/payables` | List every Greenprints payable across all scholars (admin only) |
| GET | `/api/scholars?search=` | List/search scholars (admin + greenprints) |
| GET | `/api/scholars/:id` | Full scholar detail + payables (admin + greenprints) |
| POST | `/api/scholars` | Add a new enrolled scholar (admin only) |
| DELETE | `/api/scholars/:id` | Remove a scholar from monitoring (admin only) |
| POST | `/api/scholars/:id/payables` | Encode a new instructional-materials item a scholar received (admin + greenprints) |
| POST | `/api/scholars/:id/payables/:payableId/liquidate` | Settle a cash payment: OR number, date, cashier (admin + greenprints) |
| POST | `/api/scholars/:id/receive-check` | Confirm a scholar physically picked up their released check (admin + greenprints) |
| POST | `/api/scholars/:id/release-check` | Release the LandBank check (admin only) |
| GET | `/api/scholar-auth/search?name=` | Search for your own scholar record by name — no login, returns name/ID/program only (never financial data) |
| POST | `/api/scholar-auth/set-password` | First-time claim: a scholar sets their own password for their record |
| POST | `/api/scholar-auth/signin` | Returning scholar signs in with the password they set |
| GET | `/api/scholar/me` | The signed-in scholar's own full record (student sessions only) |

**Frontend (`public/`)** now owns only:
- Markup and styling
- Form validation and UI state (modal open/close, role tabs, sign-up vs sign-in mode)
- `fetch()` calls to the API above, and rendering the responses

## Task 6 — Client-side form validation

The sign-in/sign-up form (`public/index.html` + `public/app.js`) is the
form in this system with user-entered fields, so that's where Task 6's
validation was implemented:

- **Required fields** — First Name, Last Name, Email, Password, and (in
  sign-up mode) Confirm Password all carry the HTML5 `required`
  attribute, and `app.js` re-checks `element.validity.valueMissing` on
  blur/submit so a blank field is always caught before the request ever
  reaches the server.
- **Format validation** — Email must be a valid email address
  (`name@domain.com`), enforced by `type="email"` + a HTML5 `pattern`
  **and** a matching JS regex (`EMAIL_RE`) on both sign-in and sign-up.
  Sign-up/sign-in only accept an email as the login ID — there is no
  username option. Password requires `minlength="8"`. Confirm Password
  is checked against Password on every keystroke.
- **HTML5 constraint attributes used**: `required`, `minlength`,
  `maxlength`, `pattern`, `type="email"`. There's no numeric or ranged
  field anywhere in this system's forms (no age, quantity, or
  code-entry inputs), so `type="number"`/`min`/`max` weren't applicable.
- **JavaScript validation** — every field validates on `blur`, then
  live on every keystroke once it's been touched, and the whole form is
  re-validated again on `submit` (which calls `preventDefault()` and
  stops the `fetch()` call if anything fails). The form has `novalidate`
  so only this custom validation — not the browser's native popups —
  is what the user sees.
- **Error + success feedback** — an invalid field gets a red outline, a
  brief shake, and a plain-language message under it (e.g. "Enter a
  valid email address (e.g. name@domain.com)."); a field that passes
  gets a green outline and a check mark.
- **Server-side validation is unchanged and still enforced** —
  `server.js`'s `/api/auth/signup` and `/api/auth/signin` routes
  independently re-validate everything (see `EMAIL_RE` and the field
  checks in `app.post('/api/auth/signup', ...)`), so the API is never
  trusting the client alone.

**Manual test scenarios** (role = STVET Admin, sign-up mode unless noted):

| # | Input | Expected result |
|---|---|---|
| 1 | Submit with every field blank | All required fields turn red with "is required" messages; no request is sent |
| 2 | First/Last Name = `J` | "Enter at least 2 characters." |
| 3 | First/Last Name = `Juan123` | "Letters only, please." (pattern mismatch) |
| 4 | Email = `abc` | "Enter a valid email address…" |
| 5 | Email = `not-an-email@` | "Enter a valid email address…" |
| 6 | Email = `admin@tesda.gov.ph` | Field turns green |
| 7 | Password = `short1` | "Password must be at least 8 characters." |
| 8 | Password = `longenough1`, Confirm = `different` | "Passwords do not match." |
| 9 | Password = `longenough1`, Confirm = `longenough1` | Both fields turn green |
| 10 | All fields valid → Submit | Account is created (or, on sign-in, the dashboard opens) |

## Task 7 — Data storage & record management

Two new tables were added to the STVET Admin dashboard, below Enrolled
Scholars (the Task 4 table):

- **Registered Accounts** — every account created through the Task 6
  sign-up form (name, email, role, account ID). Backed by a new
  `GET /api/accounts` route (admin only, passwords stripped).
- **Greenprints Material Payables** — every material item, amount, and
  payment status across every scholar, flattened into one list. Backed
  by a new `GET /api/payables` route (admin only).

How the requirements are met:

1. **Store validated data** — Accounts only exist here because they
   passed every Task 6 client- and server-side check first; there's no
   path to create one that skips validation.
2. **Display automatically, no reload** — `app.js` fetches both tables
   with `fetch()`/`api()` and renders them via DOM manipulation
   (`accountsTableBody.innerHTML = ...`, `payablesTableBody.innerHTML = ...`).
   Nothing in this app ever calls `location.reload()`; the whole flow
   (sign up → sign in → dashboard) is a single page session.
3. **Retrieve saved records on refresh** — `accountsCache` and
   `payablesCache` (plain JS arrays) are mirrored into
   `localStorage` (`tesda_accounts_cache`, `tesda_payables_cache`) every
   time they're fetched. On page load, `resumeSession()` reopens the
   dashboard if a valid token is stored, and the tables paint instantly
   from the localStorage copy before the fresh network request even
   resolves.
4. **Manage records** — both tables are searchable (client-side,
   filtered straight out of the in-memory array — no extra network
   call per keystroke) and list every record, not just a page of them.
5. **Update the interface dynamically** — all three dashboard tables
   (Scholars, Accounts, Payables) are pure DOM updates against their
   `<tbody>` elements; none of it involves a page navigation.
6. **Consistent design** — a shared `.data-table` CSS class (in
   `styles.css`) gives all three tables identical borders, spacing, and
   header styling; only the scholar table keeps the extra
   click-to-select row behavior.
7. **Test data persistence** — sign up a new account, sign in as admin,
   confirm it appears in Registered Accounts; then refresh the browser
   tab entirely and confirm both new tables still show data immediately
   (from `localStorage`) before/while the fresh fetch completes. Search
   each table with a few different terms to confirm filtering works.
8. **Upload to GitHub** — see the commands below.

## Task 8 — Edit & Delete (completing CRUD)

Every Task 7 table now supports full CRUD, not just Create/Read:

- **Enrolled Scholars** (Admin) — the detail panel's header has a pencil
  icon that turns the scholar's name/program/grant/allowance into an
  inline, Task-6-style validated form pre-filled with their current data.
  "Remove Scholar from Monitoring" (Delete) already existed from earlier.
- **Registered Accounts** (Admin) — Edit/Delete icon buttons per row.
  Editing turns that row into inline inputs (name, email, role) with
  Save/Cancel; Delete asks for confirmation, then removes the account
  and invalidates any of its active sessions. Admin cannot delete the
  account they're currently signed in as. Passwords aren't editable here
  by design — that belongs in a separate "reset password" flow.
- **Greenprints Material Payables** (Admin's flattened table, *and* each
  scholar's own payables list on the **Greenprints dashboard**) —
  Edit/Delete icon buttons per item. Editing swaps the item/amount for
  inline inputs; Delete asks for confirmation. Both immediately refresh
  the scholar's clearance status and the dashboard stat cards, since
  removing or changing a payable can flip a scholar between Cleared/On
  Hold.

All of it follows the same pattern used throughout: validated inline
forms (no page navigation), a confirm step before every delete,
`.btn-icon`/`.table-edit-input` styling that matches the rest of the
interface, and a DOM-only refresh afterward — nothing here reloads the
page.

**New/changed API routes:** `PUT /api/scholars/:id`,
`PUT /api/scholars/:id/payables/:payableId`,
`DELETE /api/scholars/:id/payables/:payableId`,
`PUT /api/accounts/:id`, `DELETE /api/accounts/:id`.

## Deploying this update to GitHub

From the project root, once you're happy with the changes:

```bash
git add .
git commit -m "Task 6: add client-side validation to the sign-in/sign-up form"
git push origin main   # or your working branch name
```

## Three full dashboards (Admin, Greenprints, Scholar Student)

All three roles now have a real dashboard instead of a placeholder
message. Signing in as any role opens the matching dashboard, and
refreshing the page resumes it automatically via `GET /api/me`.

- **STVET Admin** — Enrolled Scholars (now with **Add Enrollee** and
  **Remove Scholar from Monitoring**, so admin controls exactly who's
  being tracked), Registered Accounts, Greenprints Material Payables,
  and LandBank check release.
- **Greenprints** — a scholar list plus a detail panel to:
  - **Encode materials** a scholar received (adds a new UNPAID item).
  - **Liquidate cash** for an unpaid item (records OR number, date,
    cashier and marks it PAID).
  - **Confirm check pickup** — a separate step from the admin's
    release: admin *releases* the check, Greenprints confirms the
    scholar actually *received* it.
- **Scholar Student** — search their own record and see a progress bar
  of how much of the fixed ₱5,500 instructional materials fee they've
  settled, plus their itemized payables and check status.

## Scholar Student sign-in (search + self-claimed password)

Unlike STVET Admin and Greenprints, a scholar never creates an
"account." From the **Scholar Student** tab in the sign-in modal:

1. Search their name — this hits `/api/scholar-auth/search`, which is
   open (no login) but only ever returns name, ID, and program.
2. Pick their record from the results.
3. **First time ever:** they set a password for that record right there
   (with confirm-password validation, same rules as Task 6 — at least
   8 characters). **Every time after:** they just enter that password.
4. On success, they land straight on their own dashboard — no
   re-searching, no separate account, and no name-guessing route to
   anyone else's payment data.

## Notes / things to harden before real use
- Passwords are stored in plaintext in MySQL (`accounts.password`, `scholars.password`) — swap in `bcrypt`/`argon2` hashing before this touches real scholar data.
- Sessions (bearer tokens) still live in a `Map` in server memory, not in MySQL — that's normal for this kind of short-lived token, but it does mean they reset on restart and won't work across multiple server instances. For production, move to signed JWTs or a session store (Redis).
- All three roles (STVET Admin, Greenprints, Scholar Student) now have a working dashboard — see the section above.
- **Scholar Student sign-in is password-based, not account-based.** The "Scholar Student" tab in the sign-in modal is a self-contained flow: search your name → pick your record → set a password the first time (or enter it every time after). This is deliberately a *separate* session type from the `accounts`/signup system used by STVET Admin and Greenprints — a scholar's password lives directly on their `scholars` row, not in a separate account. The open name-search endpoint (`/api/scholar-auth/search`) only ever returns name/ID/program, never clearance or payment data — that detail is only reachable via `/api/scholar/me`, which requires the scholar's own signed-in session.
- The Holy Trinity College logo (`holy-trinity-logo.png`) wasn't part of either upload, so the `<img>` tags pointing to it will show a broken image until you add that file to `public/`.

# TESDA STVET Portal — Node.js + HTML split

Your original file was a single `.html` with all logic (including the
scholar records, accounts, and clearance rules) hardcoded in an inline
`<script>`. This version splits it into two clear layers:

```
tesda-app/
├── server.js          Node.js/Express backend — owns the data + REST API
├── package.json
└── public/             The plain HTML/CSS/JS frontend
    ├── index.html       your original markup, with the inline <script> swapped for app.js
    ├── styles.css        your original stylesheet, unchanged
    └── app.js            all client logic, talks to the backend via fetch()
```

## Run it

```bash
cd tesda-app
npm install
npm start
```

Then open **http://localhost:3000**.

Demo admin login: `admin@tesda.gov.ph` / `admin123`

## What moved where

**Backend (`server.js`)** now owns:
- The `scholars` records and Greenprints `payables` (previously a hardcoded JS array in the page)
- The `accounts` list and signup/signin logic (previously an in-memory array + form handler in the page)
- Clearance-status computation (`CLEARED` vs `ON_HOLD`) and the LandBank check-release rule
- A simple bearer-token session system (`sessions` map) protecting the admin routes

**REST API:**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an account for a role |
| POST | `/api/auth/signin` | Sign in, returns a token |
| POST | `/api/auth/signout` | Invalidate the current token |
| GET | `/api/stats` | Dashboard totals (admin only) |
| GET | `/api/scholars?search=` | List/search scholars (admin only) |
| GET | `/api/scholars/:id` | Full scholar detail + payables (admin only) |
| POST | `/api/scholars/:id/release-check` | Release the LandBank check (admin only) |
| GET | `/api/public/scholars/search?name=` | Search scholars by name — no login (Scholar Student tab) |
| GET | `/api/public/scholars/:id` | Full scholar detail + payables — no login (Scholar Student tab) |

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

## Deploying this update to GitHub

From the project root, once you're happy with the changes:

```bash
git add .
git commit -m "Task 6: add client-side validation to the sign-in/sign-up form"
git push origin main   # or your working branch name
```

## Notes / things to harden before real use
- Passwords are stored in plaintext in memory — swap in `bcrypt`/`argon2` hashing and a real database (Postgres, MongoDB, etc.) before this touches real scholar data.
- Sessions live in a `Map` in server memory, so they reset on restart and won't work across multiple server instances — move to signed JWTs or a session store (Redis) for production.
- Only the **STVET Admin** dashboard UI is implemented, matching your original file. Greenprints sign-in works against the backend but has no dashboard view built yet.
- **Scholar Student** no longer signs in with an account. The student tab is a name-search panel that calls `/api/public/scholars/search` and `/api/public/scholars/:id` — these routes are intentionally open (no auth) since students never register. That also means anyone who knows (or guesses) a scholar's name can see their clearance and payment detail. For a real deployment, gate the detail lookup behind something only the student would know (e.g. confirm their scholar ID or birthdate before showing payables), or require a lightweight one-time PIN issued by the admin at enrollment.
- The Holy Trinity College logo (`holy-trinity-logo.png`) wasn't part of either upload, so the `<img>` tags pointing to it will show a broken image until you add that file to `public/`.

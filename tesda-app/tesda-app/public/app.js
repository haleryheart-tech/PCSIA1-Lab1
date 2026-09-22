/**
 * TESDA STVET Portal — Frontend
 * Talks to the Node/Express backend over fetch(). No app data lives
 * in this file anymore; it's all fetched from /api/*.
 */

const API = '/api';

function authHeaders() {
  const token = localStorage.getItem('tesda_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed');
    err.field = data && data.field;
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ================= SIGN-IN MODAL ================= */

const overlay = document.getElementById('signinOverlay');
const closeBtn = document.getElementById('modalCloseBtn');
const roleTabs = document.querySelectorAll('.role-tab');
const submitLabel = document.getElementById('submitLabel');
const idLabel = document.getElementById('idLabel');
const idHint = document.getElementById('idHint');
const userIdInput = document.getElementById('userId');
const togglePwBtn = document.getElementById('togglePw');
const pwInput = document.getElementById('userPw');
const form = document.getElementById('signinForm');
const modalError = document.getElementById('modalError');
const modalErrorText = document.getElementById('modalErrorText');
const modalSuccess = document.getElementById('modalSuccess');
const modalSuccessText = document.getElementById('modalSuccessText');
const submitBtn = document.getElementById('submitBtn');
const submitIcon = document.getElementById('submitIcon');
const submitIconDefault = submitIcon ? submitIcon.innerHTML : '';
const modalSub = document.querySelector('.modal-sub');
const firstNameInput = document.getElementById('firstName');
const firstNameField = document.getElementById('firstNameField');
const middleInitialInput = document.getElementById('middleInitial');
const lastNameInput = document.getElementById('lastName');
const suffixInput = document.getElementById('suffix');
const nameRow = document.getElementById('nameRow');
const suffixField = document.getElementById('suffixField');
const studentSearchPanel = document.getElementById('studentSearchPanel');
const studentSearchInput = document.getElementById('studentSearchInput');
const studentSearchResults = document.getElementById('studentSearchResults');
const studentDetailCard = document.getElementById('studentDetailCard');
const confirmPwInput = document.getElementById('confirmPw');
const confirmPwField = document.getElementById('confirmPwField');
const rememberRow = document.getElementById('rememberRow');
const termsNote = document.getElementById('termsNote');
const authToggleText = document.getElementById('authToggleText');

const userIdWrap = document.getElementById('userIdWrap');
const userIdError = document.getElementById('userIdError');
const userPwWrap = document.getElementById('userPwWrap');
const userPwError = document.getElementById('userPwError');
const confirmPwWrap = document.getElementById('confirmPwWrap');
const confirmPwError = document.getElementById('confirmPwError');
const firstNameWrap = document.getElementById('firstNameWrap');
const firstNameError = document.getElementById('firstNameError');
const lastNameWrap = document.getElementById('lastNameWrap');
const lastNameError = document.getElementById('lastNameError');
const middleInitialWrap = document.getElementById('middleInitialWrap');
const middleInitialError = document.getElementById('middleInitialError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(wrap, errorEl, msg) {
  wrap.classList.remove('valid');
  wrap.classList.add('invalid');
  errorEl.textContent = msg;
  errorEl.classList.add('show');
}
function clearFieldError(wrap, errorEl) {
  wrap.classList.remove('invalid');
  errorEl.textContent = '';
  errorEl.classList.remove('show');
}
// Marks a field as successfully validated (green border + check mark).
// Only call this once a field actually has a value — an empty optional
// field should stay neutral, not "valid".
function setFieldValid(wrap) {
  wrap.classList.remove('invalid');
  wrap.classList.add('valid');
}
function clearFieldValid(wrap) {
  wrap.classList.remove('valid');
}
function clearAllFieldErrors() {
  [
    [userIdWrap, userIdError], [userPwWrap, userPwError], [confirmPwWrap, confirmPwError],
    [firstNameWrap, firstNameError], [lastNameWrap, lastNameError], [middleInitialWrap, middleInitialError]
  ].forEach(([wrap, errorEl]) => { clearFieldError(wrap, errorEl); clearFieldValid(wrap); });
}

// Name fields lean on the required/minlength/maxlength/pattern attributes
// set in index.html: el.validity is the browser's own constraint-validation
// verdict for those attributes, so the JS just turns it into a friendly,
// field-level message instead of the native tooltip (the form has
// novalidate so only our messages ever show).
function validateFirstName() {
  if (authMode !== 'signup') return true;
  const el = firstNameInput;
  el.value = el.value.replace(/^\s+/, '');
  if (el.validity.valueMissing) { setFieldError(firstNameWrap, firstNameError, 'First name is required.'); return false; }
  if (el.validity.tooShort) { setFieldError(firstNameWrap, firstNameError, 'Enter at least 2 characters.'); return false; }
  if (el.validity.patternMismatch) { setFieldError(firstNameWrap, firstNameError, 'Letters only, please.'); return false; }
  clearFieldError(firstNameWrap, firstNameError);
  setFieldValid(firstNameWrap);
  return true;
}

function validateLastName() {
  if (authMode !== 'signup') return true;
  const el = lastNameInput;
  el.value = el.value.replace(/^\s+/, '');
  if (el.validity.valueMissing) { setFieldError(lastNameWrap, lastNameError, 'Last name is required.'); return false; }
  if (el.validity.tooShort) { setFieldError(lastNameWrap, lastNameError, 'Enter at least 2 characters.'); return false; }
  if (el.validity.patternMismatch) { setFieldError(lastNameWrap, lastNameError, 'Letters only, please.'); return false; }
  clearFieldError(lastNameWrap, lastNameError);
  setFieldValid(lastNameWrap);
  return true;
}

function validateMiddleInitial() {
  if (authMode !== 'signup') return true;
  const el = middleInitialInput;
  if (!el.value.trim()) { clearFieldError(middleInitialWrap, middleInitialError); clearFieldValid(middleInitialWrap); return true; } // optional
  if (el.validity.patternMismatch) {
    setFieldError(middleInitialWrap, middleInitialError, '1–3 letters only.');
    return false;
  }
  clearFieldError(middleInitialWrap, middleInitialError);
  setFieldValid(middleInitialWrap);
  return true;
}

function buildFullName() {
  const first = firstNameInput.value.trim();
  const mi = middleInitialInput.value.trim().replace(/\.$/, '');
  const last = lastNameInput.value.trim();
  const suffix = suffixInput.value.trim();
  let name = first;
  if (mi) name += ' ' + mi + '.';
  if (last) name += ' ' + last;
  if (suffix) name += ' ' + suffix;
  return name;
}

function validateUserId() {
  const el = userIdInput;
  const val = el.value.trim();
  if (el.validity.valueMissing || !val) { setFieldError(userIdWrap, userIdError, 'Please enter your email address.'); return false; }
  if (!EMAIL_RE.test(val)) { setFieldError(userIdWrap, userIdError, 'Enter a valid email address (e.g. name@domain.com).'); return false; }
  clearFieldError(userIdWrap, userIdError);
  setFieldValid(userIdWrap);
  return true;
}

function validatePassword() {
  const el = pwInput;
  const val = el.value;
  if (el.validity.valueMissing || !val) { setFieldError(userPwWrap, userPwError, 'Password is required.'); return false; }
  if (authMode === 'signup' && el.validity.tooShort) { setFieldError(userPwWrap, userPwError, 'Password must be at least 8 characters.'); return false; }
  clearFieldError(userPwWrap, userPwError);
  setFieldValid(userPwWrap);
  // Confirm-password depends on this value, so keep it in sync live.
  if (authMode === 'signup' && confirmPwInput.value) validateConfirmPassword();
  return true;
}

function validateConfirmPassword() {
  if (authMode !== 'signup') return true;
  const el = confirmPwInput;
  const val = el.value;
  if (el.validity.valueMissing || !val) { setFieldError(confirmPwWrap, confirmPwError, 'Please confirm your password.'); return false; }
  if (val !== pwInput.value) { setFieldError(confirmPwWrap, confirmPwError, 'Passwords do not match.'); return false; }
  clearFieldError(confirmPwWrap, confirmPwError);
  setFieldValid(confirmPwWrap);
  return true;
}

let authMode = 'signin'; // 'signin' | 'signup'

const roleCopy = {
  admin: { label: 'STVET Admin', submit: 'Sign In as STVET Admin', idHint: 'Use your registered email address on file with the STVET Administrative Office.', placeholder: 'name@tesda.gov.ph' },
  greenprints: { label: 'Greenprints', submit: 'Sign In as Greenprints Staff', idHint: 'Use your registered email address on file with Greenprints management.', placeholder: 'name@greenprints.ph' },
  student: { label: 'Scholar Student', submit: 'Sign In as Scholar Student', idHint: 'Use your registered email address on file upon TVET program enrollment.', placeholder: 'name@student.tesda.gov.ph' }
};

function resetStudentSearch() {
  studentSearchInput.value = '';
  studentSearchResults.innerHTML = '';
  studentSearchResults.classList.remove('show');
  studentDetailCard.innerHTML = '';
  studentDetailCard.classList.remove('show');
}

function setRole(role) {
  roleTabs.forEach((tab) => tab.classList.toggle('active', tab.getAttribute('data-role') === role));
  const copy = roleCopy[role] || roleCopy.admin;
  const studentMode = role === 'student';

  form.style.display = studentMode ? 'none' : '';
  authToggleText.style.display = studentMode ? 'none' : '';
  studentSearchPanel.classList.toggle('show', studentMode);

  if (studentMode) {
    modalSub.textContent = 'Search for your clearance record';
    setTimeout(() => studentSearchInput.focus(), 150);
  } else {
    resetStudentSearch();
    idLabel.textContent = 'Email';
    idHint.textContent = copy.idHint + (authMode === 'signin' && role === 'admin' ? ' Demo login: admin@tesda.gov.ph / admin123' : '');
    userIdInput.placeholder = copy.placeholder;
    submitLabel.textContent = authMode === 'signup' ? ('Create ' + copy.label + ' Account') : copy.submit;
    modalSub.textContent = authMode === 'signup' ? 'Create your workspace account' : 'Sign in to your workspace';
  }
  hideMessages();
}

function currentRole() {
  return document.querySelector('.role-tab.active').getAttribute('data-role');
}

function setAuthMode(mode) {
  authMode = mode;
  hideMessages();
  form.reset();
  clearAllFieldErrors();

  if (mode === 'signup') {
    modalSub.textContent = 'Create your workspace account';
    firstNameField.classList.add('show');
    nameRow.classList.add('show');
    suffixField.classList.add('show');
    confirmPwField.classList.add('show');
    rememberRow.style.display = 'none';
    termsNote.classList.add('show');
    authToggleText.innerHTML = 'Already have an account? <button type="button" class="link-btn" id="toSigninBtn">Sign in</button>';
  } else {
    modalSub.textContent = 'Sign in to your workspace';
    firstNameField.classList.remove('show');
    nameRow.classList.remove('show');
    suffixField.classList.remove('show');
    confirmPwField.classList.remove('show');
    rememberRow.style.display = '';
    termsNote.classList.remove('show');
    authToggleText.innerHTML = 'New here? <button type="button" class="link-btn" id="toSignupBtn">Create an account</button>';
  }

  setRole(currentRole());
  wireAuthToggleBtn();
}

function wireAuthToggleBtn() {
  const toSignupBtn = document.getElementById('toSignupBtn');
  const toSigninBtn = document.getElementById('toSigninBtn');
  if (toSignupBtn) toSignupBtn.addEventListener('click', () => setAuthMode('signup'));
  if (toSigninBtn) toSigninBtn.addEventListener('click', () => setAuthMode('signin'));
}

function openModal(role) {
  setAuthMode('signin');
  setRole(role || 'admin');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => userIdInput.focus(), 150);
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  hideMessages();
  form.reset();
  clearAllFieldErrors();
  resetStudentSearch();
}

function showError(msg) { modalSuccess.classList.remove('show'); modalErrorText.textContent = msg; modalError.classList.add('show'); }
function showSuccess(msg) { modalError.classList.remove('show'); modalSuccessText.textContent = msg; modalSuccess.classList.add('show'); }
function hideMessages() { modalError.classList.remove('show'); modalSuccess.classList.remove('show'); }

wireAuthToggleBtn();

document.querySelectorAll('[data-open-modal]').forEach((el) => {
  el.addEventListener('click', (e) => { e.preventDefault(); openModal(el.getAttribute('data-role')); });
});

closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });

roleTabs.forEach((tab) => tab.addEventListener('click', () => {
  const role = tab.getAttribute('data-role');
  if (role === 'student' && authMode === 'signup') setAuthMode('signin'); // resets form/labels; role is corrected below
  setRole(role);
}));

togglePwBtn.addEventListener('click', () => {
  const isPw = pwInput.type === 'password';
  pwInput.type = isPw ? 'text' : 'password';
  togglePwBtn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
});

// Validate on blur (first pass, once the user leaves the field), then
// re-validate live on every keystroke afterwards so an error clears (or a
// field turns green) the moment it's fixed, instead of waiting for another
// blur. This mirrors how the demo's other live-filter inputs already behave.
function wireLiveValidation(input, wrap, validateFn) {
  input.addEventListener('blur', validateFn);
  input.addEventListener('input', () => {
    if (wrap.classList.contains('invalid') || wrap.classList.contains('valid')) validateFn();
  });
}

wireLiveValidation(userIdInput, userIdWrap, validateUserId);
wireLiveValidation(pwInput, userPwWrap, validatePassword);
wireLiveValidation(firstNameInput, firstNameWrap, validateFirstName);
wireLiveValidation(lastNameInput, lastNameWrap, validateLastName);
wireLiveValidation(middleInitialInput, middleInitialWrap, validateMiddleInitial);
// Confirm-password reacts on every keystroke from the start (not just
// after a blur) since its whole job is to mirror the password field live.
confirmPwInput.addEventListener('blur', validateConfirmPassword);
confirmPwInput.addEventListener('input', validateConfirmPassword);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();
  const activeRole = currentRole();

  if (authMode === 'signup') {
    clearAllFieldErrors();
    const firstOk = validateFirstName();
    const lastOk = validateLastName();
    const miOk = validateMiddleInitial();
    const idOk = validateUserId();
    const pwOk = validatePassword();
    const confirmOk = validateConfirmPassword();
    if (!firstOk || !lastOk || !miOk || !idOk || !pwOk || !confirmOk) {
      showError('Please fix the highlighted fields below to create your account.');
      return;
    }

    try {
      await api('/auth/signup', {
        method: 'POST',
        body: { role: activeRole, name: buildFullName(), loginId: userIdInput.value.trim(), password: pwInput.value }
      });
      const submittedId = userIdInput.value.trim();
      setAuthMode('signin');
      setRole(activeRole);
      userIdInput.value = submittedId;
      showSuccess('Account created for ' + roleCopy[activeRole].label + '. Please sign in below with your new credentials to enter the system.');
    } catch (err) {
      if (err.field === 'loginId') setFieldError(userIdWrap, userIdError, err.message);
      if (err.field === 'password') setFieldError(userPwWrap, userPwError, err.message);
      if (err.field === 'name') setFieldError(firstNameWrap, firstNameError, err.message);
      showError(err.message);
    }
    return;
  }

  // authMode === 'signin'
  clearAllFieldErrors();
  const idOkSignin = validateUserId();
  const pwOkSignin = validatePassword();
  if (!idOkSignin || !pwOkSignin) {
    showError('Please fix the highlighted fields below to sign in.');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitLabel.textContent = 'Signing in…';
    if (submitIcon) submitIcon.innerHTML = '<span class="btn-spinner"></span>';

    const { token, user } = await api('/auth/signin', {
      method: 'POST',
      body: { role: activeRole, loginId: userIdInput.value.trim(), password: pwInput.value }
    });
    localStorage.setItem('tesda_token', token);
    closeModal();
    await openDashboardFor(user.role, user);
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = roleCopy[currentRole()].submit;
    if (submitIcon) submitIcon.innerHTML = submitIconDefault;
  }
});

/* ================= SCHOLAR STUDENT SEARCH ================= */

let studentSearchDebounce = null;

async function runStudentSearch(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    studentSearchResults.innerHTML = '';
    studentSearchResults.classList.remove('show');
    return;
  }

  let rows;
  try {
    rows = await fetch(API + '/scholar-auth/search?name=' + encodeURIComponent(trimmed)).then((r) => r.json());
  } catch {
    studentSearchResults.innerHTML = '<div class="search-empty">Something went wrong searching. Please try again.</div>';
    studentSearchResults.classList.add('show');
    return;
  }

  if (!rows || rows.length === 0) {
    studentSearchResults.innerHTML = '<div class="search-empty">No matching scholar record found. If you were recently enrolled, check back after your STVET Admin encodes your record.</div>';
  } else {
    studentSearchResults.innerHTML = rows.map((s) =>
      '<button type="button" class="search-result-item" data-id="' + s.id + '" data-claimed="' + (s.claimed ? '1' : '0') + '">' +
        '<div class="sr-name">' + s.name + '</div>' +
        '<div class="sr-meta">' + s.id + ' &middot; ' + s.program + '</div>' +
      '</button>'
    ).join('');

    studentSearchResults.querySelectorAll('.search-result-item').forEach((btn) => {
      btn.addEventListener('click', () => promptScholarPassword(
        btn.getAttribute('data-id'),
        btn.querySelector('.sr-name').textContent,
        btn.getAttribute('data-claimed') === '1'
      ));
    });
  }
  studentSearchResults.classList.add('show');
}

// Task: after picking their name, a scholar either sets a password (first
// time ever accessing their record) or enters the one they already chose.
function promptScholarPassword(id, name, claimed) {
  studentSearchResults.classList.remove('show');
  studentDetailCard.classList.add('show');

  const header =
    '<button type="button" class="student-detail-back" id="studentDetailBack">&larr; Back to search</button>' +
    '<div class="detail-student" style="padding:0 0 14px;">' +
      '<div class="detail-student-name">' + name + '</div>' +
      '<div class="detail-student-meta">' + id + '</div>' +
    '</div>';

  if (claimed) {
    studentDetailCard.innerHTML = header +
      '<div class="field">' +
        '<label for="scholarPortalPassword">Password</label>' +
        '<div class="field-input" id="scholarPortalPasswordWrap">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
          '<input type="password" id="scholarPortalPassword" placeholder="Enter your password">' +
        '</div>' +
        '<div class="field-error" id="scholarPortalPasswordError"></div>' +
      '</div>' +
      '<button type="button" class="btn-sm btn-sm-primary" id="scholarUnlockBtn" style="width:100%;justify-content:center;padding:11px;">Sign In to My Dashboard</button>';

    document.getElementById('studentDetailBack').addEventListener('click', backToStudentResults);

    const pwInput = document.getElementById('scholarPortalPassword');
    const pwWrap = document.getElementById('scholarPortalPasswordWrap');
    const pwError = document.getElementById('scholarPortalPasswordError');
    const unlockBtn = document.getElementById('scholarUnlockBtn');

    async function attemptSignin() {
      pwWrap.classList.remove('invalid');
      pwError.textContent = ''; pwError.classList.remove('show');
      const password = pwInput.value;
      if (!password) {
        pwWrap.classList.add('invalid');
        pwError.textContent = 'Enter your password.';
        pwError.classList.add('show');
        return;
      }
      unlockBtn.disabled = true;
      try {
        const { token } = await api('/scholar-auth/signin', { method: 'POST', body: { id, password } });
        localStorage.setItem('tesda_token', token);
        closeModal();
        await openStudentDashboard();
      } catch (err) {
        pwWrap.classList.add('invalid');
        pwError.textContent = err.message;
        pwError.classList.add('show');
        unlockBtn.disabled = false;
      }
    }

    unlockBtn.addEventListener('click', attemptSignin);
    pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptSignin(); });
    pwInput.focus();
    return;
  }

  // Not claimed yet — first time this scholar is accessing their record,
  // so they set their own password now (Task-6-style validation).
  studentDetailCard.innerHTML = header +
    '<p class="field-hint" style="margin:-6px 0 14px;">First time here? Set a password for your own record — you\u2019ll use it every time you sign in from now on.</p>' +
    '<div class="field">' +
      '<label for="scholarNewPassword">Create a Password</label>' +
      '<div class="field-input" id="scholarNewPasswordWrap">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        '<input type="password" id="scholarNewPassword" placeholder="At least 8 characters" minlength="8">' +
      '</div>' +
      '<div class="field-error" id="scholarNewPasswordError"></div>' +
    '</div>' +
    '<div class="field">' +
      '<label for="scholarConfirmPassword">Confirm Password</label>' +
      '<div class="field-input" id="scholarConfirmPasswordWrap">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        '<input type="password" id="scholarConfirmPassword" placeholder="Re-enter your password" minlength="8">' +
      '</div>' +
      '<div class="field-error" id="scholarConfirmPasswordError"></div>' +
    '</div>' +
    '<button type="button" class="btn-sm btn-sm-primary" id="scholarClaimBtn" style="width:100%;justify-content:center;padding:11px;">Set Password &amp; Enter My Dashboard</button>';

  document.getElementById('studentDetailBack').addEventListener('click', backToStudentResults);

  const newPwInput = document.getElementById('scholarNewPassword');
  const newPwWrap = document.getElementById('scholarNewPasswordWrap');
  const newPwError = document.getElementById('scholarNewPasswordError');
  const confirmPwInput2 = document.getElementById('scholarConfirmPassword');
  const confirmPwWrap2 = document.getElementById('scholarConfirmPasswordWrap');
  const confirmPwError2 = document.getElementById('scholarConfirmPasswordError');
  const claimBtn = document.getElementById('scholarClaimBtn');

  async function attemptClaim() {
    [newPwWrap, confirmPwWrap2].forEach((w) => w.classList.remove('invalid'));
    [newPwError, confirmPwError2].forEach((e) => { e.textContent = ''; e.classList.remove('show'); });

    const password = newPwInput.value;
    const confirmPassword = confirmPwInput2.value;

    if (!password || password.length < 8) {
      newPwWrap.classList.add('invalid');
      newPwError.textContent = 'Password must be at least 8 characters.';
      newPwError.classList.add('show');
      return;
    }
    if (password !== confirmPassword) {
      confirmPwWrap2.classList.add('invalid');
      confirmPwError2.textContent = 'Passwords do not match.';
      confirmPwError2.classList.add('show');
      return;
    }

    claimBtn.disabled = true;
    try {
      const { token } = await api('/scholar-auth/set-password', { method: 'POST', body: { id, password, confirmPassword } });
      localStorage.setItem('tesda_token', token);
      closeModal();
      await openStudentDashboard();
    } catch (err) {
      confirmPwWrap2.classList.add('invalid');
      confirmPwError2.textContent = err.message;
      confirmPwError2.classList.add('show');
      claimBtn.disabled = false;
    }
  }

  claimBtn.addEventListener('click', attemptClaim);
  confirmPwInput2.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptClaim(); });
  newPwInput.focus();
}

function backToStudentResults() {
  studentDetailCard.classList.remove('show');
  studentDetailCard.innerHTML = '';
  studentSearchResults.classList.add('show');
}

studentSearchInput.addEventListener('input', () => {
  clearTimeout(studentSearchDebounce);
  studentSearchDebounce = setTimeout(() => runStudentSearch(studentSearchInput.value), 250);
});

/* ================= STVET ADMIN DASHBOARD ================= */

const siteHeader = document.getElementById('siteHeader');
const siteMain = document.getElementById('siteMain');
const adminDashboard = document.getElementById('adminDashboard');
const dashWelcome = document.getElementById('dashWelcome');
const dashLogoutBtn = document.getElementById('dashLogoutBtn');
const scholarTableBody = document.getElementById('scholarTableBody');
const detailPanel = document.getElementById('detailPanel');
const scholarSearch = document.getElementById('scholarSearch');
const statTotal = document.getElementById('statTotal');
const statHold = document.getElementById('statHold');
const statCleared = document.getElementById('statCleared');
const statReleased = document.getElementById('statReleased');

let selectedScholarId = null;
let searchDebounce = null;
let currentUserName = null;
let scholarEditMode = false;

// Small icon glyphs reused by every inline Edit/Delete/Save/Cancel control
// added in Task 8, across the Scholars, Accounts, and Payables tables.
const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
const SAVE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const CANCEL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function peso(amount) {
  return '\u20B1' + amount.toLocaleString('en-PH');
}

/* =========================================================
   TASK 7 — DATA STORAGE & RECORD MANAGEMENT
   ---------------------------------------------------------
   accountsCache / payablesCache are the in-memory JS arrays that back the
   two new dashboard tables. Every time they're refreshed from the API they
   are also mirrored into localStorage, so:
     - the tables can paint instantly from the last-known data the moment
       the dashboard opens (before the network request even resolves), and
     - a hard page refresh still shows the last saved records immediately,
       satisfying "retrieve saved records when the page is refreshed".
   The backend (server.js) remains the source of truth and is always
   re-fetched right after; localStorage is a cache, not the primary store.
   ========================================================= */
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage unavailable/full — cache is best-effort */ }
}

let accountsCache = cacheGet('tesda_accounts_cache');
let payablesCache = cacheGet('tesda_payables_cache');

async function renderStats() {
  const stats = await api('/stats');
  statTotal.textContent = stats.total;
  statHold.textContent = stats.hold;
  statCleared.textContent = stats.cleared;
  statReleased.textContent = stats.released;
}

async function renderTable() {
  const query = (scholarSearch.value || '').trim();
  const rows = await api('/scholars' + (query ? '?search=' + encodeURIComponent(query) : ''));

  if (rows.length === 0) {
    scholarTableBody.innerHTML = '<tr><td colspan="4" style="padding:26px 20px;text-align:center;color:var(--ink-500);">No scholars match your search.</td></tr>';
    return;
  }

  scholarTableBody.innerHTML = rows.map((s) => {
    const badge = s.status === 'CLEARED' ? '<span class="badge badge-cleared">Cleared</span>' : '<span class="badge badge-hold">On Hold</span>';
    const activeClass = s.id === selectedScholarId ? ' active-row' : '';
    return '<tr class="' + activeClass.trim() + '" data-id="' + s.id + '">' +
      '<td><div class="s-name">' + s.name + '</div><div class="s-id">' + s.id + ' &middot; ' + s.program + '</div></td>' +
      '<td>' + s.grant + '</td>' +
      '<td class="s-amount">' + peso(s.allowance) + '</td>' +
      '<td>' + badge + '</td></tr>';
  }).join('');

  scholarTableBody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => selectScholar(row.getAttribute('data-id')));
  });
}

async function renderDetail() {
  if (!selectedScholarId) {
    detailPanel.innerHTML = '<div class="detail-empty">Select a scholar from the list to view their Greenprints material payables and receipts.</div>';
    return;
  }

  let scholar;
  try {
    scholar = await api('/scholars/' + encodeURIComponent(selectedScholarId));
  } catch {
    detailPanel.innerHTML = '<div class="detail-empty">Could not load that scholar.</div>';
    return;
  }

  const statusBadge = scholar.status === 'CLEARED' ? '<span class="badge badge-cleared">Cleared</span>' : '<span class="badge badge-hold">On Hold</span>';
  const checkBadge = scholar.checkStatus === 'RELEASED' ? '<span class="badge badge-released">Check Released</span>' : '<span class="badge badge-hold">Check Pending</span>';

  const receiptsHtml = scholar.payables.map((p) => {
    const badge = p.status === 'PAID' ? '<span class="badge badge-paid">Paid</span>' : '<span class="badge badge-unpaid">Unpaid</span>';
    const meta = p.status === 'PAID' ? (p.orNo + ' &middot; ' + p.date + ' &middot; Cashier: ' + p.cashier) : 'Awaiting settlement at Greenprints';
    return '<div class="receipt-item"><div class="receipt-top">' +
      '<div><div class="receipt-item-name">' + p.item + '</div><div class="receipt-meta">' + meta + '</div></div>' +
      '<div style="text-align:right;"><div class="receipt-amount">' + peso(p.amount) + '</div><div style="margin-top:5px;">' + badge + '</div></div>' +
      '</div></div>';
  }).join('');

  const releaseDisabled = (scholar.status !== 'CLEARED' || scholar.checkStatus === 'RELEASED') ? 'disabled' : '';
  let hintHtml;
  if (scholar.checkStatus === 'RELEASED') {
    hintHtml = '<div class="release-hint ok">LandBank check already released to this scholar.</div>';
  } else if (scholar.status !== 'CLEARED') {
    hintHtml = '<div class="release-hint warn">Unpaid Greenprints items are blocking check release.</div>';
  } else {
    hintHtml = '<div class="release-hint ok">All material payables settled — check is ready.</div>';
  }

  // Task 8: the scholar header can flip into an edit form pre-filled with
  // this scholar's current data, in place of the read-only summary.
  const headerHtml = scholarEditMode ? scholarEditFormHtml(scholar) :
    '<div class="detail-student">' +
      '<div class="detail-student-name">' + scholar.name +
        ' <button type="button" class="btn-icon" id="editScholarBtn" title="Edit" style="margin-left:8px;vertical-align:middle;">' + EDIT_ICON + '</button>' +
      '</div>' +
      '<div class="detail-student-meta">' + scholar.id + ' &middot; ' + scholar.program + ' &middot; ' + scholar.grant + ' &middot; ' + peso(scholar.allowance) + '</div>' +
      '<div class="detail-status-row">' + statusBadge + checkBadge + '</div>' +
    '</div>';

  detailPanel.innerHTML =
    headerHtml +
    '<div class="receipt-list">' + receiptsHtml + '</div>' +
    '<div class="release-box"><button class="release-btn" id="releaseBtn" ' + releaseDisabled + '>Release LandBank Check</button>' + hintHtml + '</div>' +
    '<div class="release-box" style="border-top:1px solid var(--line);">' +
      '<button class="btn-sm btn-sm-danger" id="removeScholarBtn" style="width:100%;justify-content:center;">Remove Scholar from Monitoring</button>' +
    '</div>';

  const editScholarBtn = document.getElementById('editScholarBtn');
  if (editScholarBtn) {
    editScholarBtn.addEventListener('click', () => { scholarEditMode = true; renderDetail(); });
  }
  wireScholarEditForm(scholar);

  const releaseBtn = document.getElementById('releaseBtn');
  if (releaseBtn && !releaseBtn.disabled) {
    releaseBtn.addEventListener('click', async () => {
      releaseBtn.disabled = true;
      try {
        await api('/scholars/' + encodeURIComponent(scholar.id) + '/release-check', { method: 'POST' });
        await Promise.all([renderDetail(), renderTable(), renderStats()]);
      } catch (err) {
        alert(err.message);
        releaseBtn.disabled = false;
      }
    });
  }

  document.getElementById('removeScholarBtn').addEventListener('click', async () => {
    if (!confirm('Remove ' + scholar.name + ' from monitoring? This cannot be undone.')) return;
    try {
      await api('/scholars/' + encodeURIComponent(scholar.id), { method: 'DELETE' });
      selectedScholarId = null;
      await Promise.all([renderDetail(), renderTable(), renderStats()]);
    } catch (err) {
      alert(err.message);
    }
  });
}

function scholarEditFormHtml(scholar) {
  const esc = (v) => String(v).replace(/"/g, '&quot;');
  return '<div class="inline-form" style="border-bottom:none;padding:18px 20px 4px;">' +
    '<div class="field-row">' +
      '<div class="field"><label>Full Name</label><div class="field-input" id="editScholarNameWrap"><input type="text" id="editScholarName" value="' + esc(scholar.name) + '"></div><div class="field-error" id="editScholarNameError"></div></div>' +
      '<div class="field"><label>Program / Course</label><div class="field-input" id="editScholarProgramWrap"><input type="text" id="editScholarProgram" value="' + esc(scholar.program) + '"></div><div class="field-error" id="editScholarProgramError"></div></div>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Grant Program</label><div class="field-input" id="editScholarGrantWrap"><select id="editScholarGrant">' +
        ['TWSP', 'STEP', 'PESFA', 'UAQTEA'].map((g) => '<option value="' + g + '"' + (g === scholar.grant ? ' selected' : '') + '>' + g + '</option>').join('') +
      '</select></div><div class="field-error" id="editScholarGrantError"></div></div>' +
      '<div class="field"><label>Monthly Allowance (&#8369;)</label><div class="field-input" id="editScholarAllowanceWrap"><input type="number" id="editScholarAllowance" value="' + scholar.allowance + '" min="1" step="1"></div><div class="field-error" id="editScholarAllowanceError"></div></div>' +
    '</div>' +
    '<div class="inline-form-actions">' +
      '<button type="button" class="btn-sm btn-sm-primary" id="saveScholarEditBtn">Save Changes</button>' +
      '<button type="button" class="btn-sm btn-sm-ghost" id="cancelScholarEditBtn">Cancel</button>' +
    '</div>' +
    '<div class="inline-form-error" id="editScholarFormError"></div>' +
  '</div>';
}

function wireScholarEditForm(scholar) {
  const saveBtn = document.getElementById('saveScholarEditBtn');
  const cancelBtn = document.getElementById('cancelScholarEditBtn');
  if (!saveBtn) return;

  cancelBtn.addEventListener('click', () => { scholarEditMode = false; renderDetail(); });

  saveBtn.addEventListener('click', async () => {
    const nameWrap = document.getElementById('editScholarNameWrap');
    const programWrap = document.getElementById('editScholarProgramWrap');
    const grantWrap = document.getElementById('editScholarGrantWrap');
    const allowanceWrap = document.getElementById('editScholarAllowanceWrap');
    const nameError = document.getElementById('editScholarNameError');
    const programError = document.getElementById('editScholarProgramError');
    const grantError = document.getElementById('editScholarGrantError');
    const allowanceError = document.getElementById('editScholarAllowanceError');
    const formError = document.getElementById('editScholarFormError');

    [nameWrap, programWrap, grantWrap, allowanceWrap].forEach((w) => w.classList.remove('invalid'));
    [nameError, programError, grantError, allowanceError, formError].forEach((e) => { e.textContent = ''; e.classList.remove('show'); });

    const name = document.getElementById('editScholarName').value.trim();
    const program = document.getElementById('editScholarProgram').value.trim();
    const grant = document.getElementById('editScholarGrant').value;
    const allowance = Number(document.getElementById('editScholarAllowance').value);

    let ok = true;
    if (name.length < 2) { nameWrap.classList.add('invalid'); nameError.textContent = 'Enter the scholar\u2019s full name.'; nameError.classList.add('show'); ok = false; }
    if (program.length < 2) { programWrap.classList.add('invalid'); programError.textContent = 'Enter the enrolled program/course.'; programError.classList.add('show'); ok = false; }
    if (!grant) { grantWrap.classList.add('invalid'); grantError.textContent = 'Choose a grant program.'; grantError.classList.add('show'); ok = false; }
    if (!Number.isFinite(allowance) || allowance <= 0) { allowanceWrap.classList.add('invalid'); allowanceError.textContent = 'Enter a valid allowance amount greater than 0.'; allowanceError.classList.add('show'); ok = false; }
    if (!ok) return;

    saveBtn.disabled = true;
    try {
      await api('/scholars/' + encodeURIComponent(scholar.id), { method: 'PUT', body: { name, program, grant, allowance } });
      scholarEditMode = false;
      await Promise.all([renderDetail(), renderTable(), renderStats()]);
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.add('show');
      saveBtn.disabled = false;
    }
  });
}

function selectScholar(id) {
  selectedScholarId = id;
  scholarEditMode = false;
  renderTable();
  renderDetail();
}

scholarSearch.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderTable, 200);
});

/* ---------------- Add Enrollee (STVET Admin) ---------------- */

const toggleAddScholarBtn = document.getElementById('toggleAddScholarBtn');
const addScholarForm = document.getElementById('addScholarForm');
const cancelAddScholarBtn = document.getElementById('cancelAddScholarBtn');
const submitAddScholarBtn = document.getElementById('submitAddScholarBtn');
const addScholarFormError = document.getElementById('addScholarFormError');

const newScholarName = document.getElementById('newScholarName');
const newScholarNameWrap = document.getElementById('newScholarNameWrap');
const newScholarNameError = document.getElementById('newScholarNameError');
const newScholarProgram = document.getElementById('newScholarProgram');
const newScholarProgramWrap = document.getElementById('newScholarProgramWrap');
const newScholarProgramError = document.getElementById('newScholarProgramError');
const newScholarGrant = document.getElementById('newScholarGrant');
const newScholarGrantWrap = document.getElementById('newScholarGrantWrap');
const newScholarGrantError = document.getElementById('newScholarGrantError');
const newScholarAllowance = document.getElementById('newScholarAllowance');
const newScholarAllowanceWrap = document.getElementById('newScholarAllowanceWrap');
const newScholarAllowanceError = document.getElementById('newScholarAllowanceError');

function resetAddScholarForm() {
  newScholarName.value = '';
  newScholarProgram.value = '';
  newScholarGrant.value = '';
  newScholarAllowance.value = '';
  [newScholarNameWrap, newScholarProgramWrap, newScholarGrantWrap, newScholarAllowanceWrap].forEach((w) => w.classList.remove('invalid'));
  [newScholarNameError, newScholarProgramError, newScholarGrantError, newScholarAllowanceError, addScholarFormError].forEach((e) => { e.textContent = ''; e.classList.remove('show'); });
}

toggleAddScholarBtn.addEventListener('click', () => {
  const isHidden = addScholarForm.hidden;
  addScholarForm.hidden = !isHidden;
  if (!isHidden) resetAddScholarForm();
  else newScholarName.focus();
});

cancelAddScholarBtn.addEventListener('click', () => {
  addScholarForm.hidden = true;
  resetAddScholarForm();
});

function addScholarFieldError(wrap, errorEl, msg) {
  wrap.classList.add('invalid');
  errorEl.textContent = msg;
  errorEl.classList.add('show');
}

submitAddScholarBtn.addEventListener('click', async () => {
  [newScholarNameWrap, newScholarProgramWrap, newScholarGrantWrap, newScholarAllowanceWrap].forEach((w) => w.classList.remove('invalid'));
  [newScholarNameError, newScholarProgramError, newScholarGrantError, newScholarAllowanceError, addScholarFormError].forEach((e) => { e.textContent = ''; e.classList.remove('show'); });

  const name = newScholarName.value.trim();
  const program = newScholarProgram.value.trim();
  const grant = newScholarGrant.value;
  const allowance = Number(newScholarAllowance.value);

  let ok = true;
  if (name.length < 2) { addScholarFieldError(newScholarNameWrap, newScholarNameError, 'Enter the scholar\u2019s full name.'); ok = false; }
  if (program.length < 2) { addScholarFieldError(newScholarProgramWrap, newScholarProgramError, 'Enter the enrolled program/course.'); ok = false; }
  if (!grant) { addScholarFieldError(newScholarGrantWrap, newScholarGrantError, 'Choose a grant program.'); ok = false; }
  if (!Number.isFinite(allowance) || allowance <= 0) { addScholarFieldError(newScholarAllowanceWrap, newScholarAllowanceError, 'Enter a valid allowance amount greater than 0.'); ok = false; }
  if (!ok) return;

  submitAddScholarBtn.disabled = true;
  try {
    await api('/scholars', { method: 'POST', body: { name, program, grant, allowance } });
    addScholarForm.hidden = true;
    resetAddScholarForm();
    await Promise.all([renderTable(), renderStats()]);
  } catch (err) {
    addScholarFormError.textContent = err.message;
    addScholarFormError.classList.add('show');
  } finally {
    submitAddScholarBtn.disabled = false;
  }
});

/* ---------------- Registered Accounts table ---------------- */

const accountsTableBody = document.getElementById('accountsTableBody');
const accountsSearch = document.getElementById('accountsSearch');
let accountsSearchDebounce = null;

function roleLabel(role) {
  return role === 'admin' ? 'STVET Admin' : role === 'greenprints' ? 'Greenprints' : 'Scholar Student';
}

// Pure DOM-manipulation render off the in-memory accountsCache array — no
// network call here, so filtering as the admin types is instant.
let accountEditingId = null;

function renderAccountsTable() {
  const query = (accountsSearch.value || '').trim().toLowerCase();
  const rows = query
    ? accountsCache.filter((a) =>
        a.name.toLowerCase().includes(query) ||
        a.loginId.toLowerCase().includes(query) ||
        roleLabel(a.role).toLowerCase().includes(query))
    : accountsCache;

  if (rows.length === 0) {
    accountsTableBody.innerHTML = '<tr><td colspan="4" style="padding:26px 20px;text-align:center;color:var(--ink-500);">' +
      (accountsCache.length === 0 ? 'No accounts have been registered yet.' : 'No accounts match your search.') + '</td></tr>';
    return;
  }

  accountsTableBody.innerHTML = rows.map((a) => {
    if (a.id === accountEditingId) return accountEditRowHtml(a);
    return '<tr>' +
      '<td><div class="s-name">' + a.name + '</div><div class="s-id">' + a.loginId + '</div></td>' +
      '<td>' + roleLabel(a.role) + '</td>' +
      '<td>' + a.id + '</td>' +
      '<td><div class="row-actions">' +
        '<button type="button" class="btn-icon" data-acc-edit="' + a.id + '" title="Edit">' + EDIT_ICON + '</button>' +
        '<button type="button" class="btn-icon danger" data-acc-delete="' + a.id + '" title="Delete">' + DELETE_ICON + '</button>' +
      '</div></td></tr>';
  }).join('');

  wireAccountRowActions(rows);
}

function accountEditRowHtml(a) {
  return '<tr class="editing-row" data-acc-editing="' + a.id + '">' +
    '<td>' +
      '<input type="text" class="table-edit-input" id="accEditName" value="' + a.name.replace(/"/g, '&quot;') + '" placeholder="Full name" style="margin-bottom:6px;">' +
      '<input type="text" class="table-edit-input" id="accEditEmail" value="' + a.loginId.replace(/"/g, '&quot;') + '" placeholder="Email">' +
      '<div class="row-edit-error" id="accEditError"></div>' +
    '</td>' +
    '<td>' +
      '<select class="table-edit-select" id="accEditRole">' +
        '<option value="admin"' + (a.role === 'admin' ? ' selected' : '') + '>STVET Admin</option>' +
        '<option value="greenprints"' + (a.role === 'greenprints' ? ' selected' : '') + '>Greenprints</option>' +
      '</select>' +
    '</td>' +
    '<td>' + a.id + '</td>' +
    '<td><div class="row-actions">' +
      '<button type="button" class="btn-icon" id="accEditSave" title="Save">' + SAVE_ICON + '</button>' +
      '<button type="button" class="btn-icon" id="accEditCancel" title="Cancel">' + CANCEL_ICON + '</button>' +
    '</div></td></tr>';
}

function wireAccountRowActions(rows) {
  accountsTableBody.querySelectorAll('[data-acc-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      accountEditingId = btn.getAttribute('data-acc-edit');
      renderAccountsTable();
    });
  });
  accountsTableBody.querySelectorAll('[data-acc-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-acc-delete');
      const acc = accountsCache.find((a) => a.id === id);
      if (!confirm('Delete the account for ' + (acc ? acc.name : id) + '? This cannot be undone.')) return;
      try {
        await api('/accounts/' + encodeURIComponent(id), { method: 'DELETE' });
        await loadAccounts();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  const saveBtn = document.getElementById('accEditSave');
  const cancelBtn = document.getElementById('accEditCancel');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const errorEl = document.getElementById('accEditError');
      const nameInput = document.getElementById('accEditName');
      const emailInput = document.getElementById('accEditEmail');
      const roleSelect = document.getElementById('accEditRole');
      nameInput.classList.remove('invalid');
      emailInput.classList.remove('invalid');
      errorEl.textContent = ''; errorEl.classList.remove('show');

      const name = nameInput.value.trim();
      const loginId = emailInput.value.trim();
      const role = roleSelect.value;
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (name.length < 2) {
        nameInput.classList.add('invalid');
        errorEl.textContent = 'Enter the account holder\u2019s full name.'; errorEl.classList.add('show');
        return;
      }
      if (!emailRe.test(loginId)) {
        emailInput.classList.add('invalid');
        errorEl.textContent = 'Enter a valid email address.'; errorEl.classList.add('show');
        return;
      }

      saveBtn.disabled = true;
      try {
        await api('/accounts/' + encodeURIComponent(accountEditingId), { method: 'PUT', body: { name, loginId, role } });
        accountEditingId = null;
        await loadAccounts();
      } catch (err) {
        errorEl.textContent = err.message; errorEl.classList.add('show');
        saveBtn.disabled = false;
      }
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      accountEditingId = null;
      renderAccountsTable();
    });
  }
}

async function loadAccounts() {
  if (accountsCache.length) renderAccountsTable(); // paint the cached copy immediately
  try {
    accountsCache = await api('/accounts');
    cacheSet('tesda_accounts_cache', accountsCache);
    renderAccountsTable();
  } catch {
    /* backend unreachable — keep showing whatever was cached, if anything */
  }
}

accountsSearch.addEventListener('input', () => {
  clearTimeout(accountsSearchDebounce);
  accountsSearchDebounce = setTimeout(renderAccountsTable, 200);
});

/* ---------------- Greenprints Material Payables table ---------------- */

const payablesTableBody = document.getElementById('payablesTableBody');
const payablesSearch = document.getElementById('payablesSearch');
let payablesSearchDebounce = null;

let payableEditingId = null;

function renderPayablesTable() {
  const query = (payablesSearch.value || '').trim().toLowerCase();
  const rows = query
    ? payablesCache.filter((p) =>
        p.item.toLowerCase().includes(query) ||
        p.scholarName.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query))
    : payablesCache;

  if (rows.length === 0) {
    payablesTableBody.innerHTML = '<tr><td colspan="5" style="padding:26px 20px;text-align:center;color:var(--ink-500);">' +
      (payablesCache.length === 0 ? 'No Greenprints payables on file yet.' : 'No payables match your search.') + '</td></tr>';
    return;
  }

  payablesTableBody.innerHTML = rows.map((p) => {
    if (p.id === payableEditingId) return payableEditRowHtml(p);
    const badge = p.status === 'PAID' ? '<span class="badge badge-paid">Paid</span>' : '<span class="badge badge-unpaid">Unpaid</span>';
    const receipt = p.status === 'PAID' ? (p.orNo + ' &middot; ' + p.date) : '&mdash;';
    return '<tr><td><div class="s-name">' + p.item + '</div><div class="s-id">' + p.scholarName + ' &middot; ' + p.scholarId + '</div></td>' +
      '<td class="s-amount">' + peso(p.amount) + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' + receipt + '</td>' +
      '<td><div class="row-actions">' +
        '<button type="button" class="btn-icon" data-pay-edit="' + p.id + '" title="Edit">' + EDIT_ICON + '</button>' +
        '<button type="button" class="btn-icon danger" data-pay-delete="' + p.id + '" title="Delete">' + DELETE_ICON + '</button>' +
      '</div></td></tr>';
  }).join('');

  wirePayableRowActions();
}

function payableEditRowHtml(p) {
  return '<tr class="editing-row">' +
    '<td>' +
      '<input type="text" class="table-edit-input" id="payEditItem" value="' + p.item.replace(/"/g, '&quot;') + '" placeholder="Item name" style="margin-bottom:4px;">' +
      '<div class="s-id" style="margin-top:4px;">' + p.scholarName + ' &middot; ' + p.scholarId + ' (fixed)</div>' +
      '<div class="row-edit-error" id="payEditError"></div>' +
    '</td>' +
    '<td><input type="number" class="table-edit-input" id="payEditAmount" value="' + p.amount + '" min="1" step="1"></td>' +
    '<td colspan="2" style="color:var(--ink-500);font-size:11.5px;">Status/receipt unaffected by this edit.</td>' +
    '<td><div class="row-actions">' +
      '<button type="button" class="btn-icon" id="payEditSave" title="Save">' + SAVE_ICON + '</button>' +
      '<button type="button" class="btn-icon" id="payEditCancel" title="Cancel">' + CANCEL_ICON + '</button>' +
    '</div></td></tr>';
}

function wirePayableRowActions() {
  payablesTableBody.querySelectorAll('[data-pay-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      payableEditingId = btn.getAttribute('data-pay-edit');
      renderPayablesTable();
    });
  });
  payablesTableBody.querySelectorAll('[data-pay-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-pay-delete');
      const p = payablesCache.find((row) => row.id === id);
      if (!confirm('Delete "' + (p ? p.item : id) + '"? This cannot be undone.')) return;
      try {
        await api('/scholars/' + encodeURIComponent(p.scholarId) + '/payables/' + encodeURIComponent(id), { method: 'DELETE' });
        await Promise.all([loadPayables(), renderTable(), renderStats()]);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  const saveBtn = document.getElementById('payEditSave');
  const cancelBtn = document.getElementById('payEditCancel');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const p = payablesCache.find((row) => row.id === payableEditingId);
      const errorEl = document.getElementById('payEditError');
      const itemInput = document.getElementById('payEditItem');
      const amountInput = document.getElementById('payEditAmount');
      itemInput.classList.remove('invalid');
      amountInput.classList.remove('invalid');
      errorEl.textContent = ''; errorEl.classList.remove('show');

      const item = itemInput.value.trim();
      const amount = Number(amountInput.value);
      if (item.length < 2) {
        itemInput.classList.add('invalid');
        errorEl.textContent = 'Enter the material/item name.'; errorEl.classList.add('show');
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.classList.add('invalid');
        errorEl.textContent = 'Enter a valid amount greater than 0.'; errorEl.classList.add('show');
        return;
      }

      saveBtn.disabled = true;
      try {
        await api('/scholars/' + encodeURIComponent(p.scholarId) + '/payables/' + encodeURIComponent(payableEditingId), { method: 'PUT', body: { item, amount } });
        payableEditingId = null;
        await Promise.all([loadPayables(), renderTable(), renderStats()]);
      } catch (err) {
        errorEl.textContent = err.message; errorEl.classList.add('show');
        saveBtn.disabled = false;
      }
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      payableEditingId = null;
      renderPayablesTable();
    });
  }
}

async function loadPayables() {
  if (payablesCache.length) renderPayablesTable(); // paint the cached copy immediately
  try {
    payablesCache = await api('/payables');
    cacheSet('tesda_payables_cache', payablesCache);
    renderPayablesTable();
  } catch {
    /* backend unreachable — keep showing whatever was cached, if anything */
  }
}

payablesSearch.addEventListener('input', () => {
  clearTimeout(payablesSearchDebounce);
  payablesSearchDebounce = setTimeout(renderPayablesTable, 200);
});

async function openAdminDashboard(displayName) {
  hideLanding();
  adminDashboard.style.display = 'block';
  dashWelcome.textContent = 'Signed in as ' + (displayName || 'STVET Admin');
  window.scrollTo(0, 0);
  await Promise.all([renderStats(), renderTable(), renderDetail(), loadAccounts(), loadPayables()]);
}

dashLogoutBtn.addEventListener('click', async () => {
  await logoutAndShowLanding();
  adminDashboard.style.display = 'none';
  selectedScholarId = null;
});

/* =========================================================
   MULTI-ROLE DASHBOARD PLUMBING
   Shared show/hide for the landing page + a single logout routine used
   by all three dashboards (Admin, Greenprints, Scholar Student).
   ========================================================= */

function hideLanding() {
  siteHeader.style.display = 'none';
  siteMain.style.display = 'none';
  document.querySelector('section.lifecycle-wrap').style.display = 'none';
}

function showLanding() {
  siteHeader.style.display = '';
  siteMain.style.display = '';
  document.querySelector('section.lifecycle-wrap').style.display = '';
  window.scrollTo(0, 0);
}

async function logoutAndShowLanding() {
  try { await api('/auth/signout', { method: 'POST' }); } catch { /* ignore */ }
  localStorage.removeItem('tesda_token');
  currentUserName = null;
  showLanding();
}

async function openDashboardFor(role, user) {
  const displayName = user && (user.name || user.loginId);
  currentUserName = displayName || null;
  if (role === 'admin') return openAdminDashboard(displayName);
  if (role === 'greenprints') return openGreenprintsDashboard(displayName);
  if (role === 'student') return openStudentDashboard();
}

/* If a token from a previous session is still in localStorage, ask the
   backend who's signed in (works for any role) and resume the right
   dashboard automatically. */
(async function resumeSession() {
  const token = localStorage.getItem('tesda_token');
  if (!token) return;
  try {
    const me = await api('/me');
    await openDashboardFor(me.role, me);
  } catch {
    localStorage.removeItem('tesda_token');
  }
})();

/* =========================================================
   GREENPRINTS DASHBOARD
   ---------------------------------------------------------
   Greenprints staff: encode instructional-materials items scholars
   received, liquidate (settle) cash payments for those items, and
   confirm a scholar has physically picked up a released LandBank check.
   ========================================================= */

const greenprintsDashboard = document.getElementById('greenprintsDashboard');
const gpDashWelcome = document.getElementById('gpDashWelcome');
const gpDashLogoutBtn = document.getElementById('gpDashLogoutBtn');
const gpScholarTableBody = document.getElementById('gpScholarTableBody');
const gpScholarSearch = document.getElementById('gpScholarSearch');
const gpDetailPanel = document.getElementById('gpDetailPanel');
const gpStatTotal = document.getElementById('gpStatTotal');
const gpStatUnpaidItems = document.getElementById('gpStatUnpaidItems');
const gpStatUnpaidAmount = document.getElementById('gpStatUnpaidAmount');
const gpStatCheques = document.getElementById('gpStatCheques');

let gpSelectedScholarId = null;
let gpSearchDebounce = null;
let gpPayableEditingId = null;

async function gpRenderStats() {
  const stats = await api('/greenprints/stats');
  gpStatTotal.textContent = stats.totalScholars;
  gpStatUnpaidItems.textContent = stats.unpaidItems;
  gpStatUnpaidAmount.textContent = peso(stats.unpaidAmount);
  gpStatCheques.textContent = stats.chequesToDeliver;
}

async function gpRenderTable() {
  const query = (gpScholarSearch.value || '').trim();
  const rows = await api('/scholars' + (query ? '?search=' + encodeURIComponent(query) : ''));

  if (rows.length === 0) {
    gpScholarTableBody.innerHTML = '<tr><td colspan="3" style="padding:26px 20px;text-align:center;color:var(--ink-500);">No scholars match your search.</td></tr>';
    return;
  }

  gpScholarTableBody.innerHTML = rows.map((s) => {
    const materialsBadge = s.status === 'CLEARED' ? '<span class="badge badge-cleared">All Settled</span>' : '<span class="badge badge-hold">Balance Due</span>';
    let checkBadge;
    if (s.checkStatus !== 'RELEASED') checkBadge = '<span class="badge badge-hold">Not Released</span>';
    else if (!s.checkReceived) checkBadge = '<span class="badge badge-unpaid">Awaiting Pickup</span>';
    else checkBadge = '<span class="badge badge-released">Received</span>';
    const activeClass = s.id === gpSelectedScholarId ? ' active-row' : '';
    return '<tr class="' + activeClass.trim() + '" data-id="' + s.id + '">' +
      '<td><div class="s-name">' + s.name + '</div><div class="s-id">' + s.id + ' &middot; ' + s.program + '</div></td>' +
      '<td>' + materialsBadge + '</td>' +
      '<td>' + checkBadge + '</td></tr>';
  }).join('');

  gpScholarTableBody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => gpSelectScholar(row.getAttribute('data-id')));
  });
}

function gpSelectScholar(id) {
  gpSelectedScholarId = id;
  gpPayableEditingId = null;
  gpRenderTable();
  gpRenderDetail();
}

gpScholarSearch.addEventListener('input', () => {
  clearTimeout(gpSearchDebounce);
  gpSearchDebounce = setTimeout(gpRenderTable, 200);
});

async function gpRenderDetail() {
  if (!gpSelectedScholarId) {
    gpDetailPanel.innerHTML = '<div class="detail-empty">Select a scholar from the list to encode materials, liquidate cash, or confirm check pickup.</div>';
    return;
  }

  let scholar;
  try {
    scholar = await api('/scholars/' + encodeURIComponent(gpSelectedScholarId));
  } catch {
    gpDetailPanel.innerHTML = '<div class="detail-empty">Could not load that scholar.</div>';
    return;
  }

  const statusBadge = scholar.status === 'CLEARED' ? '<span class="badge badge-cleared">All Settled</span>' : '<span class="badge badge-hold">Balance Due</span>';

  const payablesHtml = scholar.payables.map((p) => {
    if (p.id === gpPayableEditingId) {
      return '<div class="payable-row">' +
        '<div class="field-row" style="margin-bottom:8px;">' +
          '<input type="text" class="table-edit-input" id="gpPayEditItem" value="' + p.item.replace(/"/g, '&quot;') + '" placeholder="Item name">' +
          '<input type="number" class="table-edit-input" id="gpPayEditAmount" value="' + p.amount + '" min="1" step="1" style="max-width:120px;">' +
        '</div>' +
        '<div class="row-edit-error" id="gpPayEditError"></div>' +
        '<div class="inline-form-actions" style="margin-top:8px;">' +
          '<button type="button" class="btn-sm btn-sm-primary" id="gpPayEditSave">Save</button>' +
          '<button type="button" class="btn-sm btn-sm-ghost" id="gpPayEditCancel">Cancel</button>' +
        '</div></div>';
    }
    const actions = '<div class="row-actions" style="margin-top:6px;">' +
      '<button type="button" class="btn-icon" data-gp-pay-edit="' + p.id + '" title="Edit">' + EDIT_ICON + '</button>' +
      '<button type="button" class="btn-icon danger" data-gp-pay-delete="' + p.id + '" title="Delete">' + DELETE_ICON + '</button>' +
    '</div>';
    if (p.status === 'PAID') {
      return '<div class="payable-row"><div class="payable-row-top">' +
        '<div><div class="receipt-item-name">' + p.item + '</div><div class="receipt-meta">' + p.orNo + ' &middot; ' + p.date + ' &middot; Cashier: ' + p.cashier + '</div></div>' +
        '<div style="text-align:right;"><div class="receipt-amount">' + peso(p.amount) + '</div><div style="margin-top:5px;"><span class="badge badge-paid">Paid</span></div>' + actions + '</div>' +
        '</div></div>';
    }
    return '<div class="payable-row"><div class="payable-row-top">' +
      '<div><div class="receipt-item-name">' + p.item + '</div><div class="receipt-meta">Awaiting cash liquidation</div></div>' +
      '<div style="text-align:right;"><div class="receipt-amount">' + peso(p.amount) + '</div><div style="margin-top:5px;"><span class="badge badge-unpaid">Unpaid</span></div>' + actions + '</div>' +
      '</div>' +
      '<div class="payable-liquidate-form" data-payable-id="' + p.id + '">' +
        '<input type="text" placeholder="OR Number" class="liq-or" maxlength="30">' +
        '<input type="text" placeholder="Date (e.g. Sep 20, 2026)" class="liq-date" maxlength="30">' +
        '<input type="text" placeholder="Cashier name" class="liq-cashier" maxlength="40" value="' + (currentUserName || '') + '">' +
        '<button type="button" class="btn-sm btn-sm-primary liq-submit">Liquidate</button>' +
      '</div>' +
      '<div class="payable-liquidate-error" data-payable-error="' + p.id + '"></div>' +
      '</div>';
  }).join('');

  let checkAction;
  if (scholar.checkStatus !== 'RELEASED') {
    checkAction = '<div class="release-hint warn">STVET Admin has not released this check yet.</div>';
  } else if (scholar.checkReceived) {
    checkAction = '<div class="release-hint ok">Scholar has already received their LandBank check.</div>';
  } else {
    checkAction = '<button class="release-btn" id="gpReceiveCheckBtn">Confirm Scholar Received Check</button>' +
      '<div class="release-hint ok" style="margin-top:8px;">Check was released by STVET Admin — awaiting pickup.</div>';
  }

  gpDetailPanel.innerHTML =
    '<div class="detail-student">' +
      '<div class="detail-student-name">' + scholar.name + '</div>' +
      '<div class="detail-student-meta">' + scholar.id + ' &middot; ' + scholar.program + ' &middot; ' + scholar.grant + '</div>' +
      '<div class="detail-status-row">' + statusBadge + '</div>' +
    '</div>' +
    '<div class="receipt-list" style="max-height:220px;">' + payablesHtml + '</div>' +
    '<div class="inline-form" id="gpAddMaterialForm">' +
      '<div class="field-row">' +
        '<div class="field"><label>Material / Item</label><div class="field-input" id="gpItemWrap"><input type="text" id="gpItemInput" placeholder="e.g. Drafting Kit" maxlength="80"></div><div class="field-error" id="gpItemError"></div></div>' +
        '<div class="field"><label>Amount (&#8369;)</label><div class="field-input" id="gpAmountWrap"><input type="number" id="gpAmountInput" placeholder="500" min="1" step="1"></div><div class="field-error" id="gpAmountError"></div></div>' +
      '</div>' +
      '<div class="inline-form-actions"><button type="button" class="btn-sm btn-sm-primary" id="gpAddMaterialBtn">+ Encode Material Received</button></div>' +
      '<div class="inline-form-error" id="gpAddMaterialFormError"></div>' +
    '</div>' +
    '<div class="release-box">' + checkAction + '</div>';

  // Task 8: wire each payable row's Edit/Delete icon buttons.
  gpDetailPanel.querySelectorAll('[data-gp-pay-edit]').forEach((btn) => {
    btn.addEventListener('click', () => { gpPayableEditingId = btn.getAttribute('data-gp-pay-edit'); gpRenderDetail(); });
  });
  gpDetailPanel.querySelectorAll('[data-gp-pay-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payableId = btn.getAttribute('data-gp-pay-delete');
      const p = scholar.payables.find((row) => row.id === payableId);
      if (!confirm('Delete "' + (p ? p.item : payableId) + '"? This cannot be undone.')) return;
      try {
        await api('/scholars/' + encodeURIComponent(scholar.id) + '/payables/' + encodeURIComponent(payableId), { method: 'DELETE' });
        await Promise.all([gpRenderDetail(), gpRenderTable(), gpRenderStats()]);
      } catch (err) {
        alert(err.message);
      }
    });
  });
  const gpPayEditSave = document.getElementById('gpPayEditSave');
  const gpPayEditCancel = document.getElementById('gpPayEditCancel');
  if (gpPayEditSave) {
    gpPayEditSave.addEventListener('click', async () => {
      const errorEl = document.getElementById('gpPayEditError');
      const itemInput = document.getElementById('gpPayEditItem');
      const amountInput = document.getElementById('gpPayEditAmount');
      itemInput.classList.remove('invalid');
      amountInput.classList.remove('invalid');
      errorEl.textContent = ''; errorEl.classList.remove('show');

      const item = itemInput.value.trim();
      const amount = Number(amountInput.value);
      if (item.length < 2) {
        itemInput.classList.add('invalid');
        errorEl.textContent = 'Enter the material/item name.'; errorEl.classList.add('show');
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.classList.add('invalid');
        errorEl.textContent = 'Enter a valid amount greater than 0.'; errorEl.classList.add('show');
        return;
      }

      gpPayEditSave.disabled = true;
      try {
        await api('/scholars/' + encodeURIComponent(scholar.id) + '/payables/' + encodeURIComponent(gpPayableEditingId), { method: 'PUT', body: { item, amount } });
        gpPayableEditingId = null;
        await Promise.all([gpRenderDetail(), gpRenderTable(), gpRenderStats()]);
      } catch (err) {
        errorEl.textContent = err.message; errorEl.classList.add('show');
        gpPayEditSave.disabled = false;
      }
    });
  }
  if (gpPayEditCancel) {
    gpPayEditCancel.addEventListener('click', () => { gpPayableEditingId = null; gpRenderDetail(); });
  }

  // Wire each unpaid item's inline "Liquidate" mini-form.
  gpDetailPanel.querySelectorAll('.payable-liquidate-form').forEach((formEl) => {
    const payableId = formEl.getAttribute('data-payable-id');
    const errorEl = gpDetailPanel.querySelector('[data-payable-error="' + payableId + '"]');
    formEl.querySelector('.liq-submit').addEventListener('click', async () => {
      const orNo = formEl.querySelector('.liq-or').value.trim();
      const date = formEl.querySelector('.liq-date').value.trim();
      const cashier = formEl.querySelector('.liq-cashier').value.trim();

      [...formEl.querySelectorAll('input')].forEach((i) => i.classList.remove('invalid'));
      errorEl.textContent = '';
      errorEl.classList.remove('show');

      if (!orNo || orNo.length < 3) return liqFieldError(formEl.querySelector('.liq-or'), errorEl, 'Enter a valid OR number (at least 3 characters).');
      if (!date) return liqFieldError(formEl.querySelector('.liq-date'), errorEl, 'Enter the payment date.');
      if (!cashier || cashier.length < 2) return liqFieldError(formEl.querySelector('.liq-cashier'), errorEl, 'Enter the cashier\u2019s name.');

      try {
        await api('/scholars/' + encodeURIComponent(scholar.id) + '/payables/' + encodeURIComponent(payableId) + '/liquidate', {
          method: 'POST',
          body: { orNo, date, cashier }
        });
        await Promise.all([gpRenderDetail(), gpRenderTable(), gpRenderStats()]);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
      }
    });
  });

  function liqFieldError(input, errorEl, msg) {
    input.classList.add('invalid');
    errorEl.textContent = msg;
    errorEl.classList.add('show');
  }

  // Wire "Encode Material Received" (add a new UNPAID payable item).
  const gpItemInput = document.getElementById('gpItemInput');
  const gpAmountInput = document.getElementById('gpAmountInput');
  const gpItemWrap = document.getElementById('gpItemWrap');
  const gpAmountWrap = document.getElementById('gpAmountWrap');
  const gpItemError = document.getElementById('gpItemError');
  const gpAmountError = document.getElementById('gpAmountError');
  const gpAddMaterialFormError = document.getElementById('gpAddMaterialFormError');

  document.getElementById('gpAddMaterialBtn').addEventListener('click', async () => {
    gpItemWrap.classList.remove('invalid');
    gpAmountWrap.classList.remove('invalid');
    gpItemError.textContent = ''; gpItemError.classList.remove('show');
    gpAmountError.textContent = ''; gpAmountError.classList.remove('show');
    gpAddMaterialFormError.textContent = ''; gpAddMaterialFormError.classList.remove('show');

    const item = gpItemInput.value.trim();
    const amount = Number(gpAmountInput.value);
    let ok = true;
    if (item.length < 2) {
      gpItemWrap.classList.add('invalid'); gpItemError.textContent = 'Enter the material/item name.'; gpItemError.classList.add('show'); ok = false;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      gpAmountWrap.classList.add('invalid'); gpAmountError.textContent = 'Enter a valid amount greater than 0.'; gpAmountError.classList.add('show'); ok = false;
    }
    if (!ok) return;

    try {
      await api('/scholars/' + encodeURIComponent(scholar.id) + '/payables', { method: 'POST', body: { item, amount } });
      await Promise.all([gpRenderDetail(), gpRenderTable(), gpRenderStats()]);
    } catch (err) {
      gpAddMaterialFormError.textContent = err.message;
      gpAddMaterialFormError.classList.add('show');
    }
  });

  const gpReceiveCheckBtn = document.getElementById('gpReceiveCheckBtn');
  if (gpReceiveCheckBtn) {
    gpReceiveCheckBtn.addEventListener('click', async () => {
      gpReceiveCheckBtn.disabled = true;
      try {
        await api('/scholars/' + encodeURIComponent(scholar.id) + '/receive-check', { method: 'POST' });
        await Promise.all([gpRenderDetail(), gpRenderTable(), gpRenderStats()]);
      } catch (err) {
        alert(err.message);
        gpReceiveCheckBtn.disabled = false;
      }
    });
  }
}

async function openGreenprintsDashboard(displayName) {
  hideLanding();
  greenprintsDashboard.style.display = 'block';
  gpDashWelcome.textContent = 'Signed in as ' + (displayName || 'Greenprints Staff');
  window.scrollTo(0, 0);
  await Promise.all([gpRenderStats(), gpRenderTable(), gpRenderDetail()]);
}

gpDashLogoutBtn.addEventListener('click', async () => {
  await logoutAndShowLanding();
  greenprintsDashboard.style.display = 'none';
  gpSelectedScholarId = null;
});

/* =========================================================
   SCHOLAR STUDENT DASHBOARD
   ---------------------------------------------------------
   Reached only via the search-by-name + set/enter password flow in the
   sign-in modal. The session (from /api/scholar-auth/set-password or
   /api/scholar-auth/signin) already carries which one scholar this is,
   so the dashboard goes straight to that scholar's own record — no
   re-searching needed. Tracks liquidation status, payable receipts, and
   instructional materials received, plus a progress bar against the
   fixed ₱5,500 instructional materials fee.
   ========================================================= */

const studentDashboard = document.getElementById('studentDashboard');
const stuDashWelcome = document.getElementById('stuDashWelcome');
const stuDashLogoutBtn = document.getElementById('stuDashLogoutBtn');
const stuDetailArea = document.getElementById('stuDetailArea');

async function stuRenderMyDashboard() {
  let scholar;
  try {
    scholar = await api('/scholar/me');
  } catch (err) {
    stuDetailArea.innerHTML = '<div class="detail-empty">' + err.message + '</div>';
    return;
  }

  const pct = Math.min(100, Math.round((scholar.materialsPaid / scholar.materialsFee) * 100));
  const statusBadge = scholar.status === 'CLEARED' ? '<span class="badge badge-cleared">Cleared</span>' : '<span class="badge badge-hold">On Hold</span>';
  let checkBadge;
  if (scholar.checkStatus !== 'RELEASED') checkBadge = '<span class="badge badge-hold">Check Pending</span>';
  else if (!scholar.checkReceived) checkBadge = '<span class="badge badge-unpaid">Check Ready — Not Yet Picked Up</span>';
  else checkBadge = '<span class="badge badge-released">Check Received</span>';

  // Each item doubles as: the instructional material they received, and
  // (once liquidated) its receipt — OR number, date, and cashier.
  const payablesHtml = scholar.payables.length === 0
    ? '<div class="detail-empty">No instructional materials have been encoded for you yet.</div>'
    : scholar.payables.map((p) => {
        const badge = p.status === 'PAID' ? '<span class="badge badge-paid">Liquidated</span>' : '<span class="badge badge-unpaid">Awaiting Liquidation</span>';
        const meta = p.status === 'PAID'
          ? ('Receipt ' + p.orNo + ' &middot; ' + p.date + ' &middot; Cashier: ' + p.cashier)
          : 'Settle this at the Greenprints counter to get your receipt.';
        return '<div class="receipt-item"><div class="receipt-top">' +
          '<div><div class="receipt-item-name">' + p.item + '</div><div class="receipt-meta">' + meta + '</div></div>' +
          '<div style="text-align:right;"><div class="receipt-amount">' + peso(p.amount) + '</div><div style="margin-top:5px;">' + badge + '</div></div>' +
          '</div></div>';
      }).join('');

  stuDetailArea.innerHTML =
    '<div class="panel" style="margin-bottom:18px;">' +
      '<div class="fee-progress-card">' +
        '<div class="fee-progress-top"><span class="fee-progress-amount">' + peso(scholar.materialsPaid) + '</span><span class="fee-progress-target">of ' + peso(scholar.materialsFee) + ' instructional materials fee liquidated</span></div>' +
        '<div class="fee-progress-track"><div class="fee-progress-fill" style="width:' + pct + '%;"></div></div>' +
        '<div class="fee-progress-labels"><span>' + pct + '% settled</span><span class="' + (scholar.materialsRemaining === 0 ? 'accent-green' : '') + '">' + (scholar.materialsRemaining === 0 ? 'Fully paid' : peso(scholar.materialsRemaining) + ' remaining') + '</span></div>' +
      '</div>' +
      '<div class="detail-status-row" style="padding:0 20px 18px;">' + statusBadge + checkBadge + '</div>' +
    '</div>' +
    '<div class="panel">' +
      '<div class="panel-head"><div><h3>' + scholar.name + '</h3><p>' + scholar.id + ' &middot; ' + scholar.program + ' &middot; ' + scholar.grant + '</p></div></div>' +
      '<div class="receipt-list">' + payablesHtml + '</div>' +
    '</div>';
}

async function openStudentDashboard() {
  hideLanding();
  studentDashboard.style.display = 'block';
  stuDetailArea.innerHTML = '<div class="detail-empty">Loading your record&hellip;</div>';
  window.scrollTo(0, 0);
  const me = await api('/me');
  currentUserName = me.name;
  stuDashWelcome.textContent = 'Signed in as ' + me.name;
  await stuRenderMyDashboard();
}

stuDashLogoutBtn.addEventListener('click', async () => {
  await logoutAndShowLanding();
  studentDashboard.style.display = 'none';
});

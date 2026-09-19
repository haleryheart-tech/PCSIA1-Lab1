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

    if (activeRole === 'admin') {
      closeModal();
      await openAdminDashboard(user.name || user.loginId);
    } else {
      showError('Signed in as ' + roleCopy[activeRole].label + '. The ' + roleCopy[activeRole].label + ' workspace UI is not built out yet — only the STVET Admin dashboard is implemented in this demo.');
    }
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
    rows = await fetch(API + '/public/scholars/search?name=' + encodeURIComponent(trimmed)).then((r) => r.json());
  } catch {
    studentSearchResults.innerHTML = '<div class="search-empty">Something went wrong searching. Please try again.</div>';
    studentSearchResults.classList.add('show');
    return;
  }

  if (!rows || rows.length === 0) {
    studentSearchResults.innerHTML = '<div class="search-empty">No matching scholar record found. If you were recently enrolled, check back after your STVET Admin encodes your record.</div>';
  } else {
    studentSearchResults.innerHTML = rows.map((s) =>
      '<button type="button" class="search-result-item" data-id="' + s.id + '">' +
        '<div class="sr-name">' + s.name + '</div>' +
        '<div class="sr-meta">' + s.id + ' &middot; ' + s.program + '</div>' +
      '</button>'
    ).join('');

    studentSearchResults.querySelectorAll('.search-result-item').forEach((btn) => {
      btn.addEventListener('click', () => showStudentDetail(btn.getAttribute('data-id')));
    });
  }
  studentSearchResults.classList.add('show');
}

async function showStudentDetail(id) {
  studentSearchResults.classList.remove('show');
  studentDetailCard.classList.add('show');
  studentDetailCard.innerHTML = '<div class="detail-empty">Loading…</div>';

  let scholar;
  try {
    const res = await fetch(API + '/public/scholars/' + encodeURIComponent(id));
    if (!res.ok) throw new Error('not found');
    scholar = await res.json();
  } catch {
    studentDetailCard.innerHTML =
      '<button type="button" class="student-detail-back" id="studentDetailBack">&larr; Back to search</button>' +
      '<div class="detail-empty">Could not load that record. Please try again.</div>';
    document.getElementById('studentDetailBack').addEventListener('click', backToStudentResults);
    return;
  }

  const statusBadge = scholar.status === 'CLEARED' ? '<span class="badge badge-cleared">Cleared</span>' : '<span class="badge badge-hold">On Hold</span>';
  const checkBadge = scholar.checkStatus === 'RELEASED' ? '<span class="badge badge-released">Check Released</span>' : '<span class="badge badge-hold">Check Pending</span>';

  const receiptsHtml = scholar.payables.map((p) => {
    const badge = p.status === 'PAID' ? '<span class="badge badge-paid">Paid</span>' : '<span class="badge badge-unpaid">Unpaid</span>';
    const meta = p.status === 'PAID' ? (p.orNo + ' &middot; ' + p.date) : 'Awaiting settlement at Greenprints';
    return '<div class="receipt-item"><div class="receipt-top">' +
      '<div><div class="receipt-item-name">' + p.item + '</div><div class="receipt-meta">' + meta + '</div></div>' +
      '<div style="text-align:right;"><div class="receipt-amount">' + peso(p.amount) + '</div><div style="margin-top:5px;">' + badge + '</div></div>' +
      '</div></div>';
  }).join('');

  let hint;
  if (scholar.checkStatus === 'RELEASED') {
    hint = '<div class="release-hint ok">Your LandBank check has already been released. Visit the STVET Admin office if you have not received it.</div>';
  } else if (scholar.status !== 'CLEARED') {
    hint = '<div class="release-hint warn">You have unpaid Greenprints items blocking your check release. Settle them at the Greenprints counter.</div>';
  } else {
    hint = '<div class="release-hint ok">All material payables settled — your check is ready. Visit the STVET Admin office to claim it.</div>';
  }

  studentDetailCard.innerHTML =
    '<button type="button" class="student-detail-back" id="studentDetailBack">&larr; Back to search</button>' +
    '<div class="detail-student" style="padding:0 0 14px;border-bottom:1px solid var(--line);">' +
      '<div class="detail-student-name">' + scholar.name + '</div>' +
      '<div class="detail-student-meta">' + scholar.id + ' &middot; ' + scholar.program + ' &middot; ' + scholar.grant + ' &middot; ' + peso(scholar.allowance) + '</div>' +
      '<div class="detail-status-row">' + statusBadge + checkBadge + '</div>' +
    '</div>' +
    '<div class="receipt-list" style="margin:14px 0;">' + receiptsHtml + '</div>' +
    hint;

  document.getElementById('studentDetailBack').addEventListener('click', backToStudentResults);
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

function peso(amount) {
  return '\u20B1' + amount.toLocaleString('en-PH');
}

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

  detailPanel.innerHTML =
    '<div class="detail-student">' +
      '<div class="detail-student-name">' + scholar.name + '</div>' +
      '<div class="detail-student-meta">' + scholar.id + ' &middot; ' + scholar.program + ' &middot; ' + scholar.grant + ' &middot; ' + peso(scholar.allowance) + '</div>' +
      '<div class="detail-status-row">' + statusBadge + checkBadge + '</div>' +
    '</div>' +
    '<div class="receipt-list">' + receiptsHtml + '</div>' +
    '<div class="release-box"><button class="release-btn" id="releaseBtn" ' + releaseDisabled + '>Release LandBank Check</button>' + hintHtml + '</div>';

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
}

function selectScholar(id) {
  selectedScholarId = id;
  renderTable();
  renderDetail();
}

scholarSearch.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderTable, 200);
});

async function openAdminDashboard(displayName) {
  siteHeader.style.display = 'none';
  siteMain.style.display = 'none';
  document.querySelector('section.lifecycle-wrap').style.display = 'none';
  adminDashboard.style.display = 'block';
  dashWelcome.textContent = 'Signed in as ' + (displayName || 'STVET Admin');
  window.scrollTo(0, 0);
  await Promise.all([renderStats(), renderTable(), renderDetail()]);
}

dashLogoutBtn.addEventListener('click', async () => {
  try { await api('/auth/signout', { method: 'POST' }); } catch { /* ignore */ }
  localStorage.removeItem('tesda_token');
  adminDashboard.style.display = 'none';
  siteHeader.style.display = '';
  siteMain.style.display = '';
  document.querySelector('section.lifecycle-wrap').style.display = '';
  selectedScholarId = null;
  window.scrollTo(0, 0);
});

/* If a token from a previous session is still in localStorage, try to
   resume the admin dashboard automatically. */
(async function resumeSession() {
  const token = localStorage.getItem('tesda_token');
  if (!token) return;
  try {
    await api('/stats'); // succeeds only if token is valid and role is admin
    await openAdminDashboard();
  } catch {
    localStorage.removeItem('tesda_token');
  }
})();

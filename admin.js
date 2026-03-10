// ── State ──────────────────────────────────────────────────────────────────
let verifiedPassword = '';
let classes = [];
let pendingRemoveClassSlug = null;

// ── Login ───────────────────────────────────────────────────────────────────
const adminLogin   = document.getElementById('adminLogin');
const adminPanel   = document.getElementById('adminPanel');
const adminPwInput = document.getElementById('adminPasswordInput');
const adminLoginErr = document.getElementById('adminLoginError');
const adminLoginBtn = document.getElementById('adminLoginBtn');

async function attemptLogin() {
  adminLoginBtn.disabled = true;
  adminLoginBtn.textContent = 'Checking\u2026';
  try {
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPwInput.value }),
    });
    if (res.ok) {
      verifiedPassword = adminPwInput.value;
      adminLogin.style.display = 'none';
      adminPanel.style.display = 'block';
      loadClasses();
    } else {
      adminLoginErr.style.display = 'block';
    }
  } catch { adminLoginErr.style.display = 'block'; }
  adminLoginBtn.disabled = false;
  adminLoginBtn.textContent = 'Enter';
}

adminLoginBtn.addEventListener('click', attemptLogin);
adminPwInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

// ── Load classes ─────────────────────────────────────────────────────────────
async function loadClasses() {
  try {
    const res = await fetch('/api/classes');
    const data = await res.json();
    classes = data.classes || [];
  } catch (e) { console.error('Failed to load classes', e); }
  renderClassList();
}

// ── Render class list ────────────────────────────────────────────────────────
function renderClassList() {
  const list = document.getElementById('classList');
  list.innerHTML = '';
  if (classes.length === 0) {
    list.innerHTML = '<p style="color:#6b6585;font-size:0.9rem">No classes yet. Add one below.</p>';
    return;
  }
  classes.forEach(cls => {
    const row = document.createElement('div');
    row.className = 'class-row';

    const colorDot = document.createElement('div');
    colorDot.className = 'class-row-color';
    colorDot.style.background = cls.background_color || '#a89fc8';
    row.appendChild(colorDot);

    const nameEl = document.createElement('span');
    nameEl.className = 'class-row-name';
    nameEl.textContent = cls.name;
    row.appendChild(nameEl);

    const countEl = document.createElement('span');
    countEl.className = 'class-row-count';
    countEl.textContent = (cls.student_count || 0) + ' students';
    row.appendChild(countEl);

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-small';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', () => {
      window.location.href = 'class.html?class=' + encodeURIComponent(cls.slug);
    });
    row.appendChild(viewBtn);

    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn-small';
    manageBtn.textContent = 'Manage';
    manageBtn.addEventListener('click', () => {
      window.location.href = 'teacher.html?class=' + encodeURIComponent(cls.slug);
    });
    row.appendChild(manageBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-small danger';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      pendingRemoveClassSlug = cls.slug;
      document.getElementById('removeClassMsg').textContent =
        'Remove "' + cls.name + '" and ALL its students and photos? This cannot be undone.';
      document.getElementById('removeClassOverlay').style.display = 'flex';
    });
    row.appendChild(removeBtn);

    list.appendChild(row);
  });
}

// ── Add class ─────────────────────────────────────────────────────────────────
document.getElementById('addClassBtn').addEventListener('click', async () => {
  const nameInput = document.getElementById('newClassNameInput');
  const colorInput = document.getElementById('newClassColorInput');
  const name = nameInput.value.trim();
  if (!name) return;
  try {
    await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': verifiedPassword },
      body: JSON.stringify({ name, background_color: colorInput.value }),
    });
    nameInput.value = '';
    colorInput.value = '#a89fc8';
    await loadClasses();
    const fb = document.getElementById('addClassFeedback');
    fb.style.display = 'block';
    setTimeout(() => { fb.style.display = 'none'; }, 2000);
  } catch { alert('Failed to add class.'); }
});
document.getElementById('newClassNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addClassBtn').click();
});

// ── Remove class ──────────────────────────────────────────────────────────────
document.getElementById('removeClassCancel').addEventListener('click', () => {
  document.getElementById('removeClassOverlay').style.display = 'none';
  pendingRemoveClassSlug = null;
});
document.getElementById('removeClassConfirm').addEventListener('click', async () => {
  if (!pendingRemoveClassSlug) return;
  document.getElementById('removeClassOverlay').style.display = 'none';
  try {
    await fetch('/api/class/' + encodeURIComponent(pendingRemoveClassSlug), {
      method: 'DELETE',
      headers: { 'X-Admin-Password': verifiedPassword },
    });
    await loadClasses();
  } catch { alert('Remove failed.'); }
  pendingRemoveClassSlug = null;
});

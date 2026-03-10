// ── State ──────────────────────────────────────────────────────────────────
let verifiedPassword = '';
let classSlug = '';
let classId = null;
let students = [];
let classSettings = { sort_order: 'alphabetical', shape_mode: 'circles' };
let className = '';
let bgColor = '#a89fc8';
let pendingDeletePhotoId = null;
let pendingRemoveStudentId = null;
let editingStudentId = null;

// ── Login ───────────────────────────────────────────────────────────────────
const teacherLogin   = document.getElementById('teacherLogin');
const teacherPanel   = document.getElementById('teacherPanel');
const teacherPwInput = document.getElementById('teacherPasswordInput');
const teacherLoginErr = document.getElementById('teacherLoginError');
const teacherLoginBtn = document.getElementById('teacherLoginBtn');

async function attemptLogin() {
  teacherLoginBtn.disabled = true;
  teacherLoginBtn.textContent = 'Checking\u2026';
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: teacherPwInput.value }),
    });
    if (res.ok) {
      verifiedPassword = teacherPwInput.value;
      teacherLogin.style.display = 'none';
      teacherPanel.style.display = 'block';
      loadAll();
    } else {
      teacherLoginErr.style.display = 'block';
    }
  } catch { teacherLoginErr.style.display = 'block'; }
  teacherLoginBtn.disabled = false;
  teacherLoginBtn.textContent = 'Enter';
}

teacherLoginBtn.addEventListener('click', attemptLogin);
teacherPwInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

// ── URL params ──────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
classSlug = params.get('class') || '';

// Update login sub-text and back link
if (classSlug) {
  const loginSub = document.getElementById('loginSub');
  if (loginSub) loginSub.textContent = 'Enter teacher password to manage your class';
}

// Back button
document.getElementById('backToClassBtn').addEventListener('click', () => {
  window.location.href = classSlug ? 'class.html?class=' + encodeURIComponent(classSlug) : 'index.html';
});

// ── Load everything ─────────────────────────────────────────────────────────
async function loadAll() {
  if (!classSlug) {
    // If no class specified, redirect to admin (shouldn't normally happen)
    window.location.href = 'admin.html';
    return;
  }
  await loadClassData();
  renderClassSettings();
  renderSettings();
  renderStudentList();
  renderStudentSelect();
}

async function loadClassData() {
  try {
    const res = await fetch('/api/class/' + encodeURIComponent(classSlug));
    const data = await res.json();
    classId = data.id;
    className = data.name;
    bgColor = data.background_color || '#a89fc8';
    try {
      classSettings = Object.assign(
        { sort_order: 'alphabetical', shape_mode: 'circles' },
        typeof data.settings === 'string' ? JSON.parse(data.settings) : (data.settings || {})
      );
    } catch {}
    students = (data.students || []).sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById('teacherPanelSub').textContent = 'Managing: ' + className;
    document.title = 'Teacher Zone \u2013 ' + className;
  } catch (e) { console.error('Failed to load class', e); }
}

// ── Class settings (name + colour) ─────────────────────────────────────────
function renderClassSettings() {
  document.getElementById('classNameInput').value = className;
  document.getElementById('bgColorInput').value = bgColor;
}

document.getElementById('saveClassSettingsBtn').addEventListener('click', async () => {
  const newName = document.getElementById('classNameInput').value.trim();
  const newColor = document.getElementById('bgColorInput').value;
  if (!newName) return;
  try {
    await fetch('/api/class/' + encodeURIComponent(classSlug), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': verifiedPassword },
      body: JSON.stringify({ name: newName, background_color: newColor }),
    });
    className = newName;
    bgColor = newColor;
    document.getElementById('teacherPanelSub').textContent = 'Managing: ' + className;
    const fb = document.getElementById('classSettingsFeedback');
    fb.style.display = 'block';
    setTimeout(() => { fb.style.display = 'none'; }, 2000);
  } catch { alert('Save failed.'); }
});

// ── Display settings ────────────────────────────────────────────────────────
const sortGroup  = document.getElementById('sortGroup');
const shapeGroup = document.getElementById('shapeGroup');

function renderSettings() {
  sortGroup.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === classSettings.sort_order);
  });
  shapeGroup.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === classSettings.shape_mode);
  });
}

sortGroup.addEventListener('click', e => {
  const btn = e.target.closest('.btn-toggle');
  if (!btn) return;
  classSettings.sort_order = btn.dataset.value;
  renderSettings();
});
shapeGroup.addEventListener('click', e => {
  const btn = e.target.closest('.btn-toggle');
  if (!btn) return;
  classSettings.shape_mode = btn.dataset.value;
  renderSettings();
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  try {
    await fetch('/api/class/' + encodeURIComponent(classSlug), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': verifiedPassword },
      body: JSON.stringify({ settings: classSettings }),
    });
    const fb = document.getElementById('saveFeedback');
    fb.style.display = 'block';
    setTimeout(() => { fb.style.display = 'none'; }, 2000);
    renderSettings();
  } catch { alert('Save failed.'); }
});

// ── Student list ─────────────────────────────────────────────────────────────
function renderStudentList() {
  const list = document.getElementById('studentList');
  list.innerHTML = '';
  const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(student => {
    const row = document.createElement('div');
    row.className = 'student-row';

    if (editingStudentId === student.id) {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = student.name;
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveRename(student.id, input.value);
        if (e.key === 'Escape') { editingStudentId = null; renderStudentList(); }
      });
      row.appendChild(input);

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-small';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => saveRename(student.id, input.value));
      row.appendChild(saveBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-small';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => { editingStudentId = null; renderStudentList(); });
      row.appendChild(cancelBtn);
    } else {
      const name = document.createElement('span');
      name.className = 'student-row-name';
      name.textContent = student.name;
      row.appendChild(name);

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn-small';
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', () => { editingStudentId = student.id; renderStudentList(); });
      row.appendChild(renameBtn);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-small danger';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        pendingRemoveStudentId = student.id;
        document.getElementById('removeStudentMsg').textContent =
          'Remove "' + student.name + '" and all their photos? This cannot be undone.';
        document.getElementById('removeStudentOverlay').style.display = 'flex';
      });
      row.appendChild(removeBtn);
    }
    list.appendChild(row);
  });
}

async function saveRename(studentId, newName) {
  newName = newName.trim();
  if (!newName) return;
  try {
    await fetch('/api/student/' + studentId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': verifiedPassword },
      body: JSON.stringify({ name: newName }),
    });
    editingStudentId = null;
    await loadClassData();
    renderStudentList();
    renderStudentSelect();
  } catch { alert('Rename failed.'); }
}

// Add student
document.getElementById('addStudentBtn').addEventListener('click', async () => {
  const input = document.getElementById('newStudentInput');
  const name = input.value.trim();
  if (!name) return;
  try {
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': verifiedPassword },
      body: JSON.stringify({ classSlug, name }),
    });
    input.value = '';
    await loadClassData();
    renderStudentList();
    renderStudentSelect();
  } catch { alert('Failed to add student.'); }
});
document.getElementById('newStudentInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addStudentBtn').click();
});

// Remove student
document.getElementById('removeStudentCancel').addEventListener('click', () => {
  document.getElementById('removeStudentOverlay').style.display = 'none';
  pendingRemoveStudentId = null;
});
document.getElementById('removeStudentConfirm').addEventListener('click', async () => {
  if (!pendingRemoveStudentId) return;
  document.getElementById('removeStudentOverlay').style.display = 'none';
  try {
    await fetch('/api/student/' + pendingRemoveStudentId, {
      method: 'DELETE',
      headers: { 'X-Teacher-Password': verifiedPassword },
    });
    await loadClassData();
    renderStudentList();
    renderStudentSelect();
  } catch { alert('Remove failed.'); }
  pendingRemoveStudentId = null;
});

// ── Photo management ─────────────────────────────────────────────────────────
function renderStudentSelect() {
  const select = document.getElementById('photoStudentSelect');
  const current = select.value;
  select.innerHTML = '<option value="">\u2014 Choose a student \u2014</option>';
  [...students].sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

document.getElementById('photoStudentSelect').addEventListener('change', async e => {
  const sid = e.target.value;
  const grid = document.getElementById('adminPhotoGrid');
  grid.innerHTML = '';
  if (!sid) return;
  grid.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const res = await fetch('/api/student/' + sid);
    const data = await res.json();
    const photos = data.photos || [];
    grid.innerHTML = '';
    if (photos.length === 0) {
      grid.innerHTML = '<p style="color:#6b6585;font-size:0.9rem;grid-column:1/-1">No photos yet.</p>';
      return;
    }
    photos.forEach(photo => {
      const cell = document.createElement('div');
      cell.className = 'admin-photo-cell';
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = 'Student photo';
      cell.appendChild(img);
      const delBtn = document.createElement('button');
      delBtn.className = 'admin-photo-del';
      delBtn.textContent = '\u2715';
      delBtn.title = 'Delete this photo';
      delBtn.addEventListener('click', () => {
        pendingDeletePhotoId = photo.id;
        document.getElementById('adminDeleteOverlay').style.display = 'flex';
      });
      cell.appendChild(delBtn);
      grid.appendChild(cell);
    });
  } catch { grid.innerHTML = '<p style="color:#ef4444;font-size:0.9rem">Failed to load photos.</p>'; }
});

document.getElementById('adminDeleteCancel').addEventListener('click', () => {
  document.getElementById('adminDeleteOverlay').style.display = 'none';
  pendingDeletePhotoId = null;
});
document.getElementById('adminDeleteConfirm').addEventListener('click', async () => {
  if (!pendingDeletePhotoId) return;
  document.getElementById('adminDeleteOverlay').style.display = 'none';
  try {
    await fetch('/api/photo/' + pendingDeletePhotoId, {
      method: 'DELETE',
      headers: { 'X-Teacher-Password': verifiedPassword },
    });
    document.getElementById('photoStudentSelect').dispatchEvent(new Event('change'));
  } catch { alert('Delete failed.'); }
  pendingDeletePhotoId = null;
});

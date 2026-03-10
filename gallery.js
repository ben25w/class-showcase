// ── Pastel palette (same as home) ─────────────────────────────────────────
const PASTEL_PALETTE = [
  { light: '#FFF0F3', deep: '#FFB3C1', text: '#7a2d3e' },
  { light: '#FFF4E6', deep: '#FFCA8A', text: '#7a4a10' },
  { light: '#FFFBE6', deep: '#FFE566', text: '#6b5800' },
  { light: '#F0FFF4', deep: '#86EFAC', text: '#166534' },
  { light: '#F0F9FF', deep: '#7DD3FC', text: '#0c4a6e' },
  { light: '#F5F3FF', deep: '#C4B5FD', text: '#3b0764' },
  { light: '#FFF0FB', deep: '#F0ABFC', text: '#6b21a8' },
  { light: '#F0FDFA', deep: '#5EEAD4', text: '#134e4a' },
  { light: '#FFF7ED', deep: '#FDBA74', text: '#7c2d12' },
  { light: '#F0FFF0', deep: '#86EFAC', text: '#14532d' },
  { light: '#FDF4FF', deep: '#E879F9', text: '#701a75' },
  { light: '#ECFDF5', deep: '#6EE7B7', text: '#064e3b' },
  { light: '#FEF9C3', deep: '#FDE047', text: '#713f12' },
  { light: '#EFF6FF', deep: '#93C5FD', text: '#1e3a5f' },
  { light: '#FFF1F2', deep: '#FDA4AF', text: '#881337' },
  { light: '#F7FEE7', deep: '#BEF264', text: '#3a5c0a' },
  { light: '#FEFCE8', deep: '#FCD34D', text: '#78350f' },
  { light: '#F0F4FF', deep: '#A5B4FC', text: '#1e1b4b' },
  { light: '#FFF8F0', deep: '#FCA5A5', text: '#7f1d1d' },
  { light: '#F0FEFF', deep: '#67E8F9', text: '#164e63' },
];

// ── State ──────────────────────────────────────────────────────────────────
let photos = [];
let lightboxIdx = null;
let teacherMode = false;
let verifiedPassword = '';
let pendingDeleteId = null;
let studentId = '';
let classSlug = '';
let studentName = '';
let palette = PASTEL_PALETTE[0];

// ── DOM refs ───────────────────────────────────────────────────────────────
const galleryPage    = document.getElementById('galleryPage');
const galleryHeader  = document.getElementById('galleryHeader');
const galleryTitle   = document.getElementById('galleryTitle');
const galleryCount   = document.getElementById('galleryCount');
const photoGrid      = document.getElementById('photoGrid');
const addPhotoBtn    = document.getElementById('addPhotoBtn');
const addPhotoBtnText = document.getElementById('addPhotoBtnText');
const fileInput      = document.getElementById('fileInput');
const teacherBtn     = document.getElementById('teacherBtn');
const lightbox       = document.getElementById('lightbox');
const lightboxImg    = document.getElementById('lightboxImg');
const lightboxCounter = document.getElementById('lightboxCounter');
const passwordOverlay = document.getElementById('passwordOverlay');
const passwordInput  = document.getElementById('passwordInput');
const passwordError  = document.getElementById('passwordError');
const passwordCancel = document.getElementById('passwordCancel');
const passwordSubmit = document.getElementById('passwordSubmit');
const deleteOverlay  = document.getElementById('deleteOverlay');
const deleteCancel   = document.getElementById('deleteCancel');
const deleteConfirm  = document.getElementById('deleteConfirm');

// ── Helpers ────────────────────────────────────────────────────────────────
function applyPalette() {
  galleryPage.style.background = 'linear-gradient(160deg, ' + palette.light + ' 0%, ' + palette.deep + '55 100%)';
  galleryHeader.style.background = 'linear-gradient(135deg, ' + palette.light + ' 0%, ' + palette.deep + '44 100%)';
  galleryHeader.style.borderBottom = '1.5px solid ' + palette.deep + '55';
  addPhotoBtn.style.background = palette.deep;
  addPhotoBtn.style.border = '2px dashed ' + palette.deep + '99';
  addPhotoBtn.style.color = palette.text;
  addPhotoBtn.style.boxShadow = '0 4px 16px ' + palette.deep + '55';
  document.querySelector('.back-btn').style.color = palette.text;
  document.querySelector('.back-btn').style.background = palette.deep + '33';
  galleryTitle.style.color = palette.text;
  galleryCount.style.color = palette.text;
  teacherBtn.style.borderColor = palette.deep + '66';
  teacherBtn.style.background = teacherMode ? palette.deep : palette.deep + '33';
  teacherBtn.style.color = palette.text;
}

function renderGrid() {
  photoGrid.innerHTML = '';
  galleryCount.textContent = photos.length + ' / 9 photos';
  if (photos.length === 0) {
    photoGrid.innerHTML = '<div class="empty-state"><p>No photos yet!</p><small>Tap \"Add Photo\" below to get started.</small></div>';
    return;
  }
  photos.forEach((photo, idx) => {
    const cell = document.createElement('div');
    cell.className = 'photo-cell photo-slide-up';
    cell.style.animationDelay = (idx * 60) + 'ms';
    cell.style.boxShadow = '0 4px 16px ' + palette.deep + '44';
    cell.style.borderColor = palette.deep + '55';

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = studentName + ' photo ' + (idx + 1);
    cell.appendChild(img);

    if (teacherMode) {
      const overlay = document.createElement('button');
      overlay.className = 'delete-overlay';
      overlay.innerHTML = '\uD83D\uDDD1\uFE0F<br>Delete';
      overlay.addEventListener('click', e => {
        e.stopPropagation();
        pendingDeleteId = photo.id;
        deleteOverlay.style.display = 'flex';
      });
      cell.appendChild(overlay);
    } else {
      cell.addEventListener('click', () => openLightbox(idx));
    }
    photoGrid.appendChild(cell);
  });
}

function updateAddBtn() {
  addPhotoBtnText.textContent = '\uD83D\uDCF7 Add Photo';
  addPhotoBtn.classList.remove('disabled');
  addPhotoBtn.style.opacity = '1';
  addPhotoBtn.style.cursor = 'pointer';
  addPhotoBtn.style.background = palette.deep;
  addPhotoBtn.style.boxShadow = '0 4px 16px ' + palette.deep + '55';
  addPhotoBtn.style.color = palette.text;
}

// ── Lightbox ───────────────────────────────────────────────────────────────
function openLightbox(idx) {
  lightboxIdx = idx;
  lightboxImg.src = photos[idx].url;
  lightboxCounter.textContent = (idx + 1) + ' / ' + photos.length;
  lightbox.style.display = 'flex';
  lightbox.classList.add('gallery-fade-in');
}
function closeLightbox() { lightbox.style.display = 'none'; lightboxIdx = null; }
function prevPhoto() {
  if (lightboxIdx === null) return;
  lightboxIdx = (lightboxIdx - 1 + photos.length) % photos.length;
  lightboxImg.src = photos[lightboxIdx].url;
  lightboxCounter.textContent = (lightboxIdx + 1) + ' / ' + photos.length;
}
function nextPhoto() {
  if (lightboxIdx === null) return;
  lightboxIdx = (lightboxIdx + 1) % photos.length;
  lightboxImg.src = photos[lightboxIdx].url;
  lightboxCounter.textContent = (lightboxIdx + 1) + ' / ' + photos.length;
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev').addEventListener('click', e => { e.stopPropagation(); prevPhoto(); });
document.getElementById('lightboxNext').addEventListener('click', e => { e.stopPropagation(); nextPhoto(); });
lightbox.addEventListener('click', closeLightbox);
lightboxImg.addEventListener('click', e => e.stopPropagation());
document.addEventListener('keydown', e => {
  if (lightboxIdx === null) return;
  if (e.key === 'ArrowLeft') prevPhoto();
  if (e.key === 'ArrowRight') nextPhoto();
  if (e.key === 'Escape') closeLightbox();
});

// ── Teacher mode ───────────────────────────────────────────────────────────
teacherBtn.addEventListener('click', () => {
  if (teacherMode) {
    teacherMode = false;
    teacherBtn.textContent = '\uD83D\uDD12 Teacher';
    teacherBtn.classList.remove('active');
    applyPalette();
    renderGrid();
  } else {
    passwordInput.value = '';
    passwordError.style.display = 'none';
    passwordOverlay.style.display = 'flex';
    setTimeout(() => passwordInput.focus(), 50);
  }
});
passwordCancel.addEventListener('click', () => { passwordOverlay.style.display = 'none'; });
passwordOverlay.addEventListener('click', e => { if (e.target === passwordOverlay) passwordOverlay.style.display = 'none'; });

async function submitPassword() {
  passwordSubmit.disabled = true;
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    if (res.ok) {
      verifiedPassword = passwordInput.value;
      teacherMode = true;
      teacherBtn.textContent = '\uD83D\uDD13 Exit';
      teacherBtn.classList.add('active');
      passwordOverlay.style.display = 'none';
      applyPalette();
      renderGrid();
    } else {
      passwordError.style.display = 'block';
    }
  } catch { passwordError.style.display = 'block'; }
  passwordSubmit.disabled = false;
}
passwordSubmit.addEventListener('click', submitPassword);
passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitPassword(); });

// ── Delete ─────────────────────────────────────────────────────────────────
deleteCancel.addEventListener('click', () => { deleteOverlay.style.display = 'none'; pendingDeleteId = null; });
deleteOverlay.addEventListener('click', e => {
  if (e.target === deleteOverlay) { deleteOverlay.style.display = 'none'; pendingDeleteId = null; }
});
deleteConfirm.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  deleteOverlay.style.display = 'none';
  try {
    await fetch('/api/photo/' + pendingDeleteId, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': verifiedPassword },
    });
    await loadPhotos();
  } catch (e) { console.error('Delete failed', e); }
  pendingDeleteId = null;
});

// ── Upload ─────────────────────────────────────────────────────────────────
fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  addPhotoBtnText.textContent = '\u23F3 Uploading\u2026';
  addPhotoBtn.classList.add('disabled');

  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  try {
    const response = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        classSlug,
        base64,
        mimeType: file.type || 'image/jpeg',
        originalName: file.name,
        fileSize: file.size,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      alert(err.error || 'Upload failed. Please try again.');
    }
  } catch { alert('Upload failed. Please check your connection.'); }

  await loadPhotos();
  fileInput.value = '';
});

// ── Load photos ────────────────────────────────────────────────────────────
async function loadPhotos() {
  try {
    const res = await fetch('/api/student/' + studentId);
    const data = await res.json();
    photos = data.photos || [];
  } catch { photos = []; }
  renderGrid();
  updateAddBtn();
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  studentId = params.get('student') || '';
  classSlug = params.get('class') || '';

  if (!studentId) { window.location.href = 'index.html'; return; }

  // Back button: go to class page if we know the class, else index
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = classSlug ? 'class.html?class=' + encodeURIComponent(classSlug) : 'index.html';
  });

  document.getElementById('teacherZoneBtnGallery').addEventListener('click', () => {
    window.location.href = classSlug ? 'teacher.html?class=' + encodeURIComponent(classSlug) : 'admin.html';
  });

  // Load student info
  try {
    const res = await fetch('/api/student/' + studentId);
    const data = await res.json();
    if (!data || data.error) { window.location.href = 'index.html'; return; }

    studentName = data.name;
    // Pick palette based on student position within class
    const classRes = await fetch('/api/class/' + encodeURIComponent(classSlug || data.class_slug || ''));
    if (classRes.ok) {
      const classData = await classRes.json();
      const students = (classData.students || []).sort((a, b) => a.name.localeCompare(b.name));
      const idx = students.findIndex(s => s.id === parseInt(studentId));
      if (idx >= 0) palette = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];
    }
  } catch { window.location.href = 'index.html'; return; }

  galleryTitle.textContent = studentName;
  document.title = studentName + "'s Gallery";
  applyPalette();
  await loadPhotos();
}

init();

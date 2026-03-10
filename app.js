// ── Pastel palette ────────────────────────────────────────────────────────────
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

const SHAPES = ['circle', 'square', 'rectangle', 'triangle'];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Detect which page we are on ─────────────────────────────────────────────
const PAGE = (() => {
  const path = window.location.pathname;
  if (path.endsWith('class.html')) return 'class';
  return 'index'; // default splash
})();

const params = new URLSearchParams(window.location.search);

// ── INDEX PAGE: Class chooser splash ────────────────────────────────────────
async function initIndexPage() {
  document.getElementById('year').textContent = new Date().getFullYear();

  document.getElementById('teacherZoneBtn').addEventListener('click', () => {
    window.location.href = 'admin.html';
  });

  const grid = document.getElementById('mainGrid');
  grid.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';

  let classes = [];
  try {
    const res = await fetch('/api/classes');
    const data = await res.json();
    classes = data.classes || [];
  } catch (e) {
    console.error('Failed to load classes', e);
  }

  // Update subtitle
  document.getElementById('pageSubtitle').textContent = classes.length === 1
    ? 'Tap a name to see their creations'
    : 'Tap your class to get started';

  grid.innerHTML = '';
  grid.className = classes.length === 1 ? 'bubble-grid' : 'class-grid';

  if (classes.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No classes yet.</p><small>Ask your teacher to add a class.</small></div>';
    return;
  }

  if (classes.length === 1) {
    // Single-class: show students directly (Phase 1 behaviour)
    document.getElementById('pageTitle').textContent = classes[0].name + "'s Showcase";
    await renderStudentGrid(grid, classes[0].slug, classes[0].settings);
    return;
  }

  // Multi-class: show class cards
  classes.forEach((cls, idx) => {
    const delay = idx * 60;
    const card = document.createElement('button');
    card.className = 'class-card bubble-float-in';
    card.style.animationDelay = delay + 'ms';
    card.style.background = cls.background_color || '#a89fc8';
    card.style.color = '#fff';
    card.style.boxShadow = '0 6px 24px ' + (cls.background_color || '#a89fc8') + '55';

    const nameEl = document.createElement('span');
    nameEl.className = 'class-card-name';
    nameEl.textContent = cls.name;
    card.appendChild(nameEl);

    card.setAttribute('aria-label', 'Open ' + cls.name);
    card.addEventListener('click', () => {
      window.location.href = 'class.html?class=' + encodeURIComponent(cls.slug);
    });
    grid.appendChild(card);
  });
}

// ── CLASS PAGE: Student grid for one class ─────────────────────────────────
async function initClassPage() {
  document.getElementById('year').textContent = new Date().getFullYear();

  const classSlug = params.get('class') || '';
  if (!classSlug) { window.location.href = 'index.html'; return; }

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('teacherZoneBtn').addEventListener('click', () => {
    window.location.href = 'teacher.html?class=' + encodeURIComponent(classSlug);
  });

  let classData = null;
  try {
    const res = await fetch('/api/class/' + encodeURIComponent(classSlug));
    classData = await res.json();
  } catch (e) {
    window.location.href = 'index.html';
    return;
  }

  if (!classData || classData.error) { window.location.href = 'index.html'; return; }

  document.getElementById('classTitle').textContent = classData.name;
  document.title = classData.name + ' – Showcase';

  // Apply background colour
  if (classData.background_color) {
    document.getElementById('pageWrap').style.background = classData.background_color + '22';
  }

  const grid = document.getElementById('bubbleGrid');
  await renderStudentGrid(grid, classSlug, classData.settings);
}

// ── Shared: render student bubbles into a grid container ───────────────────
async function renderStudentGrid(grid, classSlug, settingsJson) {
  let settings = { sort_order: 'alphabetical', shape_mode: 'circles' };
  try {
    if (settingsJson) {
      const parsed = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
      settings = Object.assign(settings, parsed);
    }
  } catch {}

  let students = [];
  try {
    const res = await fetch('/api/class/' + encodeURIComponent(classSlug));
    const data = await res.json();
    students = data.students || [];
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><p>Could not load students.</p></div>';
    return;
  }

  // Sort
  if (settings.sort_order === 'random') {
    students = shuffle(students);
  } else {
    students = [...students].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Assign colours
  const paletteIndices = shuffle(Array.from({ length: PASTEL_PALETTE.length }, (_, i) => i));

  // Assign shapes
  const shapeMode = settings.shape_mode || 'circles';
  const assignedShapes = students.map(() => {
    if (shapeMode === 'mixed') return SHAPES[Math.floor(Math.random() * SHAPES.length)];
    if (shapeMode === 'circles') return 'circle';
    if (shapeMode === 'squares') return 'square';
    if (shapeMode === 'rectangles') return 'rectangle';
    if (shapeMode === 'triangles') return 'triangle';
    return 'circle';
  });

  grid.innerHTML = '';
  if (students.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No students yet!</p><small>Ask your teacher to add students.</small></div>';
    return;
  }

  students.forEach((student, idx) => {
    const palette = PASTEL_PALETTE[paletteIndices[idx % paletteIndices.length]];
    const shape = assignedShapes[idx];
    const delay = idx * 40;

    const btn = document.createElement('button');
    btn.className = 'bubble-btn bubble-float-in shape-' + shape;
    btn.style.animationDelay = delay + 'ms';
    btn.style.background = 'radial-gradient(circle at 38% 38%, ' + palette.light + ' 0%, ' + palette.deep + ' 100%)';
    btn.style.boxShadow = '0 6px 24px ' + palette.deep + '55, 0 2px 8px ' + palette.deep + '33';
    btn.style.border = '2.5px solid ' + palette.deep + '88';
    btn.setAttribute('aria-label', 'View ' + student.name + "'s gallery");

    const nameSpan = document.createElement('span');
    nameSpan.className = 'bubble-name';
    nameSpan.style.color = palette.text;
    nameSpan.textContent = student.name;
    btn.appendChild(nameSpan);

    btn.addEventListener('click', () => {
      window.location.href = 'gallery.html?class=' + encodeURIComponent(classSlug) + '&student=' + student.id;
    });

    grid.appendChild(btn);
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────
if (PAGE === 'class') {
  initClassPage();
} else {
  initIndexPage();
}

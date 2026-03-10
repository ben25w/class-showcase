-- Run this once in your Cloudflare D1 console
-- Dashboard → D1 → class-showcase-db → Console

-- ============================================================
-- CLASSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  background_color TEXT NOT NULL DEFAULT '#a89fc8',
  settings TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- STUDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(class_id, slug)
);

-- ============================================================
-- PHOTOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SEED: ONE DEFAULT CLASS (Phase 1 behaviour)
-- ============================================================
INSERT OR IGNORE INTO classes (id, name, slug, background_color, settings, sort_order)
VALUES (1, 'Our Class', 'our-class', '#a89fc8', '{"sort_order":"alphabetical","shape_mode":"circles"}', 0);

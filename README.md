# class-showcase

Multi-class Student Project Showcase — v2

A photo gallery web app for Early Years classrooms. Students upload photos of their builds/models directly from an iPad. Photos display in a personal 3×3 grid. Supports multiple classes, each with their own children and settings.

Built on Cloudflare Pages, D1, and R2. No server to maintain.

## What it does

- **Splash page** shows a grid of classes (or student names if only one class)
- **Tap a class** → see that class's student name grid
- **Tap a name** → see that student's personal 3×3 photo gallery
- **Upload photos** directly from iPad camera (no login needed for students)
- **Teacher Zone** per class: manage students, settings, background colour, delete photos
- **Admin Dashboard** (Ben only): add/remove classes

## Stack

| Layer | Tool |
|---|---|
| Hosting | Cloudflare Pages |
| API | Cloudflare Functions (in /functions) |
| Database | Cloudflare D1 (SQLite) |
| Photo storage | Cloudflare R2 |
| Frontend | Plain HTML, CSS, JavaScript |

No build step. No Node. No dependencies. Push to GitHub and it deploys.

## File structure

```
/
├── index.html          ← Splash page (class chooser / single-class student grid)
├── class.html          ← Student names grid for a specific class
├── gallery.html        ← Individual student photo grid
├── teacher.html        ← Teacher dashboard (per class)
├── admin.html          ← Admin dashboard (Ben only)
├── app.js              ← Splash + class page logic
├── gallery.js          ← Gallery page logic
├── teacher.js          ← Teacher dashboard logic
├── admin.js            ← Admin dashboard logic
├── style.css           ← All styles
├── setup.sql           ← Run once in D1 console to create tables
└── functions/
    ├── _routes.json
    └── api/
        ├── classes.js              ← GET all classes, POST new class
        ├── class/[slug].js         ← GET class+students, PUT update, DELETE cascade
        ├── students.js             ← POST add student
        ├── student/[id].js         ← GET student+photos, PUT rename, DELETE remove
        ├── photos.js               ← POST upload photo
        ├── photo/[id].js           ← DELETE photo
        └── auth/
            ├── verify.js           ← POST check teacher password
            └── verify-admin.js     ← POST check admin password
```

## Cloudflare setup

### D1 database
1. Create a D1 database called `class-showcase-db`
2. Open the Console tab and run **each statement** from `setup.sql` one at a time

### R2 bucket
- Create a bucket called `student-showcase-v2`
- Go to Settings → Public Development URL → Enable

### Pages bindings
In your Pages project → Settings → Bindings:
- D1 Database → variable name `DB` → select your database
- R2 Bucket → variable name `R2` → select your bucket

### Environment variables
In Settings → Variables and Secrets:
- `R2_PUBLIC_URL` — your R2 public URL (e.g. `https://pub-xxxxx.r2.dev`)
- `ADMIN_PASSWORD` — Harrow
- `TEACHER_PASSWORD` — your teacher password

After adding bindings and variables, do a manual redeploy.

## URL structure

- `/` — Splash (classes or single-class students)
- `/class.html?class=butterflies` — Student grid for Butterflies class
- `/gallery.html?class=butterflies&student=42` — Oliver's gallery
- `/teacher.html?class=butterflies` — Teacher Zone for Butterflies
- `/admin.html` — Admin Dashboard (Ben only, password: Harrow)

## Phase 1 / Phase 2

- **Phase 1**: Single class behaves exactly like the original app. The splash page shows students directly when only one class exists.
- **Phase 2**: Add more classes via admin dashboard. Splash page becomes a class chooser. Each class has its own settings, background colour, and student list.

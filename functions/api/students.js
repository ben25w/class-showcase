// POST /api/students — add a student to a class (teacher)

const ALLOWED_ORIGINS = ['https://class-showcase.pages.dev'];

function getCORS(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password, X-Teacher-Password',
    'Vary': 'Origin',
  };
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  const CORS = getCORS(request);

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'POST') {
    const pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');
    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403);
    }
    try {
      const { name, classSlug } = await request.json();
      if (!name || !name.trim()) return json({ error: 'Name required' }, 400);
      if (!classSlug) return json({ error: 'classSlug required' }, 400);

      const cls = await env.DB.prepare(
        'SELECT id FROM classes WHERE slug = ?'
      ).bind(classSlug).first();
      if (!cls) return json({ error: 'Class not found' }, 404);

      const slug = slugify(name.trim());
      const maxRow = await env.DB.prepare(
        'SELECT MAX(sort_order) as m FROM students WHERE class_id = ?'
      ).bind(cls.id).first();
      const sortOrder = (maxRow?.m ?? -1) + 1;

      await env.DB.prepare(
        'INSERT OR IGNORE INTO students (class_id, name, slug, sort_order) VALUES (?, ?, ?, ?)'
      ).bind(cls.id, name.trim(), slug, sortOrder).run();

      const student = await env.DB.prepare(
        'SELECT id, name, slug FROM students WHERE class_id = ? AND slug = ?'
      ).bind(cls.id, slug).first();

      return json({ success: true, student });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}

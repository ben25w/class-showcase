// GET /api/classes -- list all classes (+ student counts)
// POST /api/classes -- create a new class (admin only)

const ALLOWED_ORIGINS = ['https://class-showcase.pages.dev'];

function getCORS(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password, X-Teacher-Password',
    'Vary': 'Origin',
  };
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  const CORS = getCORS(request);

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'GET') {
    try {
      const result = await env.DB.prepare(
        `SELECT c.id, c.name, c.slug, c.background_color, c.settings, c.sort_order,
                COUNT(s.id) as student_count
         FROM classes c
         LEFT JOIN students s ON s.class_id = c.id
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.name ASC`
      ).all();
      return json({ classes: result.results }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  if (method === 'POST') {
    const pw = request.headers.get('X-Admin-Password');
    if (pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 403, CORS);
    try {
      const body = await request.json();
      const name = (body.name || '').trim();
      if (!name) return json({ error: 'Name required' }, 400, CORS);
      const slug = slugify(name);
      const bgColor = body.background_color || '#a89fc8';
      const settings = JSON.stringify({ sort_order: 'alphabetical', shape_mode: 'circles' });
      const maxRow = await env.DB.prepare('SELECT MAX(sort_order) as m FROM classes').first();
      const sortOrder = (maxRow?.m ?? -1) + 1;
      await env.DB.prepare(
        'INSERT INTO classes (name, slug, background_color, settings, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(name, slug, bgColor, settings, sortOrder).run();
      return json({ success: true, slug }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
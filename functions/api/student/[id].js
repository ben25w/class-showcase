// GET /api/student/:id -- get student info + photos
// PUT /api/student/:id -- rename student (teacher)
// DELETE /api/student/:id -- remove student + photos (teacher)

const ALLOWED_ORIGINS = ['https://class-showcase.pages.dev'];

function getCORS(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
  const { request, env, params } = context;
  const method = request.method;
  const id = params.id;
  const CORS = getCORS(request);

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'GET') {
    try {
      const student = await env.DB.prepare(
        `SELECT s.id, s.name, s.slug, s.class_id, c.slug as class_slug, c.name as class_name
         FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
      ).bind(id).first();
      if (!student) return json({ error: 'Student not found' }, 404, CORS);
      const photosResult = await env.DB.prepare(
        'SELECT id, url, r2_key, created_at FROM photos WHERE student_id = ? ORDER BY created_at ASC'
      ).bind(id).all();
      return json({ ...student, photos: photosResult.results }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  if (method === 'PUT') {
    const pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');
    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403, CORS);
    }
    try {
      const { name } = await request.json();
      if (!name || !name.trim()) return json({ error: 'Name required' }, 400, CORS);
      const newSlug = slugify(name.trim());
      await env.DB.prepare(
        'UPDATE students SET name = ?, slug = ? WHERE id = ?'
      ).bind(name.trim(), newSlug, id).run();
      return json({ success: true }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  if (method === 'DELETE') {
    const pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');
    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403, CORS);
    }
    try {
      const photos = await env.DB.prepare('SELECT r2_key FROM photos WHERE student_id = ?').bind(id).all();
      for (const photo of photos.results) {
        try { await env.R2.delete(photo.r2_key); } catch {}
      }
      await env.DB.prepare('DELETE FROM photos WHERE student_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
      return json({ success: true }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
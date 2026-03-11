// GET /api/class/:slug -- get class data + students + settings
// PUT /api/class/:slug -- update class name, colour, or settings (teacher)
// DELETE /api/class/:slug -- remove class + students + photos (admin only)

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

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method;
  const slug = params.slug;
  const CORS = getCORS(request);

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'GET') {
    try {
      const cls = await env.DB.prepare(
        'SELECT id, name, slug, background_color, settings, sort_order FROM classes WHERE slug = ?'
      ).bind(slug).first();
      if (!cls) return json({ error: 'Class not found' }, 404, CORS);
      const studentsResult = await env.DB.prepare(
        'SELECT id, name, slug, sort_order FROM students WHERE class_id = ? ORDER BY name ASC'
      ).bind(cls.id).all();
      return json({ ...cls, students: studentsResult.results }, 200, CORS);
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
      const body = await request.json();
      const updates = [];
      const bindings = [];
      if (body.name) { updates.push('name = ?'); bindings.push(body.name.trim()); }
      if (body.background_color) { updates.push('background_color = ?'); bindings.push(body.background_color); }
      if (body.settings !== undefined) {
        updates.push('settings = ?');
        bindings.push(typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings));
      }
      if (updates.length === 0) return json({ success: true }, 200, CORS);
      bindings.push(slug);
      await env.DB.prepare(
        'UPDATE classes SET ' + updates.join(', ') + ' WHERE slug = ?'
      ).bind(...bindings).run();
      return json({ success: true }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  if (method === 'DELETE') {
    const pw = request.headers.get('X-Admin-Password');
    if (pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 403, CORS);
    try {
      const cls = await env.DB.prepare('SELECT id FROM classes WHERE slug = ?').bind(slug).first();
      if (!cls) return json({ error: 'Class not found' }, 404, CORS);
      const students = await env.DB.prepare('SELECT id FROM students WHERE class_id = ?').bind(cls.id).all();
      for (const student of students.results) {
        const photos = await env.DB.prepare('SELECT r2_key FROM photos WHERE student_id = ?').bind(student.id).all();
        for (const photo of photos.results) {
          try { await env.R2.delete(photo.r2_key); } catch {}
        }
        await env.DB.prepare('DELETE FROM photos WHERE student_id = ?').bind(student.id).run();
      }
      await env.DB.prepare('DELETE FROM students WHERE class_id = ?').bind(cls.id).run();
      await env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(cls.id).run();
      return json({ success: true }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
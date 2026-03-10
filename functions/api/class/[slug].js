// GET /api/class/:slug    — get class data + students + settings
// PUT /api/class/:slug    — update class name, colour, or settings (teacher)
// DELETE /api/class/:slug — remove class + students + photos (admin only)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password, X-Teacher-Password',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method;
  const slug = params.slug;

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  // ── GET /api/class/:slug ───────────────────────────────────────────────────
  if (method === 'GET') {
    try {
      const cls = await env.DB.prepare(
        'SELECT id, name, slug, background_color, settings, sort_order FROM classes WHERE slug = ?'
      ).bind(slug).first();

      if (!cls) return json({ error: 'Class not found' }, 404);

      const studentsResult = await env.DB.prepare(
        'SELECT id, name, slug, sort_order FROM students WHERE class_id = ? ORDER BY name ASC'
      ).bind(cls.id).all();

      return json({
        ...cls,
        students: studentsResult.results,
      });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // ── PUT /api/class/:slug — update name, colour, settings ──────────────────
  if (method === 'PUT') {
    const pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');
    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403);
    }
    try {
      const body = await request.json();
      const updates = [];
      const bindings = [];

      if (body.name) {
        updates.push('name = ?');
        bindings.push(body.name.trim());
      }
      if (body.background_color) {
        updates.push('background_color = ?');
        bindings.push(body.background_color);
      }
      if (body.settings !== undefined) {
        updates.push('settings = ?');
        bindings.push(typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings));
      }

      if (updates.length === 0) return json({ success: true });

      bindings.push(slug);
      await env.DB.prepare(
        'UPDATE classes SET ' + updates.join(', ') + ' WHERE slug = ?'
      ).bind(...bindings).run();

      return json({ success: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // ── DELETE /api/class/:slug — cascade delete (admin only) ─────────────────
  if (method === 'DELETE') {
    const pw = request.headers.get('X-Admin-Password');
    if (pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 403);

    try {
      // Get class
      const cls = await env.DB.prepare(
        'SELECT id FROM classes WHERE slug = ?'
      ).bind(slug).first();
      if (!cls) return json({ error: 'Class not found' }, 404);

      // Get all students in this class
      const students = await env.DB.prepare(
        'SELECT id FROM students WHERE class_id = ?'
      ).bind(cls.id).all();

      // Delete all photos from R2 + DB for each student
      for (const student of students.results) {
        const photos = await env.DB.prepare(
          'SELECT r2_key FROM photos WHERE student_id = ?'
        ).bind(student.id).all();

        for (const photo of photos.results) {
          try { await env.R2.delete(photo.r2_key); } catch {}
        }

        await env.DB.prepare('DELETE FROM photos WHERE student_id = ?').bind(student.id).run();
      }

      // Delete students + class
      await env.DB.prepare('DELETE FROM students WHERE class_id = ?').bind(cls.id).run();
      await env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(cls.id).run();

      return json({ success: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}

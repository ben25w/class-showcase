// DELETE /api/photo/:id -- delete a single photo (teacher auth required)

const ALLOWED_ORIGINS = ['https://class-showcase.pages.dev'];

function getCORS(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
  const CORS = getCORS(request);

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'DELETE') {
    let pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');
    if (!pw) {
      try { const body = await request.json(); pw = body.password; } catch {}
    }
    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403, CORS);
    }
    const photoId = params.id;
    try {
      const photo = await env.DB.prepare(
        'SELECT id, r2_key FROM photos WHERE id = ?'
      ).bind(photoId).first();
      if (!photo) return json({ error: 'Photo not found' }, 404, CORS);
      try { await env.R2.delete(photo.r2_key); } catch {}
      await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run();
      return json({ success: true }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
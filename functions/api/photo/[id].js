// DELETE /api/photo/:id — delete a single photo (teacher or password in body)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'DELETE') {
    // Accept password from header OR body (for gallery page teacher mode)
    let pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');
    if (!pw) {
      try {
        const body = await request.json();
        pw = body.password;
      } catch {}
    }
    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403);
    }

    const photoId = params.id;
    try {
      const photo = await env.DB.prepare(
        'SELECT id, r2_key FROM photos WHERE id = ?'
      ).bind(photoId).first();

      if (!photo) return json({ error: 'Photo not found' }, 404);

      try { await env.R2.delete(photo.r2_key); } catch {}
      await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run();

      return json({ success: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}

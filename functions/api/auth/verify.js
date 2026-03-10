// POST /api/auth/verify — check teacher password
// Accepts either TEACHER_PASSWORD or ADMIN_PASSWORD (admin can do everything teacher can)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (request.method === 'POST') {
    try {
      const { password } = await request.json();
      const ok = password === env.TEACHER_PASSWORD || password === env.ADMIN_PASSWORD;
      if (ok) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: 'Incorrect password' }), {
          status: 403,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}

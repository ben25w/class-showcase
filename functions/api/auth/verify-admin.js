// POST /api/auth/verify-admin — check admin password only
// Rate-limited: max 5 attempts per IP per 15 minutes

const ALLOWED_ORIGINS = [
  'https://class-showcase.pages.dev',
];

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Simple in-memory rate limiter (resets on worker restart)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export async function onRequest(context) {
  const { request, env } = context;
  const CORS = getCorsHeaders(request);

  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return json(
        { error: `Too many attempts. Try again in ${rateCheck.retryAfterSec} seconds.` },
        429,
        { ...CORS, 'Retry-After': String(rateCheck.retryAfterSec) }
      );
    }

    try {
      const { password } = await request.json();

      if (password === env.ADMIN_PASSWORD) {
        return json({ success: true }, 200, CORS);
      } else {
        return json({ error: 'Incorrect password' }, 403, CORS);
      }
    } catch (e) {
      return json({ error: 'Invalid request' }, 400, CORS);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
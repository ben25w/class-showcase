// POST /api/photos — upload a photo for a student
// Requires X-Teacher-Password or X-Admin-Password header (or password in body)

const ALLOWED_ORIGINS = [
  'https://class-showcase.pages.dev',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Known image magic bytes (hex prefixes)
const IMAGE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/gif':  [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/heic': null,
  'image/heif': null,
};

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Teacher-Password, X-Admin-Password',
    'Vary': 'Origin',
  };
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function verifyMagicBytes(bytes, mimeType) {
  const sig = IMAGE_SIGNATURES[mimeType];
  if (sig === null) return true;
  if (!sig) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return false;
  }
  return true;
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  const CORS = getCorsHeaders(request);

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'POST') {
    let pw = request.headers.get('X-Teacher-Password') || request.headers.get('X-Admin-Password');

    let bodyText;
    try {
      bodyText = await request.text();
    } catch {
      return json({ error: 'Invalid request body' }, 400, CORS);
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return json({ error: 'Invalid JSON' }, 400, CORS);
    }

    if (!pw) pw = body.password;

    if (pw !== env.TEACHER_PASSWORD && pw !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 403, CORS);
    }

    try {
      const { studentId, classSlug, base64, mimeType, originalName, fileSize } = body;

      if (!studentId) return json({ error: 'studentId required' }, 400, CORS);
      if (!base64)    return json({ error: 'base64 required' }, 400, CORS);

      const allowedMimes = Object.keys(IMAGE_SIGNATURES);
      const safeMime = (mimeType || '').toLowerCase();
      if (!allowedMimes.includes(safeMime)) {
        return json({ error: 'Only image files are allowed (jpeg, png, gif, webp, heic)' }, 400, CORS);
      }

      const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
      let binaryStr;
      try {
        binaryStr = atob(base64Data);
      } catch {
        return json({ error: 'Invalid base64 data' }, 400, CORS);
      }

      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      if (bytes.length > MAX_FILE_SIZE) {
        return json({ error: 'File too large. Maximum size is 10 MB.' }, 400, CORS);
      }

      if (!verifyMagicBytes(bytes, safeMime)) {
        return json({ error: 'File content does not match the declared image type' }, 400, CORS);
      }

      const student = await env.DB.prepare(
        `SELECT s.id, s.slug, c.slug as class_slug FROM students s
         JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
      ).bind(studentId).first();

      if (!student) return json({ error: 'Student not found' }, 404, CORS);

      const existing = await env.DB.prepare(
        'SELECT id, r2_key FROM photos WHERE student_id = ? ORDER BY created_at ASC'
      ).bind(studentId).all();

      if (existing.results.length >= 9) {
        const oldest = existing.results[0];
        try { await env.R2.delete(oldest.r2_key); } catch {}
        await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(oldest.id).run();
      }

      const ext = safeMime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
      const effectiveClassSlug = classSlug || student.class_slug;
      const r2Key = `classes/${effectiveClassSlug}/${student.slug}/${randomId}.${ext}`;

      await env.R2.put(r2Key, bytes.buffer, {
        httpMetadata: { contentType: safeMime },
      });

      const publicUrl = `${env.R2_PUBLIC_URL}/${r2Key}`;

      await env.DB.prepare(
        'INSERT INTO photos (student_id, r2_key, url) VALUES (?, ?, ?)'
      ).bind(studentId, r2Key, publicUrl).run();

      return json({ success: true, url: publicUrl }, 200, CORS);
    } catch (e) {
      return json({ error: e.message }, 500, CORS);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
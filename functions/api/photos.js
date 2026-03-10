// POST /api/photos — upload a photo for a student (public — no auth needed)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (method === 'POST') {
    try {
      const { studentId, classSlug, base64, mimeType, originalName, fileSize } = await request.json();

      if (!studentId) return json({ error: 'studentId required' }, 400);
      if (!base64) return json({ error: 'base64 required' }, 400);

      // Verify student exists
      const student = await env.DB.prepare(
        `SELECT s.id, s.slug, c.slug as class_slug
         FROM students s JOIN classes c ON c.id = s.class_id
         WHERE s.id = ?`
      ).bind(studentId).first();
      if (!student) return json({ error: 'Student not found' }, 404);

      // Check existing photo count — auto-delete oldest if at 9
      const existing = await env.DB.prepare(
        'SELECT id, r2_key FROM photos WHERE student_id = ? ORDER BY created_at ASC'
      ).bind(studentId).all();

      if (existing.results.length >= 9) {
        const oldest = existing.results[0];
        try { await env.R2.delete(oldest.r2_key); } catch {}
        await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(oldest.id).run();
      }

      // Decode base64
      const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Build R2 key: classes/{classSlug}/{studentSlug}/{randomId}.ext
      const ext = (mimeType || 'image/jpeg').split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
      const effectiveClassSlug = classSlug || student.class_slug;
      const r2Key = `classes/${effectiveClassSlug}/${student.slug}/${randomId}.${ext}`;

      // Upload to R2
      await env.R2.put(r2Key, bytes.buffer, {
        httpMetadata: { contentType: mimeType || 'image/jpeg' },
      });

      const publicUrl = `${env.R2_PUBLIC_URL}/${r2Key}`;

      // Save to DB
      await env.DB.prepare(
        'INSERT INTO photos (student_id, r2_key, url) VALUES (?, ?, ?)'
      ).bind(studentId, r2Key, publicUrl).run();

      return json({ success: true, url: publicUrl });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}

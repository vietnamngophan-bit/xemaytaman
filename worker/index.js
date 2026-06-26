const STATUS = new Set(['in_stock', 'sold', 'incoming', 'reserved']);
const CATEGORY = new Set(['new', 'used']);
const EDITABLE_FIELDS = [
  'slug', 'name', 'brand', 'category', 'price', 'msrp', 'year', 'mileage', 'engine', 'color',
  'documents', 'status', 'description', 'images', 'featured', 'sort_order'
];

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif'
};

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=UTF-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function error(message, status = 400) {
  return json({ ok: false, error: message }, { status });
}

function getCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  const item = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function bytesToBase64Url(bytes) {
  let string = '';
  for (const byte of bytes) string += String.fromCharCode(byte);
  return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToString(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return atob(base64);
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function createSession(secret) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 12 })));
  return `${payload}.${await hmac(secret, payload)}`;
}

async function isAdmin(request, env) {
  const token = getCookie(request, 'tam_an_admin');
  if (!token || !env.SESSION_SECRET) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = await hmac(env.SESSION_SECRET, payload);
  if (signature !== expected) return false;
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(base64UrlToString(payload), c => c.charCodeAt(0)))).exp > Date.now();
  } catch {
    return false;
  }
}

function slugify(input = '') {
  return input
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 80) || `xe-${Date.now()}`;
}

function toInt(value, fallback = null) {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rowToBike(row) {
  if (!row) return null;
  let images = [];
  try { images = JSON.parse(row.images || '[]'); } catch { images = []; }
  return { ...row, images, featured: Boolean(row.featured) };
}

function normalizeBike(input, existing = {}) {
  const bike = {};
  const source = { ...existing, ...input };
  bike.name = String(source.name || '').trim();
  bike.slug = slugify(source.slug || bike.name);
  bike.brand = String(source.brand || 'Honda').trim();
  bike.category = CATEGORY.has(source.category) ? source.category : 'new';
  bike.price = Math.max(0, toInt(source.price, 0));
  bike.msrp = toInt(source.msrp, null);
  bike.year = toInt(source.year, null);
  bike.mileage = toInt(source.mileage, null);
  bike.engine = String(source.engine || '').trim();
  bike.color = String(source.color || '').trim();
  bike.documents = String(source.documents || '').trim();
  bike.status = STATUS.has(source.status) ? source.status : 'in_stock';
  bike.description = String(source.description || '').trim();
  bike.images = Array.isArray(source.images) ? source.images.filter(v => typeof v === 'string' && v.startsWith('/')) : [];
  bike.featured = source.featured ? 1 : 0;
  bike.sort_order = toInt(source.sort_order, 0);
  return bike;
}

async function parseJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const data = await parseJson(request);
    if (!data?.password || !env.ADMIN_PASSWORD || data.password !== env.ADMIN_PASSWORD) {
      return error('Mật khẩu không đúng.', 401);
    }
    const token = await createSession(env.SESSION_SECRET);
    return json({ ok: true }, { headers: { 'set-cookie': `tam_an_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` } });
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    return json({ ok: true }, { headers: { 'set-cookie': 'tam_an_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' } });
  }

  if (pathname === '/api/auth/me' && request.method === 'GET') {
    return json({ ok: true, authenticated: await isAdmin(request, env) });
  }

  if (pathname.startsWith('/media/') && request.method === 'GET') {
    const key = decodeURIComponent(pathname.slice('/media/'.length));
    if (!key || key.includes('..')) return error('Không tìm thấy ảnh.', 404);
    const object = await env.IMAGES.get(key);
    if (!object) return error('Không tìm thấy ảnh.', 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }

  if (pathname === '/api/bikes' && request.method === 'GET') {
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const featured = url.searchParams.get('featured');
    const terms = [];
    const values = [];
    if (STATUS.has(status)) { terms.push('status = ?'); values.push(status); }
    if (CATEGORY.has(category)) { terms.push('category = ?'); values.push(category); }
    if (featured === '1') terms.push('featured = 1');
    const sql = `SELECT * FROM bikes ${terms.length ? `WHERE ${terms.join(' AND ')}` : ''} ORDER BY featured DESC, sort_order ASC, id DESC`;
    const statement = env.DB.prepare(sql);
    const result = values.length ? await statement.bind(...values).all() : await statement.all();
    return json({ ok: true, bikes: result.results.map(rowToBike) }, { headers: { 'cache-control': 'public, max-age=60' } });
  }

  const bikeMatch = pathname.match(/^\/api\/bikes\/([^/]+)$/);
  if (bikeMatch && request.method === 'GET') {
    const key = decodeURIComponent(bikeMatch[1]);
    const result = await env.DB.prepare('SELECT * FROM bikes WHERE slug = ? OR CAST(id AS TEXT) = ? LIMIT 1').bind(key, key).first();
    if (!result) return error('Không tìm thấy xe.', 404);
    return json({ ok: true, bike: rowToBike(result) });
  }

  const admin = await isAdmin(request, env);
  if (pathname.startsWith('/api/admin/') && !admin) return error('Bạn chưa đăng nhập.', 401);

  if (pathname === '/api/admin/bikes' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM bikes ORDER BY updated_at DESC, id DESC').all();
    return json({ ok: true, bikes: result.results.map(rowToBike) });
  }

  if (pathname === '/api/admin/bikes' && request.method === 'POST') {
    const payload = await parseJson(request);
    if (!payload) return error('Dữ liệu không hợp lệ.');
    const bike = normalizeBike(payload);
    if (!bike.name) return error('Vui lòng nhập tên xe.');
    const duplicate = await env.DB.prepare('SELECT id FROM bikes WHERE slug = ? LIMIT 1').bind(bike.slug).first();
    if (duplicate) bike.slug = `${bike.slug}-${Date.now().toString().slice(-5)}`;
    const insert = await env.DB.prepare(`
      INSERT INTO bikes (slug, name, brand, category, price, msrp, year, mileage, engine, color, documents, status, description, images, featured, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(bike.slug, bike.name, bike.brand, bike.category, bike.price, bike.msrp, bike.year, bike.mileage, bike.engine, bike.color, bike.documents, bike.status, bike.description, JSON.stringify(bike.images), bike.featured, bike.sort_order).run();
    const created = await env.DB.prepare('SELECT * FROM bikes WHERE id = ?').bind(insert.meta.last_row_id).first();
    return json({ ok: true, bike: rowToBike(created) }, { status: 201 });
  }

  const adminBike = pathname.match(/^\/api\/admin\/bikes\/(\d+)$/);
  if (adminBike && request.method === 'PUT') {
    const id = Number(adminBike[1]);
    const existing = await env.DB.prepare('SELECT * FROM bikes WHERE id = ?').bind(id).first();
    if (!existing) return error('Không tìm thấy xe.', 404);
    const payload = await parseJson(request);
    if (!payload) return error('Dữ liệu không hợp lệ.');
    const bike = normalizeBike(payload, rowToBike(existing));
    if (!bike.name) return error('Vui lòng nhập tên xe.');
    const duplicate = await env.DB.prepare('SELECT id FROM bikes WHERE slug = ? AND id != ? LIMIT 1').bind(bike.slug, id).first();
    if (duplicate) bike.slug = `${bike.slug}-${id}`;
    await env.DB.prepare(`
      UPDATE bikes SET slug=?, name=?, brand=?, category=?, price=?, msrp=?, year=?, mileage=?, engine=?, color=?, documents=?, status=?, description=?, images=?, featured=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(bike.slug, bike.name, bike.brand, bike.category, bike.price, bike.msrp, bike.year, bike.mileage, bike.engine, bike.color, bike.documents, bike.status, bike.description, JSON.stringify(bike.images), bike.featured, bike.sort_order, id).run();
    const updated = await env.DB.prepare('SELECT * FROM bikes WHERE id = ?').bind(id).first();
    return json({ ok: true, bike: rowToBike(updated) });
  }

  if (adminBike && request.method === 'DELETE') {
    const id = Number(adminBike[1]);
    await env.DB.prepare('DELETE FROM bikes WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (pathname === '/api/admin/upload' && request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    const length = Number(request.headers.get('content-length') || 0);
    if (!contentType.startsWith('image/')) return error('Chỉ nhận file ảnh.');
    if (length > 8 * 1024 * 1024) return error('Ảnh tối đa 8MB.');
    const sourceName = request.headers.get('x-file-name') || 'xe-may.jpg';
    const extension = (sourceName.split('.').pop() || 'jpg').toLowerCase();
    if (!MIME[extension]) return error('Định dạng ảnh chưa hỗ trợ.');
    const cleanName = sourceName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80);
    const key = `bikes/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanName}`;
    await env.IMAGES.put(key, request.body, { httpMetadata: { contentType: MIME[extension] } });
    return json({ ok: true, url: `/media/${encodeURIComponent(key)}` }, { status: 201 });
  }

  return error('Không tìm thấy API.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
      try {
        return await handleApi(request, env, url);
      } catch (cause) {
        console.error(cause);
        return error('Máy chủ tạm thời gặp lỗi.', 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

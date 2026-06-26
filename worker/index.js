const encoder = new TextEncoder();
const CATEGORY = new Set(['new', 'used']);
const STATUS = new Set(['in_stock', 'incoming', 'sold', 'reserved']);
const LEAD_TYPES = new Set(['consultation', 'order', 'finance']);
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
const SETTINGS_DEFAULTS = {
  store_name: 'TÂM AN', store_location: 'NOMURA • HẢI PHÒNG', hotline: '0856 262 886',
  zalo_link: 'https://zalo.me/0856262886', tiktok_link: '', youtube_link: '', contact_email: '',
  address: 'Cổng phụ KCN Nomura, Hải Phòng',
  map_link: 'https://maps.google.com/?q=Cổng+phụ+KCN+Nomura+Hải+Phòng',
  map_embed: 'https://www.google.com/maps?q=C%E1%BB%95ng%20ph%E1%BB%A5%20KCN%20Nomura%20H%E1%BA%A3i%20Ph%C3%B2ng&output=embed',
  primary_color: '#b80f19', paper_color: '#f8f6f5', dark_color: '#1b1112', font_family: 'Be Vietnam Pro',
  topline: 'TRẢ GÓP LINH HOẠT • HỒ SƠ NHANH • XE MỚI VÀ XE CŨ TUYỂN CHỌN',
  hero_eyebrow: 'Xe máy Tâm An Nomura', hero_title: 'Chọn xe ưng ý.', hero_highlight: 'Lên đường an tâm.',
  hero_description: 'Xe mới chính hãng, xe cũ tuyển chọn. Hỗ trợ trả góp nhanh, thủ tục rõ ràng và chăm sóc tận tâm tại Hải Phòng.',
  hero_image: '', inventory_eyebrow: 'Kho xe Tâm An', inventory_title: 'Xe đang chờ\nbạn cầm lái.',
  inventory_description: 'Lướt ngang để xem toàn bộ xe. Chạm vào xe để xem thông tin và gửi yêu cầu tư vấn.',
  promo_eyebrow: 'Ưu đãi tại showroom', promo_title: 'Khuyến mại rõ ràng.\nQuà tặng thiết thực.',
  promo_description: 'Tùy từng mẫu xe và thời điểm, Tâm An có chương trình hỗ trợ trả góp, phụ kiện hoặc ưu đãi khi đổi xe.',
  promo_button_text: 'Xem ưu đãi', promo_button_link: '/tra-gop',
  delivery_title: 'Hỗ trợ giao xe tận nơi', delivery_description: 'Liên hệ để Tâm An kiểm tra khu vực giao xe, thời gian nhận xe và chi phí cụ thể.',
  cta_eyebrow: 'TÂM AN NOMURA', cta_title: 'Xe đã chọn xong.\nChỉ còn cuộc gọi của bạn.'
};
let schemaPromise;

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', headers.get('cache-control') || 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}
function error(message, status = 400) { return json({ ok: false, error: message }, { status }); }
function cleanText(value, fallback = '') { return typeof value === 'string' ? value.trim().slice(0, 4000) : fallback; }
function nullableNumber(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; }
function slugify(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || `xe-${Date.now()}`; }
function parseImages(value) { try { const data = Array.isArray(value) ? value : JSON.parse(value || '[]'); return Array.isArray(data) ? data.filter(item => typeof item === 'string').slice(0, 12) : []; } catch { return []; } }
function rowToBike(row) { return { ...row, images: parseImages(row.images), featured: Boolean(row.featured), installment_from: row.installment_from || 0, bad_debt_down_payment: row.bad_debt_down_payment || 0 }; }
function cookies(request) { return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(([key]) => key)); }
function base64Url(bytes) { let string = ''; for (const byte of bytes) string += String.fromCharCode(byte); return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
async function sign(value, secret) { const key = await crypto.subtle.importKey('raw', encoder.encode(secret || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))); }
async function createSession(secret) { const payload = base64Url(encoder.encode(JSON.stringify({ exp: Date.now() + 12 * 60 * 60 * 1000, role: 'admin' }))); return `${payload}.${await sign(payload, secret)}`; }
async function isAdmin(request, env) { const token = cookies(request).tam_an_admin; if (!token || !env.SESSION_SECRET) return false; const [payload, signature] = token.split('.'); if (!payload || !signature || signature !== await sign(payload, env.SESSION_SECRET)) return false; try { const text = new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')), char => char.charCodeAt(0))); return JSON.parse(text).exp > Date.now(); } catch { return false; } }
async function parseJson(request) { try { return await request.json(); } catch { return null; } }

async function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bikes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT 'Honda',
      category TEXT NOT NULL DEFAULT 'new', price INTEGER NOT NULL DEFAULT 0, msrp INTEGER, year INTEGER, mileage INTEGER,
      engine TEXT, color TEXT, documents TEXT, status TEXT NOT NULL DEFAULT 'in_stock', description TEXT,
      images TEXT NOT NULL DEFAULT '[]', featured INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
      installment_from INTEGER NOT NULL DEFAULT 0, bad_debt_down_payment INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    const columns = await env.DB.prepare('PRAGMA table_info(bikes)').all();
    const existing = new Set((columns.results || []).map(column => column.name));
    if (!existing.has('installment_from')) await env.DB.prepare('ALTER TABLE bikes ADD COLUMN installment_from INTEGER NOT NULL DEFAULT 0').run();
    if (!existing.has('bad_debt_down_payment')) await env.DB.prepare('ALTER TABLE bikes ADD COLUMN bad_debt_down_payment INTEGER NOT NULL DEFAULT 0').run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL DEFAULT 'consultation', name TEXT NOT NULL, phone TEXT NOT NULL,
      bike_name TEXT, down_payment TEXT, credit_status TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC)').run();
    await env.DB.prepare('INSERT OR IGNORE INTO site_settings (id, data) VALUES (1, ?)').bind(JSON.stringify(SETTINGS_DEFAULTS)).run();
  })().catch(cause => { schemaPromise = undefined; throw cause; });
  return schemaPromise;
}
async function getSettings(env) {
  await ensureSchema(env);
  const row = await env.DB.prepare('SELECT data FROM site_settings WHERE id = 1').first();
  try { return { ...SETTINGS_DEFAULTS, ...(row ? JSON.parse(row.data) : {}) }; } catch { return { ...SETTINGS_DEFAULTS }; }
}
function normalizeSettings(payload = {}) {
  const settings = { ...SETTINGS_DEFAULTS };
  for (const key of Object.keys(SETTINGS_DEFAULTS)) settings[key] = cleanText(payload[key], SETTINGS_DEFAULTS[key]);
  if (!/^#[0-9a-f]{6}$/i.test(settings.primary_color)) settings.primary_color = SETTINGS_DEFAULTS.primary_color;
  if (!/^#[0-9a-f]{6}$/i.test(settings.paper_color)) settings.paper_color = SETTINGS_DEFAULTS.paper_color;
  if (!/^#[0-9a-f]{6}$/i.test(settings.dark_color)) settings.dark_color = SETTINGS_DEFAULTS.dark_color;
  if (!['Be Vietnam Pro', 'Plus Jakarta Sans', 'Sora'].includes(settings.font_family)) settings.font_family = SETTINGS_DEFAULTS.font_family;
  return settings;
}
function normalizeBike(payload, existing = {}) {
  const name = cleanText(payload.name);
  return {
    slug: slugify(payload.slug || name || existing.name), name, brand: cleanText(payload.brand, 'Honda') || 'Honda',
    category: CATEGORY.has(payload.category) ? payload.category : 'new', status: STATUS.has(payload.status) ? payload.status : 'in_stock',
    price: nullableNumber(payload.price) ?? 0, msrp: nullableNumber(payload.msrp), year: nullableNumber(payload.year), mileage: nullableNumber(payload.mileage),
    engine: cleanText(payload.engine), color: cleanText(payload.color), documents: cleanText(payload.documents), description: cleanText(payload.description),
    installment_from: nullableNumber(payload.installment_from) ?? 0, bad_debt_down_payment: nullableNumber(payload.bad_debt_down_payment) ?? 0,
    featured: payload.featured ? 1 : 0, sort_order: nullableNumber(payload.sort_order) ?? 0, images: parseImages(payload.images)
  };
}
async function notifyLead(env, lead, settings) {
  const to = env.LEADS_EMAIL || settings.contact_email;
  if (!env.RESEND_API_KEY || !to) return false;
  const label = lead.type === 'finance' ? 'Tư vấn trả góp' : lead.type === 'order' ? 'Đặt xe / giữ xe' : 'Yêu cầu tư vấn';
  const body = [`Loại yêu cầu: ${label}`, `Khách hàng: ${lead.name}`, `Số điện thoại: ${lead.phone}`, `Xe quan tâm: ${lead.bike_name || 'Chưa chọn'}`, `Trả trước dự kiến: ${lead.down_payment || 'Chưa rõ'}`, `Tình trạng hồ sơ: ${lead.credit_status || 'Chưa rõ'}`, `Ghi chú: ${lead.note || 'Không có'}`].join('\n');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM || 'Tâm An Website <onboarding@resend.dev>', to: [to], subject: `[Tâm An] ${label} từ ${lead.name}`, text: body })
    });
    return response.ok;
  } catch { return false; }
}

async function handleApi(request, env, url) {
  const { pathname } = url;
  if (pathname.startsWith('/media/') && request.method === 'GET') {
    const key = decodeURIComponent(pathname.slice('/media/'.length));
    if (!key || key.includes('..')) return error('Không tìm thấy ảnh.', 404);
    const object = await env.IMAGES.get(key);
    if (!object) return error('Không tìm thấy ảnh.', 404);
    const headers = new Headers(); object.writeHttpMetadata(headers); headers.set('etag', object.httpEtag); headers.set('cache-control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const data = await parseJson(request);
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return error('Trang quản trị chưa được cấu hình mật khẩu.', 503);
    if (!data?.password || data.password !== env.ADMIN_PASSWORD) return error('Mật khẩu không đúng.', 401);
    const token = await createSession(env.SESSION_SECRET);
    return json({ ok: true }, { headers: { 'set-cookie': `tam_an_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` } });
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') return json({ ok: true }, { headers: { 'set-cookie': 'tam_an_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' } });
  if (pathname === '/api/auth/me' && request.method === 'GET') return json({ ok: true, authenticated: await isAdmin(request, env) });

  await ensureSchema(env);
  if (pathname === '/api/settings' && request.method === 'GET') return json({ ok: true, settings: await getSettings(env) }, { headers: { 'cache-control': 'public, max-age=60' } });
  if (pathname === '/api/bikes' && request.method === 'GET') {
    const status = url.searchParams.get('status'); const category = url.searchParams.get('category'); const terms=[]; const values=[];
    if (STATUS.has(status)) { terms.push('status = ?'); values.push(status); } if (CATEGORY.has(category)) { terms.push('category = ?'); values.push(category); }
    const sql = `SELECT * FROM bikes ${terms.length ? `WHERE ${terms.join(' AND ')}` : ''} ORDER BY featured DESC, sort_order ASC, id DESC`;
    const statement = env.DB.prepare(sql); const result = values.length ? await statement.bind(...values).all() : await statement.all();
    return json({ ok: true, bikes: (result.results || []).map(rowToBike) }, { headers: { 'cache-control': 'public, max-age=60' } });
  }
  if (pathname === '/api/leads' && request.method === 'POST') {
    const payload = await parseJson(request); if (!payload) return error('Dữ liệu không hợp lệ.');
    const lead = { type: LEAD_TYPES.has(payload.type) ? payload.type : 'consultation', name: cleanText(payload.name), phone: cleanText(payload.phone), bike_name: cleanText(payload.bike_name), down_payment: cleanText(payload.down_payment), credit_status: cleanText(payload.credit_status), note: cleanText(payload.note) };
    if (!lead.name || !lead.phone) return error('Vui lòng nhập họ tên và số điện thoại.');
    await env.DB.prepare('INSERT INTO leads (type, name, phone, bike_name, down_payment, credit_status, note) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(lead.type, lead.name, lead.phone, lead.bike_name, lead.down_payment, lead.credit_status, lead.note).run();
    const settings = await getSettings(env); const emailSent = await notifyLead(env, lead, settings);
    return json({ ok: true, email_sent: emailSent }, { status: 201 });
  }

  const admin = await isAdmin(request, env);
  if (pathname.startsWith('/api/admin/') && !admin) return error('Bạn chưa đăng nhập.', 401);
  if (pathname === '/api/admin/settings' && request.method === 'GET') return json({ ok: true, settings: await getSettings(env) });
  if (pathname === '/api/admin/settings' && request.method === 'PUT') {
    const payload = await parseJson(request); if (!payload) return error('Dữ liệu không hợp lệ.'); const settings = normalizeSettings(payload);
    await env.DB.prepare('UPDATE site_settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').bind(JSON.stringify(settings)).run();
    return json({ ok: true, settings });
  }
  if (pathname === '/api/admin/bikes' && request.method === 'GET') { const result = await env.DB.prepare('SELECT * FROM bikes ORDER BY updated_at DESC, id DESC').all(); return json({ ok: true, bikes: (result.results || []).map(rowToBike) }); }
  if (pathname === '/api/admin/bikes' && request.method === 'POST') {
    const payload = await parseJson(request); if (!payload) return error('Dữ liệu không hợp lệ.'); const bike = normalizeBike(payload); if (!bike.name) return error('Vui lòng nhập tên xe.');
    const duplicate = await env.DB.prepare('SELECT id FROM bikes WHERE slug = ? LIMIT 1').bind(bike.slug).first(); if (duplicate) bike.slug = `${bike.slug}-${Date.now().toString().slice(-5)}`;
    const insert = await env.DB.prepare(`INSERT INTO bikes (slug,name,brand,category,price,msrp,year,mileage,engine,color,documents,status,description,images,featured,sort_order,installment_from,bad_debt_down_payment,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(bike.slug,bike.name,bike.brand,bike.category,bike.price,bike.msrp,bike.year,bike.mileage,bike.engine,bike.color,bike.documents,bike.status,bike.description,JSON.stringify(bike.images),bike.featured,bike.sort_order,bike.installment_from,bike.bad_debt_down_payment).run();
    const created = await env.DB.prepare('SELECT * FROM bikes WHERE id = ?').bind(insert.meta.last_row_id).first(); return json({ ok: true, bike: rowToBike(created) }, { status: 201 });
  }
  const bikeMatch = pathname.match(/^\/api\/admin\/bikes\/(\d+)$/);
  if (bikeMatch && request.method === 'PUT') {
    const id = Number(bikeMatch[1]); const existing = await env.DB.prepare('SELECT * FROM bikes WHERE id = ?').bind(id).first(); if (!existing) return error('Không tìm thấy xe.', 404);
    const payload = await parseJson(request); if (!payload) return error('Dữ liệu không hợp lệ.'); const bike = normalizeBike(payload, rowToBike(existing)); if (!bike.name) return error('Vui lòng nhập tên xe.');
    const duplicate = await env.DB.prepare('SELECT id FROM bikes WHERE slug = ? AND id != ? LIMIT 1').bind(bike.slug,id).first(); if (duplicate) bike.slug = `${bike.slug}-${id}`;
    await env.DB.prepare(`UPDATE bikes SET slug=?,name=?,brand=?,category=?,price=?,msrp=?,year=?,mileage=?,engine=?,color=?,documents=?,status=?,description=?,images=?,featured=?,sort_order=?,installment_from=?,bad_debt_down_payment=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(bike.slug,bike.name,bike.brand,bike.category,bike.price,bike.msrp,bike.year,bike.mileage,bike.engine,bike.color,bike.documents,bike.status,bike.description,JSON.stringify(bike.images),bike.featured,bike.sort_order,bike.installment_from,bike.bad_debt_down_payment,id).run();
    const updated = await env.DB.prepare('SELECT * FROM bikes WHERE id = ?').bind(id).first(); return json({ ok: true, bike: rowToBike(updated) });
  }
  if (bikeMatch && request.method === 'DELETE') { await env.DB.prepare('DELETE FROM bikes WHERE id = ?').bind(Number(bikeMatch[1])).run(); return json({ ok: true }); }
  if (pathname === '/api/admin/leads' && request.method === 'GET') { const result=await env.DB.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 300').all(); return json({ ok:true, leads:result.results||[] }); }
  if (pathname === '/api/admin/upload' && request.method === 'POST') {
    const contentType=request.headers.get('content-type')||''; const length=Number(request.headers.get('content-length')||0); if(!contentType.startsWith('image/')) return error('Chỉ nhận file ảnh.'); if(length>8*1024*1024) return error('Ảnh tối đa 8MB.');
    const sourceName=decodeURIComponent(request.headers.get('x-file-name')||'xe-may.jpg'); const extension=(sourceName.split('.').pop()||'jpg').toLowerCase(); if(!MIME[extension]) return error('Định dạng ảnh chưa hỗ trợ.');
    const cleanName=sourceName.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80); const key=`uploads/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${cleanName}`;
    await env.IMAGES.put(key,request.body,{httpMetadata:{contentType:MIME[extension]}}); return json({ok:true,url:`/media/${encodeURIComponent(key)}`},{status:201});
  }
  return error('Không tìm thấy API.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
      try { return await handleApi(request, env, url); } catch (cause) { console.error(cause); return error('Máy chủ tạm thời gặp lỗi.', 500); }
    }
    return env.ASSETS.fetch(request);
  }
};

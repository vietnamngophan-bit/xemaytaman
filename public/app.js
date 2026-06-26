const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const statusText = { in_stock: 'Còn hàng', incoming: 'Sắp về', sold: 'Đã bán', reserved: 'Đang giữ xe' };
const categoryText = { new: 'Xe mới', used: 'Xe cũ' };
const filterText = { all: 'Tất cả xe', in_stock: 'Xe có sẵn', incoming: 'Xe sắp về', new: 'Xe mới', used: 'Xe cũ' };
const defaultSettings = {
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
const fallbackBikes = [
  { id: 'demo-1', name: 'Honda Vision 2026', brand: 'Honda', category: 'new', price: 35900000, msrp: 38900000, year: 2026, mileage: 0, engine: '110cc', color: 'Đỏ đô', documents: 'Hồ sơ đầy đủ', status: 'in_stock', description: 'Xe mới 100%, hỗ trợ trả góp nhanh. Tặng phụ kiện theo chương trình tại cửa hàng.', installment_from: 5000000, bad_debt_down_payment: 12000000, images: ['/assets/vision-red-bike.jpg'], featured: true },
  { id: 'demo-2', name: 'Honda Air Blade 160', brand: 'Honda', category: 'new', price: 56500000, year: 2026, mileage: 0, engine: '160cc', color: 'Đen nhám', documents: 'Hồ sơ đầy đủ', status: 'incoming', description: 'Phiên bản thể thao, máy khỏe, thiết kế hiện đại. Đăng ký để được ưu tiên nhận xe khi về.', installment_from: 9000000, images: ['/assets/vision-promo.jpg'], featured: true },
  { id: 'demo-3', name: 'Honda SH Mode 2023', brand: 'Honda', category: 'used', price: 53500000, year: 2023, mileage: 8200, engine: '125cc', color: 'Trắng ngọc trai', documents: 'Giấy tờ hợp lệ', status: 'in_stock', description: 'Xe cũ tuyển chọn, máy móc nguyên bản, ngoại hình đẹp. Có hỗ trợ đổi xe và trả góp.', installment_from: 8000000, bad_debt_down_payment: 15000000, images: ['/assets/vision-red-bike.jpg'], featured: false }
];

let siteSettings = { ...defaultSettings };
let bikes = [];
let adminBikes = [];
let activeFilter = 'all';
let searchQuery = '';
let editingImages = [];
let currentEditingId = null;

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function currency(value) { return value === null || value === undefined || value === '' ? 'Liên hệ' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value)); }
function compactMoney(value) { const numeric = Number(value || 0); if (!numeric) return ''; return numeric >= 1000000 ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(numeric / 1000000)} triệu` : currency(numeric); }
function makeTel(number) { return `tel:${String(number || '').replace(/[^0-9+]/g, '')}`; }
function formValue(form, name) { return form.elements[name]?.value ?? ''; }
function lineBreak(value) { return escapeHtml(value || '').replace(/\n/g, '<br />'); }
function setText(selector, value) { const node = $(selector); if (node) node.textContent = value || ''; }
function renderTitle(selector, value) { const node = $(selector); if (!node) return; const lines = String(value || '').split('\n'); node.innerHTML = `${escapeHtml(lines[0] || '')}${lines.length > 1 ? `<br /><em>${escapeHtml(lines.slice(1).join(' '))}</em>` : ''}`; }

function applySettings(raw = {}) {
  siteSettings = { ...defaultSettings, ...raw };
  document.documentElement.style.setProperty('--red', siteSettings.primary_color || defaultSettings.primary_color);
  document.documentElement.style.setProperty('--red-dark', siteSettings.primary_color || defaultSettings.primary_color);
  document.documentElement.style.setProperty('--paper', siteSettings.paper_color || defaultSettings.paper_color);
  document.documentElement.style.setProperty('--dark', siteSettings.dark_color || defaultSettings.dark_color);
  document.documentElement.style.setProperty('--font', `"${siteSettings.font_family || defaultSettings.font_family}", ui-sans-serif, system-ui, sans-serif`);
  document.documentElement.style.setProperty('--heading', `"${siteSettings.font_family || defaultSettings.font_family}", ui-sans-serif, system-ui, sans-serif`);
  setText('#topline-text', siteSettings.topline);
  setText('#brand-name', siteSettings.store_name); setText('#brand-location', siteSettings.store_location);
  setText('#hero-eyebrow', siteSettings.hero_eyebrow); setText('#hero-title', siteSettings.hero_title); setText('#hero-highlight', siteSettings.hero_highlight); setText('#hero-description', siteSettings.hero_description);
  setText('#inventory-eyebrow', siteSettings.inventory_eyebrow); renderTitle('#inventory-title', siteSettings.inventory_title); setText('#inventory-description', siteSettings.inventory_description);
  setText('#promo-eyebrow', siteSettings.promo_eyebrow); renderTitle('#promo-title', siteSettings.promo_title); setText('#promo-description', siteSettings.promo_description);
  const promoButton = $('#promo-button'); if (promoButton) { promoButton.href = siteSettings.promo_button_link || '/tra-gop'; promoButton.innerHTML = `${escapeHtml(siteSettings.promo_button_text || 'Xem ưu đãi')} <span>↗</span>`; }
  setText('#delivery-title', siteSettings.delivery_title); setText('#delivery-description', siteSettings.delivery_description);
  setText('#cta-eyebrow', siteSettings.cta_eyebrow); renderTitle('#cta-title', siteSettings.cta_title);
  const addressNode = $('#showroom-address'); if (addressNode) addressNode.innerHTML = lineBreak(String(siteSettings.address || '').replace(/,\s*/g, ',\n'));
  ['#header-phone', '#showroom-phone', '#cta-phone'].forEach(selector => { const node = $(selector); if (!node) return; node.textContent = siteSettings.hotline || defaultSettings.hotline; node.href = makeTel(siteSettings.hotline); });
  const map = $('#map-link'); if (map) map.href = siteSettings.map_link || defaultSettings.map_link;
  const mapEmbed = $('#map-embed'); if (mapEmbed) mapEmbed.src = siteSettings.map_embed || defaultSettings.map_embed;
  const floater = $('#floating-call'); if (floater) floater.href = makeTel(siteSettings.hotline);
  const zalo = $('#floating-zalo'); if (zalo) zalo.href = siteSettings.zalo_link || defaultSettings.zalo_link;
  [['#footer-tiktok', siteSettings.tiktok_link], ['#footer-youtube', siteSettings.youtube_link]].forEach(([selector, url]) => { const node = $(selector); if (!node) return; node.hidden = !url; if (url) node.href = url; });
  const hero = $('#hero-bg');
  if (hero && siteSettings.hero_image) hero.style.backgroundImage = `linear-gradient(110deg,rgba(20,9,10,.92),rgba(20,9,10,.72) 45%,rgba(20,9,10,.22)),url("${String(siteSettings.hero_image).replace(/"/g, '%22')}")`;
}
async function loadSettings() { try { const response = await fetch('/api/settings'); if (!response.ok) throw new Error(); const data = await response.json(); applySettings(data.settings || {}); } catch { applySettings(); } }

function bikeMeta(bike) { const parts = []; if (bike.year) parts.push(bike.year); if (bike.mileage || bike.mileage === 0) parts.push(bike.mileage === 0 ? 'Xe mới' : `${new Intl.NumberFormat('vi-VN').format(bike.mileage)} km`); if (bike.color) parts.push(bike.color); return parts.slice(0, 2).join(' • ') || 'Liên hệ showroom'; }
function financeInfo(bike) { const lines = []; if (Number(bike.installment_from) > 0) lines.push(`<span>Trả góp từ <b>${escapeHtml(compactMoney(bike.installment_from))}</b></span>`); if (Number(bike.bad_debt_down_payment) > 0) lines.push(`<span>Nợ xấu trả trước từ <b>${escapeHtml(compactMoney(bike.bad_debt_down_payment))}</b></span>`); return lines.length ? `<div class="bike-finance">${lines.join('')}</div>` : '<div class="bike-finance"><span>Liên hệ để nhận phương án trả góp phù hợp</span></div>'; }
function foldText(value = '') { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim(); }
function editDistance(a, b) { const rows = Array.from({ length: a.length + 1 }, (_, index) => index); for (let j = 1; j <= b.length; j++) { let previous = rows[0]; rows[0] = j; for (let i = 1; i <= a.length; i++) { const current = rows[i]; rows[i] = Math.min(rows[i] + 1, rows[i - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; } } return rows[a.length]; }
function smartTokens(query) { const aliases = { ab: 'air blade', shm: 'sh mode', vison: 'vision', visoin: 'vision', arblade: 'air blade' }; const normal = foldText(query).split(' ').filter(Boolean).map(word => aliases[word] || word).join(' '); return normal.split(' ').filter(Boolean); }
function matchesSmart(bike, query) {
  const tokens = smartTokens(query); if (!tokens.length) return true;
  const haystack = foldText([bike.name, bike.brand, bike.color, bike.engine, bike.category === 'new' ? 'xe moi' : 'xe cu', statusText[bike.status], bike.description].filter(Boolean).join(' '));
  if (haystack.includes(tokens.join(' '))) return true;
  const words = haystack.split(' ');
  return tokens.every(token => words.some(word => word.includes(token) || token.includes(word) || (token.length >= 4 && editDistance(token, word) <= (token.length > 6 ? 2 : 1))));
}
function filteredBikes() { return bikes.filter(bike => { const byFilter = activeFilter === 'all' || (activeFilter === 'new' || activeFilter === 'used' ? bike.category === activeFilter : bike.status === activeFilter); return byFilter && matchesSmart(bike, searchQuery); }); }
function renderBikeCarousel() {
  const grid = $('#bike-grid'); if (!grid) return; const filtered = filteredBikes();
  const count = $('#bike-count'); if (count) count.textContent = `${filtered.length} xe`;
  setText('#active-filter-label', searchQuery ? `Kết quả: “${searchQuery}”` : (filterText[activeFilter] || 'Tất cả xe'));
  const clear = $('#clear-search'); if (clear) clear.hidden = !searchQuery;
  if (!filtered.length) { grid.innerHTML = '<div class="loading-card">Chưa tìm thấy xe phù hợp. Hãy thử tên ngắn hơn hoặc gọi Tâm An để kiểm tra kho xe.</div>'; return; }
  grid.innerHTML = filtered.map(bike => {
    const photo = bike.images?.[0]; const msrp = bike.msrp && Number(bike.msrp) > Number(bike.price) ? `<del>${currency(bike.msrp)}</del>` : '';
    return `<button class="bike-card" type="button" data-bike-id="${escapeHtml(bike.id)}" aria-label="Xem thông tin ${escapeHtml(bike.name)}">
      <span class="status-badge ${escapeHtml(bike.status)}">${statusText[bike.status] || 'Cập nhật'}</span>
      <div class="bike-image">${photo ? `<img loading="lazy" src="${escapeHtml(photo)}" alt="${escapeHtml(bike.name)}" />` : ''}</div>
      <div class="bike-content"><div class="bike-meta"><span>${categoryText[bike.category] || 'Xe máy'}</span><span>${escapeHtml(bikeMeta(bike))}</span></div><h3 class="bike-name">${escapeHtml(bike.name)}</h3>${financeInfo(bike)}<div class="price-row"><div><strong>${currency(bike.price)}</strong>${msrp}</div><span class="view-bike">Xem xe →</span></div></div>
    </button>`;
  }).join('');
  $$('[data-bike-id]', grid).forEach(button => button.addEventListener('click', () => { const bike = bikes.find(item => String(item.id) === String(button.dataset.bikeId)); if (bike) openDetailModal(bike); }));
}
async function loadBikes() { try { const response = await fetch('/api/bikes'); if (!response.ok) throw new Error(); const data = await response.json(); bikes = data.bikes || []; } catch { bikes = fallbackBikes; } renderBikeCarousel(); }
function setFilter(filter) { activeFilter = filter || 'all'; renderBikeCarousel(); const target = $('#xe'); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function setupStoreControls() {
  $$('[data-filter-link]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); setFilter(link.dataset.filterLink); }));
  $('#bike-search')?.addEventListener('input', event => { searchQuery = event.target.value.trim(); renderBikeCarousel(); });
  $('#clear-search')?.addEventListener('click', () => { const search = $('#bike-search'); if (search) search.value = ''; searchQuery = ''; renderBikeCarousel(); search?.focus(); });
  $$('[data-carousel-scroll]').forEach(button => button.addEventListener('click', () => { const grid = $('#bike-grid'); if (!grid) return; grid.scrollBy({ left: (button.dataset.carouselScroll === 'next' ? 1 : -1) * grid.clientWidth * .84, behavior: 'smooth' }); }));
}
function setupMobileMenu() { const button = $('[data-menu-toggle]'); const nav = $('#main-nav'); if (!button || !nav) return; button.addEventListener('click', () => nav.classList.toggle('open')); $$('#main-nav a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open'))); }

function detailSpecs(bike) { const items = [['Hãng', bike.brand], ['Năm sản xuất', bike.year], ['Dung tích máy', bike.engine], ['Màu xe', bike.color], ['Odo', bike.mileage === 0 ? 'Xe mới' : bike.mileage ? `${new Intl.NumberFormat('vi-VN').format(bike.mileage)} km` : 'Đang cập nhật'], ['Giấy tờ', bike.documents || 'Liên hệ']]; return items.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => `<div class="detail-spec"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join(''); }
function openDetailModal(bike) {
  const modal = $('#detail-modal'); const content = $('#detail-content'); if (!modal || !content) return;
  const photo = bike.images?.[0] || '/assets/vision-red-bike.jpg'; const msrp = bike.msrp && Number(bike.msrp) > Number(bike.price) ? `<del>Giá niêm yết: ${currency(bike.msrp)}</del>` : '';
  content.innerHTML = `<div class="detail-layout"><div class="detail-gallery"><img src="${escapeHtml(photo)}" alt="${escapeHtml(bike.name)}" /></div><div class="detail-info"><span class="status-badge ${escapeHtml(bike.status)}">${statusText[bike.status] || 'Cập nhật'}</span><div class="bike-meta"><span>${categoryText[bike.category] || 'Xe máy'}</span><span>${escapeHtml(bikeMeta(bike))}</span></div><h2 id="detail-modal-title">${escapeHtml(bike.name)}</h2><div class="detail-price">${currency(bike.price)}${msrp}</div>${financeInfo(bike)}<div class="detail-specs">${detailSpecs(bike)}</div><p class="detail-description">${escapeHtml(bike.description || 'Liên hệ Tâm An để nhận thông tin xe, màu và ưu đãi đang áp dụng.').replace(/\n/g, '<br />')}</p><form class="lead-form detail-form" id="detail-form" data-lead-type="order"><h3>Để lại thông tin để tư vấn</h3><p class="form-lead-text">Tâm An sẽ gọi xác nhận tình trạng xe và tư vấn chi tiết.</p><div class="detail-form-grid"><label>Họ và tên*<input name="name" required placeholder="Nhập họ và tên" /></label><label>Số điện thoại*<input name="phone" required inputmode="tel" placeholder="Nhập số điện thoại" /></label><label class="full-span">Mẫu xe quan tâm<input name="bike_name" readonly value="${escapeHtml(bike.name)}" /></label><label class="full-span">Nội dung cần tư vấn<textarea name="note" rows="3" placeholder="Màu xe, thời gian nhận xe, trả góp..."></textarea></label></div><button class="button button-primary" type="submit">Gửi yêu cầu tư vấn <span>→</span></button><p class="form-message" data-lead-message></p></form></div></div>`;
  modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
  $('#detail-form', content)?.addEventListener('submit', submitLeadForm);
}
function closeDetailModal() { const modal = $('#detail-modal'); if (!modal) return; modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); }
async function submitLeadForm(event) {
  event.preventDefault(); const form = event.currentTarget; const message = $('[data-lead-message]', form); const button = $('button[type="submit"]', form); const payload = Object.fromEntries(new FormData(form).entries()); payload.type = form.dataset.leadType || 'consultation';
  button.disabled = true; button.textContent = 'Đang gửi...'; if (message) message.textContent = '';
  try { const response = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không gửi được yêu cầu.'); form.reset(); if (message) message.textContent = data.email_sent ? 'Đã gửi yêu cầu. Tâm An sẽ liên hệ sớm.' : 'Đã nhận yêu cầu. Tâm An sẽ liên hệ sớm.'; } catch (error) { if (message) message.textContent = error.message; } finally { button.disabled = false; button.innerHTML = payload.type === 'finance' ? 'Nhận tư vấn trả góp <span>→</span>' : 'Gửi yêu cầu tư vấn <span>→</span>'; }
}
function setupLeadForms() { $('#finance-form')?.addEventListener('submit', submitLeadForm); $$('[data-detail-close]').forEach(button => button.addEventListener('click', closeDetailModal)); document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetailModal(); }); }

function closeBikeModal() { const modal = $('#bike-modal'); if (!modal) return; modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); }
function openBikeModal(bike = null) {
  currentEditingId = bike?.id || null; editingImages = [...(bike?.images || [])]; const modal = $('#bike-modal'); const form = $('#bike-form'); if (!modal || !form) return;
  form.reset(); $('#modal-title').textContent = bike ? `Sửa ${bike.name}` : 'Thêm xe mới';
  const values = bike || { brand: 'Honda', category: 'new', status: 'in_stock', sort_order: 0 }; Object.entries(values).forEach(([key, value]) => { if (form.elements[key] && key !== 'featured') form.elements[key].value = value ?? ''; }); form.elements.featured.checked = Boolean(values.featured); renderImagePreview(); $('#bike-message').textContent = ''; modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
}
function renderImagePreview() { const target = $('#image-preview'); if (!target) return; target.innerHTML = editingImages.map((src, index) => `<figure><img src="${escapeHtml(src)}" alt="Ảnh xe ${index + 1}" /><button type="button" data-remove-image="${index}" aria-label="Xóa ảnh">×</button></figure>`).join(''); $$('[data-remove-image]', target).forEach(button => button.addEventListener('click', () => { editingImages.splice(Number(button.dataset.removeImage), 1); renderImagePreview(); })); }
async function uploadOneFile(file) { if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} lớn hơn 8MB.`); const response = await fetch('/api/admin/upload', { method: 'POST', headers: { 'content-type': file.type, 'x-file-name': encodeURIComponent(file.name) }, body: file }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải ảnh.'); return data.url; }
async function uploadFiles(files) { const message = $('#bike-message'); for (const file of [...files]) { message.textContent = `Đang tải ${file.name}...`; editingImages.push(await uploadOneFile(file)); } message.textContent = ''; renderImagePreview(); }
function formToBike(form) { return { name: formValue(form, 'name'), brand: formValue(form, 'brand'), category: formValue(form, 'category'), status: formValue(form, 'status'), price: formValue(form, 'price'), msrp: formValue(form, 'msrp'), year: formValue(form, 'year'), mileage: formValue(form, 'mileage'), engine: formValue(form, 'engine'), color: formValue(form, 'color'), installment_from: formValue(form, 'installment_from'), bad_debt_down_payment: formValue(form, 'bad_debt_down_payment'), documents: formValue(form, 'documents'), sort_order: formValue(form, 'sort_order'), description: formValue(form, 'description'), featured: form.elements.featured.checked, images: editingImages }; }
function renderAdmin(list) { adminBikes = list; const stats = [['Tổng xe', list.length], ['Đang có sẵn', list.filter(b => b.status === 'in_stock').length], ['Xe sắp về', list.filter(b => b.status === 'incoming').length], ['Đã bán', list.filter(b => b.status === 'sold').length]]; $('#admin-stats').innerHTML = stats.map(([label, count]) => `<article class="stat-card"><span>${label}</span><strong>${count}</strong></article>`).join(''); $('#admin-bikes').innerHTML = list.map(bike => `<tr><td><span class="admin-bike-name">${escapeHtml(bike.name)}</span><span class="admin-bike-sub">${escapeHtml(bike.brand || '')} • ${bike.year || '—'}</span></td><td>${categoryText[bike.category] || '—'}</td><td class="table-price">${currency(bike.price)}</td><td><span class="mini-status ${escapeHtml(bike.status)}">${statusText[bike.status] || '—'}</span></td><td class="admin-bike-sub">${bike.updated_at ? new Date(`${bike.updated_at}Z`).toLocaleDateString('vi-VN') : '—'}</td><td><button class="table-action" data-edit-bike="${bike.id}">Sửa</button></td></tr>`).join('') || '<tr><td colspan="6">Chưa có xe. Bấm “Thêm xe” để bắt đầu.</td></tr>'; $$('[data-edit-bike]').forEach(button => button.addEventListener('click', () => { const bike = adminBikes.find(item => String(item.id) === String(button.dataset.editBike)); if (bike) openBikeModal(bike); })); }
async function loadAdminBikes() { const response = await fetch('/api/admin/bikes'); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải kho xe.'); renderAdmin(data.bikes || []); }
function populateSettingsForm(settings) { const form = $('#settings-form'); if (!form) return; Object.entries({ ...defaultSettings, ...settings }).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; }); }
async function loadAdminSettings() { const response = await fetch('/api/admin/settings'); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải nội dung website.'); applySettings(data.settings || {}); populateSettingsForm(data.settings || {}); }
async function loadLeads() { const tbody = $('#admin-leads'); const response = await fetch('/api/admin/leads'); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải danh sách khách.'); tbody.innerHTML = (data.leads || []).map(lead => `<tr><td><span class="admin-bike-name">${escapeHtml(lead.name)}</span><span class="admin-bike-sub">${escapeHtml(lead.phone)}${lead.note ? ` • ${escapeHtml(lead.note).slice(0, 65)}` : ''}</span></td><td>${lead.type === 'finance' ? 'Trả góp' : lead.type === 'order' ? 'Tư vấn xe' : 'Tư vấn'}</td><td>${escapeHtml(lead.bike_name || '—')}${lead.down_payment ? `<br><span class="admin-bike-sub">Trả trước: ${escapeHtml(lead.down_payment)}</span>` : ''}</td><td class="admin-bike-sub">${lead.created_at ? new Date(`${lead.created_at}Z`).toLocaleString('vi-VN') : '—'}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có yêu cầu nào.</td></tr>'; }
function changeAdminView(view) { $$('.admin-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.adminView === view)); $$('[data-admin-panel]').forEach(panel => panel.hidden = panel.dataset.adminPanel !== view); if (view === 'leads') loadLeads().catch(error => { $('#admin-leads').innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`; }); }
async function initializeAdmin() { const login = $('#login-card'); const dashboard = $('#admin-dashboard'); try { const response = await fetch('/api/auth/me'); const data = await response.json(); if (data.authenticated) { login.hidden = true; dashboard.hidden = false; await Promise.all([loadAdminBikes(), loadAdminSettings()]); } else { login.hidden = false; dashboard.hidden = true; } } catch { $('#login-message').textContent = 'Không thể kết nối máy chủ. Thử lại sau.'; } }
function setupAdmin() {
  $('#login-form')?.addEventListener('submit', async event => { event.preventDefault(); const message = $('#login-message'); const button = $('button[type="submit"]', event.currentTarget); button.disabled = true; button.textContent = 'Đang kiểm tra...'; message.textContent = ''; try { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('#admin-password').value }) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể đăng nhập.'); $('#admin-password').value = ''; await initializeAdmin(); } catch (error) { message.textContent = error.message; } finally { button.disabled = false; button.innerHTML = 'Đăng nhập <span>→</span>'; } });
  $('#logout-button')?.addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); await initializeAdmin(); });
  $('#add-bike-button')?.addEventListener('click', () => openBikeModal());
  $$('[data-modal-close]').forEach(button => button.addEventListener('click', closeBikeModal));
  $$('.admin-tab').forEach(tab => tab.addEventListener('click', () => changeAdminView(tab.dataset.adminView)));
  $('#refresh-leads')?.addEventListener('click', () => loadLeads());
  $('#image-input')?.addEventListener('change', async event => { if (!event.target.files?.length) return; try { await uploadFiles(event.target.files); } catch (error) { $('#bike-message').textContent = error.message; } event.target.value = ''; });
  $('#settings-image-input')?.addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; const message = $('#settings-message'); try { message.textContent = 'Đang tải ảnh...'; const url = await uploadOneFile(file); $('#settings-form').elements.hero_image.value = url; message.textContent = 'Đã tải ảnh nền. Bấm “Lưu thay đổi website”.'; } catch (error) { message.textContent = error.message; } event.target.value = ''; });
  $('#settings-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const message = $('#settings-message'); const button = $('button[type="submit"]', form); const payload = Object.fromEntries(new FormData(form).entries()); button.disabled = true; button.textContent = 'Đang lưu...'; message.textContent = ''; try { const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể lưu thay đổi.'); applySettings(data.settings || payload); message.textContent = 'Đã lưu. Website đã cập nhật.'; } catch (error) { message.textContent = error.message; } finally { button.disabled = false; button.innerHTML = 'Lưu thay đổi website <span>→</span>'; } });
  $('#bike-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const message = $('#bike-message'); const submit = $('button[type="submit"]', form); submit.disabled = true; submit.textContent = 'Đang lưu...'; message.textContent = ''; try { const payload = formToBike(form); const endpoint = currentEditingId ? `/api/admin/bikes/${currentEditingId}` : '/api/admin/bikes'; const response = await fetch(endpoint, { method: currentEditingId ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể lưu xe.'); closeBikeModal(); await Promise.all([loadAdminBikes(), loadBikes()]); } catch (error) { message.textContent = error.message; } finally { submit.disabled = false; submit.innerHTML = 'Lưu xe <span>→</span>'; } });
  initializeAdmin();
}

function initializeStorefront() { $('#storefront').hidden = false; $('#finance-page').hidden = true; $('#admin-shell').hidden = true; setupStoreControls(); setupMobileMenu(); setupLeadForms(); loadBikes(); }
function initializeFinance() { $('#storefront').hidden = true; $('#finance-page').hidden = false; $('#admin-shell').hidden = true; setupMobileMenu(); setupLeadForms(); }
async function boot() { $('#year-now').textContent = new Date().getFullYear(); const path = location.pathname.replace(/\/$/, '') || '/'; if (path === '/admin') { $('#storefront').hidden = true; $('#finance-page').hidden = true; $('#admin-shell').hidden = false; $('.topline').hidden = true; $('.site-header').hidden = true; $('.site-footer').hidden = true; $('.floating-contact').hidden = true; setupAdmin(); return; } await loadSettings(); if (path === '/tra-gop') initializeFinance(); else initializeStorefront(); }
boot();

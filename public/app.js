const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const statusText = { in_stock: 'Còn hàng', incoming: 'Sắp về', sold: 'Đã bán', reserved: 'Đang giữ xe' };
const categoryText = { new: 'Xe mới', used: 'Xe cũ' };
const defaultSettings = {
  store_name: 'TÂM AN', store_location: 'NOMURA • HẢI PHÒNG', hotline: '0856 262 886',
  zalo_link: 'https://zalo.me/0856262886', contact_email: '',
  address: 'Cổng phụ KCN Nomura, Hải Phòng',
  map_link: 'https://maps.google.com/?q=Cổng+phụ+KCN+Nomura+Hải+Phòng',
  map_embed: 'https://www.google.com/maps?q=C%E1%BB%95ng%20ph%E1%BB%A5%20KCN%20Nomura%20H%E1%BA%A3i%20Ph%C3%B2ng&output=embed',
  primary_color: '#b80f19', paper_color: '#f8f6f5', dark_color: '#1b1112', font_family: 'Be Vietnam Pro',
  topline: 'TRẢ GÓP LINH HOẠT • HỒ SƠ NHANH • XE MỚI VÀ XE CŨ TUYỂN CHỌN',
  hero_eyebrow: 'Xe máy Tâm An Nomura', hero_title: 'Chọn xe ưng ý.', hero_highlight: 'Lên đường an tâm.',
  hero_description: 'Xe mới chính hãng, xe cũ tuyển chọn. Hỗ trợ trả góp nhanh, thủ tục rõ ràng và chăm sóc tận tâm tại Hải Phòng.',
  hero_image: '', inventory_eyebrow: 'Kho xe Tâm An', inventory_title: 'Xe đang chờ bạn cầm lái.',
  inventory_description: 'Thông tin xe, giá và trạng thái được cập nhật trực tiếp từ showroom.',
  cta_eyebrow: 'TÂM AN NOMURA', cta_title: 'Xe đã chọn xong.\nChỉ còn cuộc gọi của bạn.'
};
const fallbackBikes = [
  { id: 'demo-1', name: 'Honda Vision 2026', brand: 'Honda', category: 'new', price: 35900000, msrp: 38900000, year: 2026, mileage: 0, color: 'Đỏ đô', status: 'in_stock', installment_from: 5000000, bad_debt_down_payment: 12000000, images: ['/assets/vision-red-bike.jpg'], featured: true },
  { id: 'demo-2', name: 'Honda Air Blade 160', brand: 'Honda', category: 'new', price: 56500000, year: 2026, mileage: 0, color: 'Đen nhám', status: 'incoming', installment_from: 9000000, images: ['/assets/vision-promo.jpg'], featured: true },
  { id: 'demo-3', name: 'Honda SH Mode 2023', brand: 'Honda', category: 'used', price: 53500000, year: 2023, mileage: 8200, color: 'Trắng ngọc trai', status: 'in_stock', installment_from: 8000000, bad_debt_down_payment: 15000000, images: ['/assets/vision-red-bike.jpg'], featured: false }
];

let siteSettings = { ...defaultSettings };
let bikes = [];
let adminBikes = [];
let activeFilter = 'all';
let editingImages = [];
let currentEditingId = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
function currency(value) {
  if (value === null || value === undefined || value === '') return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value));
}
function compactMoney(value) {
  const numeric = Number(value || 0);
  if (!numeric) return '';
  if (numeric >= 1000000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(numeric / 1000000)} triệu`;
  return currency(numeric);
}
function makeTel(number) { return `tel:${String(number || '').replace(/[^0-9+]/g, '')}`; }
function lineBreak(value) { return escapeHtml(value || '').replace(/\n/g, '<br />'); }
function formValue(form, name) { return form.elements[name]?.value ?? ''; }

function applySettings(raw = {}) {
  siteSettings = { ...defaultSettings, ...raw };
  const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value || ''; };
  document.documentElement.style.setProperty('--red', siteSettings.primary_color || defaultSettings.primary_color);
  document.documentElement.style.setProperty('--red-dark', siteSettings.primary_color || defaultSettings.primary_color);
  document.documentElement.style.setProperty('--paper', siteSettings.paper_color || defaultSettings.paper_color);
  document.documentElement.style.setProperty('--dark', siteSettings.dark_color || defaultSettings.dark_color);
  document.documentElement.style.setProperty('--font', `"${siteSettings.font_family || defaultSettings.font_family}", ui-sans-serif, system-ui, sans-serif`);
  setText('#topline-text', siteSettings.topline);
  setText('#brand-name', siteSettings.store_name);
  setText('#brand-location', siteSettings.store_location);
  setText('#hero-eyebrow', siteSettings.hero_eyebrow);
  setText('#hero-title', siteSettings.hero_title);
  setText('#hero-highlight', siteSettings.hero_highlight);
  setText('#hero-description', siteSettings.hero_description);
  setText('#inventory-eyebrow', siteSettings.inventory_eyebrow);
  const inventoryTitle = $('#inventory-title');
  if (inventoryTitle) inventoryTitle.innerHTML = lineBreak(siteSettings.inventory_title).replace(/(bạn cầm lái\.)/i, '<em>$1</em>');
  setText('#inventory-description', siteSettings.inventory_description);
  setText('#cta-eyebrow', siteSettings.cta_eyebrow);
  const ctaTitle = $('#cta-title');
  if (ctaTitle) {
    const lines = String(siteSettings.cta_title || '').split('\n');
    ctaTitle.innerHTML = `${escapeHtml(lines[0] || '')}${lines[1] ? `<br /><em>${escapeHtml(lines.slice(1).join(' '))}</em>` : ''}`;
  }
  const address = String(siteSettings.address || '').replace(/,\s*/g, ',\n');
  const addressNode = $('#showroom-address');
  if (addressNode) addressNode.innerHTML = lineBreak(address);
  ['#header-phone', '#showroom-phone', '#cta-phone'].forEach(selector => {
    const node = $(selector); if (!node) return;
    node.textContent = siteSettings.hotline || defaultSettings.hotline;
    node.href = makeTel(siteSettings.hotline);
  });
  const map = $('#map-link'); if (map) map.href = siteSettings.map_link || defaultSettings.map_link;
  const mapEmbed = $('#map-embed'); if (mapEmbed && siteSettings.map_embed) mapEmbed.src = siteSettings.map_embed;
  const floater = $('#floating-call'); if (floater) floater.href = makeTel(siteSettings.hotline);
  const zalo = $('#floating-zalo'); if (zalo) zalo.href = siteSettings.zalo_link || defaultSettings.zalo_link;
  const hero = $('#hero-bg');
  if (hero && siteSettings.hero_image) {
    hero.style.backgroundImage = `linear-gradient(90deg, rgba(25,10,12,.95) 0%, rgba(25,10,12,.79) 44%, rgba(25,10,12,.2) 100%), url("${String(siteSettings.hero_image).replace(/"/g, '%22')}")`;
  }
}

async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error();
    const data = await response.json();
    applySettings(data.settings || {});
  } catch { applySettings(); }
}

function bikeMeta(bike) {
  const parts = [];
  if (bike.year) parts.push(bike.year);
  if (bike.mileage || bike.mileage === 0) parts.push(bike.mileage === 0 ? 'Xe mới' : `${new Intl.NumberFormat('vi-VN').format(bike.mileage)} km`);
  if (bike.color) parts.push(bike.color);
  return parts.slice(0, 2).join(' • ') || 'Liên hệ showroom';
}
function financeInfo(bike) {
  const lines = [];
  if (Number(bike.installment_from) > 0) lines.push(`<span>Trả góp từ <b>${escapeHtml(compactMoney(bike.installment_from))}</b></span>`);
  if (Number(bike.bad_debt_down_payment) > 0) lines.push(`<span>Nợ xấu trả trước từ <b>${escapeHtml(compactMoney(bike.bad_debt_down_payment))}</b></span>`);
  return lines.length ? `<div class="bike-finance">${lines.join('')}</div>` : '';
}
function renderBikeGrid() {
  const grid = $('#bike-grid');
  if (!grid) return;
  const filtered = bikes.filter(bike => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'new' || activeFilter === 'used') return bike.category === activeFilter;
    return bike.status === activeFilter;
  });
  const count = $('#bike-count'); if (count) count.textContent = `${filtered.length} xe hiển thị`;
  if (!filtered.length) {
    grid.innerHTML = '<div class="loading-card">Chưa có xe phù hợp. Gọi Tâm An để kiểm tra kho xe mới nhất.</div>';
    return;
  }
  grid.innerHTML = filtered.map(bike => {
    const photo = bike.images?.[0];
    const photoMarkup = photo ? `<img loading="lazy" src="${escapeHtml(photo)}" alt="${escapeHtml(bike.name)}" />` : '';
    const msrp = bike.msrp && Number(bike.msrp) > Number(bike.price) ? `<del>${currency(bike.msrp)}</del>` : '';
    return `<article class="bike-card">
      <span class="status-badge ${escapeHtml(bike.status)}">${statusText[bike.status] || 'Cập nhật'}</span>
      <a class="bike-image ${photo ? '' : 'placeholder'}" href="#contact" aria-label="Hỏi về ${escapeHtml(bike.name)}">${photoMarkup}</a>
      <div class="bike-content">
        <div class="bike-meta"><span>${categoryText[bike.category] || 'Xe máy'}</span><span>${escapeHtml(bikeMeta(bike))}</span></div>
        <h3 class="bike-name">${escapeHtml(bike.name)}</h3>
        ${financeInfo(bike)}
        <div class="price-row"><div><strong>${currency(bike.price)}</strong>${msrp}</div><a class="bike-arrow" href="tel:${escapeHtml(siteSettings.hotline)}" aria-label="Gọi hỏi về ${escapeHtml(bike.name)}">☎</a></div>
        <div class="bike-actions"><button class="button button-primary" type="button" data-order-bike="${escapeHtml(bike.name)}">Đặt xe / giữ xe</button><a class="bike-arrow" href="/tra-gop" aria-label="Tư vấn trả góp ${escapeHtml(bike.name)}">₫</a></div>
      </div>
    </article>`;
  }).join('');
  $$('[data-order-bike]', grid).forEach(button => button.addEventListener('click', () => openLeadModal(button.dataset.orderBike)));
}
async function loadBikes() {
  try {
    const response = await fetch('/api/bikes', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error();
    const data = await response.json();
    bikes = data.bikes || [];
  } catch { bikes = fallbackBikes; }
  renderBikeGrid();
}
function setFilter(filter) {
  activeFilter = filter || 'all';
  $$('.filter-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === activeFilter));
  renderBikeGrid();
}
function setupFilters() {
  $$('.filter-tab').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  $$('[data-filter-link]').forEach(link => link.addEventListener('click', event => {
    if (location.pathname !== '/' && location.pathname !== '') return;
    event.preventDefault();
    setFilter(link.dataset.filterLink);
    $('#xe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}
function setupMobileMenu() {
  const toggle = $('[data-menu-toggle]'); const nav = $('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => { nav.classList.toggle('mobile-open'); $('.site-header')?.classList.toggle('menu-open'); });
  $$('a', nav).forEach(link => link.addEventListener('click', () => { nav.classList.remove('mobile-open'); $('.site-header')?.classList.remove('menu-open'); }));
}
function openLeadModal(name = '') {
  const modal = $('#lead-modal');
  $('#order-bike-name').value = name;
  modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  setTimeout(() => $('[name="name"]', $('#order-form'))?.focus(), 30);
}
function closeLeadModal() { const modal = $('#lead-modal'); modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

async function submitLead(form) {
  const message = $('[data-lead-message]', form);
  const button = $('button[type="submit"]', form);
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.type = form.dataset.leadType || 'consultation';
  message.textContent = ''; button.disabled = true; button.textContent = 'Đang gửi...';
  try {
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể gửi yêu cầu.');
    form.reset();
    message.textContent = 'Đã gửi! Tâm An sẽ liên hệ lại sớm nhất.';
    if (form.id === 'order-form') setTimeout(closeLeadModal, 1000);
  } catch (error) { message.textContent = error.message || 'Không thể gửi yêu cầu.'; }
  finally { button.disabled = false; button.innerHTML = form.dataset.leadType === 'finance' ? 'Nhận tư vấn trả góp <span>→</span>' : (form.dataset.leadType === 'order' ? 'Gửi yêu cầu đặt xe <span>→</span>' : 'Gửi yêu cầu <span>→</span>'); }
}
function setupLeadForms() {
  $$('form[data-lead-type]').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); submitLead(form); }));
  $$('[data-lead-modal-close]').forEach(button => button.addEventListener('click', closeLeadModal));
}

function populateBikeForm(bike = null) {
  const form = $('#bike-form'); currentEditingId = bike?.id || null; form.reset();
  form.elements.id.value = bike?.id || '';
  const fields = ['name','brand','category','status','price','msrp','year','mileage','engine','color','installment_from','bad_debt_down_payment','documents','sort_order','description'];
  fields.forEach(field => { if (bike && form.elements[field]) form.elements[field].value = bike[field] ?? ''; });
  form.elements.category.value = bike?.category || 'new'; form.elements.status.value = bike?.status || 'in_stock'; form.elements.featured.checked = Boolean(bike?.featured);
  editingImages = [...(bike?.images || [])]; $('#modal-title').textContent = bike ? `Sửa: ${bike.name}` : 'Thêm xe mới'; $('#bike-message').textContent = ''; renderImagePreview();
}
function openBikeModal(bike = null) { populateBikeForm(bike); const modal = $('#bike-modal'); modal.hidden = false; modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; setTimeout(()=> $('[name="name"]', $('#bike-form'))?.focus(), 30); }
function closeBikeModal() { const modal=$('#bike-modal'); modal.hidden=true; modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
function renderImagePreview() { const target=$('#image-preview'); target.innerHTML=editingImages.map((src,index)=>`<figure><img src="${escapeHtml(src)}" alt="Ảnh xe ${index+1}"/><button type="button" data-remove-image="${index}" aria-label="Xoá ảnh">×</button></figure>`).join(''); $$('[data-remove-image]',target).forEach(button=>button.addEventListener('click',()=>{ editingImages.splice(Number(button.dataset.removeImage),1); renderImagePreview(); })); }
async function uploadOneFile(file) {
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} lớn hơn 8MB.`);
  const response = await fetch('/api/admin/upload', { method: 'POST', headers: { 'content-type': file.type, 'x-file-name': encodeURIComponent(file.name) }, body: file });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải ảnh.');
  return data.url;
}
async function uploadFiles(files) { const message=$('#bike-message'); for (const file of [...files]) { message.textContent=`Đang tải ${file.name}...`; editingImages.push(await uploadOneFile(file)); } message.textContent=''; renderImagePreview(); }
function formToBike(form) { return { name:formValue(form,'name'), brand:formValue(form,'brand'), category:formValue(form,'category'), status:formValue(form,'status'), price:formValue(form,'price'), msrp:formValue(form,'msrp'), year:formValue(form,'year'), mileage:formValue(form,'mileage'), engine:formValue(form,'engine'), color:formValue(form,'color'), installment_from:formValue(form,'installment_from'), bad_debt_down_payment:formValue(form,'bad_debt_down_payment'), documents:formValue(form,'documents'), sort_order:formValue(form,'sort_order'), description:formValue(form,'description'), featured:form.elements.featured.checked, images:editingImages }; }

function renderAdmin(list) {
  adminBikes = list;
  const stats = [['Tổng xe',list.length],['Đang có sẵn',list.filter(b=>b.status==='in_stock').length],['Xe sắp về',list.filter(b=>b.status==='incoming').length],['Đã bán',list.filter(b=>b.status==='sold').length]];
  $('#admin-stats').innerHTML = stats.map(([label,count])=>`<article class="stat-card"><span>${label}</span><strong>${count}</strong></article>`).join('');
  $('#admin-bikes').innerHTML = list.map(bike=>`<tr><td><span class="admin-bike-name">${escapeHtml(bike.name)}</span><span class="admin-bike-sub">${escapeHtml(bike.brand||'')} • ${bike.year||'—'}</span></td><td>${categoryText[bike.category]||'—'}</td><td class="table-price">${currency(bike.price)}</td><td><span class="mini-status ${escapeHtml(bike.status)}">${statusText[bike.status]||'—'}</span></td><td class="admin-bike-sub">${bike.updated_at ? new Date(`${bike.updated_at}Z`).toLocaleDateString('vi-VN') : '—'}</td><td><button class="table-action" data-edit-bike="${bike.id}">Sửa</button></td></tr>`).join('') || '<tr><td colspan="6">Chưa có xe. Bấm “Thêm xe” để bắt đầu.</td></tr>';
  $$('[data-edit-bike]').forEach(button=>button.addEventListener('click',()=>{ const bike=adminBikes.find(item=>Number(item.id)===Number(button.dataset.editBike)); if(bike) openBikeModal(bike); }));
}
async function loadAdminBikes() { const response=await fetch('/api/admin/bikes'); const data=await response.json(); if(!response.ok||!data.ok) throw new Error(data.error||'Không thể tải kho xe.'); renderAdmin(data.bikes||[]); }
function populateSettingsForm(settings) { const form=$('#settings-form'); if(!form) return; Object.entries({ ...defaultSettings, ...settings }).forEach(([key,value])=> { if(form.elements[key]) form.elements[key].value=value ?? ''; }); }
async function loadAdminSettings() { const response=await fetch('/api/admin/settings'); const data=await response.json(); if(!response.ok||!data.ok) throw new Error(data.error||'Không thể tải nội dung website.'); applySettings(data.settings||{}); populateSettingsForm(data.settings||{}); }
async function loadLeads() { const tbody=$('#admin-leads'); const response=await fetch('/api/admin/leads'); const data=await response.json(); if(!response.ok||!data.ok) throw new Error(data.error||'Không thể tải danh sách khách.'); tbody.innerHTML=(data.leads||[]).map(lead=>`<tr><td><span class="admin-bike-name">${escapeHtml(lead.name)}</span><span class="admin-bike-sub">${escapeHtml(lead.phone)}${lead.note?` • ${escapeHtml(lead.note).slice(0,65)}`:''}</span></td><td>${lead.type==='finance'?'Trả góp':lead.type==='order'?'Đặt xe':'Tư vấn'}</td><td>${escapeHtml(lead.bike_name||'—')}${lead.down_payment?`<br><span class="admin-bike-sub">Trả trước: ${escapeHtml(lead.down_payment)}</span>`:''}</td><td class="admin-bike-sub">${lead.created_at?new Date(`${lead.created_at}Z`).toLocaleString('vi-VN'):'—'}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có yêu cầu nào.</td></tr>'; }
function changeAdminView(view) { $$('.admin-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.adminView===view)); $$('[data-admin-panel]').forEach(panel=>panel.hidden=panel.dataset.adminPanel!==view); if(view==='leads') loadLeads().catch(error=>{ $('#admin-leads').innerHTML=`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`; }); }
async function initializeAdmin() { const login=$('#login-card'); const dashboard=$('#admin-dashboard'); try { const response=await fetch('/api/auth/me'); const data=await response.json(); if(data.authenticated){ login.hidden=true; dashboard.hidden=false; await Promise.all([loadAdminBikes(),loadAdminSettings()]); }else{ login.hidden=false; dashboard.hidden=true; } } catch { $('#login-message').textContent='Không thể kết nối máy chủ. Thử lại sau.'; } }
function setupAdmin() {
  $('#login-form')?.addEventListener('submit', async event=>{ event.preventDefault(); const message=$('#login-message'); const button=$('button[type="submit"]',event.currentTarget); message.textContent=''; button.disabled=true; button.textContent='Đang kiểm tra...'; try { const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('#admin-password').value})}); const data=await response.json(); if(!response.ok||!data.ok) throw new Error(data.error||'Không thể đăng nhập.'); $('#admin-password').value=''; await initializeAdmin(); }catch(error){message.textContent=error.message;} finally{button.disabled=false;button.innerHTML='Đăng nhập <span>→</span>';}});
  $('#logout-button')?.addEventListener('click',async()=>{ await fetch('/api/auth/logout',{method:'POST'}); await initializeAdmin(); });
  $('#add-bike-button')?.addEventListener('click',()=>openBikeModal()); $$('[data-modal-close]').forEach(button=>button.addEventListener('click',closeBikeModal));
  $$('.admin-tab').forEach(tab=>tab.addEventListener('click',()=>changeAdminView(tab.dataset.adminView)));
  $('#refresh-leads')?.addEventListener('click',()=>loadLeads());
  $('#image-input')?.addEventListener('change',async event=>{if(!event.target.files?.length)return; try{await uploadFiles(event.target.files);}catch(error){$('#bike-message').textContent=error.message;}event.target.value='';});
  $('#settings-image-input')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return; const message=$('#settings-message'); try{message.textContent='Đang tải ảnh...'; const url=await uploadOneFile(file); $('#settings-form').elements.hero_image.value=url; message.textContent='Đã tải ảnh nền. Bấm “Lưu thay đổi website”.';}catch(error){message.textContent=error.message;}event.target.value='';});
  $('#settings-form')?.addEventListener('submit',async event=>{event.preventDefault(); const form=event.currentTarget;const message=$('#settings-message');const button=$('button[type="submit"]',form); const payload=Object.fromEntries(new FormData(form).entries());button.disabled=true;button.textContent='Đang lưu...';message.textContent='';try{const response=await fetch('/api/admin/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Không thể lưu thay đổi.');applySettings(data.settings||payload);message.textContent='Đã lưu. Website đã cập nhật.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;button.innerHTML='Lưu thay đổi website <span>→</span>';}});
  $('#bike-form')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const message=$('#bike-message');const submit=$('button[type="submit"]',form);submit.disabled=true;submit.textContent='Đang lưu...';message.textContent='';try{const payload=formToBike(form);const endpoint=currentEditingId?`/api/admin/bikes/${currentEditingId}`:'/api/admin/bikes';const response=await fetch(endpoint,{method:currentEditingId?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Không thể lưu xe.');closeBikeModal();await Promise.all([loadAdminBikes(),loadBikes()]);}catch(error){message.textContent=error.message;}finally{submit.disabled=false;submit.innerHTML='Lưu xe <span>→</span>';}});
  initializeAdmin();
}

function initializeStorefront() { $('#storefront').hidden=false; $('#finance-page').hidden=true; $('#admin-shell').hidden=true; setupFilters(); setupMobileMenu(); setupLeadForms(); loadBikes(); }
function initializeFinance() { $('#storefront').hidden=true; $('#finance-page').hidden=false; $('#admin-shell').hidden=true; document.body.classList.add('finance-route'); setupMobileMenu(); setupLeadForms(); }
async function boot() {
  $('#year-now').textContent=new Date().getFullYear();
  const path=location.pathname.replace(/\/$/,'') || '/';
  if(path==='/admin') { $('#storefront').hidden=true; $('#finance-page').hidden=true; $('#admin-shell').hidden=false; $('.topline').hidden=true; $('.site-header').hidden=true; $('.site-footer').hidden=true; $('.floating-contact').hidden=true; setupAdmin(); return; }
  await loadSettings();
  if(path==='/tra-gop') initializeFinance(); else initializeStorefront();
}
boot();

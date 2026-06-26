const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const statusText = {
  in_stock: 'Còn hàng',
  incoming: 'Sắp về',
  sold: 'Đã bán',
  reserved: 'Đang giữ xe'
};
const categoryText = { new: 'Xe mới', used: 'Xe cũ' };
const fallbackBikes = [
  { id: 'demo-1', name: 'Honda Vision 2026', brand: 'Honda', category: 'new', price: 35900000, msrp: 38900000, year: 2026, mileage: 0, color: 'Đỏ đô', status: 'in_stock', images: ['/assets/vision-red-bike.jpg'], featured: true },
  { id: 'demo-2', name: 'Honda Air Blade 160', brand: 'Honda', category: 'new', price: 56500000, year: 2026, mileage: 0, color: 'Đen nhám', status: 'incoming', images: ['/assets/vision-promo.jpg'], featured: true },
  { id: 'demo-3', name: 'Honda SH Mode 2023', brand: 'Honda', category: 'used', price: 53500000, year: 2023, mileage: 8200, color: 'Trắng ngọc trai', status: 'in_stock', images: ['/assets/vision-red-bike.jpg'], featured: false }
];

let bikes = [];
let activeFilter = 'all';
let editingImages = [];
let currentEditingId = null;

function currency(value) {
  if (!value && value !== 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function bikeMeta(bike) {
  const parts = [];
  if (bike.year) parts.push(bike.year);
  if (bike.mileage || bike.mileage === 0) parts.push(bike.mileage === 0 ? 'Xe mới' : `${new Intl.NumberFormat('vi-VN').format(bike.mileage)} km`);
  if (bike.color) parts.push(bike.color);
  return parts.slice(0, 2).join(' • ') || 'Liên hệ showroom';
}

function renderBikeGrid() {
  const grid = $('#bike-grid');
  const filtered = bikes.filter(bike => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'new' || activeFilter === 'used') return bike.category === activeFilter;
    return bike.status === activeFilter;
  });
  $('#bike-count').textContent = `${filtered.length} xe hiển thị`;

  if (!filtered.length) {
    grid.innerHTML = '<div class="loading-card">Chưa có xe phù hợp. Gọi Tâm An để kiểm tra kho xe mới nhất.</div>';
    return;
  }

  grid.innerHTML = filtered.map(bike => {
    const photo = bike.images?.[0];
    const photoMarkup = photo
      ? `<img loading="lazy" src="${escapeHtml(photo)}" alt="${escapeHtml(bike.name)}" />`
      : '';
    const msrp = bike.msrp && Number(bike.msrp) > Number(bike.price) ? `<del>${currency(bike.msrp)}</del>` : '';
    return `<article class="bike-card reveal visible">
      <span class="status-badge ${escapeHtml(bike.status)}">${statusText[bike.status] || 'Cập nhật'}</span>
      <a class="bike-image ${photo ? '' : 'placeholder'}" href="tel:0856262886" aria-label="Hỏi về ${escapeHtml(bike.name)}">${photoMarkup}</a>
      <div class="bike-content">
        <div class="bike-meta"><span>${categoryText[bike.category] || 'Xe máy'}</span><span>${escapeHtml(bikeMeta(bike))}</span></div>
        <h3 class="bike-name">${escapeHtml(bike.name)}</h3>
        <div class="price-row"><div><strong>${currency(bike.price)}</strong>${msrp}</div><a class="bike-arrow" href="tel:0856262886" aria-label="Gọi hỏi về ${escapeHtml(bike.name)}">→</a></div>
      </div>
    </article>`;
  }).join('');
}

async function loadBikes() {
  try {
    const response = await fetch('/api/bikes', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Lỗi tải dữ liệu');
    const data = await response.json();
    bikes = data.bikes || [];
  } catch (error) {
    bikes = fallbackBikes;
  }
  renderBikeGrid();
}

function setupFilters() {
  $$('.filter-tab').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      $$('.filter-tab').forEach(tab => tab.classList.toggle('active', tab === button));
      renderBikeGrid();
    });
  });
}

function setupReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  $$('.reveal').forEach(node => observer.observe(node));
}

function setupMobileMenu() {
  const toggle = $('[data-menu-toggle]');
  const nav = $('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    nav.classList.toggle('mobile-open');
    $('.site-header').classList.toggle('menu-open');
  });
  $$('a', nav).forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('mobile-open');
    $('.site-header').classList.remove('menu-open');
  }));
}

function formValue(form, name) {
  return form.elements[name]?.value ?? '';
}

function populateBikeForm(bike = null) {
  const form = $('#bike-form');
  currentEditingId = bike?.id || null;
  form.reset();
  form.elements.id.value = bike?.id || '';
  const fields = ['name', 'brand', 'category', 'status', 'price', 'msrp', 'year', 'mileage', 'engine', 'color', 'documents', 'sort_order', 'description'];
  fields.forEach(field => {
    if (bike && form.elements[field]) form.elements[field].value = bike[field] ?? '';
  });
  form.elements.category.value = bike?.category || 'new';
  form.elements.status.value = bike?.status || 'in_stock';
  form.elements.featured.checked = Boolean(bike?.featured);
  editingImages = [...(bike?.images || [])];
  $('#modal-title').textContent = bike ? `Sửa: ${bike.name}` : 'Thêm xe mới';
  $('#bike-message').textContent = '';
  renderImagePreview();
}

function openBikeModal(bike = null) {
  populateBikeForm(bike);
  const modal = $('#bike-modal');
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('[name="name"]', $('#bike-form'))?.focus(), 30);
}

function closeBikeModal() {
  const modal = $('#bike-modal');
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderImagePreview() {
  const target = $('#image-preview');
  target.innerHTML = editingImages.map((src, index) => `<figure><img src="${escapeHtml(src)}" alt="Ảnh xe ${index + 1}" /><button type="button" data-remove-image="${index}" aria-label="Xoá ảnh">×</button></figure>`).join('');
  $$('[data-remove-image]', target).forEach(button => button.addEventListener('click', () => {
    editingImages.splice(Number(button.dataset.removeImage), 1);
    renderImagePreview();
  }));
}

async function uploadFiles(files) {
  const message = $('#bike-message');
  for (const file of [...files]) {
    if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} lớn hơn 8MB.`);
    message.textContent = `Đang tải ${file.name}...`;
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'content-type': file.type, 'x-file-name': encodeURIComponent(file.name) },
      body: file
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải ảnh.');
    editingImages.push(data.url);
  }
  message.textContent = '';
  renderImagePreview();
}

function formToBike(form) {
  return {
    name: formValue(form, 'name'),
    brand: formValue(form, 'brand'),
    category: formValue(form, 'category'),
    status: formValue(form, 'status'),
    price: formValue(form, 'price'),
    msrp: formValue(form, 'msrp'),
    year: formValue(form, 'year'),
    mileage: formValue(form, 'mileage'),
    engine: formValue(form, 'engine'),
    color: formValue(form, 'color'),
    documents: formValue(form, 'documents'),
    sort_order: formValue(form, 'sort_order'),
    description: formValue(form, 'description'),
    featured: form.elements.featured.checked,
    images: editingImages
  };
}

function renderAdmin(bikesAdmin) {
  const stats = [
    ['Tổng xe', bikesAdmin.length],
    ['Đang có sẵn', bikesAdmin.filter(b => b.status === 'in_stock').length],
    ['Xe sắp về', bikesAdmin.filter(b => b.status === 'incoming').length],
    ['Đã bán', bikesAdmin.filter(b => b.status === 'sold').length]
  ];
  $('#admin-stats').innerHTML = stats.map(([label, count]) => `<article class="stat-card"><span>${label}</span><strong>${count}</strong></article>`).join('');
  $('#admin-bikes').innerHTML = bikesAdmin.map(bike => `<tr>
    <td><span class="admin-bike-name">${escapeHtml(bike.name)}</span><span class="admin-bike-sub">${escapeHtml(bike.brand || '')} • ${bike.year || '—'}</span></td>
    <td>${categoryText[bike.category] || '—'}</td>
    <td class="table-price">${currency(bike.price)}</td>
    <td><span class="mini-status ${escapeHtml(bike.status)}">${statusText[bike.status] || '—'}</span></td>
    <td class="admin-bike-sub">${bike.updated_at ? new Date(`${bike.updated_at}Z`).toLocaleDateString('vi-VN') : '—'}</td>
    <td><button class="table-action" data-edit-bike="${bike.id}">Sửa</button></td>
  </tr>`).join('') || '<tr><td colspan="6">Chưa có xe. Bấm “Thêm xe” để bắt đầu.</td></tr>';
  $$('[data-edit-bike]').forEach(button => button.addEventListener('click', () => {
    const bike = bikesAdmin.find(item => Number(item.id) === Number(button.dataset.editBike));
    if (bike) openBikeModal(bike);
  }));
}

async function loadAdminBikes() {
  const response = await fetch('/api/admin/bikes');
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể tải kho xe.');
  renderAdmin(data.bikes || []);
}

async function initializeAdmin() {
  const login = $('#login-card');
  const dashboard = $('#admin-dashboard');
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    if (data.authenticated) {
      login.hidden = true;
      dashboard.hidden = false;
      await loadAdminBikes();
    } else {
      login.hidden = false;
      dashboard.hidden = true;
    }
  } catch {
    $('#login-message').textContent = 'Không thể kết nối máy chủ. Thử lại sau.';
  }
}

function setupAdmin() {
  $('#login-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('#login-message');
    const button = $('button[type="submit"]', event.currentTarget);
    message.textContent = '';
    button.disabled = true;
    button.textContent = 'Đang kiểm tra...';
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('#admin-password').value }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Không thể đăng nhập.');
      $('#admin-password').value = '';
      await initializeAdmin();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.innerHTML = 'Đăng nhập <span>→</span>';
    }
  });

  $('#logout-button')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await initializeAdmin();
  });
  $('#add-bike-button')?.addEventListener('click', () => openBikeModal());
  $$('[data-modal-close]').forEach(button => button.addEventListener('click', closeBikeModal));
  $('#image-input')?.addEventListener('change', async event => {
    if (!event.target.files?.length) return;
    try { await uploadFiles(event.target.files); } catch (error) { $('#bike-message').textContent = error.message; }
    event.target.value = '';
  });
  $('#bike-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = $('#bike-message');
    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    submit.textContent = 'Đang lưu...';
    message.textContent = '';
    try {
      const data = formToBike(form);
      const endpoint = currentEditingId ? `/api/admin/bikes/${currentEditingId}` : '/api/admin/bikes';
      const response = await fetch(endpoint, { method: currentEditingId ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Không thể lưu xe.');
      closeBikeModal();
      await loadAdminBikes();
      await loadBikes();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Lưu xe <span>→</span>';
    }
  });
  initializeAdmin();
}

function initializeStorefront() {
  $('#storefront').hidden = false;
  $('#admin-shell').hidden = true;
  setupReveal();
  setupFilters();
  setupMobileMenu();
  loadBikes();
}

function boot() {
  $('#year-now').textContent = new Date().getFullYear();
  const isAdmin = location.pathname === '/admin' || location.pathname === '/admin/';
  if (isAdmin) {
    $('#storefront').hidden = true;
    $('#admin-shell').hidden = false;
    $('.topline').hidden = true;
    $('.site-header').hidden = true;
    $('.site-footer').hidden = true;
    $('.floating-contact').hidden = true;
    setupAdmin();
  } else {
    initializeStorefront();
  }
}

boot();

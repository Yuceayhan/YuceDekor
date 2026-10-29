const TOKEN_KEY = 'yuce_admin_token';
const USER_KEY = 'yuce_admin_user';

// Dinamik API Adresi (Live Server 5500 portu veya file:// protokolünde 3000 portuna yönlendirir)
const API_BASE = (window.location.port === '5500' || window.location.port === '5501' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : '';

const token = localStorage.getItem(TOKEN_KEY);
const userStr = localStorage.getItem(USER_KEY);

if (!token) {
  if (document.documentElement) document.documentElement.style.display = 'none';
  window.location.replace('login.html');
}

window.addEventListener('pageshow', () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
    if (document.documentElement) document.documentElement.style.display = 'none';
    window.location.replace('login.html');
  }
});

const user = userStr ? JSON.parse(userStr) : { username: 'Admin' };
document.getElementById('admin-username-display').textContent = user.username || 'Admin';

// State
let allProducts = [];
let pendingUploadFile = null;
let servicePendingUploadFile = null;

// Category Labels mapping
const CATEGORY_NAMES = {
  'tv-unitesi': 'TV Ünitesi',
  'led-tavan': 'LED Tavan',
  'asma-tavan': 'Asma Tavan',
  'ic-cephe-boya': 'İç Cephe Boya',
  'dis-cephe-boya': 'Dış Cephe Boya',
  '3d-duvar': '3D Duvar',
  'anahtar-teslim': 'Anahtar Teslim',
  'ofis': 'Ofis'
};

const DEFAULT_SERVICE_TITLES = [
  'TV Ünitesi Tasarımı',
  'LED Tavan Uygulamaları',
  'Asma Tavan Sistemleri',
  'İç Cephe Boya',
  'Dış Cephe Boya',
  '3D Duvar Dekorasyonu',
  'Anahtar Teslim Tadilat',
  'Ofis Dekorasyonu'
];

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// DOM Elements
const statTotal = document.getElementById('stat-total');
const statActive = document.getElementById('stat-active');
const statDiscounted = document.getElementById('stat-discounted');
const productsTableBody = document.getElementById('products-table-body');
const mainAlert = document.getElementById('main-alert');

// Modal Elements
const productModal = document.getElementById('product-modal');
const passwordModal = document.getElementById('password-modal');
const productForm = document.getElementById('product-form');
const passwordForm = document.getElementById('password-form');
const modalAlert = document.getElementById('modal-alert');
const pwAlert = document.getElementById('pw-alert');
const imagePreview = document.getElementById('image-preview');
const pImageUrl = document.getElementById('p-image-url');
const uploadStatus = document.getElementById('upload-status');

// Init
document.addEventListener('DOMContentLoaded', () => {
  verifyAuth();
  loadStats();
  loadProducts();
  setupEventListeners();
});

// Auth Verification
async function verifyAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Oturum sonlandı.');
  } catch (err) {
    logout();
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (document.documentElement) document.documentElement.style.display = 'none';
  window.location.replace('login.html');
}

// Load Stats
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    statTotal.textContent = data.totalProducts || 0;
    statActive.textContent = data.activeProducts || 0;
    statDiscounted.textContent = data.discountedProducts || 0;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// Load Products
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Ürünler yüklenemedi.');
    allProducts = await res.json();
    updateCategoryOptions();
    updateTitleOptions();
    renderProductsTable(allProducts);
  } catch (err) {
    showAlert(mainAlert, err.message, 'danger');
  }
}

// Render Products Table
function renderProductsTable(products) {
  if (!products || products.length === 0) {
    productsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          Henüz eklenmiş hizmet veya ürün bulunmuyor.
        </td>
      </tr>
    `;
    return;
  }

  productsTableBody.innerHTML = products.map(p => {
    const categoryLabel = CATEGORY_NAMES[p.category] || p.category;
    const statusBadge = p.is_active === 1
      ? `<span class="badge badge-active">Aktif</span>`
      : `<span class="badge badge-inactive">Pasif</span>`;

    let priceDisplay = '';
    if (p.has_discount && p.discount_price) {
      priceDisplay = `
        <span class="old-price">${formatCurrency(p.price)}</span>
        <span class="current-price">${formatCurrency(p.discount_price)}</span>
        <span class="badge badge-discount">%${p.discount_rate} İndirim</span>
      `;
    } else {
      priceDisplay = `<span class="current-price">${formatCurrency(p.price)}</span>`;
    }

    const imgSrc = p.image_url ? (p.image_url.startsWith('http') || p.image_url.startsWith('/') ? p.image_url : '../' + p.image_url) : '../images/resim1.jpg';

    return `
      <tr>
        <td>
          <img src="${imgSrc}" class="product-thumb" alt="${escapeHtml(p.title)}" onerror="this.src='../images/resim1.jpg'">
        </td>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
          ${p.description ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(p.description.substring(0, 50))}${p.description.length > 50 ? '...' : ''}</div>` : ''}
        </td>
        <td><span style="background: var(--bg-input); padding: 4px 8px; border-radius: 6px; font-size: 0.85rem;">${categoryLabel}</span></td>
        <td>${priceDisplay}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon edit" onclick="editProduct(${p.id})" title="Düzenle">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete" onclick="deleteProduct(${p.id})" title="Sil">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Helpers
function formatCurrency(val) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showAlert(element, message, type = 'danger') {
  element.className = `alert-box alert-${type}`;
  element.textContent = message;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

// Setup Listeners
function setupEventListeners() {
  document.getElementById('logout-btn').addEventListener('click', logout);

  const pCategorySelect = document.getElementById('p-category');
  const pCustomCategoryInput = document.getElementById('p-custom-category');

  pCategorySelect.addEventListener('change', () => {
    if (pCategorySelect.value === '__new__') {
      pCustomCategoryInput.style.display = 'block';
      pCustomCategoryInput.required = true;
      pCustomCategoryInput.focus();
    } else {
      pCustomCategoryInput.style.display = 'none';
      pCustomCategoryInput.required = false;
      pCustomCategoryInput.value = '';
    }
  });

  const pTitleSelect = document.getElementById('p-title-select');
  const pTitleCustomInput = document.getElementById('p-title-custom');

  if (pTitleSelect) {
    pTitleSelect.addEventListener('change', () => {
      if (pTitleSelect.value === '__new__') {
        pTitleCustomInput.style.display = 'block';
        pTitleCustomInput.required = true;
        pTitleCustomInput.focus();
      } else {
        pTitleCustomInput.style.display = 'none';
        pTitleCustomInput.required = false;
        pTitleCustomInput.value = '';
      }
    });
  }

  // Modal Triggers
  document.getElementById('open-add-modal').addEventListener('click', () => {
    resetProductForm();
    updateCategoryOptions();
    updateTitleOptions();
    document.getElementById('modal-form-title').textContent = 'Yeni Hizmet / Ürün Ekle';
    productModal.classList.add('active');
  });

  document.querySelectorAll('.close-product-modal').forEach(btn => {
    btn.addEventListener('click', () => productModal.classList.remove('active'));
  });

  document.getElementById('nav-change-password').addEventListener('click', (e) => {
    e.preventDefault();
    passwordForm.reset();
    pwAlert.style.display = 'none';
    passwordModal.classList.add('active');
  });

  document.querySelectorAll('.close-pw-modal').forEach(btn => {
    btn.addEventListener('click', () => passwordModal.classList.remove('active'));
  });

  // Dynamic Price Discount Calculator
  const pPrice = document.getElementById('p-price');
  const pDiscRate = document.getElementById('p-discount-rate');
  const pDiscPrice = document.getElementById('p-discount-price');

  pPrice.addEventListener('input', calculateDiscount);
  pDiscRate.addEventListener('input', () => {
    const price = parseFloat(pPrice.value) || 0;
    const rate = parseFloat(pDiscRate.value) || 0;
    if (price > 0 && rate >= 0 && rate <= 100) {
      pDiscPrice.value = Math.round(price * (1 - rate / 100));
    }
  });

  pDiscPrice.addEventListener('input', () => {
    const price = parseFloat(pPrice.value) || 0;
    const discPrice = parseFloat(pDiscPrice.value) || 0;
    if (price > 0 && discPrice > 0 && discPrice < price) {
      pDiscRate.value = Math.round(((price - discPrice) / price) * 100);
    }
  });

  function calculateDiscount() {
    const price = parseFloat(pPrice.value) || 0;
    const rate = parseFloat(pDiscRate.value) || 0;
    if (price > 0 && rate > 0) {
      pDiscPrice.value = Math.round(price * (1 - rate / 100));
    }
  }

  // Form içindeki girdi alanlarında Enter'a basıldığında formun erken gönderilmesini engelle
  productForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      return false;
    }
  });

  // Image URL preview update
  pImageUrl.addEventListener('input', () => {
    const url = pImageUrl.value.trim();
    if (url) {
      imagePreview.src = url.startsWith('http') || url.startsWith('/') ? url : '../' + url;
      imagePreview.style.display = 'block';
    } else {
      imagePreview.src = '';
      imagePreview.style.display = 'none';
    }
  });

  // Image File Select Handler (Local preview without writing to disk immediately)
  document.getElementById('p-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pendingUploadFile = file;

    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.src = event.target.result;
      imagePreview.style.display = 'block';
      uploadStatus.textContent = '✅ Ürün görseli seçildi.';
    };
    reader.readAsDataURL(file);
  });

  // Hizmet Kapak Fotoğrafı Handlers
  const pServiceFileInput = document.getElementById('p-service-file-input');
  const serviceUploadStatus = document.getElementById('service-upload-status');
  const serviceImagePreview = document.getElementById('service-image-preview');
  const pServiceImageUrl = document.getElementById('p-service-image-url');

  if (pServiceImageUrl) {
    pServiceImageUrl.addEventListener('input', () => {
      const url = pServiceImageUrl.value.trim();
      if (url) {
        serviceImagePreview.src = url.startsWith('http') || url.startsWith('/') ? url : '../' + url;
        serviceImagePreview.style.display = 'block';
      } else {
        serviceImagePreview.src = '';
        serviceImagePreview.style.display = 'none';
      }
    });
  }

  if (pServiceFileInput) {
    pServiceFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      servicePendingUploadFile = file;

      const reader = new FileReader();
      reader.onload = (event) => {
        serviceImagePreview.src = event.target.result;
        serviceImagePreview.style.display = 'block';
        if (serviceUploadStatus) serviceUploadStatus.textContent = '✅ Hizmet kapak görseli seçildi.';
      };
      reader.readAsDataURL(file);
    });
  }

  // Product Form Submission (Create or Update)
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('save-product-btn');
    const originalBtnHTML = saveBtn ? saveBtn.innerHTML : '<i class="fas fa-save"></i> Kaydet';

    const id = document.getElementById('product-id').value;
    let category = document.getElementById('p-category').value;

    if (category === '__new__') {
      const customVal = document.getElementById('p-custom-category').value.trim();
      if (!customVal) {
        showAlert(modalAlert, 'Lütfen yeni kategori adını yazın.', 'danger');
        return;
      }
      category = slugify(customVal);
      CATEGORY_NAMES[category] = customVal;
    }

    let titleVal = document.getElementById('p-title-select') ? document.getElementById('p-title-select').value : '';
    if (titleVal === '__new__') {
      titleVal = document.getElementById('p-title-custom') ? document.getElementById('p-title-custom').value.trim() : '';
    }

    const priceVal = parseFloat(document.getElementById('p-price').value);

    if (!titleVal) {
      showAlert(modalAlert, 'Lütfen ürün/hizmet başlığını yazın veya seçin.', 'danger');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      showAlert(modalAlert, 'Lütfen geçerli bir fiyat girin.', 'danger');
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
    }

    try {
      let finalImageUrl = document.getElementById('p-image-url').value.trim();
      let finalServiceImageUrl = document.getElementById('p-service-image-url') ? document.getElementById('p-service-image-url').value.trim() : '';

      // 1. Hizmet kapak görseli yükleme
      if (servicePendingUploadFile) {
        if (serviceUploadStatus) serviceUploadStatus.textContent = 'Hizmet görseli yükleniyor...';
        const formData = new FormData();
        formData.append('image', servicePendingUploadFile);

        const uploadRes = await fetch(`${API_BASE}/api/admin/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Hizmet görseli yüklenemedi.');
        finalServiceImageUrl = uploadData.image_url;
      }

      // 2. Ürün görseli yükleme
      if (pendingUploadFile) {
        uploadStatus.textContent = 'Ürün görseli yükleniyor...';
        const formData = new FormData();
        formData.append('image', pendingUploadFile);

        const uploadRes = await fetch(`${API_BASE}/api/admin/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Ürün görseli yüklenemedi.');
        finalImageUrl = uploadData.image_url;
      }

      if (!finalImageUrl) {
        finalImageUrl = 'images/resim1.jpg';
      }

      const payload = {
        title: titleVal,
        category: category,
        description: document.getElementById('p-desc').value.trim(),
        price: priceVal,
        discount_rate: parseFloat(document.getElementById('p-discount-rate').value) || 0,
        discount_price: document.getElementById('p-discount-price').value ? parseFloat(document.getElementById('p-discount-price').value) : null,
        image_url: finalImageUrl,
        service_image_url: finalServiceImageUrl || null,
        is_active: parseInt(document.getElementById('p-status').value)
      };

      const isEdit = !!id;
      const url = isEdit ? `${API_BASE}/api/admin/products/${id}` : `${API_BASE}/api/admin/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız.');

      productModal.classList.remove('active');
      showAlert(mainAlert, data.message || 'Hizmet / Ürün başarıyla kaydedildi.', 'success');
      loadStats();
      loadProducts();
    } catch (err) {
      showAlert(modalAlert, err.message, 'danger');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHTML;
      }
    }
  });

  // Password Change Submission
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      showAlert(pwAlert, 'Yeni şifreler eşleşmiyor.', 'danger');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şifre değiştirilemedi.');

      showAlert(pwAlert, data.message, 'success');
      setTimeout(() => {
        passwordModal.classList.remove('active');
      }, 1500);
    } catch (err) {
      showAlert(pwAlert, err.message, 'danger');
    }
  });
}

// Reset Form
function resetProductForm() {
  pendingUploadFile = null;
  servicePendingUploadFile = null;
  document.getElementById('product-id').value = '';
  
  const fileInput = document.getElementById('p-file-input');
  if (fileInput) fileInput.value = '';

  const serviceFileInput = document.getElementById('p-service-file-input');
  if (serviceFileInput) serviceFileInput.value = '';

  productForm.reset();

  imagePreview.src = '';
  imagePreview.style.display = 'none';

  const serviceImagePreview = document.getElementById('service-image-preview');
  if (serviceImagePreview) {
    serviceImagePreview.src = '';
    serviceImagePreview.style.display = 'none';
  }

  const pCustomCat = document.getElementById('p-custom-category');
  if (pCustomCat) {
    pCustomCat.style.display = 'none';
    pCustomCat.required = false;
    pCustomCat.value = '';
  }

  const pTitleCustom = document.getElementById('p-title-custom');
  if (pTitleCustom) {
    pTitleCustom.style.display = 'none';
    pTitleCustom.required = false;
    pTitleCustom.value = '';
  }

  uploadStatus.textContent = '';
  const serviceUploadStatus = document.getElementById('service-upload-status');
  if (serviceUploadStatus) serviceUploadStatus.textContent = '';

  modalAlert.style.display = 'none';
}

function updateTitleOptions() {
  const pTitleSelect = document.getElementById('p-title-select');
  if (!pTitleSelect) return;

  const currentVal = pTitleSelect.value;
  const titlesSet = new Set(DEFAULT_SERVICE_TITLES);

  allProducts.forEach(p => {
    if (p.title) titlesSet.add(p.title);
  });

  let optionsHTML = Array.from(titlesSet).map(t => {
    return `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`;
  }).join('');

  optionsHTML += `<option value="__new__">➕ Yeni Hizmet Başlığı Yaz / Ekle...</option>`;
  pTitleSelect.innerHTML = optionsHTML;

  if (currentVal && Array.from(titlesSet).includes(currentVal)) {
    pTitleSelect.value = currentVal;
  } else if (currentVal === '__new__') {
    pTitleSelect.value = '__new__';
    const pTitleCustom = document.getElementById('p-title-custom');
    if (pTitleCustom) pTitleCustom.style.display = 'block';
  }
}

function updateCategoryOptions() {
  const pCategory = document.getElementById('p-category');
  if (!pCategory) return;

  const currentVal = pCategory.value;
  const categoriesSet = new Set(Object.keys(CATEGORY_NAMES));

  allProducts.forEach(p => {
    if (p.category) {
      categoriesSet.add(p.category);
      if (!CATEGORY_NAMES[p.category]) {
        CATEGORY_NAMES[p.category] = p.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  });

  let optionsHTML = Array.from(categoriesSet).map(catKey => {
    const label = CATEGORY_NAMES[catKey] || catKey;
    return `<option value="${catKey}">${escapeHtml(label)}</option>`;
  }).join('');

  optionsHTML += `<option value="__new__">➕ Yeni Kategori Yaz / Ekle...</option>`;
  pCategory.innerHTML = optionsHTML;

  if (currentVal && Array.from(categoriesSet).includes(currentVal)) {
    pCategory.value = currentVal;
  }
}

// Global functions for inline actions
window.editProduct = function (id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) return;

  resetProductForm();
  updateCategoryOptions();
  updateTitleOptions();

  document.getElementById('product-id').value = p.id;
  
  const pServiceImageUrlInput = document.getElementById('p-service-image-url');
  const serviceImagePreview = document.getElementById('service-image-preview');
  if (pServiceImageUrlInput) {
    pServiceImageUrlInput.value = p.service_image_url || '';
    if (p.service_image_url && serviceImagePreview) {
      serviceImagePreview.src = p.service_image_url.startsWith('http') || p.service_image_url.startsWith('/') ? p.service_image_url : '../' + p.service_image_url;
      serviceImagePreview.style.display = 'block';
    }
  }

  const pTitleSelect = document.getElementById('p-title-select');
  const pTitleCustom = document.getElementById('p-title-custom');

  if (pTitleSelect) {
    if (pTitleSelect.querySelector(`option[value="${escapeHtml(p.title)}"]`)) {
      pTitleSelect.value = p.title;
      if (pTitleCustom) pTitleCustom.style.display = 'none';
    } else {
      pTitleSelect.value = '__new__';
      if (pTitleCustom) {
        pTitleCustom.style.display = 'block';
        pTitleCustom.value = p.title || '';
      }
    }
  }
  
  const pCategory = document.getElementById('p-category');
  if (pCategory.querySelector(`option[value="${p.category}"]`)) {
    pCategory.value = p.category;
  } else {
    pCategory.value = '__new__';
    const pCustomCategory = document.getElementById('p-custom-category');
    if (pCustomCategory) {
      pCustomCategory.style.display = 'block';
      pCustomCategory.value = CATEGORY_NAMES[p.category] || p.category;
    }
  }

  document.getElementById('p-desc').value = p.description || '';
  document.getElementById('p-price').value = p.price || 0;
  document.getElementById('p-discount-rate').value = p.discount_rate || '';
  document.getElementById('p-discount-price').value = p.discount_price || '';
  document.getElementById('p-image-url').value = p.image_url || '';
  document.getElementById('p-status').value = p.is_active;

  if (p.image_url) {
    imagePreview.src = p.image_url.startsWith('http') || p.image_url.startsWith('/') ? p.image_url : '../' + p.image_url;
    imagePreview.style.display = 'block';
  } else {
    imagePreview.style.display = 'none';
  }

  document.getElementById('modal-form-title').textContent = 'Hizmet / Ürün Düzenle';
  productModal.classList.add('active');
};

window.deleteProduct = async function (id) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Silme işlemi başarısız.');

    showAlert(mainAlert, data.message, 'success');
    loadStats();
    loadProducts();
  } catch (err) {
    showAlert(mainAlert, err.message, 'danger');
  }
};

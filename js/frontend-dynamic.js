(function () {
  // Dinamik API Adresi (Live Server 5500 portu veya file:// protokolünde 3000 portuna yönlendirir)
  const API_BASE = (window.location.port === '5500' || window.location.port === '5501' || window.location.protocol === 'file:') 
    ? 'http://localhost:3000' 
    : '';

  const CATEGORY_MAP = {
    'tvunitesi.html': 'tv-unitesi',
    'ledtavan.html': 'led-tavan',
    'asmatavan.html': 'asma-tavan',
    'iccphboya.html': 'ic-cephe-boya',
    'dıscphbya.html': 'dis-cephe-boya',
    'discphbya.html': 'dis-cephe-boya',
    '3dvrdekorsyn.html': '3d-duvar',
    'anhtatteslim.html': 'anahtar-teslim',
    'ofisdekorsyon.html': 'ofis'
  };

  const CATEGORY_ICONS = {
    'tv-unitesi': 'fas fa-tv',
    'led-tavan': 'fas fa-lightbulb',
    'asma-tavan': 'fas fa-layer-group',
    'ic-cephe-boya': 'fas fa-paint-roller',
    'dis-cephe-boya': 'fas fa-building',
    '3d-duvar': 'fas fa-cubes',
    'anahtar-teslim': 'fas fa-key',
    'ofis': 'fas fa-briefcase'
  };

  const CATEGORY_LABELS = {
    'all': 'Hepsi',
    'tv-unitesi': 'TV Ünitesi',
    'led-tavan': 'LED Tavan',
    'asma-tavan': 'Asma Tavan',
    'ic-cephe-boya': 'İç Cephe',
    'dis-cephe-boya': 'Dış Cephe',
    '3d-duvar': '3D Duvar',
    'anahtar-teslim': 'Anahtar Teslim',
    'ofis': 'Ofis'
  };

  let globalProducts = [];

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Ana Sayfa İndirimli Ürünler Bölümü (Varsa)
    const discountContainer = document.getElementById('discounts-grid');
    if (discountContainer) {
      loadDiscountedProducts(discountContainer);
    }

    // 2. Ana Sayfa Hizmetlerimiz Bölümü (Dinamik Yeni Hizmet Kartları)
    const servicesGrid = document.getElementById('services-grid');
    if (servicesGrid) {
      loadDynamicServices(servicesGrid);
    }

    // 3. Kategori Sayfaları & Genel Ürün Yükleme
    const productsContainer = document.querySelector('.products:not(#discounts-grid)');
    if (!productsContainer) return;

    const rawPath = decodeURIComponent(window.location.pathname);
    const fileName = rawPath.split('/').pop().split('?')[0].split('#')[0].toLowerCase();
    
    // URL parametresinden kategori kontrolü (?cat=kategori-slug)
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat');

    let initialCategory = catParam || CATEGORY_MAP[fileName] || 'all';

    fetch(`${API_BASE}/api/products`)
      .then(res => {
        if (!res.ok) throw new Error('API Hatası');
        return res.json();
      })
      .then(products => {
        if (!products || products.length === 0) return;
        globalProducts = products.filter(p => p.is_active === 1);

        setupDynamicFilters(initialCategory);
        renderCategoryProducts(productsContainer, initialCategory);
      })
      .catch(err => {
        console.log('Dinamik veriler yüklenemedi:', err);
      });
  });

  // Ana sayfa Hizmetlerimiz bölümüne özel eklenen yeni kategorileri/hizmetleri kart olarak ekleme
  function loadDynamicServices(servicesGrid) {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(products => {
        const activeProds = products.filter(p => p.is_active === 1);
        const defaultCats = new Set(['tv-unitesi', 'led-tavan', 'asma-tavan', 'ic-cephe-boya', 'dis-cephe-boya', '3d-duvar', 'anahtar-teslim', 'ofis']);
        
        // Mevcut varsayılan hizmet kartlarının görsellerini veritabanında service_image_url varsa güncelle
        activeProds.forEach(p => {
          if (p.service_image_url && p.category) {
            const existingLink = servicesGrid.querySelector(`a[href*="${p.category}"]`);
            if (existingLink) {
              const img = existingLink.querySelector('.service-card img');
              if (img) img.src = p.service_image_url;
            }
          }
        });

        // Varsayılan kategoriler haricindeki yeni kategorileri bul
        const customCategoriesMap = {};
        activeProds.forEach(p => {
          if (p.category && !defaultCats.has(p.category)) {
            if (!customCategoriesMap[p.category]) {
              customCategoriesMap[p.category] = p;
            }
          }
        });

        Object.keys(customCategoriesMap).forEach(catKey => {
          // Kart zaten eklenmiş mi kontrol et
          if (servicesGrid.querySelector(`[data-category="${catKey}"]`)) return;

          const p = customCategoriesMap[catKey];
          const catName = CATEGORY_LABELS[catKey] || catKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const serviceImg = p.service_image_url || p.image_url;
          const imgSrc = serviceImg ? (serviceImg.startsWith('http') || serviceImg.startsWith('/') ? serviceImg : serviceImg) : 'images/resim1.jpg';

          const serviceCardHTML = `
            <a href="tvunitesi.html?cat=${encodeURIComponent(catKey)}" data-category="${catKey}">
              <div class="service-card">
                <img src="${imgSrc}" alt="${escapeHtml(catName)}" onerror="this.src='images/resim1.jpg'">
                <div class="service-content">
                  <div class="service-icon">✨</div>
                  <h2>${escapeHtml(catName)}</h2>
                  <h5>${escapeHtml(p.description || 'Fonksiyonel ve estetik özel dekorasyon çözümleri.')}</h5>
                </div>
              </div>
            </a>
          `;

          servicesGrid.insertAdjacentHTML('beforeend', serviceCardHTML);
        });
      })
      .catch(err => console.log('Dinamik hizmetler yüklenemedi:', err));
  }

  // Kategori Butonlarını (Filter Bar) Dinamik Olarak Güncelle
  function setupDynamicFilters(activeCategory) {
    const filtersContainer = document.querySelector('.modern-filters');
    if (!filtersContainer) return;

    // Veritabanındaki tüm aktif kategorileri topla
    const catSet = new Set(['all', 'tv-unitesi', 'led-tavan', 'asma-tavan', 'ic-cephe-boya', 'dis-cephe-boya', '3d-duvar', 'anahtar-teslim', 'ofis']);
    globalProducts.forEach(p => {
      if (p.category) catSet.add(p.category);
    });

    const catArray = Array.from(catSet);

    filtersContainer.innerHTML = catArray.map(catKey => {
      const isActive = catKey === activeCategory ? 'active' : '';
      const icon = CATEGORY_ICONS[catKey] || 'fas fa-star';
      const label = CATEGORY_LABELS[catKey] || catKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      return `
        <a href="#" class="filter-card ${isActive}" data-cat="${catKey}">
          <i class="${icon}"></i>
          <span>${escapeHtml(label)}</span>
        </a>
      `;
    }).join('');

    // Filtre Butonlarına Tıklama Olayı (Sayfa yenilenmeden dinamik süzme)
    filtersContainer.querySelectorAll('.filter-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        filtersContainer.querySelectorAll('.filter-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedCat = btn.getAttribute('data-cat');
        const productsContainer = document.querySelector('.products:not(#discounts-grid)');
        if (productsContainer) {
          renderCategoryProducts(productsContainer, selectedCat);
        }
      });
    });
  }

  // Seçilen Kategoriye Göre Ürünleri Ekrana Çiz
  function renderCategoryProducts(container, categoryKey) {
    let filtered = globalProducts;
    if (categoryKey && categoryKey !== 'all') {
      filtered = globalProducts.filter(p => p.category === categoryKey);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
          <h3>Bu kategoride henüz yayınlanmış ürün bulunmuyor.</h3>
          <p>Daha sonra tekrar kontrol edebilir veya diğer kategorilerimizi inceleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    renderDynamicProducts(container, filtered);
  }

  // Ana sayfa için indirimli ürünleri yükleme
  function loadDiscountedProducts(container) {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(products => {
        const discounted = products.filter(p => p.has_discount && p.discount_price && p.is_active === 1);
        if (discounted.length === 0) return;

        const section = document.getElementById('discounts-section');
        if (section) section.style.display = 'block';

        container.innerHTML = discounted.map(p => {
          const priceFormatted = formatCurrency(p.price);
          const discountPriceFormatted = formatCurrency(p.discount_price);
          const imgSrc = p.image_url.startsWith('http') || p.image_url.startsWith('/') ? p.image_url : p.image_url;

          return `
            <div class="card discount-card" data-id="${p.id}">
              <div class="discount-ribbon">%${p.discount_rate} İNDİRİM</div>
              <img src="${imgSrc}" alt="${escapeHtml(p.title)}" onerror="this.src='images/resim1.jpg'" />
              <div class="card-body">
                <h3>${escapeHtml(p.title)}</h3>
                <p>${escapeHtml(p.description || '')}</p>
                <div class="product-price-box">
                  <span class="old-price">${priceFormatted}</span>
                  <span class="current-price">${discountPriceFormatted}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(err => console.log('İndirimli ürünler yüklenemedi:', err));
  }

  function renderDynamicProducts(container, products) {
    container.innerHTML = products.map(p => {
      let priceHTML = '';
      const priceFormatted = formatCurrency(p.price);

      if (p.has_discount && p.discount_price) {
        const discountPriceFormatted = formatCurrency(p.discount_price);
        priceHTML = `
          <div class="product-price-box">
            <span class="old-price">${priceFormatted}</span>
            <span class="current-price">${discountPriceFormatted}</span>
            <span class="discount-badge">%${p.discount_rate} İNDİRİM</span>
          </div>
        `;
      } else if (p.price > 0) {
        priceHTML = `
          <div class="product-price-box">
            <span class="current-price">${priceFormatted}</span>
          </div>
        `;
      }

      const imgSrc = p.image_url.startsWith('http') || p.image_url.startsWith('/') ? p.image_url : p.image_url;

      return `
        <div class="card" data-id="${p.id}" data-category="${p.category || ''}">
          <img src="${imgSrc}" alt="${escapeHtml(p.title)}" onerror="this.src='images/resim1.jpg'" />
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || '')}</p>
          ${priceHTML}
        </div>
      `;
    }).join('');
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Global Kart Tıklama -> Detay Modal Açma Handler
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card, .discount-card');
    if (!card) return;

    // Sayfa yönlendiren hizmet kartlarını atla
    if (card.closest('.service-card') || (card.parentElement && card.parentElement.tagName === 'A')) return;

    // Üst menü butonlarını atla
    if (e.target.closest('.admin-nav-link') || e.target.closest('.theme-toggle-btn') || e.target.closest('.hamburger')) return;

    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    const img = card.querySelector('img') ? card.querySelector('img').src : '';
    const title = card.querySelector('h3') ? card.querySelector('h3').innerText : '';
    const desc = card.querySelector('p') ? card.querySelector('p').innerText : '';

    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalSpecArea = document.getElementById('modal-spec-area');
    const modalSpecMaterial = document.getElementById('modal-spec-material');
    const modalSpecDuration = document.getElementById('modal-spec-duration');
    const modalSpecWarranty = document.getElementById('modal-spec-warranty');
    const modalWhatsappBtn = document.getElementById('modal-whatsapp-btn');

    const rawPath = decodeURIComponent(window.location.pathname);
    const filename = rawPath.split('/').pop().split('?')[0].split('#')[0].toLowerCase() || 'index.html';

    const pageDefaults = {
      'tvunitesi.html': { area: 'Salon & Yaşam Alanları', material: 'I. Sınıf Lake & MDF Ahşap', duration: '5 - 10 İş Günü', warranty: '2 Yıl Garanti' },
      '3dvrdekorsyn.html': { area: 'Salon, Koridor & Yatak Odası', material: '3D Alçı Panel & Premium Duvar Kağıdı', duration: '2 - 4 İş Günü', warranty: '2 Yıl Garanti' },
      'asmatavan.html': { area: 'Tavan & Aydınlatma Alanları', material: 'Alçıpan Profil & Alçı Sıva', duration: '3 - 5 İş Günü', warranty: '2 Yıl Garanti' },
      'ledtavan.html': { area: 'Salon, Mutfak & Hol Tavanları', material: 'Gizli LED Şerit & Alçıpan Modülleri', duration: '2 - 4 İş Günü', warranty: '2 Yıl Garanti' },
      'iccphboya.html': { area: 'Tüm İç Mekan Duvarları', material: 'Silikonlu Su Bazlı Silinebilir Boya', duration: '3 - 5 İş Günü', warranty: 'Kusursuz İşçilik Güvencesi' },
      'dıscphbya.html': { area: 'Bina Dış Cephe Yüzeyleri', material: 'Akrilik Dış Cephe Boyası & Mantolama', duration: '7 - 15 İş Günü', warranty: '5 Yıl Dayanıklılık Garantisi' },
      'discphbya.html': { area: 'Bina Dış Cephe Yüzeyleri', material: 'Akrilik Dış Cephe Boyası & Mantolama', duration: '7 - 15 İş Günü', warranty: '5 Yıl Dayanıklılık Garantisi' },
      'ofisdekorsyon.html': { area: 'Ofis, Kurumsal & Çalışma Alanları', material: 'Masaüstü Ahşap, Cam Bölme & Akustik', duration: '10 - 20 İş Günü', warranty: '2 Yıl Garanti' },
      'anhtatteslim.html': { area: 'Komple Daire / Villa / Dükkan', material: "A'dan Z'ye Komple Yapı Malzemeleri", duration: '20 - 45 İş Günü', warranty: '5 Yıl Garanti' }
    };

    const defaults = pageDefaults[filename] || {
      area: 'Salon & Yaşam Alanları',
      material: 'I. Kalite Malzemeler',
      duration: '5 - 10 İş Günü',
      warranty: '2 Yıl Garanti'
    };

    if (modalImg) modalImg.src = img;
    if (modalTitle) modalTitle.innerText = title;
    if (modalDesc) modalDesc.innerText = desc;

    if (modalSpecArea) modalSpecArea.innerText = card.getAttribute('data-spec-area') || defaults.area;
    if (modalSpecMaterial) modalSpecMaterial.innerText = card.getAttribute('data-spec-material') || defaults.material;
    if (modalSpecDuration) modalSpecDuration.innerText = card.getAttribute('data-spec-duration') || defaults.duration;
    if (modalSpecWarranty) modalSpecWarranty.innerText = card.getAttribute('data-spec-warranty') || defaults.warranty;

    if (modalWhatsappBtn) {
      const text = encodeURIComponent(`Merhaba, ${title} hakkında detaylı bilgi almak istiyorum.`);
      modalWhatsappBtn.href = `https://wa.me/905449009495?text=${text}`;
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
  });

  // Modal Kapatma Handler (X Butonu veya Arka Plan)
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    if (e.target.classList.contains('close-modal') || e.target === modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  });
})();

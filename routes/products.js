const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Price and discount calculation helper
function formatProduct(p) {
  let price = Number(p.price) || 0;
  let discount_price = p.discount_price !== null && p.discount_price !== undefined ? Number(p.discount_price) : null;
  let discount_rate = Number(p.discount_rate) || 0;

  // İndirim Oranı girilmiş ama İndirimli Fiyat boşsa, otomatik hesapla
  if (discount_rate > 0 && (!discount_price || discount_price >= price)) {
    discount_price = Math.round(price * (1 - discount_rate / 100));
  }
  // İndirimli Fiyat girilmiş ama İndirim Oranı boşsa, oranı otomatik hesapla
  else if (discount_price && discount_price < price && discount_rate === 0) {
    discount_rate = Math.round(((price - discount_price) / price) * 100);
  }

  const has_discount = discount_price !== null && discount_price < price;

  return {
    ...p,
    price,
    discount_price: has_discount ? discount_price : null,
    discount_rate: has_discount ? discount_rate : 0,
    has_discount
  };
}

// ----------------------------------------------------
// 1. PUBLIC API (Ön Yüz İçin)
// ----------------------------------------------------
router.get('/products', (req, res) => {
  const { category } = req.query;
  let sql = `SELECT * FROM products WHERE is_active = 1`;
  let params = [];

  if (category && category !== 'all') {
    sql += ` AND category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' });
    }
    const products = rows.map(formatProduct);
    res.json(products);
  });
});

// Single Product Public Details
router.get('/products/:id', (req, res) => {
  db.get(`SELECT * FROM products WHERE id = ? AND is_active = 1`, [req.params.id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Ürün/Hizmet bulunamadı.' });
    }
    res.json(formatProduct(row));
  });
});


// ----------------------------------------------------
// 2. ADMIN API (Admin Paneli İçin - Korumalı)
// ----------------------------------------------------

// Admin Dashboard İstatistikleri
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const totalRow = await db.asyncGet(`SELECT COUNT(*) as count FROM products`);
    const activeRow = await db.asyncGet(`SELECT COUNT(*) as count FROM products WHERE is_active = 1`);
    const allProducts = await db.asyncAll(`SELECT * FROM products`);
    
    const discountedCount = allProducts.map(formatProduct).filter(p => p.has_discount && p.is_active === 1).length;

    res.json({
      totalProducts: totalRow.count,
      activeProducts: activeRow.count,
      discountedProducts: discountedCount
    });
  } catch (err) {
    res.status(500).json({ error: 'İstatistikler çekilemedi.' });
  }
});

// Admin Tüm Ürünler Listesi
router.get('/admin/products', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM products ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ürünler getirilemedi.' });
    }
    res.json(rows.map(formatProduct));
  });
});

// Yeni Ürün/Hizmet Ekleme
router.post('/admin/products', authenticateToken, (req, res) => {
  const { title, description, category, image_url, service_image_url, price, discount_price, discount_rate, is_active } = req.body;

  if (!title || !category || price === undefined) {
    return res.status(400).json({ error: 'Başlık, kategori ve fiyat zorunludur.' });
  }

  const numPrice = Number(price);
  let numDiscPrice = discount_price ? Number(discount_price) : null;
  let numDiscRate = discount_rate ? Number(discount_rate) : 0;

  if (numDiscRate > 0 && !numDiscPrice) {
    numDiscPrice = Math.round(numPrice * (1 - numDiscRate / 100));
  } else if (numDiscPrice && !numDiscRate) {
    numDiscRate = Math.round(((numPrice - numDiscPrice) / numPrice) * 100);
  }

  const sql = `
    INSERT INTO products (title, description, category, image_url, service_image_url, price, discount_price, discount_rate, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title,
    description || '',
    category,
    image_url || 'images/resim1.jpg',
    service_image_url || null,
    numPrice,
    numDiscPrice,
    numDiscRate,
    is_active !== undefined ? Number(is_active) : 1
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Ürün eklenirken hata oluştu: ' + err.message });
    }
    db.get(`SELECT * FROM products WHERE id = ?`, [this.lastID], (getErr, row) => {
      res.status(201).json({ message: 'Ürün/Hizmet başarıyla eklendi.', product: formatProduct(row) });
    });
  });
});

// Ürün/Hizmet Güncelleme
router.put('/admin/products/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, description, category, image_url, service_image_url, price, discount_price, discount_rate, is_active } = req.body;

  if (!title || !category || price === undefined) {
    return res.status(400).json({ error: 'Başlık, kategori ve fiyat zorunludur.' });
  }

  const numPrice = Number(price);
  let numDiscPrice = discount_price !== null && discount_price !== undefined && discount_price !== '' ? Number(discount_price) : null;
  let numDiscRate = discount_rate ? Number(discount_rate) : 0;

  if (numDiscRate > 0 && (!numDiscPrice || numDiscPrice >= numPrice)) {
    numDiscPrice = Math.round(numPrice * (1 - numDiscRate / 100));
  } else if (numDiscPrice && numDiscPrice < numPrice && numDiscRate === 0) {
    numDiscRate = Math.round(((numPrice - numDiscPrice) / numPrice) * 100);
  }

  const sql = `
    UPDATE products
    SET title = ?, description = ?, category = ?, image_url = ?, service_image_url = ?, price = ?, discount_price = ?, discount_rate = ?, is_active = ?
    WHERE id = ?
  `;

  const params = [
    title,
    description || '',
    category,
    image_url,
    service_image_url || null,
    numPrice,
    numDiscPrice,
    numDiscRate,
    Number(is_active),
    id
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Ürün güncellenirken hata oluştu.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Güncellenecek ürün bulunamadı.' });
    }
    db.get(`SELECT * FROM products WHERE id = ?`, [id], (getErr, row) => {
      res.json({ message: 'Ürün başarıyla güncellendi.', product: formatProduct(row) });
    });
  });
});

// Ürün/Hizmet Silme
router.delete('/admin/products/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Ürün silinirken hata oluştu.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Silinecek ürün bulunamadı.' });
    }
    res.json({ message: 'Ürün başarıyla silindi.' });
  });
});

module.exports = router;

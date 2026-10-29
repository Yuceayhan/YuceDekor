const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin sayfalarında önbelleklemeyi engelle (Geri tuşunda oturum kapalıysa sayfanın açılmaması için)
app.use('/admin', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Statik klasörler
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname)); // HTML, CSS, JS ve Görseller için

// API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api', uploadRoutes);

// Fallback HTML routing for Admin Panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Sunucuyu Başlat
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Yüce Dekor Server ${PORT} portunda çalışıyor!`);
  console.log(`🌐 Ana Sayfa: http://localhost:${PORT}`);
  console.log(`🔐 Admin Paneli Girişi: http://localhost:${PORT}/admin/login.html`);
  console.log(`==================================================`);
});

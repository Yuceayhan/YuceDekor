const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// 1. Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Giriş başarılı!',
      token,
      user: { id: user.id, username: user.username }
    });
  });
});

// 2. Mevcut Admin Bilgisi
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 3. Şifre Değiştirme
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mevcut ve yeni şifre alanları doldurulmalıdır.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
  }

  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mevcut şifreniz yanlış.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    db.run(
      `UPDATE users SET password = ? WHERE id = ?`,
      [newHashedPassword, req.user.id],
      (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: 'Şifre güncellenirken hata oluştu.' });
        }
        res.json({ message: 'Şifreniz başarıyla güncellendi.' });
      }
    );
  });
});

module.exports = router;

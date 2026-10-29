const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'yucedekor.db');
const db = new sqlite3.Database(dbPath);

// Helper for promise-based queries
db.asyncRun = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.asyncGet = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.asyncAll = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Database Initializer
async function initDatabase() {
  db.serialize(async () => {
    // 1. Kullanıcılar (Admin) Tablosu
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Hizmetler / Ürünler Tablosu
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        service_image_url TEXT,
        price REAL NOT NULL DEFAULT 0,
        discount_price REAL DEFAULT NULL,
        discount_rate INTEGER DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Default Admin oluşturma (admin / admin123)
    db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], async (err, row) => {
      if (err) {
        console.error('Admin kontrol hatası:', err);
        return;
      }
      if (!row) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        db.run(
          `INSERT INTO users (username, password) VALUES (?, ?)`,
          ['admin', hashedPassword],
          (insertErr) => {
            if (insertErr) console.error('Varsayılan admin oluşturma hatası:', insertErr);
            else console.log('✅ Varsayılan Admin hesabı oluşturuldu (Kullanıcı: admin, Şifre: admin123)');
          }
        );
      }
    });

    // Örnek Ürün / Hizmet Verileri (Tüm Kategoriler İçin Tam Liste)
    db.get(`SELECT COUNT(*) as count FROM products`, (err, row) => {
      if (!err && row.count < 20) {
        db.run(`DELETE FROM products`, [], () => {
          const sampleProducts = [
            // TV Ünitesi
            { title: 'Modern Ahşap TV Ünitesi', description: 'Lüks ahşap ve mermer detaylı TV ünitesi tasarımı', category: 'tv-unitesi', image_url: 'images/tv1.jpg', price: 18500, discount_price: 15725, discount_rate: 15, is_active: 1 },
            { title: 'Minimalist TV Ünitesi', description: 'Sade ve zarif görünüm sunan modern TV paneli', category: 'tv-unitesi', image_url: 'images/tv2.jpg', price: 14000, discount_price: 12600, discount_rate: 10, is_active: 1 },
            { title: 'Gold Detaylı Lüks TV Ünitesi', description: 'Altın çıtalı ve LED aydınlatmalı özel tasarım', category: 'tv-unitesi', image_url: 'images/tv3.jpg', price: 24000, discount_price: 20400, discount_rate: 15, is_active: 1 },
            { title: 'Duvar TV Ünitesi', description: 'Alan kazandıran modern çözüm', category: 'tv-unitesi', image_url: 'images/tv4.jpg', price: 16500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'LED Aydınlatmalı TV Ünitesi', description: 'Ortam ambiyansını güçlendiren gizli LED ışıklarla modern ve etkileyici tasarım', category: 'tv-unitesi', image_url: 'images/tv5.jpg', price: 21000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Ahşap Doğal TV Ünitesi', description: 'Doğal ahşap dokusuyla sıcak ve samimi yaşam alanları oluşturan özel tasarım', category: 'tv-unitesi', image_url: 'images/tv6.jpg', price: 19500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Gömme TV Ünitesi', description: 'Duvar içine entegre edilerek minimalist ve düzenli bir görünüm sağlayan çözüm', category: 'tv-unitesi', image_url: 'images/tv7.jpg', price: 22000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Klasik TV Ünitesi', description: 'Zarif detaylar ve klasik çizgilerle zamansız bir dekorasyon sunan şık model', category: 'tv-unitesi', image_url: 'images/tv8.jpg', price: 17500, discount_price: null, discount_rate: 0, is_active: 1 },

            // LED Tavan
            { title: 'Modern LED Tavan', description: 'Göz yormayan, modern hatlara sahip şık aydınlatma', category: 'led-tavan', image_url: 'images/led1.jpg', price: 12500, discount_price: 11250, discount_rate: 10, is_active: 1 },
            { title: 'Minimal Asma Tavan', description: 'Sade mekanlar için zarif ve minimalist tasarım', category: 'led-tavan', image_url: 'images/led2.jpg', price: 10000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Lüks LED Tavan', description: 'Premium detaylar ve özel armatürlerle göz alıcı tasarım', category: 'led-tavan', image_url: 'images/led3.webp', price: 16000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Gizli Işık LED Tavan', description: 'Mekana derinlik ve genişlik katan modern gizli ışık çözümü', category: 'led-tavan', image_url: 'images/led4.jpg', price: 13500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'RGB Renk Değiştiren LED Tavan', description: 'Ortam ambiyansını kumanda veya telefonla değiştirebileceğiniz dinamik aydınlatma', category: 'led-tavan', image_url: 'images/led5.jpg', price: 15000, discount_price: 13500, discount_rate: 10, is_active: 1 },
            { title: 'Geometrik Tasarım Tavan', description: 'Farklı geometrik formlarla yaşam alanlarına derinlik katan özel asma tavan', category: 'led-tavan', image_url: 'images/led6.jpg', price: 14500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Koridor LED Aydınlatma', description: 'Uzun alanlar için kesintisiz, şık ve düzenli bir görünüm sağlayan çözümler', category: 'led-tavan', image_url: 'images/led7.jpg', price: 9500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Klasik Spotlu Tavan', description: 'Zarif detaylar ve klasik çizgilerle zamansız bir dekorasyon sunan şık model', category: 'led-tavan', image_url: 'images/led8.jpg', price: 11000, discount_price: null, discount_rate: 0, is_active: 1 },

            // Asma Tavan
            { title: 'Alçıpan Havuz Tavan', description: 'Salon ve oturma odaları için derinlik katan havuzlu alçıpan tasarımı', category: 'asma-tavan', image_url: 'images/asmtvn1.jpg', price: 11500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Sade Alçıpan Tavan', description: 'Düz, pürüzsüz yüzeyiyle mekana ferahlık ve netlik kazandıran uygulama', category: 'asma-tavan', image_url: 'images/asmtvn2.jpg', price: 8500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Premium Çift Kademeli Tavan', description: 'Çift katmanlı özel yapısı ve kalın kesim detaylarıyla şık ve lüks görünüm', category: 'asma-tavan', image_url: 'images/asmtvn3.jpg', price: 15500, discount_price: 13175, discount_rate: 15, is_active: 1 },
            { title: 'Gizli Işıklı Alçıpan', description: 'Spot ve şerit LED yerleşimine uygun, ışığı gizleyerek yansıtan modern çözüm', category: 'asma-tavan', image_url: 'images/asmtvn4.jpg', price: 12000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Dekoratif Karo Tavan', description: 'Özellikle iş yerleri, mutfak veya antreler için hem estetik hem modüler sistemler', category: 'asma-tavan', image_url: 'images/asmtvn6.webp', price: 9800, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Doğal Ahşap Entegre Tavan', description: 'Alçıpan gövde içerisine yerleştirilen ahşap çıtalarla sıcak ve doğal bir ambiyans', category: 'asma-tavan', image_url: 'images/asmtvn5.webp', price: 17000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Niş ve Spotlu Tavan', description: 'Köşeli spot yerleşimleri ve özel tavan nişleriyle homojen bir aydınlatma alt yapısı', category: 'asma-tavan', image_url: 'images/asmtvn7.jpg', price: 13000, discount_price: null, discount_rate: 0, is_active: 1 },

            // İç Cephe Boya
            { title: 'Yarı Mat Silinebilir Boya', description: 'Leke tutmayan, kolay temizlenen ve ışığı mükemmel yansıtan fonksiyonel çözüm', category: 'ic-cephe-boya', image_url: 'images/iccphbya1.jpg', price: 7500, discount_price: 6750, discount_rate: 10, is_active: 1 },
            { title: 'Minimalist Soft Tonlar', description: 'Mekanları daha geniş ve ferah gösteren, göz yormayan soft renk uygulamaları', category: 'ic-cephe-boya', image_url: 'images/iccphbya2.jpg', price: 6500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Premium İtalyan Boya', description: 'Duvarlara mermer veya kadife dokusu kazandıran, lüks ve dekoratif özel efekt boyası', category: 'ic-cephe-boya', image_url: 'images/iccphbya3.jpg', price: 12000, discount_price: 10200, discount_rate: 15, is_active: 1 },
            { title: 'Vurgulu Tek Duvar (Accent Wall)', description: 'Oda oda karakter katmak için yatak başı veya TV arkasına uygulanan kontrast renkler', category: 'ic-cephe-boya', image_url: 'images/iccphbya4.jpg', price: 4500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Antrasit ve Loft Tarzı', description: 'Modern, endüstriyel ve maskülen alanlar yaratmak için ideal koyu ton uygulamaları', category: 'ic-cephe-boya', image_url: 'images/iccphbya5.jpg', price: 7000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Doğal Toprak ve Kum Tonları', description: 'Yaşam alanlarına sıcaklık, samimiyet ve huzur katan doğadan ilham alan renkler', category: 'ic-cephe-boya', image_url: 'images/iccphbya6.jpg', price: 6800, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Tam Mat (Mürekkep) Boya', description: 'Duvar kusurlarını gizleyen, kadifeksi ve derin bir renk doygunluğu sunan uygulama', category: 'ic-cephe-boya', image_url: 'images/iccphbya7.jpg', price: 7200, discount_price: null, discount_rate: 0, is_active: 1 },

            // Dış Cephe Boya
            { title: 'Silikonlu Dış Cephe Boyası', description: 'Yüksek su itme gücüyle yağmur sularını geçirmeyen, binayı nemden koruyan dayanıklı çözüm', category: 'dis-cephe-boya', image_url: 'images/dıscphbya1.jpg', price: 14500, discount_price: 13050, discount_rate: 10, is_active: 1 },
            { title: 'Modern Akrilik Uygulamalar', description: 'Güneş ışınlarına (UV) karşı solma yapmayan, canlılığını yıllarca koruyan modern renkler', category: 'dis-cephe-boya', image_url: 'images/dıscphbya2.jpg', price: 13000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Premium Grenli (Dokulu) Boya', description: 'Özel rulo teknikleriyle uygulanan, cephedeki sıva kusurlarını mükemmel şekilde gizleyen desenli kaplama', category: 'dis-cephe-boya', image_url: 'images/dıscphbya3.jpg', price: 16000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Nefes Alan Elastomerik Boya', description: 'Duvarların nefes almasını sağlayarak küf oluşumunu engelleyen ve kılcal çatlakları köprüleyen sistem', category: 'dis-cephe-boya', image_url: 'images/dıscphbya4.jpg', price: 15500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Koyu ve Maskülen Tonlar', description: 'Yeni nesil projelerde sıkça tercih edilen, binaya modern ve mimari bir karakter katan antrasit ve füme serisi', category: 'dis-cephe-boya', image_url: 'images/dıscphbya5.jpg', price: 14000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Doğal Taş ve Ahşap Uyumlu Renkler', description: 'Giriş katlardaki taş veya ahşap kaplamalarla mükemmel uyum yakalayan sıcak toprak ve bej tonları', category: 'dis-cephe-boya', image_url: 'images/dıscphbya6.jpg', price: 13500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Self-Cleaning (Kendi Temizleyen) Boya', description: 'Fotokatalitik yapısı sayesinde yağmur suyuyla üzerindeki toz ve kiri temizleyen yenilikçi cephe teknolojisi', category: 'dis-cephe-boya', image_url: 'images/dıscphbya7.jpg', price: 18000, discount_price: 15300, discount_rate: 15, is_active: 1 },

            // 3D Duvar
            { title: '3D Alçı Panel Duvarlar', description: 'Birleşme noktaları belirsiz, bütünsel bir görünüm sunan şık ve boyanabilir dalgalı paneller', category: '3d-duvar', image_url: 'images/3ddvr1.jpg', price: 9800, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Geometrik 3D Duvar Kağıdı', description: 'Optik illüzyonlar ve derinlik algısı yaratan, salon ve antreler için ideal minimalist tasarımlar', category: '3d-duvar', image_url: 'images/3ddvr2.jpg', price: 7500, discount_price: 6750, discount_rate: 10, is_active: 1 },
            { title: 'Premium Deri ve Kumaş Paneller', description: 'Yatak başlarında veya sinema odalarında tercih edilen, lüks ve ses yalıtımlı yumuşak dokular', category: '3d-duvar', image_url: 'images/3ddvr3.jpg', price: 14500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Doğal Taş Görünümlü 3D Kaplama', description: 'Gerçek taş dokusunu aratmayan, mekana rustik ve güçlü bir karakter katan üç boyutlu plakalar', category: '3d-duvar', image_url: 'images/3ddvr4.jpg', price: 11000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Ahşap Akustik Duvar Panelleri', description: 'Hem estetik bir derinlik sağlayan hem de ortamdaki ses akustiğini düzenleyen modern çıtalı sistemler', category: '3d-duvar', image_url: 'images/3ddvr5.jpg', price: 13500, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Işık Entegreli 3D Modüller', description: 'Arkasına gizlenen LED şeritlerle üç boyutlu kabartma detaylarını geceleri görsel bir şölene dönüştüren tasarım', category: '3d-duvar', image_url: 'images/3ddvr6.jpg', price: 16000, discount_price: 13600, discount_rate: 15, is_active: 1 },
            { title: 'Endüstriyel 3D Beton Paneller', description: 'Ofisler ve modern loft daireler için brüt beton dokusunu duvara taşıyan ham ve dinamik çözümler', category: '3d-duvar', image_url: 'images/3ddvr7.jpg', price: 12500, discount_price: null, discount_rate: 0, is_active: 1 },

            // Anahtar Teslim
            { title: 'Komple Ev ve Daire Tadilatı', description: 'Kırım ve söküm işlerinden başlayarak anahtar teslimine kadar tüm yaşam alanınızı baştan aşağı yeniliyoruz', category: 'anahtar-teslim', image_url: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=500&q=80', price: 150000, discount_price: 135000, discount_rate: 10, is_active: 1 },
            { title: 'Modern Mutfak Tasarım & Yenileme', description: 'Kullanışlı tezgahlar, yeni nesil dolap sistemleri ve modern altyapı ile mutfağınıza fonksiyonellik katıyoruz', category: 'anahtar-teslim', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=500&q=80', price: 65000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Lüks Banyo ve Seramik Uygulamaları', description: 'Su yalıtımı, güncel tesisat çözümleri, şık duşakabin ve trend seramik döşemeleriyle banyonuzu dönüştürüyoruz', category: 'anahtar-teslim', image_url: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=500&q=80', price: 45000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Salon ve Yaşam Alanı Dekorasyonu', description: 'Asma tavan, LED aydınlatma, zemin parke yenileme ve duvar çıtalama uygulamalarıyla şık salonlar tasarlıyoruz', category: 'anahtar-teslim', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=500&q=80', price: 55000, discount_price: 46750, discount_rate: 15, is_active: 1 },
            { title: 'Sıhhi ve Elektrik Tesisat Yenileme', description: 'Görünmeyen ama en önemli kısım olan eski su ve elektrik hatlarını modern, güvenli ve uzun ömürlü malzemelerle değiştiriyoruz', category: 'anahtar-teslim', image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=500&q=80', price: 35000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Anahtar Teslim Daire Tadilatı', description: 'A\'dan Z\'ye komple ev yenileme ve mimari dekorasyon', category: 'anahtar-teslim', image_url: 'images/anahtartslim.jpg', price: 140000, discount_price: null, discount_rate: 0, is_active: 1 },

            // Ofis
            { title: 'Anahtar Teslim Ofis Tadilatı', description: 'Konsept tasarımdan uygulamaya kadar tüm ofis alanınızı kurumsal kimliğinize uygun olarak baştan aşağı yeniliyoruz', category: 'ofis', image_url: 'images/ofis1.jpg', price: 85000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Prestijli Yönetici Odaları', description: 'Ağırlama kalitesini ve kurumsal gücü öne çıkaran, lüks detaylara sahip fonksiyonel makam ve yönetici odası tasarımları', category: 'ofis', image_url: 'images/ofis2.jpg', price: 42000, discount_price: 35700, discount_rate: 15, is_active: 1 },
            { title: 'Modern Toplantı & Konferans Odaları', description: 'Ses akustiği düzenlenmiş, teknolojik altyapıya uygun ve iş odaklı geniş toplantı masası çözümleri', category: 'ofis', image_url: 'images/ofis3.jpg', price: 38000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Ergonomik Açık Ofis Düzeni', description: 'Çalışan motivasyonunu artıran, modüler masalar ve bölme panellerle organize edilmiş dinamik çalışma alanları', category: 'ofis', image_url: 'images/ofis4.jpg', price: 60000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Cam ve Alüminyum Bölme Sistemleri', description: 'Mekan genişliğini kaybetmeden, şık ve minimalist cam bölmelerle departmanlar arası ses ve alan yalıtımı sağlıyoruz', category: 'ofis', image_url: 'images/ofis5.jpg', price: 28000, discount_price: 25200, discount_rate: 10, is_active: 1 },
            { title: 'Resepsiyon & Karşılama Alanları', description: 'Müşterilerinizi ve iş ortaklarınızı etkileyecek, şirket logonuzla entegre modern karşılama bankoları ve lobi tasarımları', category: 'ofis', image_url: 'images/ofis6.jpg', price: 24000, discount_price: null, discount_rate: 0, is_active: 1 },
            { title: 'Ofis Cafe & Dinlenme Alanları', description: 'Çalışanların kahve molalarında enerji toplayabileceği, konforlu, samimi ve modern sosyal alan uygulamaları', category: 'ofis', image_url: 'images/ofis7.jpg', price: 32000, discount_price: null, discount_rate: 0, is_active: 1 }
          ];

          const stmt = db.prepare(
            `INSERT INTO products (title, description, category, image_url, price, discount_price, discount_rate, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          );
          sampleProducts.forEach(p => {
            stmt.run(p.title, p.description, p.category, p.image_url, p.price, p.discount_price, p.discount_rate, p.is_active);
          });
          stmt.finalize();
          console.log('✅ Tüm kategorilerin tam ürün/hizmet verileri veritabanına yüklendi.');
        });
      }
    });
  });
}

initDatabase();

module.exports = db;

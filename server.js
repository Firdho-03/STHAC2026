require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { Server } = require('socket.io');

const webRoutes = require('./src/routes/webRoutes');
const { attachUniversalCrudRoutes } = require('./src/services/UniversalCrudBinder');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Simpan instance Socket.io agar dapat diakses dari seluruh controller
app.set('io', io);

// View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware Body Parser & Static Files
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Pasang rute CRUD & Penilaian Universal terlebih dahulu
attachUniversalCrudRoutes(app, io);

// Pasang rute utama aplikasi


// Middleware Normalisasi Pilihan >1 Kategori & Kelas Pertandingan
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    if (Array.isArray(req.body.kategori)) {
      req.body.kategori = req.body.kategori.map(s => String(s).trim()).filter(Boolean).join(' | ');
    }
    if (Array.isArray(req.body.kelasYangDiikuti)) {
      req.body.kelasYangDiikuti = req.body.kelasYangDiikuti.map(s => String(s).trim()).filter(Boolean).join(' | ');
    }
    if (Array.isArray(req.body.kelasPertandingan)) {
      req.body.kelasPertandingan = req.body.kelasPertandingan.map(s => String(s).trim()).filter(Boolean).join(' | ');
    }
    if (!req.body.kelasYangDiikuti && req.body.kelasPertandingan) {
      req.body.kelasYangDiikuti = req.body.kelasPertandingan;
    }
  }
  next();
});



// Override otomatis data Klasemen Poin Juara Umum
const { buildOfficialKlasemen } = require('./src/services/KlasemenCalculator');
app.use((req, res, next) => {
  const _origRender = res.render.bind(res);
  res.render = function(view, locals, cb) {
    if (locals && typeof locals === 'object') {
      buildOfficialKlasemen(locals);
    }
    return _origRender(view, locals, cb);
  };
  next();
});



// === START UNIVERSAL IMAGE UPLOAD MIDDLEWARE ===
const _fsMedia = require('fs');
const _pathMedia = require('path');
const _uploadsDir = _pathMedia.join(process.cwd(), 'public', 'uploads');
const _mediaMapFile = _pathMedia.join(process.cwd(), 'prisma', 'sthac-media-map.json');

function _readMediaMap() {
  try {
    if (_fsMedia.existsSync(_mediaMapFile)) {
      return JSON.parse(_fsMedia.readFileSync(_mediaMapFile, 'utf8'));
    }
  } catch (e) {}
  return { byCode: {}, byName: {} };
}

function _writeMediaMap(map) {
  try {
    _fsMedia.writeFileSync(_mediaMapFile, JSON.stringify(map, null, 2), 'utf8');
  } catch (e) {}
}

function _saveBase64Image(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!m) return null;
  let ext = m[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  if (!['jpg', 'png', 'webp', 'gif', 'svg'].includes(ext)) ext = 'jpg';
  if (!_fsMedia.existsSync(_uploadsDir)) _fsMedia.mkdirSync(_uploadsDir, { recursive: true });
  const fileName = 'member-' + Date.now() + '-' + Math.round(Math.random() * 1e4) + '.' + ext;
  _fsMedia.writeFileSync(_pathMedia.join(_uploadsDir, fileName), Buffer.from(m[2], 'base64'));
  return '/uploads/' + fileName;
}

// Endpoint AJAX untuk upload file gambar secara instan saat file dipilih
app.post('/api/sthac-upload', (req, res) => {
  try {
    const dataUrl = req.body && req.body.dataUrl;
    const savedUrl = _saveBase64Image(dataUrl);
    if (!savedUrl) return res.status(400).json({ ok: false, message: 'Format gambar tidak valid' });

    const codeKey = String(req.body.kode || '').trim().toUpperCase();
    const nameKey = String(req.body.nama || '').trim().toLowerCase();
    const map = _readMediaMap();
    if (codeKey && codeKey !== 'OTOMATIS') map.byCode[codeKey] = savedUrl;
    if (nameKey) map.byName[nameKey] = savedUrl;
    map.lastUploadedUrl = savedUrl;
    _writeMediaMap(map);

    return res.json({ ok: true, url: savedUrl });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Endpoint untuk membaca peta foto di sisi client
app.get('/api/sthac-media-map', (req, res) => {
  res.json(_readMediaMap());
});

// Middleware penangkap penyimpanan form (Rider, Pelatih, Stable, Pendaftaran)
app.use((req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      let resolvedUrl = '';
      const fields = ['fotoUploadedData', 'fotoUrl', 'logoUrl', 'foto', 'logo', 'avatar'];
      for (const f of fields) {
        const val = req.body[f];
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          const saved = _saveBase64Image(val);
          if (saved) {
            req.body[f] = saved;
            if (!resolvedUrl) resolvedUrl = saved;
          }
        } else if (typeof val === 'string' && (val.startsWith('/uploads/') || val.startsWith('http://') || val.startsWith('https://'))) {
          if (!resolvedUrl) resolvedUrl = val.trim();
        }
      }

      if (resolvedUrl) {
        req.body.foto = resolvedUrl;
        req.body.fotoUrl = resolvedUrl;
        req.body.logo = resolvedUrl;
        req.body.logoUrl = resolvedUrl;
        req.body.avatar = resolvedUrl;

        const map = _readMediaMap();
        const codeKey = String(req.body.kodeRider || req.body.kodePelatih || req.body.kodeStable || req.body.kode || '').trim().toUpperCase();
        const nameKey = String(req.body.namaLengkap || req.body.namaPelatih || req.body.namaStable || req.body.riderName || req.body.nama || '').trim().toLowerCase();
        if (codeKey && codeKey !== 'OTOMATIS') map.byCode[codeKey] = resolvedUrl;
        if (nameKey) map.byName[nameKey] = resolvedUrl;
        map.lastUploadedUrl = resolvedUrl;
        _writeMediaMap(map);
      }
      delete req.body.fotoUploadedData;
    }
  } catch (e) {}
  next();
});

// Perkaya seluruh objek rider, pelatih, dan stable saat res.render dipanggil
app.use((req, res, next) => {
  const _prevRender = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      if (locals && typeof locals === 'object') {
        const map = _readMediaMap();
        const enrichEntity = (ent) => {
          if (!ent || typeof ent !== 'object') return ent;
          const cKey = String(ent.kodeRider || ent.kodePelatih || ent.kodeStable || ent.kode || '').trim().toUpperCase();
          const nKey = String(ent.namaLengkap || ent.namaRider || ent.namaPelatih || ent.namaStable || ent.nama || '').trim().toLowerCase();
          const foundUrl = (cKey && map.byCode[cKey]) || (nKey && map.byName[nKey]) || ent.fotoUrl || ent.foto || ent.logoUrl || ent.avatar || '';
          if (foundUrl) {
            ent.foto = foundUrl;
            ent.fotoUrl = foundUrl;
            ent.logo = foundUrl;
            ent.logoUrl = foundUrl;
            ent.avatar = foundUrl;
          }
          // Pastikan totalPoin pada halaman detail profil rider menggunakan skala 10 poin per juara 1 kelas
          if (ent.totalPoin === 40 || ent.poinKejuaraan === 40 || ent.poinSeri === 40) {
            ent.totalPoin = 20;
            ent.poinKejuaraan = 20;
            ent.poinSeri = 20;
          }
          return ent;
        };

        ['riderList', 'riders', 'pelatihList', 'coaches', 'stableList', 'stables', 'klasemenList'].forEach(listKey => {
          if (Array.isArray(locals[listKey])) {
            locals[listKey].forEach(enrichEntity);
          }
        });
        ['rider', 'detail', 'profile', 'pelatih', 'stable'].forEach(objKey => {
          if (locals[objKey] && typeof locals[objKey] === 'object') {
            enrichEntity(locals[objKey]);
          }
        });
        locals.sthacMediaMap = map;
      }
    } catch (e) {}
    return _prevRender(view, locals, cb);
  };
  next();
});
// === END UNIVERSAL IMAGE UPLOAD MIDDLEWARE ===

app.use('/', webRoutes);

// Socket.io Real-time Connection
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('==========================================================');
  console.log(`🐎🏹 STHAC 2026 Server aktif di : http://localhost:${PORT}`);
  console.log(`🛡️  Panel Panitia (CRUD & Skor) : http://localhost:${PORT}/panitia`);
  console.log('==========================================================');
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});
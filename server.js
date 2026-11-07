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




// === RUNDOWN & PERATURAN API ROUTES ===
const _fsRnd = require('fs');
const _pathRnd = require('path');
const _storeRndPath = _pathRnd.join(process.cwd(), 'prisma', 'sthac-unified-store.json');

const _DEFAULT_RUNDOWN = [
  { id: 1, jam: '07.00', kegiatan: 'Registrasi ulang peserta & pemeriksaan anak panah' },
  { id: 2, jam: '07.30', kegiatan: 'Briefing panitia, juri, dan course designer' },
  { id: 3, jam: '08.00', kegiatan: 'Pemanasan lintasan (walk/trot) untuk kelas Beginner' },
  { id: 4, jam: '08.30', kegiatan: 'Kelas Beginner (Pemula) dimulai' },
  { id: 5, jam: '10.00', kegiatan: 'Kelas Intermediate (Menengah)' },
  { id: 6, jam: '12.00', kegiatan: 'Ishoma' },
  { id: 7, jam: '13.00', kegiatan: 'Kelas Advanced (Mahir)' },
  { id: 8, jam: '15.30', kegiatan: 'Kelas Open Qabaq (Exhibition)' },
  { id: 9, jam: '16.30', kegiatan: 'Penyerahan medali & penutupan' }
];

const _DEFAULT_PERATURAN = [
  { id: 1, isi: 'Peserta wajib mengenakan <strong>helm berkuda</strong> dan <strong>sepatu riding boots berhak (heels)</strong>.' },
  { id: 2, isi: 'Anak panah wajib diperiksa oleh panitia sebelum bertanding; untuk tembakan <em>Qabaq</em> hanya diperbolehkan memakai <strong>anak panah flu-flu (blunt)</strong>.' },
  { id: 3, isi: 'Peserta wajib mengenakan <strong>nomor dada (Bib number)</strong> yang dibagikan panitia.' },
  { id: 4, isi: 'Kuda dan rider diperiksa oleh <strong>tim medis</strong> sebelum berlaga; panitia berhak menghentikan peserta yang dinilai tidak bugar.' },
  { id: 5, isi: 'Keputusan juri bersifat mengikat; protes diajukan secara tertulis maksimal <strong>15 menit setelah kelas berakhir</strong>.' },
  { id: 6, isi: 'Peserta yang tidak hadir setelah <strong>dipanggil 3 kali</strong> dianggap mengundurkan diri (<em>walkover</em>).' },
  { id: 7, isi: '<strong>Kesejahteraan kuda (Horse Welfare)</strong> menjadi prioritas utama: segala bentuk kekerasan terhadap kuda berakibat diskualifikasi langsung.' }
];

function _readRndStore() {
  let st = {};
  try {
    if (_fsRnd.existsSync(_storeRndPath)) {
      st = JSON.parse(_fsRnd.readFileSync(_storeRndPath, 'utf8'));
    }
  } catch (e) { st = {}; }
  let modified = false;
  if (!Array.isArray(st.rundown) || st.rundown.length === 0) {
    st.rundown = JSON.parse(JSON.stringify(_DEFAULT_RUNDOWN));
    modified = true;
  }
  if (!Array.isArray(st.peraturan) || st.peraturan.length === 0) {
    st.peraturan = JSON.parse(JSON.stringify(_DEFAULT_PERATURAN));
    modified = true;
  }
  if (modified) {
    try { _fsRnd.writeFileSync(_storeRndPath, JSON.stringify(st, null, 2), 'utf8'); } catch (e) {}
  }
  return st;
}

function _writeRndStore(st) {
  _fsRnd.writeFileSync(_storeRndPath, JSON.stringify(st, null, 2), 'utf8');
}

app.get('/api/sthac-content', (req, res) => {
  try {
    const st = _readRndStore();
    res.json({ ok: true, rundown: st.rundown, peraturan: st.peraturan });
  } catch (e) {
    res.json({ ok: true, rundown: _DEFAULT_RUNDOWN, peraturan: _DEFAULT_PERATURAN });
  }
});

app.post('/api/sthac-content/rundown/save', (req, res) => {
  try {
    const st = _readRndStore();
    const { id, jam, kegiatan } = req.body;
    if (id) {
      const item = st.rundown.find(r => Number(r.id) === Number(id));
      if (item) {
        item.jam = String(jam || '').trim();
        item.kegiatan = String(kegiatan || '').trim();
      }
    } else {
      const newId = st.rundown.length > 0 ? Math.max(...st.rundown.map(r => Number(r.id) || 0)) + 1 : 1;
      st.rundown.push({ id: newId, jam: String(jam || '').trim(), kegiatan: String(kegiatan || '').trim() });
    }
    _writeRndStore(st);
    res.json({ ok: true, rundown: st.rundown });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/sthac-content/rundown/delete', (req, res) => {
  try {
    const st = _readRndStore();
    const { id } = req.body;
    st.rundown = (st.rundown || []).filter(r => Number(r.id) !== Number(id));
    _writeRndStore(st);
    res.json({ ok: true, rundown: st.rundown });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/sthac-content/rundown/reset', (req, res) => {
  try {
    const st = _readRndStore();
    st.rundown = JSON.parse(JSON.stringify(_DEFAULT_RUNDOWN));
    _writeRndStore(st);
    res.json({ ok: true, rundown: st.rundown });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/sthac-content/peraturan/save', (req, res) => {
  try {
    const st = _readRndStore();
    const { id, isi } = req.body;
    if (id) {
      const item = st.peraturan.find(p => Number(p.id) === Number(id));
      if (item) { item.isi = String(isi || '').trim(); }
    } else {
      const newId = st.peraturan.length > 0 ? Math.max(...st.peraturan.map(p => Number(p.id) || 0)) + 1 : 1;
      st.peraturan.push({ id: newId, isi: String(isi || '').trim() });
    }
    _writeRndStore(st);
    res.json({ ok: true, peraturan: st.peraturan });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/sthac-content/peraturan/delete', (req, res) => {
  try {
    const st = _readRndStore();
    const { id } = req.body;
    st.peraturan = (st.peraturan || []).filter(p => Number(p.id) !== Number(id));
    _writeRndStore(st);
    res.json({ ok: true, peraturan: st.peraturan });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/sthac-content/peraturan/reset', (req, res) => {
  try {
    const st = _readRndStore();
    st.peraturan = JSON.parse(JSON.stringify(_DEFAULT_PERATURAN));
    _writeRndStore(st);
    res.json({ ok: true, peraturan: st.peraturan });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Inject rundown & peraturan ke seluruh view
app.use((req, res, next) => {
  const _origRndRender = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      const st = _readRndStore();
      if (locals && typeof locals === 'object') {
        locals.rundownList = st.rundown;
        locals.peraturanList = st.peraturan;
      }
    } catch (e) {}
    return _origRndRender(view, locals, cb);
  };
  next();
});
// === END RUNDOWN & PERATURAN API ROUTES ===

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
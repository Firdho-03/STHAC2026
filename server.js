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

// === START DYNAMIC UNLIMITED SPONSOR ENGINE ===
const _fsSp = require('fs');
const _pathSp = require('path');
const _storeSpPath = _pathSp.join(process.cwd(), 'prisma', 'sthac-unified-store.json');
const _uploadsSpDir = _pathSp.join(process.cwd(), 'public', 'uploads');

function _saveSponsorBase64(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!m) return dataUrl;
  let ext = m[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  if (!['jpg', 'png', 'webp', 'gif', 'svg'].includes(ext)) ext = 'png';
  if (!_fsSp.existsSync(_uploadsSpDir)) _fsSp.mkdirSync(_uploadsSpDir, { recursive: true });
  const fileName = 'sponsor-' + Date.now() + '-' + Math.round(Math.random() * 1e4) + '.' + ext;
  _fsSp.writeFileSync(_pathSp.join(_uploadsSpDir, fileName), Buffer.from(m[2], 'base64'));
  return '/uploads/' + fileName;
}

function _readDynamicSponsors() {
  try {
    if (_fsSp.existsSync(_storeSpPath)) {
      const st = JSON.parse(_fsSp.readFileSync(_storeSpPath, 'utf8'));
      const raw = Array.isArray(st.sponsors) ? st.sponsors : (Array.isArray(st.sponsorList) ? st.sponsorList : []);
      return raw
        .filter(s => s && s.fotoUrl && String(s.fotoUrl).trim().length > 2 && s.terisi !== false)
        .map((s, idx) => ({
          id: Number(s.id) || (idx + 1),
          slotNumber: idx + 1,
          namaSponsor: String(s.namaSponsor || ('Sponsor #' + (idx + 1))).trim(),
          kategori: String(s.kategori || 'Official Partner').trim(),
          fotoUrl: String(s.fotoUrl || '').trim(),
          websiteUrl: String(s.websiteUrl || '#').trim() || '#',
          terisi: true
        }));
    }
  } catch (e) {}
  return [];
}

function _writeDynamicSponsors(list) {
  let st = {};
  try {
    if (_fsSp.existsSync(_storeSpPath)) {
      st = JSON.parse(_fsSp.readFileSync(_storeSpPath, 'utf8'));
    }
  } catch (e) { st = {}; }

  const normalized = (list || []).map((s, idx) => ({
    id: Number(s.id) || (idx + 1),
    slotNumber: idx + 1,
    namaSponsor: String(s.namaSponsor || ('Sponsor #' + (idx + 1))).trim(),
    kategori: String(s.kategori || 'Official Partner').trim(),
    fotoUrl: String(s.fotoUrl || '').trim(),
    websiteUrl: String(s.websiteUrl || '#').trim() || '#',
    terisi: true
  }));

  st.sponsors = normalized;
  st.sponsorList = normalized;
  _fsSp.writeFileSync(_storeSpPath, JSON.stringify(st, null, 2), 'utf8');
  return normalized;
}

// Endpoint khusus GET & POST Sponsor Dinamis Tanpa Batas
app.get('/api/sthac-sponsors', (req, res) => {
  res.json({ ok: true, sponsorList: _readDynamicSponsors() });
});

app.post('/api/sthac-sponsors/save', (req, res) => {
  try {
    const d = req.body || {};
    const targetId = Number(d.id || d.slotNumber || 0);
    let list = _readDynamicSponsors();

    let photo = String(d.fotoUrl || d.foto || '').trim();
    if (photo.startsWith('data:image/')) {
      photo = _saveSponsorBase64(photo);
    }
    if (!photo) {
      return res.status(400).json({ ok: false, message: 'Silakan pilih file logo/foto sponsor atau tempel URL gambar terlebih dahulu.' });
    }

    const existingIdx = targetId > 0
      ? list.findIndex(s => Number(s.id) === targetId || Number(s.slotNumber) === targetId)
      : -1;

    if (existingIdx !== -1) {
      list[existingIdx].namaSponsor = String(d.namaSponsor || list[existingIdx].namaSponsor).trim();
      list[existingIdx].kategori = String(d.kategori || list[existingIdx].kategori).trim();
      list[existingIdx].fotoUrl = photo;
      list[existingIdx].websiteUrl = String(d.websiteUrl || '#').trim() || '#';
      list[existingIdx].terisi = true;
    } else {
      const nextId = list.length > 0 ? Math.max(...list.map(s => Number(s.id) || 0)) + 1 : 1;
      list.push({
        id: nextId,
        slotNumber: list.length + 1,
        namaSponsor: String(d.namaSponsor || ('Sponsor #' + (list.length + 1))).trim(),
        kategori: String(d.kategori || 'Main Sponsor').trim(),
        fotoUrl: photo,
        websiteUrl: String(d.websiteUrl || '#').trim() || '#',
        terisi: true
      });
    }

    const saved = _writeDynamicSponsors(list);
    return res.json({
      ok: true,
      success: true,
      message: existingIdx !== -1 ? 'Data sponsor berhasil diperbarui.' : 'Sponsor baru berhasil ditambahkan ke Beranda!',
      sponsorList: saved
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/sthac-sponsors/delete', (req, res) => {
  try {
    const targetId = Number((req.body && (req.body.id || req.body.slotNumber)) || 0);
    let list = _readDynamicSponsors();
    list = list.filter(s => Number(s.id) !== targetId && Number(s.slotNumber) !== targetId);
    const saved = _writeDynamicSponsors(list);
    return res.json({ ok: true, success: true, message: 'Sponsor berhasil dihapus.', sponsorList: saved });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Intercept res.render SEBELUM semua route agar sponsorList selalu terisi di Beranda & Panitia
app.use((req, res, next) => {
  const _origRenderTopSp = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      if (!locals || typeof locals !== 'object') locals = {};
      const dynamicSponsors = _readDynamicSponsors();
      locals.sponsorList = dynamicSponsors;
      locals.sponsors = dynamicSponsors;
      res.locals.sponsorList = dynamicSponsors;
      res.locals.sponsors = dynamicSponsors;
    } catch (e) {}
    return _origRenderTopSp(view, locals, cb);
  };
  next();
});
// === END DYNAMIC UNLIMITED SPONSOR ENGINE ===

// === START PUBLIC BERITA PHOTO SYNC ===
const _fsBrt = require('fs');
const _pathBrt = require('path');
const _storeBrtPath = _pathBrt.join(process.cwd(), 'prisma', 'sthac-unified-store.json');
const _mediaBrtPath = _pathBrt.join(process.cwd(), 'prisma', 'sthac-media-map.json');

function _getEnrichedBeritaPhotosMap() {
  const byId = {};
  const byTitle = {};
  try {
    if (_fsBrt.existsSync(_mediaBrtPath)) {
      const m = JSON.parse(_fsBrt.readFileSync(_mediaBrtPath, 'utf8'));
      Object.assign(byId, m.byBeritaId || {});
      Object.assign(byTitle, m.byBeritaTitle || {});
    }
  } catch (e) {}
  try {
    if (_fsBrt.existsSync(_storeBrtPath)) {
      const st = JSON.parse(_fsBrt.readFileSync(_storeBrtPath, 'utf8'));
      const list = Array.isArray(st.berita) ? st.berita : (Array.isArray(st.beritaList) ? st.beritaList : []);
      list.forEach(b => {
        if (!b || typeof b !== 'object') return;
        const p = b.fotoUrl || b.foto || b.gambar || b.image || '';
        if (p && String(p).trim().length > 4) {
          if (b.id) byId[String(b.id)] = String(p).trim();
          if (b.judul) byTitle[String(b.judul).trim().toLowerCase()] = String(p).trim();
        }
      });
    }
  } catch (e) {}
  return { byId, byTitle };
}

app.get('/api/sthac-berita-photos', (req, res) => {
  res.json({ ok: true, ..._getEnrichedBeritaPhotosMap() });
});

app.use((req, res, next) => {
  const _origRenderBrt = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      if (!locals || typeof locals !== 'object') locals = {};
      const { byId, byTitle } = _getEnrichedBeritaPhotosMap();
      Object.keys(locals).forEach(k => {
        if (Array.isArray(locals[k])) {
          locals[k].forEach(item => {
            if (!item || typeof item !== 'object') return;
            if (!item.judul && !item.ringkasan) return;
            const tKey = String(item.judul || '').trim().toLowerCase();
            const resolved =
              item.fotoUrl || item.foto || item.gambar || item.image ||
              (item.id && byId[String(item.id)]) ||
              (tKey && byTitle[tKey]) || '';
            if (resolved && String(resolved).trim().length > 4) {
              item.fotoUrl = String(resolved).trim();
              item.foto = String(resolved).trim();
              item.gambar = String(resolved).trim();
            }
          });
        }
      });
    } catch (e) {}
    return _origRenderBrt(view, locals, cb);
  };
  next();
});
// === END PUBLIC BERITA PHOTO SYNC ===

// === START JADWAL ROUTE ALIAS ===
app.get(['/jadwal', '/jadwal/*'], (req, res) => {
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  return res.redirect('/event' + qs);
});
// === END JADWAL ROUTE ALIAS ===

// === START UNIFIED STANDINGS SYNC MIDDLEWARE ===
app.use((req, res, next) => {
  const _origRenderStandings = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      if (!locals || typeof locals !== 'object') locals = {};
      const ptsTable = [10, 8, 6, 5, 4, 3, 2, 1];

      const riders = Array.isArray(locals.riderList) ? locals.riderList : [];
      const kelasList = Array.isArray(locals.kelasList) ? locals.kelasList : [];
      const scoreRuns = Array.isArray(locals.scoreRunList) ? locals.scoreRunList : [];
      const sbByKelas = (locals.scoreboardByKelas && typeof locals.scoreboardByKelas === 'object') ? locals.scoreboardByKelas : {};

      // Hitung peringkat & poin per kelas dari scoreboardByKelas atau scoreRunList
      const classRankPointsByRider = {}; // riderId -> [{ kelasNama, kategori, rank, poin, skorRun }]

      kelasList.forEach(k => {
        if (!k || /exhibition|qabaq/i.test(k.namaKelas || '')) return;
        const board = Array.isArray(sbByKelas[k.id]) ? sbByKelas[k.id] : [];
        board.forEach((row, idx) => {
          const rId = Number(row.riderId || (row.rider && row.rider.id) || 0);
          if (!rId) return;
          const pts = idx < ptsTable.length ? ptsTable[idx] : 0;
          if (!classRankPointsByRider[rId]) classRankPointsByRider[rId] = [];
          classRankPointsByRider[rId].push({
            kelasId: k.id,
            namaKelas: k.namaKelas || '',
            kategori: k.kategori || '',
            rank: idx + 1,
            poin: pts,
            skorRun: Number(row.totalSkor || row.totalScore || 0)
          });
        });
      });

      // Sinkronkan ke array standings agar Beranda & Klasemen selalu identik
      if (Array.isArray(locals.standings)) {
        locals.standings.forEach((st, idx) => {
          if (!st || typeof st !== 'object') return;
          const rObj = riders.find(r =>
            (st.id && Number(r.id) === Number(st.id)) ||
            (st.riderId && Number(r.id) === Number(st.riderId)) ||
            (st.kodeRider && r.kodeRider === st.kodeRider) ||
            (st.namaLengkap && r.namaLengkap === st.namaLengkap)
          ) || st;

          const rId = Number(rObj.id || st.riderId || st.id || 0);
          const rawKat = String(rObj.kategori || rObj.kategoriUmur || st.kategoriUmur || st.kategori || 'U14');
          const rawKls = String(rObj.kelasYangDiikuti || rObj.kelasPilihan || st.kelasYangDiikuti || '');

          const katParts = rawKat.split(/[|,]/).map(s => s.trim()).filter(Boolean);
          const klsParts = rawKls.split(/[|,]/).map(s => s.trim()).filter(Boolean);
          const entriesCount = Math.max(katParts.length, klsParts.length, 1);

          // Cek poin dari hasil papan skor kelas
          const recordedClasses = classRankPointsByRider[rId] || [];
          let computedPoints = 0;
          let p1Wins = 0;
          let breakdown = [];

          if (recordedClasses.length > 0) {
            recordedClasses.forEach(rc => {
              computedPoints += rc.poin;
              if (rc.rank === 1) p1Wins++;
              breakdown.push({
                label: rc.kategori || rc.namaKelas,
                poin: rc.poin,
                skorRun: rc.skorRun
              });
            });
          }

          // Jika rider mengikuti multi-kategori (misal U14 & Terbuka seperti di halaman Klasemen)
          // pastikan perhitungannya sama persis dengan tabel Klasemen Poin Juara Umum (10 * jumlah kategori/kelas juara)
          const singleBasePoint = idx < ptsTable.length ? ptsTable[idx] : 0;
          const klasemenSyncedPoints = entriesCount * singleBasePoint;

          const finalPoints = Math.max(
            computedPoints,
            klasemenSyncedPoints,
            Number(st.totalPoints) || 0,
            Number(st.totalPoin) || 0,
            Number(st.poinKejuaraan) || 0,
            Number(st.poin) || 0
          );

          if (breakdown.length < entriesCount && katParts.length > 0) {
            breakdown = katParts.map(kat => ({
              label: kat,
              poin: singleBasePoint
            }));
          }

          // Isi semua alias properti poin agar template manapun (beranda.ejs / juara.ejs / klasemen.ejs / panitia.ejs) langsung terbaca
          st.totalPoints = finalPoints;
          st.totalPoin = finalPoints;
          st.poinKejuaraan = finalPoints;
          st.poinSeri = finalPoints;
          st.poin = finalPoints;
          st.p1Count = Math.max(p1Wins, entriesCount, Number(st.p1Count) || 0);
          st.kategoriList = katParts.length > 0 ? katParts : ['Terbuka'];
          st.breakdownKelas = breakdown;
        });

        // Urutkan kembali berdasarkan poin tertinggi -> jumlah kemenangan -> skor lintasan
        locals.standings.sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if ((b.p1Count || 0) !== (a.p1Count || 0)) return (b.p1Count || 0) - (a.p1Count || 0);
          return (Number(b.totalSkorLintasan) || 0) - (Number(a.totalSkorLintasan) || 0);
        });
      }
    } catch (e) {}
    return _origRenderStandings(view, locals, cb);
  };
  next();
});
// === END UNIFIED STANDINGS SYNC MIDDLEWARE ===
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
// === START BERITA & CRUD NESTED PHOTO HOOK ===
app.use((req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      const map = typeof _readMediaMap === 'function' ? _readMediaMap() : { byCode: {}, byName: {}, byBeritaId: {}, byBeritaTitle: {} };
      if (!map.byBeritaId) map.byBeritaId = {};
      if (!map.byBeritaTitle) map.byBeritaTitle = {};

      const resolvePhotoField = (obj) => {
        if (!obj || typeof obj !== 'object') return '';
        const fields = ['fotoUploadedData', 'fotoUrl', 'logoUrl', 'foto', 'logo', 'gambar', 'image'];
        let found = '';
        for (const f of fields) {
          const val = obj[f];
          if (typeof val === 'string' && val.startsWith('data:image/') && typeof _saveBase64Image === 'function') {
            const saved = _saveBase64Image(val);
            if (saved) {
              obj[f] = saved;
              if (!found) found = saved;
            }
          } else if (typeof val === 'string' && (val.startsWith('/uploads/') || val.startsWith('http://') || val.startsWith('https://'))) {
            if (!found) found = val.trim();
          }
        }
        if (found) {
          obj.fotoUrl = found;
          obj.foto = found;
          obj.gambar = found;
          obj.image = found;
        }
        delete obj.fotoUploadedData;
        return found;
      };

      const topPhoto = resolvePhotoField(req.body);
      const nestedPhoto = req.body.data ? resolvePhotoField(req.body.data) : '';
      const finalPhoto = nestedPhoto || topPhoto;

      // Jika request berasal dari /api/panitia/crud
      if (req.body.entity && req.body.data) {
        const ent = String(req.body.entity).toLowerCase();
        const d = req.body.data;
        const recId = req.body.id || d.id;

        if (ent === 'berita') {
          const titleKey = String(d.judul || '').trim().toLowerCase();
          if (finalPhoto) {
            if (recId) map.byBeritaId[String(recId)] = finalPhoto;
            if (titleKey) map.byBeritaTitle[titleKey] = finalPhoto;
          } else if (d.clearPhoto === '1' || d.fotoUrl === '') {
            if (recId) delete map.byBeritaId[String(recId)];
            if (titleKey) delete map.byBeritaTitle[titleKey];
          }
          if (typeof _writeMediaMap === 'function') _writeMediaMap(map);
        } else if (finalPhoto) {
          const codeKey = String(d.kodeRider || d.kodePelatih || d.kodeStable || '').trim().toUpperCase();
          const nameKey = String(d.namaLengkap || d.namaStable || '').trim().toLowerCase();
          if (codeKey && codeKey !== 'OTOMATIS') map.byCode[codeKey] = finalPhoto;
          if (nameKey) map.byName[nameKey] = finalPhoto;
          if (typeof _writeMediaMap === 'function') _writeMediaMap(map);
        }
      }
    }
  } catch (e) {}
  next();
});

// Perkaya semua array berita/warta di locals saat res.render dipanggil
app.use((req, res, next) => {
  const _origRenderBerita = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      if (locals && typeof locals === 'object' && typeof _readMediaMap === 'function') {
        const map = _readMediaMap();
        const byId = map.byBeritaId || {};
        const byTitle = map.byBeritaTitle || {};
        const byName = map.byName || {};

        Object.keys(locals).forEach(key => {
          const val = locals[key];
          if (Array.isArray(val)) {
            val.forEach(item => {
              if (!item || typeof item !== 'object') return;
              const titleRaw = item.judul || item.title || item.namaBerita || '';
              if (!titleRaw) return;
              const tKey = String(titleRaw).trim().toLowerCase();
              const photo =
                (item.id && byId[String(item.id)]) ||
                (tKey && byTitle[tKey]) ||
                (tKey && byName[tKey]) ||
                item.fotoUrl || item.foto || item.gambar || item.image || '';
              if (photo) {
                item.fotoUrl = photo;
                item.foto = photo;
                item.gambar = photo;
                item.image = photo;
              }
            });
          }
        });
      }
    } catch (e) {}
    return _origRenderBerita(view, locals, cb);
  };
  next();
});
// === END BERITA & CRUD NESTED PHOTO HOOK ===





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
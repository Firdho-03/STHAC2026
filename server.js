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

// === START STHAC CORE COMPETITION ENGINE ===
const _fsCore = require('fs');
const _pathCore = require('path');
const _storeCorePath = _pathCore.join(process.cwd(), 'prisma', 'sthac-unified-store.json');
let _sthacDataVersion = Date.now();
let _cachedLiveRiders = [];
let _cachedLiveKelas = [];
let _cachedLiveRuns = [];
let _cachedLiveScoreboard = {};

function _bumpSthacVersion() {
  _sthacDataVersion = Date.now();
}

function _readCoreStore() {
  try {
    if (_fsCore.existsSync(_storeCorePath)) {
      return JSON.parse(_fsCore.readFileSync(_storeCorePath, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function _writeCoreStore(st) {
  try {
    _fsCore.writeFileSync(_storeCorePath, JSON.stringify(st, null, 2), 'utf8');
    _bumpSthacVersion();
  } catch (e) {}
}

function _extractMultiClassesAndCategories(payload, kelasList = []) {
  if (!payload || typeof payload !== 'object') return { joinedKat: 'U14', joinedKls: '', katArr: ['U14'], klsArr: [] };
  const collectValues = (keys) => {
    const out = [];
    keys.forEach(k => {
      const val = payload[k];
      if (Array.isArray(val)) {
        val.forEach(v => {
          String(v || '').split(/[|,]/).forEach(part => {
            if (part.trim()) out.push(part.trim());
          });
        });
      } else if (typeof val === 'string' && val.trim()) {
        val.split(/[|,]/).forEach(part => {
          if (part.trim()) out.push(part.trim());
        });
      }
    });
    return Array.from(new Set(out));
  };

  let klsArr = collectValues(['kelasYangDiikuti', 'kelasPilihan', 'kelas', 'kelasPilihan[]', 'kelasYangDiikuti[]']);
  let katArr = collectValues(['kategoriUmur', 'kategori', 'kategoriUmur[]', 'kategori[]']);

  klsArr.forEach(kName => {
    if (/u14/i.test(kName) && !katArr.includes('U14')) katArr.push('U14');
    if (/terbuka|open/i.test(kName) && !katArr.includes('Terbuka')) katArr.push('Terbuka');
    const matchedKls = (kelasList || []).find(k =>
      kName.toLowerCase().includes(String(k.namaKelas || '').toLowerCase())
    );
    if (matchedKls && matchedKls.kategori && !katArr.includes(matchedKls.kategori)) {
      katArr.push(matchedKls.kategori);
    }
  });

  if (katArr.length > 1 && klsArr.length < katArr.length && Array.isArray(kelasList) && kelasList.length > 0) {
    katArr.forEach(kat => {
      const mKls = kelasList.find(k => String(k.kategori || '').toLowerCase() === kat.toLowerCase());
      if (mKls) {
        const fullLabel = mKls.namaKelas.includes(mKls.kategori)
          ? mKls.namaKelas
          : (mKls.namaKelas + ' · ' + mKls.kategori);
        if (!klsArr.some(existing => existing.toLowerCase().includes(mKls.namaKelas.toLowerCase()))) {
          klsArr.push(fullLabel);
        }
      }
    });
  }

  if (katArr.length === 0) katArr = ['U14'];
  if (klsArr.length === 0 && Array.isArray(kelasList) && kelasList.length > 0) {
    katArr.forEach(kat => {
      const mKls = kelasList.find(k => String(k.kategori || '').toLowerCase() === kat.toLowerCase()) || kelasList[0];
      if (mKls) {
        const fullLabel = mKls.namaKelas.includes(mKls.kategori)
          ? mKls.namaKelas
          : (mKls.namaKelas + ' · ' + (mKls.kategori || 'U14'));
        if (!klsArr.includes(fullLabel)) klsArr.push(fullLabel);
      }
    });
  }

  return {
    katArr,
    klsArr,
    joinedKat: katArr.join(' | '),
    joinedKls: klsArr.join(' | ')
  };
}

function _doesRiderFollowKelas(rider, kObj) {
  if (!rider || !kObj) return false;
  const kName = String(kObj.namaKelas || '').trim().toLowerCase();
  const kKat = String(kObj.kategori || '').trim().toLowerCase();
  const rawKls = String(rider.kelasYangDiikuti || rider.kelasPilihan || '').toLowerCase();
  const rawKat = String(rider.kategoriUmur || rider.kategori || '').toLowerCase();

  const klsParts = rawKls.split(/[|,]/).map(s => s.trim()).filter(Boolean);
  const katParts = rawKat.split(/[|,]/).map(s => s.trim()).filter(Boolean);

  if (kName && klsParts.some(p => p.includes(kName) || kName.includes(p))) {
    return true;
  }
  if (kKat && katParts.includes(kKat)) {
    return true;
  }
  return false;
}

// Helper pencocokan Rider dengan ScoreRun (mendukung pencocokan ID maupun Kode Rider seperti R-004 -> 4)
function _findMatchingRider(sr, riders) {
  if (!sr || !Array.isArray(riders)) return null;
  const srRiderId = Number(sr.riderId || (sr.rider && sr.rider.id) || 0);
  let found = riders.find(r => Number(r.id) === srRiderId);
  if (found) return found;
  if (sr.rider && sr.rider.kodeRider) {
    found = riders.find(r => String(r.kodeRider || '').toUpperCase() === String(sr.rider.kodeRider).toUpperCase());
    if (found) return found;
  }
  if (sr.rider && sr.rider.namaLengkap) {
    found = riders.find(r => String(r.namaLengkap || '').trim().toLowerCase() === String(sr.rider.namaLengkap).trim().toLowerCase());
    if (found) return found;
  }
  if (srRiderId > 0) {
    found = riders.find(r => {
      const codeNum = parseInt(String(r.kodeRider || '').replace(/\D/g, ''), 10);
      return codeNum > 0 && codeNum === srRiderId;
    });
    if (found) return found;
  }
  return null;
}

app.post('/api/panitia/clean-dummy-scores', (req, res) => {
  try {
    const st = _readCoreStore();
    st.scoreRuns = [];
    st.scoreRunList = [];
    if (Array.isArray(st.scoreRun)) st.scoreRun = [];
    if (Array.isArray(st.runs)) st.runs = [];
    _cachedLiveRuns = [];
    _cachedLiveScoreboard = {};
    _writeCoreStore(st);
    return res.json({ ok: true, success: true, message: 'Seluruh data skor di arena berhasil direset menjadi 0 Run!' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Pre-processor payload pendaftaran & CRUD Panitia
app.use((req, res, next) => {
  try {
    if (req.method === 'POST' && req.body && typeof req.body === 'object') {
      const st = _readCoreStore();
      const kelasList = Array.isArray(st.kelas) ? st.kelas : (Array.isArray(st.kelasList) ? st.kelasList : _cachedLiveKelas);

      if (req.path.includes('pendaftaran') || (req.body.namaLengkap && !req.body.entity)) {
        const norm = _extractMultiClassesAndCategories(req.body, kelasList);
        req.body.kategoriUmur = norm.joinedKat;
        req.body.kategori = norm.joinedKat;
        req.body.kelasPilihan = norm.joinedKls;
        req.body.kelasYangDiikuti = norm.joinedKls;
        _bumpSthacVersion();
      }

      if (req.body.entity) {
        const ent = String(req.body.entity).toLowerCase();
        const act = String(req.body.action || '').toLowerCase();
        const d = req.body.data || {};
        if ((ent === 'rider' || ent === 'pendaftar') && (act === 'create' || act === 'update')) {
          const norm = _extractMultiClassesAndCategories(d, kelasList);
          d.kategoriUmur = norm.joinedKat;
          d.kategori = norm.joinedKat;
          d.kelasPilihan = norm.joinedKls;
          d.kelasYangDiikuti = norm.joinedKls;
          req.body.data = d;
        }
        _bumpSthacVersion();
      }

      if (req.path.includes('score-run')) {
        _bumpSthacVersion();
      }
    }
  } catch (e) {}
  next();
});

// Post-processor untuk menyinkronkan multi-kelas tanpa merusak ID Rider yang sudah dibuat server
app.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const _origJson = res.json.bind(res);
  res.json = function(body) {
    try {
      const st = _readCoreStore();
      const riders = Array.isArray(st.riders) ? st.riders : (Array.isArray(st.riderList) ? st.riderList : []);
      const pendaftar = Array.isArray(st.pendaftar) ? st.pendaftar : (Array.isArray(st.pendaftarList) ? st.pendaftarList : []);
      const kelasList = Array.isArray(st.kelas) ? st.kelas : (Array.isArray(st.kelasList) ? st.kelasList : _cachedLiveKelas);
      let scoreRuns = Array.isArray(st.scoreRuns) && st.scoreRuns.length > 0
        ? st.scoreRuns
        : (Array.isArray(st.scoreRunList) ? st.scoreRunList : []);
      let modified = false;

      const ent = req.body && req.body.entity ? String(req.body.entity).toLowerCase() : '';
      const act = req.body && req.body.action ? String(req.body.action).toLowerCase() : '';
      const targetId = Number((req.body && (req.body.id || (req.body.data && req.body.data.id))) || 0);

      if (ent === 'rider' && act === 'delete' && targetId > 0) {
        scoreRuns = scoreRuns.filter(sr => Number(sr.riderId) !== targetId);
        _cachedLiveRuns = _cachedLiveRuns.filter(sr => Number(sr.riderId) !== targetId);
        modified = true;
      }

      if ((ent === 'pendaftar' && act === 'approve') || (ent === 'rider' && (act === 'create' || act === 'update'))) {
        const d = (req.body && req.body.data) || {};
        const norm = _extractMultiClassesAndCategories(d, kelasList);

        if (ent === 'rider' && targetId > 0 && act === 'update') {
          const rObj = riders.find(r => Number(r.id) === targetId);
          if (rObj) {
            rObj.kategoriUmur = norm.joinedKat;
            rObj.kategori = norm.joinedKat;
            rObj.kelasPilihan = norm.joinedKls;
            rObj.kelasYangDiikuti = norm.joinedKls;
            modified = true;
          }
        } else if (ent === 'rider' && act === 'create' && riders.length > 0) {
          const newest = riders[riders.length - 1];
          if (newest) {
            newest.kategoriUmur = norm.joinedKat;
            newest.kategori = norm.joinedKat;
            newest.kelasPilihan = norm.joinedKls;
            newest.kelasYangDiikuti = norm.joinedKls;
            scoreRuns = scoreRuns.filter(sr => Number(sr.riderId) !== Number(newest.id));
            modified = true;
          }
        } else if (ent === 'pendaftar' && act === 'approve' && riders.length > 0) {
          const newestRider = riders[riders.length - 1];
          if (newestRider) {
            const pNorm = _extractMultiClassesAndCategories(newestRider, kelasList);
            newestRider.kategoriUmur = pNorm.joinedKat;
            newestRider.kategori = pNorm.joinedKat;
            newestRider.kelasPilihan = pNorm.joinedKls;
            newestRider.kelasYangDiikuti = pNorm.joinedKls;
            scoreRuns = scoreRuns.filter(sr => Number(sr.riderId) !== Number(newestRider.id));
            modified = true;
          }
        }
      }

      if (req.path.includes('pendaftaran') && pendaftar.length > 0) {
        const newestP = pendaftar[pendaftar.length - 1];
        if (newestP) {
          const norm = _extractMultiClassesAndCategories(req.body, kelasList);
          newestP.kategoriUmur = norm.joinedKat;
          newestP.kategori = norm.joinedKat;
          newestP.kelasPilihan = norm.joinedKls;
          newestP.kelasYangDiikuti = norm.joinedKls;
          modified = true;
        }
      }

      if (modified) {
        st.riders = riders;
        st.riderList = riders;
        st.pendaftar = pendaftar;
        st.pendaftarList = pendaftar;
        st.scoreRuns = scoreRuns;
        st.scoreRunList = scoreRuns;
        _writeCoreStore(st);
      } else {
        _bumpSthacVersion();
      }
    } catch (e) {}
    return _origJson(body);
  };
  next();
});

// Fungsi Inti Pembangun Scoreboard, Entri Run Panitia & Klasemen Poin Juara Umum
function _buildAccurateScoreboardAndStandings(locals) {
  const ptsTable = [10, 8, 6, 5, 4, 3, 2, 1];
  const st = _readCoreStore();

  const storeRiders = Array.isArray(st.riders) && st.riders.length > 0
    ? st.riders
    : (Array.isArray(st.riderList) ? st.riderList : []);
  const storeKelas = Array.isArray(st.kelas) && st.kelas.length > 0
    ? st.kelas
    : (Array.isArray(st.kelasList) ? st.kelasList : []);
  const storeRuns = [st.scoreRuns, st.scoreRunList, st.scoreRun, st.runs, st.scores].find(arr => Array.isArray(arr) && arr.length > 0) || [];

  // 1. Pilih daftar Rider aktif (utamakan locals.riderList -> storeRiders -> _cachedLiveRiders)
  const riders = (Array.isArray(locals.riderList) && locals.riderList.length > 0)
    ? locals.riderList
    : (storeRiders.length > 0 ? storeRiders : _cachedLiveRiders);
  if (riders.length > 0) _cachedLiveRiders = riders;

  // 2. Pilih daftar Kelas aktif
  const kelasList = (Array.isArray(locals.kelasList) && locals.kelasList.length > 0)
    ? locals.kelasList
    : (storeKelas.length > 0 ? storeKelas : _cachedLiveKelas);
  if (kelasList.length > 0) _cachedLiveKelas = kelasList;

  // Normalisasi multi-kelas pada setiap rider
  riders.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const norm = _extractMultiClassesAndCategories(r, kelasList);
    r.kategoriUmur = norm.joinedKat;
    r.kategori = norm.joinedKat;
    r.kategoriList = norm.katArr;
    r.kelasPilihan = norm.joinedKls;
    r.kelasYangDiikuti = norm.joinedKls;
    r.kelasListArray = norm.klsArr;
  });

  // 3. Kumpulkan seluruh ScoreRun dari: locals.scoreRunList, storeRuns, locals.scoreboardByKelas, atau _cachedLiveRuns
  let candidateRuns = [];
  if (Array.isArray(locals.scoreRunList) && locals.scoreRunList.length > 0) {
    candidateRuns = locals.scoreRunList;
  } else if (storeRuns.length > 0) {
    candidateRuns = storeRuns;
  } else if (_cachedLiveRuns.length > 0) {
    candidateRuns = _cachedLiveRuns;
  }

  // Jika candidateRuns masih kosong tetapi locals.scoreboardByKelas memiliki data run (seperti di /skor), ekstrak run-nya!
  if (candidateRuns.length === 0 && locals.scoreboardByKelas && typeof locals.scoreboardByKelas === 'object') {
    const extracted = [];
    Object.keys(locals.scoreboardByKelas).forEach(kId => {
      const board = locals.scoreboardByKelas[kId];
      if (!Array.isArray(board)) return;
      board.forEach(row => {
        if (!row || !Array.isArray(row.runs)) return;
        row.runs.forEach((sr, idx) => {
          if (sr && typeof sr === 'object' && (Number(sr.totalSkor ?? sr.skor ?? 0) > 0 || Number(sr.waktuTempuh ?? 0) > 0)) {
            extracted.push({
              id: sr.id || ( Number(kId) * 1000 + Number(row.riderId || 1) * 10 + (idx + 1) ),
              kelasId: Number(sr.kelasId || kId),
              riderId: Number(sr.riderId || row.riderId || (row.rider && row.rider.id)),
              runNumber: Number(sr.runNumber || (idx + 1)),
              target1: Number(sr.target1 ?? sr.t1 ?? 0),
              target2: Number(sr.target2 ?? sr.t2 ?? 0),
              target3: Number(sr.target3 ?? sr.t3 ?? 0),
              waktuTempuh: Number(sr.waktuTempuh ?? sr.waktu ?? 0),
              totalSkor: Number(sr.totalSkor ?? sr.skor ?? 0),
              rider: row.rider || null
            });
          }
        });
      });
    });
    if (extracted.length > 0) candidateRuns = extracted;
  }

  // 4. Filter hanya run yang memiliki Rider valid di daftar Rider resmi & lengkapi properti .rider dan .kelas
  const cleanScoreRuns = [];
  candidateRuns.forEach((sr, idx) => {
    if (!sr || typeof sr !== 'object') return;
    const matchedRider = _findMatchingRider(sr, riders);
    if (!matchedRider) return;
    const kObj = kelasList.find(k => Number(k.id) === Number(sr.kelasId)) || sr.kelas || null;
    const t1 = Number(sr.target1 ?? sr.t1 ?? 0);
    const t2 = Number(sr.target2 ?? sr.t2 ?? 0);
    const t3 = Number(sr.target3 ?? sr.t3 ?? 0);
    const wVal = Number(sr.waktuTempuh ?? sr.waktu ?? 0);
    const totVal = Number(sr.totalSkor ?? sr.skor ?? (t1 + t2 + t3));

    cleanScoreRuns.push({
      ...sr,
      id: sr.id || (idx + 1),
      kelasId: Number(sr.kelasId || (kObj && kObj.id) || 1),
      riderId: Number(matchedRider.id),
      runNumber: Number(sr.runNumber || 1),
      target1: t1,
      target2: t2,
      target3: t3,
      waktuTempuh: wVal,
      totalSkor: Number(totVal.toFixed(2)),
      rider: matchedRider,
      kelas: kObj
    });
  });

  if (cleanScoreRuns.length > 0) {
    _cachedLiveRuns = cleanScoreRuns;
  }

  locals.scoreRunList = cleanScoreRuns;
  locals.riderList = riders;
  if (locals.stats && typeof locals.stats === 'object') {
    locals.stats.totalRunTercatat = cleanScoreRuns.length;
  }

  // 5. Bangun scoreboardByKelas secara akurat dari cleanScoreRuns
  const scoreboardByKelas = {};

  kelasList.forEach(k => {
    if (!k) return;
    const kId = Number(k.id);
    const maxRun = Number(k.jumlahRun) || 3;
    const isExhibition = /exhibition|qabaq/i.test(k.namaKelas || '');

    const runsInKelas = cleanScoreRuns.filter(sr => Number(sr.kelasId) === kId);
    const runsByRider = new Map();
    runsInKelas.forEach(sr => {
      const rId = Number(sr.riderId);
      if (!runsByRider.has(rId)) runsByRider.set(rId, []);
      runsByRider.get(rId).push(sr);
    });

    const scoredParticipants = riders.filter(r => runsByRider.has(Number(r.id)));

    const scoredRows = scoredParticipants.map(r => {
      const rId = Number(r.id);
      const rRuns = runsByRider.get(rId) || [];
      const runMap = {};
      let totalSkor = 0;
      let totalWaktu = 0;
      let validRunCount = 0;

      rRuns.forEach(sr => {
        const rNo = Number(sr.runNumber) || 1;
        if (rNo >= 1 && rNo <= maxRun) {
          runMap[rNo] = sr;
        }
      });

      const runsArray = [];
      for (let i = 1; i <= maxRun; i++) {
        const sr = runMap[i] || null;
        if (sr) {
          const sVal = Number(sr.totalSkor ?? sr.skor ?? 0);
          const wVal = Number(sr.waktuTempuh ?? sr.waktu ?? 0);
          totalSkor += sVal;
          totalWaktu += wVal;
          validRunCount++;
          runsArray.push(sr);
        } else {
          runsArray.push(null);
        }
      }

      return {
        riderId: rId,
        rider: r,
        kodeRider: r.kodeRider,
        namaLengkap: r.namaLengkap,
        asalStable: r.asalStable,
        kategoriUmur: r.kategoriUmur,
        runs: runsArray,
        runMap,
        validRunCount,
        sudahDinilai: validRunCount > 0 && totalSkor > 0,
        totalSkor: Number(totalSkor.toFixed(2)),
        totalScore: Number(totalSkor.toFixed(2)),
        totalWaktu: Number(totalWaktu.toFixed(2)),
        rank: 1,
        pos: 1,
        poinKlasmen: 0,
        poinKejuaraan: 0
      };
    }).filter(x => x.sudahDinilai);

    scoredRows.sort((a, b) => {
      if (b.totalSkor !== a.totalSkor) return b.totalSkor - a.totalSkor;
      if (a.totalWaktu > 0 && b.totalWaktu > 0 && a.totalWaktu !== b.totalWaktu) return a.totalWaktu - b.totalWaktu;
      return a.riderId - b.riderId;
    });

    scoredRows.forEach((row, idx) => {
      const rk = idx + 1;
      row.rank = rk;
      row.pos = rk;
      const pts = (!isExhibition && row.totalSkor > 0 && rk >= 1 && rk <= ptsTable.length) ? ptsTable[rk - 1] : 0;
      row.poinKlasmen = pts;
      row.poinKejuaraan = pts;
    });

    scoreboardByKelas[kId] = scoredRows;
    k.scoreboard = scoredRows;
    k.rows = scoredRows;
  });

  _cachedLiveScoreboard = scoreboardByKelas;
  locals.scoreboardByKelas = scoreboardByKelas;

  // 6. Bangun Klasemen Poin Juara Umum (standings) dari akumulasi nyata seluruh kelas
  const standings = riders.map(r => {
    const rId = Number(r.id);
    const rincianKelas = [];
    let totalPoints = 0;
    let p1Count = 0;
    let totalSkorLintasan = 0;

    kelasList.forEach(k => {
      if (!k) return;
      const kId = Number(k.id);
      const isExhibition = /exhibition|qabaq/i.test(k.namaKelas || '');
      const board = scoreboardByKelas[kId] || [];
      const entry = board.find(row => {
        if (Number(row.riderId) === rId) return true;
        if (row.kodeRider && r.kodeRider && String(row.kodeRider) === String(r.kodeRider)) return true;
        return false;
      });

      if (entry || _doesRiderFollowKelas(r, k)) {
        const pts = entry ? Number(entry.poinKlasmen || 0) : 0;
        const skorRun = entry ? Number(entry.totalSkor || 0) : 0;
        const rk = entry && entry.sudahDinilai ? entry.rank : '-';
        const sudahDinilai = !!(entry && entry.sudahDinilai);

        if (!isExhibition) {
          totalPoints += pts;
          if (rk === 1 && sudahDinilai && pts > 0) p1Count++;
        }
        totalSkorLintasan += skorRun;

        rincianKelas.push({
          kelasId: kId,
          namaKelas: k.namaKelas,
          kategori: k.kategori || 'Terbuka',
          labelLengkap: k.namaKelas + ' (' + (k.kategori || 'Terbuka') + ')',
          peringkat: rk,
          poinKlasmen: pts,
          skorRun: Number(skorRun.toFixed(2)),
          sudahDinilai
        });
      }
    });

    if (rincianKelas.length === 0) {
      (r.kategoriList || ['U14']).forEach(kat => {
        rincianKelas.push({
          kelasId: 0,
          namaKelas: kat,
          kategori: kat,
          labelLengkap: kat,
          peringkat: '-',
          poinKlasmen: 0,
          skorRun: 0,
          sudahDinilai: false
        });
      });
    }

    return {
      id: rId,
      riderId: rId,
      kodeRider: r.kodeRider,
      namaLengkap: r.namaLengkap,
      asalStable: r.asalStable,
      kotaAsal: r.kotaAsal,
      kategoriUmur: r.kategoriUmur,
      kategori: r.kategoriUmur,
      kategoriList: r.kategoriList || ['U14'],
      kelasPilihan: r.kelasYangDiikuti,
      kelasYangDiikuti: r.kelasYangDiikuti,
      kelasListArray: r.kelasListArray || [],
      rincianKelas,
      p1Count,
      totalSkorLintasan: Number(totalSkorLintasan.toFixed(2)),
      totalPoints,
      totalPoin: totalPoints,
      poinKejuaraan: totalPoints,
      poinSeri: totalPoints,
      poin: totalPoints
    };
  });

  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.p1Count !== a.p1Count) return b.p1Count - a.p1Count;
    if (b.totalSkorLintasan !== a.totalSkorLintasan) return b.totalSkorLintasan - a.totalSkorLintasan;
    return a.id - b.id;
  });

  locals.standings = standings;
  return { scoreboardByKelas, standings, cleanScoreRuns };
}

app.get('/api/sthac-live-state', (req, res) => {
  try {
    const st = _readCoreStore();
    const dummyLocals = {
      riderList: st.riders || st.riderList || _cachedLiveRiders,
      pendaftarList: st.pendaftar || st.pendaftarList || [],
      kelasList: st.kelas || st.kelasList || _cachedLiveKelas,
      scoreRunList: (Array.isArray(st.scoreRuns) && st.scoreRuns.length > 0) ? st.scoreRuns : _cachedLiveRuns,
      scoreboardByKelas: _cachedLiveScoreboard
    };
    _buildAccurateScoreboardAndStandings(dummyLocals);
    res.json({
      ok: true,
      version: _sthacDataVersion,
      counts: {
        riders: dummyLocals.riderList.length,
        pendaftar: dummyLocals.pendaftarList.length,
        scoreRuns: dummyLocals.scoreRunList.length
      },
      standings: dummyLocals.standings
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.use((req, res, next) => {
  const _origRenderCore = res.render.bind(res);
  res.render = function(view, locals, cb) {
    try {
      if (!locals || typeof locals !== 'object') locals = {};
      _buildAccurateScoreboardAndStandings(locals);
      res.locals.standings = locals.standings;
      res.locals.scoreboardByKelas = locals.scoreboardByKelas;
      res.locals.scoreRunList = locals.scoreRunList;
    } catch (e) {}
    return _origRenderCore(view, locals, cb);
  };
  next();
});
// === END STHAC CORE COMPETITION ENGINE ===



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
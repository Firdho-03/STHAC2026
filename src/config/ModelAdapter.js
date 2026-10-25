const fs = require('fs');
const path = require('path');
const dbModule = require('./Database');
const prisma = dbModule.getClient ? dbModule.getClient() : (dbModule.prisma || dbModule);

const unifiedStorePath = path.join(process.cwd(), 'prisma', 'sthac-unified-store.json');

const defaultSeed = {
  setting: {
    id: 1,
    eventName: 'South Tangerang Horseback Archery Cup',
    tagline: 'Kejuaraan Berkuda Memanah Berjenjang',
    headline: 'SERI 1 · 14 NOVEMBER 2026 · SAIGA STABLE',
    footerOrg: 'Diselenggarakan Oleh : Saiga Stable',
    location: 'Saiga Stable, Tangerang Selatan, Banten',
    mapUrl: 'https://maps.google.com',
    whatsapp: '081586844344',
    instagram: '@sthac2026',
    logoUrl: 'https://media.vibecoder.co.id/app-media/ilham/south-tangerang-hacup/230836bd-5988-4bad-8ea9-c1eda8d6d2c4.png',
    registrationOpen: true
  },
  seri: [
    { id: 1, nomorSeri: 1, namaSeri: 'Seri 1 — South Tangerang Horseback Archery Cup', tanggalPelaksanaan: '14 Nov 2026', lokasi: 'Saiga Stable', statusSeri: 'Pendaftaran dibuka' },
    { id: 2, nomorSeri: 2, namaSeri: 'Seri 2 — South Tangerang Horseback Archery Cup', tanggalPelaksanaan: 'Menyusul', lokasi: 'Menyusul', statusSeri: 'Akan datang' },
    { id: 3, nomorSeri: 3, namaSeri: 'Seri 3 — Grand Final', tanggalPelaksanaan: 'Menyusul', lokasi: 'Menyusul', statusSeri: 'Akan datang' }
  ],
  lintasan: [
    { id: 1, kodeLintasan: 'ARENA-WT', namaLintasan: 'Arena Walk-Trot', sistem: 'IHAA', panjangMeter: 50, jumlahTarget: 3, nilaiZonaTarget: '5 / 4 / 3 / 2 / 1', parTime: 12, poinPerDetikCepat: 1, penaltiPerDetikLambat: 1, bonusSapuBersih: 0, bolehSkorNegatif: false, aturanOvertime: 'Skor minimum 0' },
    { id: 2, kodeLintasan: 'TABLA-T4', namaLintasan: 'Turkish Tabla T4', sistem: 'IHAA', panjangMeter: 90, jumlahTarget: 3, nilaiZonaTarget: '5 / 4 / 3 / 2 / 1', parTime: 12, poinPerDetikCepat: 1, penaltiPerDetikLambat: 1, bonusSapuBersih: 2, bolehSkorNegatif: false, aturanOvertime: 'Skor minimum 0' }
  ],
  kelas: [
    { id: 1, seriId: 1, urutanTampil: 1, namaKelas: 'Beginner ( Walk )', kategori: 'U14', lintasanId: 1, namaLintasan: 'Arena Walk-Trot', jumlahRun: 6, kuotaPeserta: 30, statusKelas: 'Pendaftaran dibuka', hitungPoinJuara: true, buangSkorTerendah: false },
    { id: 2, seriId: 1, urutanTampil: 2, namaKelas: 'Beginner ( Trot )', kategori: 'Terbuka', lintasanId: 1, namaLintasan: 'Arena Walk-Trot', jumlahRun: 3, kuotaPeserta: 30, statusKelas: 'Pendaftaran dibuka', hitungPoinJuara: true, buangSkorTerendah: false }
  ],
  rider: [
    { id: 1, kodeRider: 'R-001', namaLengkap: 'Tristiyan Abiy Pratama', gender: 'Putra', umur: 14, kategoriUmur: 'U14', asalStable: 'SAIGA STABLE', namaPelatih: 'Coach Hendra Wijaya', kotaAsal: 'Tangerang Selatan', provinsi: 'Banten', noWhatsapp: '081586844344', statusAktif: true },
    { id: 2, kodeRider: 'R-002', namaLengkap: 'carla cahya permata', gender: 'Putri', umur: 14, kategoriUmur: 'Terbuka', asalStable: 'SAIGA STABLE', namaPelatih: 'Coach Hendra Wijaya', kotaAsal: 'Tangerang Selatan', provinsi: 'Banten', noWhatsapp: '081586844344', statusAktif: true },
    { id: 3, kodeRider: 'R-003', namaLengkap: 'Mileva Almahira Baihaqi', gender: 'Putri', umur: 14, kategoriUmur: 'U14', asalStable: 'SAIGA STABLE', namaPelatih: 'Coach Hendra Wijaya', kotaAsal: 'Tangerang Selatan', provinsi: 'Banten', noWhatsapp: '081586844344', statusAktif: true },
    { id: 4, kodeRider: 'R-004', namaLengkap: 'Mileva Almahira Baihaqi (Open)', gender: 'Putri', umur: 14, kategoriUmur: 'Terbuka', asalStable: 'SAIGA STABLE', namaPelatih: 'Coach Hendra Wijaya', kotaAsal: 'Tangerang Selatan', provinsi: 'Banten', noWhatsapp: '081586844344', statusAktif: true },
    { id: 5, kodeRider: 'R-005', namaLengkap: 'Archer abrisam', gender: 'Putra', umur: 14, kategoriUmur: 'U14', asalStable: 'Winning Academy', namaPelatih: 'Coach Raka Pratama', kotaAsal: 'Depok', provinsi: 'Jawa Barat', noWhatsapp: '081299887766', statusAktif: true },
    { id: 6, kodeRider: 'R-006', namaLengkap: 'Archer abrisam (Open)', gender: 'Putra', umur: 14, kategoriUmur: 'Terbuka', asalStable: 'Winning Academy', namaPelatih: 'Coach Raka Pratama', kotaAsal: 'Depok', provinsi: 'Jawa Barat', noWhatsapp: '081299887766', statusAktif: true }
  ],
  pelatih: [
    { id: 1, kodePelatih: 'C-001', namaLengkap: 'Coach Hendra Wijaya', asalStable: 'SAIGA STABLE', kotaAsal: 'Tangerang Selatan', provinsi: 'Banten', noWhatsapp: '081586844344', lisensi: 'Pordasi & IHAA Level 2' },
    { id: 2, kodePelatih: 'C-002', namaLengkap: 'Coach Raka Pratama', asalStable: 'Winning Academy', kotaAsal: 'Depok', provinsi: 'Jawa Barat', noWhatsapp: '081299887766', lisensi: 'Pordasi Berkuda Memanah' }
  ],
  stable: [
    { id: 1, kodeStable: 'S-001', namaStable: 'SAIGA STABLE', kota: 'Tangerang Selatan', provinsi: 'Banten', kontakWa: '081586844344', namaPelatih: 'Coach Hendra Wijaya' },
    { id: 2, kodeStable: 'S-002', namaStable: 'Winning Academy', kota: 'Depok', provinsi: 'Jawa Barat', kontakWa: '081299887766', namaPelatih: 'Coach Raka Pratama' }
  ],
  panitia: [
    { id: 1, kodePanitia: 'P-001', namaLengkap: 'Mardiansyah', email: 'mardiansyah@sthac.com', jabatan: 'Juri Utama', noWhatsapp: '081586844344', peranAkses: 'SuperAdmin' },
    { id: 2, kodePanitia: 'P-002', namaLengkap: 'Andi Wijaya', email: 'andi@sthac.com', jabatan: 'Scorer / Pencatat', noWhatsapp: '081288776655', peranAkses: 'Admin' },
    { id: 3, kodePanitia: 'P-003', namaLengkap: 'Firdho Aulia', email: 'firdhoaulia@gmail.com', jabatan: 'Ketua Panitia & Juri', noWhatsapp: '081586844344', peranAkses: 'SuperAdmin' }
  ],
  unduhan: [
    { id: 1, kodeBadge: 'THB', judul: 'Technical Handbook Seri 1 STHAC 2026', kategori: 'Handbook', statusInfo: 'Tersedia', fileUrl: '/aturan' },
    { id: 2, kodeBadge: 'RULE', judul: 'Peraturan Pertandingan IHAA & Pordasi 2026', kategori: 'Regulasi', statusInfo: 'Tersedia', fileUrl: '/aturan' },
    { id: 3, kodeBadge: 'FORM', judul: 'Formulir Pendaftaran Kontingen Stable', kategori: 'Formulir', statusInfo: 'Tersedia', fileUrl: '/pendaftaran' }
  ],
  berita: [
    { id: 1, slug: 'pembukaan-seri-1-sthac-2026', judul: 'Pendaftaran Seri 1 STHAC 2026 Resmi Dibuka di Saiga Stable', kategori: 'Pengumuman', tanggalTerbit: '24 Oktober 2026', ringkasan: 'Seri pembuka South Tangerang Horseback Archery Cup 2026 siap digelar pada Sabtu, 14 November 2026 di Saiga Stable.', isiBerita: 'Kejuaraan berkuda memanah berjenjang South Tangerang Horseback Archery Cup (STHAC) 2026 resmi membuka pendaftaran peserta untuk kategori U14 dan Terbuka.' },
    { id: 2, slug: 'standar-penilaian-ihaa-pordasi', judul: 'Integrasi Sistem Penilaian Otomatis Berbasis IHAA & Pordasi', kategori: 'Regulasi', tanggalTerbit: '24 Oktober 2026', ringkasan: 'Seluruh perhitungan poin target, par time, dan klasemen juara umum diproses secara transparan dan real-time.', isiBerita: 'STHAC 2026 menerapkan kalkulasi skor otomatis berbasis standar International Horseback Archery Alliance (IHAA) dan Pordasi Berkuda Memanah.' }
  ],
  pendaftar: [],
  scoreRun: []
};

function resolveDelegate(candidates) {
  if (!prisma) return null;
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const allKeys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));

  for (const c of list) {
    if (prisma[c] && typeof prisma[c].findMany === 'function') {
      return { delegate: prisma[c], name: c };
    }
  }
  for (const c of list) {
    const found = allKeys.find(k => k.toLowerCase() === c.toLowerCase());
    if (found && prisma[found] && typeof prisma[found].findMany === 'function') {
      return { delegate: prisma[found], name: found };
    }
  }
  return null;
}

function getStoreKey(candidates) {
  const first = (Array.isArray(candidates) ? candidates[0] : candidates).toLowerCase();
  if (first.includes('seri')) return 'seri';
  if (first.includes('pelatih') || first.includes('coach')) return 'pelatih';
  if (first.includes('stable') || first.includes('club')) return 'stable';
  if (first.includes('panitia') || first.includes('user')) return 'panitia';
  if (first.includes('dokumen') || first.includes('unduhan')) return 'unduhan';
  if (first.includes('berita') || first.includes('news')) return 'berita';
  if (first.includes('pendaftar') || first.includes('reg')) return 'pendaftar';
  if (first.includes('rider')) return 'rider';
  if (first.includes('lintasan') || first.includes('track')) return 'lintasan';
  if (first.includes('kelas') || first.includes('class')) return 'kelas';
  if (first.includes('score') || first.includes('run')) return 'scoreRun';
  return first;
}

function expandSynonyms(raw) {
  const d = { ...raw };
  const pairs = [
    ['namaLengkap', 'name'], ['namaLengkap', 'fullName'], ['namaLengkap', 'nama'],
    ['kodeRider', 'code'], ['kodeRider', 'riderCode'], ['kodeRider', 'kode'],
    ['kodePelatih', 'code'], ['kodeStable', 'code'], ['kodeLintasan', 'code'],
    ['asalStable', 'stableName'], ['asalStable', 'club'], ['asalStable', 'namaStable'],
    ['namaPelatih', 'coachName'], ['namaPelatih', 'coach'], ['namaPelatih', 'pelatih'],
    ['kotaAsal', 'city'], ['kotaAsal', 'kota'],
    ['provinsi', 'province'],
    ['noWhatsapp', 'phone'], ['noWhatsapp', 'whatsapp'], ['noWhatsapp', 'kontakWa'],
    ['kategoriUmur', 'category'], ['kategoriUmur', 'ageCategory'], ['kategoriUmur', 'kategori'],
    ['umur', 'age'],
    ['gender', 'sex'],
    ['namaKelas', 'name'], ['namaKelas', 'className'],
    ['namaLintasan', 'name'], ['namaLintasan', 'trackName'],
    ['panjangMeter', 'lengthMeters'], ['panjangMeter', 'distance'],
    ['jumlahTarget', 'targetCount'],
    ['nilaiZonaTarget', 'targetZones'], ['nilaiZonaTarget', 'zones'],
    ['jumlahRun', 'totalRuns'], ['jumlahRun', 'maxRuns'],
    ['kuotaPeserta', 'quota'],
    ['judul', 'title'],
    ['isiBerita', 'content'], ['ringkasan', 'summary'], ['ringkasan', 'excerpt'],
    ['jabatan', 'role'], ['jabatan', 'position'],
    ['fileUrl', 'url'], ['kodeBadge', 'badge'], ['kodeBadge', 'code'],
    ['statusVerifikasi', 'status'], ['statusKelas', 'status'], ['statusSeri', 'status'],
    ['kelasId', 'classId'], ['waktuTempuh', 'timeSeconds'], ['waktuTempuh', 'waktu'],
    ['poinTarget', 'targetPoints'], ['poinTarget', 'skorTarget'],
    ['poinWaktu', 'timePoints'], ['poinWaktu', 'skorWaktu'],
    ['bonusTambahan', 'bonusPoints'], ['bonusTambahan', 'poinBonus'],
    ['totalSkor', 'finalScore'], ['totalSkor', 'totalScore'], ['totalSkor', 'skorAkhir'], ['totalSkor', 'totalRun'],
    ['runNumber', 'runKe'], ['runNumber', 'nomorRun'],
    ['target1', 't1'], ['target2', 't2'], ['target3', 't3'], ['target4', 't4'], ['target5', 't5']
  ];
  pairs.forEach(([a, b]) => {
    if (d[a] !== undefined && d[b] === undefined) d[b] = d[a];
    if (d[b] !== undefined && d[a] === undefined) d[a] = d[b];
  });
  return d;
}

let memoryStore = null;
let initPromise = null;

async function ensureStoreInitialized() {
  if (memoryStore) return memoryStore;
  if (initPromise) return await initPromise;

  initPromise = (async () => {
    if (fs.existsSync(unifiedStorePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(unifiedStorePath, 'utf8'));
        if (parsed && parsed._initialized) {
          memoryStore = { ...defaultSeed, ...parsed };
          return memoryStore;
        }
      } catch (e) {}
    }

    // Inisialisasi pertama kali: Tarik seluruh data yang ada di SQLite agar tidak ada data yang hilang
    const store = JSON.parse(JSON.stringify(defaultSeed));
    const tableMap = {
      seri: ['seriKejuaraan', 'seri', 'series'],
      lintasan: ['lintasan', 'track', 'masterLintasan'],
      kelas: ['kelasPertandingan', 'kelas', 'competitionClass'],
      rider: ['rider', 'pesertaRider', 'atlet'],
      pelatih: ['pelatih', 'coach'],
      stable: ['stable', 'klub', 'club'],
      panitia: ['panitiaUser', 'panitia', 'adminUser', 'user'],
      unduhan: ['dokumenUnduhan', 'dokumen', 'unduhan'],
      berita: ['berita', 'news', 'warta'],
      pendaftar: ['pendaftaran', 'registration', 'pendaftar'],
      scoreRun: ['scoreRun', 'runScore', 'penilaian', 'skorRun']
    };

    for (const [key, cands] of Object.entries(tableMap)) {
      const info = resolveDelegate(cands);
      if (info) {
        try {
          const rows = await info.delegate.findMany();
          if (rows && rows.length > 0) {
            store[key] = rows.map(r => expandSynonyms(r));
          }
        } catch (e) {}
      }
    }

    // Normalisasi ScoreRun dari SQLite agar kelasId, riderId, runNumber, target1..3 pasti berupa angka valid
    const riderById = new Map((store.rider || []).map(r => [Number(r.id), r]));
    const kelasList = store.kelas || [];
    const kelasU14 = kelasList.find(k => String(k.kategori || '').toUpperCase().includes('U14')) || kelasList[0] || { id: 1 };
    const kelasOpen = kelasList.find(k => !String(k.kategori || '').toUpperCase().includes('U14')) || kelasList[1] || kelasList[0] || { id: 2 };

    store.scoreRun = (store.scoreRun || []).map((sr, idx) => {
      const rId = Number(sr.riderId || sr.pesertaRiderId || 1);
      const rObj = riderById.get(rId);
      let kId = Number(sr.kelasId || sr.classId || sr.kelasPertandinganId || 0);
      if (!kId) {
        const isU14 = rObj && String(rObj.kategoriUmur || rObj.kategori || '').toUpperCase().includes('U14');
        kId = isU14 ? Number(kelasU14.id) : Number(kelasOpen.id);
      }
      const runNo = Number(sr.runNumber || sr.runKe || sr.nomorRun || ((idx % 6) + 1));

      let t1 = Number(sr.target1 ?? sr.t1 ?? 0);
      let t2 = Number(sr.target2 ?? sr.t2 ?? 0);
      let t3 = Number(sr.target3 ?? sr.t3 ?? 0);
      if (t1 === 0 && t2 === 0 && t3 === 0 && sr.targetScoresJson) {
        try {
          const arr = JSON.parse(sr.targetScoresJson);
          if (Array.isArray(arr)) {
            t1 = Number(arr[0] || 0);
            t2 = Number(arr[1] || 0);
            t3 = Number(arr[2] || 0);
          }
        } catch (e) {}
      }

      const poinTarget = Number(sr.poinTarget ?? sr.skorTarget ?? sr.targetPoints ?? (t1 + t2 + t3));
      const waktuTempuh = Number(sr.waktuTempuh ?? sr.waktu ?? sr.timeSeconds ?? 0);
      const poinWaktu = Number(sr.poinWaktu ?? sr.skorWaktu ?? sr.timePoints ?? 0);
      const bonusTambahan = Number(sr.bonusTambahan ?? sr.poinBonus ?? sr.bonusPoints ?? 0);
      const totalSkor = Number(sr.totalSkor ?? sr.skorAkhir ?? sr.totalRun ?? sr.finalScore ?? (poinTarget + poinWaktu + bonusTambahan));

      return {
        ...sr,
        id: Number(sr.id || (idx + 1)),
        kelasId: kId,
        classId: kId,
        riderId: rId,
        runNumber: runNo,
        runKe: runNo,
        target1: t1,
        target2: t2,
        target3: t3,
        t1,
        t2,
        t3,
        poinTarget,
        waktuTempuh,
        poinWaktu,
        bonusTambahan,
        totalSkor,
        updatedAt: sr.updatedAt || new Date(Date.now() - (1000 * (100 - idx))).toISOString()
      };
    });

    store._initialized = true;
    memoryStore = store;
    fs.writeFileSync(unifiedStorePath, JSON.stringify(memoryStore, null, 2), 'utf8');
    return memoryStore;
  })();

  return await initPromise;
}

function persistStore() {
  if (!memoryStore) return;
  try {
    fs.writeFileSync(unifiedStorePath, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (e) {
    console.error('Gagal menulis unified store:', e.message);
  }
}

// Sinkronisasi latar belakang ke SQLite jika model & kolom cocok
async function trySyncToPrisma(candidates, action, id, payload) {
  const info = resolveDelegate(candidates);
  if (!info) return;
  try {
    const sample = await info.delegate.findFirst().catch(() => null);
    if (!sample && action !== 'deleteMany') return;
    const allowedKeys = sample ? Object.keys(sample).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt') : [];
    const cleanData = {};
    allowedKeys.forEach(k => {
      if (payload && payload[k] !== undefined) {
        const sampleVal = sample[k];
        if (typeof sampleVal === 'number') {
          cleanData[k] = Number(payload[k]) || 0;
        } else if (typeof sampleVal === 'boolean') {
          cleanData[k] = Boolean(payload[k]);
        } else {
          cleanData[k] = String(payload[k] ?? '');
        }
      }
    });

    if (action === 'create' && Object.keys(cleanData).length > 0) {
      await info.delegate.create({ data: cleanData }).catch(() => {});
    } else if (action === 'update' && id && Object.keys(cleanData).length > 0) {
      await info.delegate.update({ where: { id: Number(id) }, data: cleanData }).catch(() => {});
    } else if (action === 'delete' && id) {
      await info.delegate.delete({ where: { id: Number(id) } }).catch(() => {});
    } else if (action === 'deleteMany') {
      await info.delegate.deleteMany({ where: payload || {} }).catch(() => {});
    }
  } catch (e) {}
}

async function safeFindMany(candidates) {
  const store = await ensureStoreInitialized();
  const key = getStoreKey(candidates);
  return Array.isArray(store[key]) ? [...store[key]] : [];
}

async function safeFindFirst(candidates) {
  const rows = await safeFindMany(candidates);
  return rows.length > 0 ? rows[0] : null;
}

async function safeCreate(candidates, rawData) {
  const store = await ensureStoreInitialized();
  const key = getStoreKey(candidates);
  if (!Array.isArray(store[key])) store[key] = [];

  const expanded = expandSynonyms(rawData);
  const nextId = store[key].reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const nowIso = new Date().toISOString();
  const newItem = {
    ...expanded,
    id: nextId,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  store[key].push(newItem);
  persistStore();
  await trySyncToPrisma(candidates, 'create', nextId, newItem);
  return newItem;
}

async function safeUpdate(candidates, id, rawData) {
  const store = await ensureStoreInitialized();
  const key = getStoreKey(candidates);
  if (!Array.isArray(store[key])) store[key] = [];

  const numId = Number(id);
  const expanded = expandSynonyms(rawData);
  const nowIso = new Date().toISOString();
  const idx = store[key].findIndex(item => Number(item.id) === numId);

  if (idx !== -1) {
    store[key][idx] = {
      ...store[key][idx],
      ...expanded,
      id: numId,
      updatedAt: nowIso
    };
    persistStore();
    await trySyncToPrisma(candidates, 'update', numId, store[key][idx]);
    return store[key][idx];
  } else {
    // Jika ID belum ada di store, buat baru agar tidak pernah gagal
    return await safeCreate(candidates, { ...expanded, id: numId });
  }
}

async function safeDelete(candidates, id) {
  const store = await ensureStoreInitialized();
  const key = getStoreKey(candidates);
  const numId = Number(id);
  if (Array.isArray(store[key])) {
    store[key] = store[key].filter(item => Number(item.id) !== numId);
    persistStore();
  }
  await trySyncToPrisma(candidates, 'delete', numId, null);
  return { deleted: true };
}

async function safeDeleteMany(candidates, where = {}) {
  const store = await ensureStoreInitialized();
  const key = getStoreKey(candidates);
  if (Array.isArray(store[key])) {
    if (!where || Object.keys(where).length === 0) {
      store[key] = [];
    } else {
      store[key] = store[key].filter(item => {
        return !Object.entries(where).every(([k, v]) => Number(item[k]) === Number(v));
      });
    }
    persistStore();
  }
  await trySyncToPrisma(candidates, 'deleteMany', null, where);
  return { deleted: true };
}

async function safeCount(candidates) {
  const rows = await safeFindMany(candidates);
  return rows.length;
}

async function getSiteSettings() {
  const store = await ensureStoreInitialized();
  return { ...defaultSeed.setting, ...(store.setting || {}) };
}

async function saveSiteSettings(newSettings) {
  const store = await ensureStoreInitialized();
  const cleanPayload = { ...newSettings };
  cleanPayload.registrationOpen =
    newSettings.registrationOpen === true ||
    newSettings.registrationOpen === 'true' ||
    newSettings.registrationOpen === '1' ||
    newSettings.registrationOpen === 'on';

  store.setting = { ...defaultSeed.setting, ...(store.setting || {}), ...cleanPayload };
  persistStore();
  return store.setting;
}

module.exports = {
  prisma,
  resolveDelegate,
  safeFindMany,
  safeFindFirst,
  safeCreate,
  safeUpdate,
  safeDelete,
  safeDeleteMany,
  safeCount,
  getSiteSettings,
  saveSiteSettings
};
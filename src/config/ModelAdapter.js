const fs = require('fs');
const path = require('path');
const dbModule = require('./Database');
const prisma = dbModule.getClient ? dbModule.getClient() : (dbModule.prisma || dbModule);

const localStorePath = path.join(process.cwd(), 'prisma', 'sthac-data-store.json');

// Data bawaan resmi STHAC 2026 jika tabel terkait di DB masih kosong
const defaultStore = {
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
  pelatih: [
    { id: 1, kodePelatih: 'C-001', namaLengkap: 'Coach Hendra Wijaya', asalStable: 'Saiga Stable', kotaAsal: 'Tangerang Selatan', provinsi: 'Banten', noWhatsapp: '081586844344', lisensi: 'Pordasi & IHAA Level 2' },
    { id: 2, kodePelatih: 'C-002', namaLengkap: 'Coach Raka Pratama', asalStable: 'Winning Academy', kotaAsal: 'Depok', provinsi: 'Jawa Barat', noWhatsapp: '081299887766', lisensi: 'Pordasi Berkuda Memanah' }
  ],
  stable: [
    { id: 1, kodeStable: 'S-001', namaStable: 'Saiga Stable', kota: 'Tangerang Selatan', provinsi: 'Banten', kontakWa: '081586844344', namaPelatih: 'Coach Hendra Wijaya' },
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
  rider: [],
  lintasan: [],
  kelas: [],
  scoreRun: []
};

function readLocalStore() {
  if (!fs.existsSync(localStorePath)) {
    fs.writeFileSync(localStorePath, JSON.stringify(defaultStore, null, 2), 'utf8');
    return JSON.parse(JSON.stringify(defaultStore));
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
    return { ...defaultStore, ...parsed };
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultStore));
  }
}

function writeLocalStore(data) {
  fs.writeFileSync(localStorePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadSchemaMetadata() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const meta = {};
  if (!fs.existsSync(schemaPath)) return meta;

  const content = fs.readFileSync(schemaPath, 'utf8');
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const fields = {};

    match[2].split(/\r?\n/).forEach(line => {
      const clean = line.trim();
      if (!clean || clean.startsWith('//') || clean.startsWith('@@')) return;
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) {
        const fName = parts[0];
        const rawType = parts[1];
        const baseType = rawType.replace('?', '').replace('[]', '');
        if (['String', 'Int', 'Float', 'Boolean', 'DateTime'].includes(baseType)) {
          fields[fName] = {
            type: baseType,
            optional: rawType.endsWith('?') || clean.includes('@default')
          };
        }
      }
    });
    meta[delegateName] = { modelName, delegateName, fields };
  }
  return meta;
}

const schemaMeta = loadSchemaMetadata();

function resolveDelegate(candidates) {
  if (!prisma) return null;
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const allKeys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));

  for (const c of list) {
    if (prisma[c] && typeof prisma[c].findMany === 'function') {
      return { delegate: prisma[c], name: c, meta: schemaMeta[c] };
    }
  }
  for (const c of list) {
    const found = allKeys.find(k => k.toLowerCase() === c.toLowerCase());
    if (found && prisma[found] && typeof prisma[found].findMany === 'function') {
      return { delegate: prisma[found], name: found, meta: schemaMeta[found] };
    }
  }
  return null;
}

// Pemetaan otomatis sinonim field Indonesia <-> Inggris agar cocok dengan schema.prisma mana pun
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
    ['kelasId', 'classId'], ['waktuTempuh', 'timeSeconds'],
    ['poinTarget', 'targetPoints'], ['poinWaktu', 'timePoints'],
    ['bonusTambahan', 'bonusPoints'], ['totalSkor', 'finalScore'], ['totalSkor', 'totalScore']
  ];
  pairs.forEach(([a, b]) => {
    if (d[a] !== undefined && d[b] === undefined) d[b] = d[a];
    if (d[b] !== undefined && d[a] === undefined) d[a] = d[b];
  });
  return d;
}

function sanitizeData(delegateInfo, rawPayload, isUpdate = false) {
  const expanded = expandSynonyms(rawPayload);
  if (!delegateInfo || !delegateInfo.meta || !delegateInfo.meta.fields) {
    const copy = { ...expanded };
    delete copy.id;
    return copy;
  }

  const fields = delegateInfo.meta.fields;
  const clean = {};

  for (const [fName, fInfo] of Object.entries(fields)) {
    if (fName === 'id' || fName === 'createdAt' || fName === 'updatedAt') continue;

    if (expanded[fName] !== undefined) {
      const val = expanded[fName];
      if (fInfo.type === 'Int') clean[fName] = parseInt(val, 10) || 0;
      else if (fInfo.type === 'Float') clean[fName] = parseFloat(val) || 0;
      else if (fInfo.type === 'Boolean') clean[fName] = val === true || val === 'true' || val === '1' || val === 1 || val === 'on';
      else if (fInfo.type === 'DateTime') clean[fName] = val ? new Date(val) : new Date();
      else clean[fName] = String(val ?? '').trim();
    } else if (!isUpdate && !fInfo.optional) {
      if (fInfo.type === 'Int' || fInfo.type === 'Float') clean[fName] = 0;
      else if (fInfo.type === 'Boolean') clean[fName] = false;
      else if (fInfo.type === 'DateTime') clean[fName] = new Date();
      else clean[fName] = '-';
    }
  }
  return clean;
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

async function safeFindMany(candidates, options = {}) {
  const info = resolveDelegate(candidates);
  const storeKey = getStoreKey(candidates);
  const store = readLocalStore();
  const localArr = Array.isArray(store[storeKey]) ? store[storeKey] : [];

  if (info) {
    try {
      const dbRows = await info.delegate.findMany(options);
      if (dbRows && dbRows.length > 0) return dbRows;
    } catch (e) {
      try {
        const dbRows2 = await info.delegate.findMany();
        if (dbRows2 && dbRows2.length > 0) return dbRows2;
      } catch (e2) {}
    }
  }
  return localArr;
}

async function safeFindFirst(candidates, options = {}) {
  const rows = await safeFindMany(candidates, options);
  return rows.length > 0 ? rows[0] : null;
}

async function safeCreate(candidates, rawData) {
  const info = resolveDelegate(candidates);
  const storeKey = getStoreKey(candidates);
  const expanded = expandSynonyms(rawData);

  if (info) {
    try {
      const data = sanitizeData(info, expanded, false);
      const created = await info.delegate.create({ data });
      return created;
    } catch (e) {}
  }

  // Simpan ke localStore jika model tidak ada di Prisma atau gagal karena constraint
  const store = readLocalStore();
  if (!Array.isArray(store[storeKey])) store[storeKey] = [];
  const nextId = store[storeKey].reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const newItem = { id: nextId, ...expanded, createdAt: new Date().toISOString() };
  store[storeKey].push(newItem);
  writeLocalStore(store);
  return newItem;
}

async function safeUpdate(candidates, id, rawData) {
  const numId = Number(id);
  const info = resolveDelegate(candidates);
  const storeKey = getStoreKey(candidates);
  const expanded = expandSynonyms(rawData);

  if (info) {
    try {
      const data = sanitizeData(info, expanded, true);
      const updated = await info.delegate.update({ where: { id: numId }, data });
      return updated;
    } catch (e) {}
  }

  const store = readLocalStore();
  if (!Array.isArray(store[storeKey])) store[storeKey] = [];
  const idx = store[storeKey].findIndex(item => Number(item.id) === numId);
  if (idx !== -1) {
    store[storeKey][idx] = { ...store[storeKey][idx], ...expanded, id: numId };
    writeLocalStore(store);
    return store[storeKey][idx];
  }
  return null;
}

async function safeDelete(candidates, id) {
  const numId = Number(id);
  const info = resolveDelegate(candidates);
  const storeKey = getStoreKey(candidates);

  if (info) {
    try {
      await info.delegate.delete({ where: { id: numId } });
    } catch (e) {}
  }

  const store = readLocalStore();
  if (Array.isArray(store[storeKey])) {
    store[storeKey] = store[storeKey].filter(item => Number(item.id) !== numId);
    writeLocalStore(store);
  }
  return { deleted: true };
}

async function safeDeleteMany(candidates, where = {}) {
  const info = resolveDelegate(candidates);
  const storeKey = getStoreKey(candidates);

  if (info) {
    try {
      await info.delegate.deleteMany({ where });
    } catch (e) {}
  }

  const store = readLocalStore();
  if (Array.isArray(store[storeKey])) {
    if (!where || Object.keys(where).length === 0) {
      store[storeKey] = [];
    } else {
      store[storeKey] = store[storeKey].filter(item => {
        return !Object.entries(where).every(([k, v]) => Number(item[k]) === Number(v));
      });
    }
    writeLocalStore(store);
  }
  return { deleted: true };
}

async function safeCount(candidates) {
  const rows = await safeFindMany(candidates);
  return rows.length;
}

async function getSiteSettings() {
  const store = readLocalStore();
  const info = resolveDelegate(['setting', 'siteSetting', 'appSetting', 'pengaturan', 'setelan']);
  if (info) {
    try {
      const row = await info.delegate.findFirst();
      if (row) return { ...defaultStore.setting, ...store.setting, ...row };
    } catch (e) {}
  }
  return { ...defaultStore.setting, ...(store.setting || {}) };
}

async function saveSiteSettings(newSettings) {
  const store = readLocalStore();
  const cleanPayload = { ...newSettings };
  cleanPayload.registrationOpen =
    newSettings.registrationOpen === true ||
    newSettings.registrationOpen === 'true' ||
    newSettings.registrationOpen === '1' ||
    newSettings.registrationOpen === 'on';

  store.setting = { ...defaultStore.setting, ...(store.setting || {}), ...cleanPayload };
  writeLocalStore(store);

  const info = resolveDelegate(['setting', 'siteSetting', 'appSetting', 'pengaturan', 'setelan']);
  if (info) {
    try {
      const existing = await info.delegate.findFirst();
      if (existing) {
        await safeUpdate(['setting', 'siteSetting'], existing.id, cleanPayload);
      } else {
        await safeCreate(['setting', 'siteSetting'], cleanPayload);
      }
    } catch (e) {}
  }
  return store.setting;
}

module.exports = {
  prisma,
  resolveDelegate,
  sanitizeData,
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
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { safeFindMany, getSiteSettings } = require('../config/ModelAdapter');
const { CANDIDATES } = require('../services/UniversalCrudBinder');

const POIN_JUARA_MAP = [20, 15, 12, 10, 8, 6, 4, 3, 2, 1];

// Proxy Pengaman: Jika template memanggil properti sub-list yang belum ada, otomatis kembalikan [] agar tidak pernah TypeError
function createSafeBundle(baseObj) {
  return new Proxy(baseObj, {
    get(target, prop) {
      if (prop in target && target[prop] !== undefined && target[prop] !== null) {
        return target[prop];
      }
      if (typeof prop === 'symbol' || prop === 'inspect' || prop === 'toJSON') {
        return target[prop];
      }
      return [];
    }
  });
}

function getTemplateVariables(viewName) {
  try {
    const filePath = path.join(process.cwd(), 'views', `${viewName}.ejs`);
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/<%[\s\S]*?%>/g) || [];
    const vars = new Set();
    const reserved = new Set([
      'if', 'else', 'for', 'while', 'function', 'return', 'const', 'let', 'var',
      'true', 'false', 'null', 'undefined', 'new', 'Date', 'Math', 'Number',
      'String', 'Array', 'Object', 'JSON', 'parseInt', 'parseFloat', 'isNaN',
      'console', 'include', 'forEach', 'map', 'filter', 'slice', 'reduce', 'find', 'Boolean'
    ]);
    matches.forEach(block => {
      const clean = block.replace(/^<%[=\-_]?/, '').replace(/[-_]?%>$/, '');
      const idRegex = /(?:^|[^\w.$])([a-zA-Z_$][\w$]*)/g;
      let m;
      while ((m = idRegex.exec(clean)) !== null) {
        const name = m[1];
        if (!reserved.has(name)) vars.add(name);
      }
    });
    return Array.from(vars);
  } catch (e) {
    return [];
  }
}

async function buildViewContext(req, activePage, pageTitle, viewName) {
  const [
    setting,
    seriRaw,
    lintasanRaw,
    kelasRaw,
    riderRaw,
    pelatihRaw,
    stableRaw,
    pendaftarRaw,
    scoreRunRaw,
    panitiaRaw,
    dokumenRaw,
    beritaRaw
  ] = await Promise.all([
    getSiteSettings(),
    safeFindMany(CANDIDATES.seri),
    safeFindMany(CANDIDATES.lintasan),
    safeFindMany(CANDIDATES.kelas),
    safeFindMany(CANDIDATES.rider),
    safeFindMany(CANDIDATES.pelatih),
    safeFindMany(CANDIDATES.stable),
    safeFindMany(CANDIDATES.pendaftar),
    safeFindMany(CANDIDATES.scoreRun),
    safeFindMany(CANDIDATES.panitia),
    safeFindMany(CANDIDATES.unduhan),
    safeFindMany(CANDIDATES.berita)
  ]);

  // 1. Seri Kejuaraan
  const seriFallback = [
    { id: 1, nomorSeri: 1, namaSeri: 'Seri 1 — South Tangerang Horseback Archery Cup', tanggalPelaksanaan: '14 Nov 2026', lokasi: 'Saiga Stable', statusSeri: 'Pendaftaran dibuka' },
    { id: 2, nomorSeri: 2, namaSeri: 'Seri 2 — South Tangerang Horseback Archery Cup', tanggalPelaksanaan: 'Menyusul', lokasi: 'Menyusul', statusSeri: 'Akan datang' },
    { id: 3, nomorSeri: 3, namaSeri: 'Seri 3 — Grand Final', tanggalPelaksanaan: 'Menyusul', lokasi: 'Menyusul', statusSeri: 'Akan datang' }
  ];
  const seriList = (seriRaw.length > 0 ? seriRaw : seriFallback).map((s, i) => ({
    ...s,
    id: s.id || (i + 1),
    nomorSeri: s.nomorSeri || (i + 1),
    namaSeri: s.namaSeri || s.nama || `Seri ${i + 1} — South Tangerang Horseback Archery Cup`,
    nama: s.namaSeri || s.nama || `Seri ${i + 1}`,
    tanggalPelaksanaan: s.tanggalPelaksanaan || s.tanggal || (i === 0 ? '14 Nov 2026' : 'Menyusul'),
    tanggal: s.tanggalPelaksanaan || s.tanggal || (i === 0 ? '14 Nov 2026' : 'Menyusul'),
    lokasi: s.lokasi || (i === 0 ? 'Saiga Stable' : 'Menyusul'),
    statusSeri: s.statusSeri || s.status || (i === 0 ? 'Pendaftaran dibuka' : 'Akan datang'),
    status: s.statusSeri || s.status || (i === 0 ? 'Pendaftaran dibuka' : 'Akan datang')
  }));

  const querySeriId = req.query && req.query.seri ? parseInt(req.query.seri, 10) : null;
  const selectedSeri = seriList.find(s => s.id === querySeriId || s.nomorSeri === querySeriId) || seriList[0];
  const selectedSeriId = selectedSeri ? selectedSeri.id : 1;

  // 2. Master Lintasan
  const lintasanList = lintasanRaw.map((l, i) => ({
    ...l,
    id: l.id || (i + 1),
    kodeLintasan: l.kodeLintasan || l.kode || `L-0${i + 1}`,
    kode: l.kodeLintasan || l.kode || `L-0${i + 1}`,
    namaLintasan: l.namaLintasan || l.nama || `Lintasan ${i + 1}`,
    nama: l.namaLintasan || l.nama || `Lintasan ${i + 1}`,
    sistem: l.sistem || l.federasi || 'IHAA',
    federasi: l.sistem || l.federasi || 'IHAA',
    panjangMeter: l.panjangMeter ?? l.panjang ?? 30,
    panjang: l.panjangMeter ?? l.panjang ?? 30,
    jumlahTarget: l.jumlahTarget ?? l.targetCount ?? 3,
    nilaiZonaTarget: l.nilaiZonaTarget || l.zonaTarget || '5 / 4 / 3 / 2 / 1',
    zonaTarget: l.nilaiZonaTarget || l.zonaTarget || '5 / 4 / 3 / 2 / 1',
    parTime: l.parTime ?? l.batasWaktu ?? 0,
    poinPerDetikCepat: l.poinPerDetikCepat ?? 1,
    penaltiPerDetikLambat: l.penaltiPerDetikLambat ?? 1,
    bonusSapuBersih: l.bonusSapuBersih ?? l.bonusSemuaTarget ?? 0,
    bolehSkorNegatif: Boolean(l.bolehSkorNegatif),
    aturanOvertime: l.aturanOvertime || l.catatan || 'Skor minimum 0',
    deskripsi: l.deskripsi || l.catatan || ''
  }));

  // 3. Rider, Pelatih, Stable, Pendaftar, Panitia
  const riderList = riderRaw.map((r, i) => ({
    ...r,
    id: r.id || (i + 1),
    kodeRider: r.kodeRider || r.kode || `R-${String(i + 1).padStart(3, '0')}`,
    kode: r.kodeRider || r.kode || `R-${String(i + 1).padStart(3, '0')}`,
    namaLengkap: r.namaLengkap || r.nama || `Rider #${r.id}`,
    nama: r.namaLengkap || r.nama || `Rider #${r.id}`,
    gender: r.gender || r.jenisKelamin || 'Putra',
    tanggalLahir: r.tanggalLahir || '2012-01-01',
    umur: r.umur ?? r.usia ?? 14,
    kategoriUmur: r.kategoriUmur || r.kategori || 'Terbuka',
    kategori: r.kategoriUmur || r.kategori || 'Terbuka',
    asalStable: r.asalStable || r.namaStable || r.stable || 'Saiga Stable',
    namaStable: r.asalStable || r.namaStable || r.stable || 'Saiga Stable',
    stable: r.asalStable || r.namaStable || r.stable || 'Saiga Stable',
    namaPelatih: r.namaPelatih || r.pelatih || '-',
    pelatih: r.namaPelatih || r.pelatih || '-',
    kotaAsal: r.kotaAsal || r.kota || 'Tangerang Selatan',
    kota: r.kotaAsal || r.kota || 'Tangerang Selatan',
    provinsi: r.provinsi || 'Banten',
    noWhatsapp: r.noWhatsapp || r.whatsapp || '-',
    whatsapp: r.noWhatsapp || r.whatsapp || '-',
    email: r.email || '-',
    kelasPilihan: r.kelasPilihan || 'Beginner ( Walk )',
    namaKuda: r.namaKuda || '-',
    statusAcc: r.statusAcc || 'Diterima',
    statusVerifikasi: r.statusVerifikasi || 'Diterima',
    statusAktif: r.statusAktif !== false
  }));

  const pelatihList = pelatihRaw.map((c, i) => ({
    ...c,
    id: c.id || (i + 1),
    kodePelatih: c.kodePelatih || c.kode || `C-${String(i + 1).padStart(3, '0')}`,
    kode: c.kodePelatih || c.kode || `C-${String(i + 1).padStart(3, '0')}`,
    namaLengkap: c.namaLengkap || c.nama || `Pelatih #${c.id}`,
    nama: c.namaLengkap || c.nama || `Pelatih #${c.id}`,
    gender: c.gender || 'Putra',
    umur: c.umur ?? 32,
    asalStable: c.asalStable || c.namaStable || c.stable || 'Saiga Stable',
    namaStable: c.asalStable || c.namaStable || c.stable || 'Saiga Stable',
    stable: c.asalStable || c.namaStable || c.stable || 'Saiga Stable',
    kotaAsal: c.kotaAsal || c.kota || 'Tangerang Selatan',
    kota: c.kotaAsal || c.kota || 'Tangerang Selatan',
    provinsi: c.provinsi || 'Banten',
    noWhatsapp: c.noWhatsapp || c.whatsapp || '-',
    whatsapp: c.noWhatsapp || c.whatsapp || '-',
    lisensi: c.lisensi || c.sertifikasi || 'Pordasi / IHAA',
    statusAcc: c.statusAcc || 'Diterima'
  }));

  const stableList = stableRaw.map((s, i) => ({
    ...s,
    id: s.id || (i + 1),
    kodeStable: s.kodeStable || s.kode || `S-${String(i + 1).padStart(3, '0')}`,
    kode: s.kodeStable || s.kode || `S-${String(i + 1).padStart(3, '0')}`,
    namaStable: s.namaStable || s.nama || `Stable #${s.id}`,
    nama: s.namaStable || s.nama || `Stable #${s.id}`,
    kota: s.kota || s.kotaAsal || 'Tangerang Selatan',
    kotaAsal: s.kotaAsal || s.kota || 'Tangerang Selatan',
    provinsi: s.provinsi || 'Banten',
    kontakWa: s.kontakWa || s.noWhatsapp || '-',
    noWhatsapp: s.kontakWa || s.noWhatsapp || '-',
    namaPelatih: s.namaPelatih || '-',
    jumlahRider: riderList.filter(r => r.asalStable.toLowerCase() === (s.namaStable || s.nama || '').toLowerCase()).length,
    statusAcc: s.statusAcc || 'Diterima'
  }));

  const pendaftarList = pendaftarRaw.map((p, i) => {
    const rawStat = p.statusVerifikasi || p.statusAcc || p.status || 'Menunggu ACC';
    const normAcc = rawStat.toLowerCase().includes('terima') ? 'Diterima' : 'Menunggu';
    return {
      ...p,
      id: p.id || (i + 1),
      kodeRider: p.kodeRider || `REG-${String(i + 1).padStart(3, '0')}`,
      kode: p.kodeRider || `REG-${String(i + 1).padStart(3, '0')}`,
      peranPendaftar: p.peranPendaftar || p.peran || 'Rider',
      peran: p.peranPendaftar || p.peran || 'Rider',
      namaLengkap: p.namaLengkap || p.nama || 'Pendaftar',
      nama: p.namaLengkap || p.nama || 'Pendaftar',
      gender: p.gender || 'Putra',
      tanggalLahir: p.tanggalLahir || '2012-01-01',
      umur: p.umur ?? 15,
      kategoriUmur: p.kategoriUmur || ((p.umur && p.umur <= 14) ? 'U14' : 'Terbuka'),
      kategori: p.kategoriUmur || ((p.umur && p.umur <= 14) ? 'U14' : 'Terbuka'),
      asalStable: p.asalStable || p.namaStable || p.stable || 'Independen',
      namaStable: p.asalStable || p.namaStable || p.stable || 'Independen',
      stable: p.asalStable || p.namaStable || p.stable || 'Independen',
      namaPelatih: p.namaPelatih || p.pelatih || '-',
      pelatih: p.namaPelatih || p.pelatih || '-',
      kotaAsal: p.kotaAsal || p.kota || 'Tangerang Selatan',
      kota: p.kotaAsal || p.kota || 'Tangerang Selatan',
      provinsi: p.provinsi || 'Banten',
      noWhatsapp: p.noWhatsapp || p.whatsapp || '-',
      whatsapp: p.noWhatsapp || p.whatsapp || '-',
      email: p.email || '-',
      kelasPilihan: p.kelasPilihan || p.namaKelas || 'Beginner ( Walk )',
      namaKuda: p.namaKuda || '-',
      statusVerifikasi: normAcc === 'Diterima' ? 'Diterima' : 'Menunggu ACC',
      statusAcc: normAcc,
      status: normAcc
    };
  });

  const dokumenList = dokumenRaw.map((d, i) => ({
    ...d,
    id: d.id || (i + 1),
    kodeBadge: d.kodeBadge || d.kode || 'DOC',
    kode: d.kodeBadge || d.kode || 'DOC',
    judul: d.judul || d.namaDokumen || d.nama || 'Dokumen Kejuaraan',
    nama: d.judul || d.namaDokumen || d.nama || 'Dokumen Kejuaraan',
    kategori: d.kategori || 'Regulasi',
    statusInfo: d.statusInfo || d.status || 'Tersedia',
    status: d.statusInfo || d.status || 'Tersedia',
    fileUrl: d.fileUrl || d.url || '#',
    url: d.fileUrl || d.url || '#',
    deskripsi: d.deskripsi || ''
  }));

  const beritaList = beritaRaw.map((b, i) => ({
    ...b,
    id: b.id || (i + 1),
    slug: b.slug || `berita-${b.id || (i + 1)}`,
    judul: b.judul || b.title || 'Warta STHAC 2026',
    kategori: b.kategori || 'Pengumuman',
    ringkasan: b.ringkasan || b.isiBerita || b.konten || '',
    isiBerita: b.isiBerita || b.konten || b.ringkasan || '',
    konten: b.isiBerita || b.konten || b.ringkasan || '',
    tanggalTerbit: b.tanggalTerbit || b.tanggal || 'Oktober 2026',
    tanggal: b.tanggalTerbit || b.tanggal || 'Oktober 2026',
    penulis: b.penulis || 'Panitia STHAC'
  }));

  const panitiaList = panitiaRaw.map((u, i) => ({
    ...u,
    id: u.id || (i + 1),
    kodePanitia: u.kodePanitia || u.kode || `P-${String(i + 1).padStart(3, '0')}`,
    kode: u.kodePanitia || u.kode || `P-${String(i + 1).padStart(3, '0')}`,
    namaLengkap: u.namaLengkap || u.nama || 'Panitia STHAC',
    nama: u.namaLengkap || u.nama || 'Panitia STHAC',
    jabatan: u.jabatan || u.peran || 'Panitia & Juri',
    peran: u.jabatan || u.peran || 'Panitia & Juri',
    email: u.email || 'admin@sthac.com',
    noWhatsapp: u.noWhatsapp || u.whatsapp || '-',
    peranAkses: u.peranAkses || 'Admin'
  }));

  // 4. Perhitungan Skor Run & Klasemen (Diurutkan dari Input/Update Terbaru)
  const scoreRunList = scoreRunRaw.map(sr => {
    const kId = Number(sr.kelasId || sr.classId || 1);
    const rId = Number(sr.riderId || 1);
    const runNo = Number(sr.runNumber || sr.runKe || sr.nomorRun || 1);
    const rObj = riderList.find(r => Number(r.id) === rId) || { id: rId, kodeRider: 'R-00' + rId, namaLengkap: 'Rider #' + rId, asalStable: '-', kategoriUmur: 'Terbuka' };
    const kObj = kelasRaw.find(k => Number(k.id) === kId) || { id: kId, namaKelas: 'Kelas #' + kId, kategori: 'Terbuka', seriId: 1 };

    const t1 = Number(sr.target1 ?? sr.t1 ?? 0);
    const t2 = Number(sr.target2 ?? sr.t2 ?? 0);
    const t3 = Number(sr.target3 ?? sr.t3 ?? 0);
    const t4 = Number(sr.target4 ?? sr.t4 ?? 0);
    const t5 = Number(sr.target5 ?? sr.t5 ?? 0);

    return {
      ...sr,
      kelasId: kId,
      riderId: rId,
      runNumber: runNo,
      runKe: runNo,
      target1: t1,
      target2: t2,
      target3: t3,
      target4: t4,
      target5: t5,
      targetsArray: [t1, t2, t3],
      poinTarget: Number(sr.poinTarget ?? sr.skorTarget ?? sr.targetPoints ?? (t1 + t2 + t3)),
      waktuTempuh: Number(sr.waktuTempuh ?? sr.waktu ?? sr.timeSeconds ?? 0),
      poinWaktu: Number(sr.poinWaktu ?? sr.skorWaktu ?? sr.timePoints ?? 0),
      bonusTambahan: Number(sr.bonusTambahan ?? sr.poinBonus ?? sr.bonusPoints ?? 0),
      totalSkor: Number(sr.totalSkor ?? sr.skorAkhir ?? sr.totalRun ?? sr.finalScore ?? 0),
      updatedAt: sr.updatedAt || '2026-10-25T00:00:00.000Z',
      rider: rObj,
      kelas: kObj
    };
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || (Number(b.id) - Number(a.id)));

  const scoreboardByKelas = {};
  const riderChampMap = new Map();

  riderList.forEach(r => {
    riderChampMap.set(r.id, {
      ...r,
      riderId: r.id,
      totalPoints: 0,
      totalPoin: 0,
      poinSeri1: 0,
      poinSeri2: 0,
      poinSeri3: 0,
      totalSkorLintasan: 0,
      totalTargetPoints: 0,
      p1Count: 0,
      juaraSatuCount: 0,
      kelasDiikuti: 0,
      riwayatKelas: []
    });
  });

  const kelasList = kelasRaw.map((k, idxK) => {
    const lintObj = lintasanList.find(l => l.id === (k.lintasanId || k.trackId)) || lintasanList[0] || {
      id: 1,
      kodeLintasan: 'L-01',
      namaLintasan: 'Arena Walk-Trot',
      sistem: 'IHAA',
      panjangMeter: 30,
      jumlahTarget: 3,
      nilaiZonaTarget: '5 / 4 / 3 / 2 / 1',
      parTime: 0
    };

    const runsInClass = scoreRunList.filter(sr => Number(sr.kelasId) === Number(k.id));
    const byRider = new Map();

    runsInClass.forEach(sr => {
      if (!byRider.has(sr.riderId)) {
        byRider.set(sr.riderId, {
          riderId: sr.riderId,
          rider: sr.rider,
          kodeRider: sr.rider.kodeRider,
          namaLengkap: sr.rider.namaLengkap,
          nama: sr.rider.namaLengkap,
          asalStable: sr.rider.asalStable,
          stable: sr.rider.asalStable,
          kategoriUmur: sr.rider.kategoriUmur,
          runs: [],
          runsByNumber: {},
          droppedRunNumber: null,
          totalTarget: 0,
          totalWaktu: 0,
          totalBonus: 0,
          totalSkor: 0
        });
      }
      const entry = byRider.get(sr.riderId);
      entry.runs.push(sr);
      entry.runsByNumber[sr.runNumber] = sr;
    });

    const rows = Array.from(byRider.values()).map(item => {
      item.runs.sort((a, b) => a.runNumber - b.runNumber);
      let activeRuns = [...item.runs];
      if (k.buangSkorTerendah && activeRuns.length > 1) {
        let minIdx = 0;
        activeRuns.forEach((r, i) => {
          if (r.totalSkor < activeRuns[minIdx].totalSkor) minIdx = i;
        });
        item.droppedRunNumber = activeRuns[minIdx].runNumber;
        activeRuns.splice(minIdx, 1);
      }
      item.totalTarget = Number(activeRuns.reduce((s, r) => s + r.poinTarget, 0).toFixed(2));
      item.totalWaktu = Number(activeRuns.reduce((s, r) => s + r.poinWaktu, 0).toFixed(2));
      item.totalBonus = Number(activeRuns.reduce((s, r) => s + r.bonusTambahan, 0).toFixed(2));
      item.totalSkor = Number(activeRuns.reduce((s, r) => s + r.totalSkor, 0).toFixed(2));
      return item;
    });

    rows.sort((a, b) => (b.totalSkor - a.totalSkor) || (b.totalTarget - a.totalTarget));

    rows.forEach((row, idx) => {
      row.peringkat = idx + 1;
      row.rank = idx + 1;
      row.poinKejuaraan = k.hitungPoinJuara !== false ? (POIN_JUARA_MAP[idx] || 0) : 0;
      row.champPoints = row.poinKejuaraan;

      if (riderChampMap.has(row.riderId)) {
        const ch = riderChampMap.get(row.riderId);
        ch.totalPoints += row.poinKejuaraan;
        ch.totalPoin = ch.totalPoints;
        const sNo = k.seriId || 1;
        if (sNo === 1) ch.poinSeri1 += row.poinKejuaraan;
        else if (sNo === 2) ch.poinSeri2 += row.poinKejuaraan;
        else ch.poinSeri3 += row.poinKejuaraan;

        ch.totalSkorLintasan = Number((ch.totalSkorLintasan + row.totalSkor).toFixed(2));
        ch.totalTargetPoints = Number((ch.totalTargetPoints + row.totalTarget).toFixed(2));
        ch.kelasDiikuti += 1;
        if (idx === 0) {
          ch.p1Count += 1;
          ch.juaraSatuCount += 1;
        }
        ch.riwayatKelas.push({
          kelasId: k.id,
          namaKelas: k.namaKelas || k.nama,
          kategori: k.kategori || 'Terbuka',
          namaLintasan: k.namaLintasan || lintObj.namaLintasan,
          peringkat: row.peringkat,
          totalSkor: row.totalSkor,
          totalTarget: row.totalTarget,
          poinKejuaraan: row.poinKejuaraan,
          runs: row.runs
        });
      }
    });

    scoreboardByKelas[k.id] = rows;

    return {
      ...k,
      id: k.id || (idxK + 1),
      seriId: k.seriId || 1,
      urutanTampil: k.urutanTampil || (idxK + 1),
      namaKelas: k.namaKelas || k.nama || `Kelas ${idxK + 1}`,
      nama: k.namaKelas || k.nama || `Kelas ${idxK + 1}`,
      kategori: k.kategori || k.kategoriUmur || 'Terbuka',
      namaLintasan: k.namaLintasan || lintObj.namaLintasan,
      lintasan: lintObj,
      jumlahRun: k.jumlahRun || k.totalRun || 3,
      kuotaPeserta: k.kuotaPeserta || k.kuota || 30,
      pesertaTerisi: rows.length || k.pesertaTerisi || 0,
      statusKelas: k.statusKelas || k.status || 'Pendaftaran dibuka',
      hitungPoinJuara: k.hitungPoinJuara !== false,
      buangSkorTerendah: Boolean(k.buangSkorTerendah),
      catatanTeknis: k.catatanTeknis || k.catatan || '',
      leaderboard: rows,
      standings: rows,
      scores: rows,
      pesertaList: rows,
      peserta: rows,
      runs: runsInClass
    };
  });

  const filteredKelasBySeri = kelasList.filter(k => Number(k.seriId || 1) === Number(selectedSeriId));
  if (selectedSeri) {
    selectedSeri.kelas = filteredKelasBySeri;
    selectedSeri.classes = filteredKelasBySeri;
    selectedSeri.kelasList = filteredKelasBySeri;
  }
  const activeKelasList = filteredKelasBySeri.length > 0 ? filteredKelasBySeri : kelasList;
  const selectedKelasId = req.query && req.query.kelas ? parseInt(req.query.kelas, 10) : (activeKelasList[0] ? activeKelasList[0].id : 1);
  const selectedKelas = activeKelasList.find(k => k.id === selectedKelasId) || activeKelasList[0] || null;

  const selectedKategori = (req.query && req.query.kategori) ? String(req.query.kategori) : 'Semua';
  let standings = Array.from(riderChampMap.values())
    .sort((a, b) => (b.totalPoints - a.totalPoints) || (b.p1Count - a.p1Count) || (b.totalSkorLintasan - a.totalSkorLintasan))
    .map((st, idx) => ({ ...st, peringkat: idx + 1, rank: idx + 1 }));

  const filteredStandings = selectedKategori !== 'Semua'
    ? standings.filter(s => s.kategoriUmur.toLowerCase() === selectedKategori.toLowerCase())
    : standings;

  // 5. Detail Rider untuk /profile?id=X
  const queryRiderId = req.query && (req.query.id || req.query.riderId) ? parseInt(req.query.id || req.query.riderId, 10) : null;
  let riderDetail = null;
  let riderRuns = [];
  let riderClasses = [];
  if (queryRiderId) {
    const foundRider = riderList.find(r => r.id === queryRiderId);
    if (foundRider) {
      const stInfo = riderChampMap.get(foundRider.id) || {};
      riderRuns = scoreRunList.filter(sr => sr.riderId === foundRider.id);
      riderClasses = stInfo.riwayatKelas || [];
      riderDetail = {
        ...foundRider,
        ...stInfo,
        runs: riderRuns,
        scoreRuns: riderRuns,
        riwayatKelas: riderClasses,
        classes: riderClasses
      };
    }
  }

  // 6. Gabungan Pendaftar + Rider untuk Tab Pendaftar di panitia.ejs (adminBundle.allRiders)
  const combinedRegistrations = pendaftarList.length > 0 ? pendaftarList : riderList;

  const cntMenunggu = pendaftarList.filter(p => p.statusAcc !== 'Diterima').length;
  const cntDiterima = pendaftarList.filter(p => p.statusAcc === 'Diterima').length + riderList.length;
  const stats = {
    menungguAcc: cntMenunggu,
    pendingAcc: cntMenunggu,
    pendaftarDiterima: cntDiterima,
    diterima: cntDiterima,
    approved: cntDiterima,
    totalPendaftar: pendaftarList.length,
    riderAktif: riderList.length,
    riders: riderList.length,
    totalRider: riderList.length,
    pelatihAktif: pelatihList.length,
    pelatih: pelatihList.length,
    coaches: pelatihList.length,
    totalPelatih: pelatihList.length,
    stableAktif: stableList.length,
    stable: stableList.length,
    stables: stableList.length,
    totalStable: stableList.length,
    totalSeri: seriList.length,
    seri: seriList.length,
    totalKelas: kelasList.length,
    kelas: kelasList.length,
    totalLintasan: lintasanList.length,
    lintasan: lintasanList.length,
    totalRunTercatat: scoreRunList.length,
    runTersimpan: scoreRunList.length,
    hasilRun: scoreRunList.length,
    runs: scoreRunList.length,
    totalRuns: scoreRunList.length,
    totalPanitia: panitiaList.length,
    panitia: panitiaList.length,
    juri: panitiaList.length,
    totalDokumen: dokumenList.length,
    dokumen: dokumenList.length,
    unduhan: dokumenList.length,
    documents: dokumenList.length,
    totalBerita: beritaList.length,
    berita: beritaList.length
  };

  // 7. OBJEK PROFILES (Untuk views/pages/profile.ejs)
  const profiles = createSafeBundle({
    riders: riderList,
    riderList,
    pelatih: pelatihList,
    coaches: pelatihList,
    pelatihList,
    stables: stableList,
    stable: stableList,
    stableList,
    panitia: panitiaList,
    juri: panitiaList,
    committees: panitiaList,
    panitiaList
  });

  // 8. OBJEK ADMIN BUNDLE (Untuk views/pages/panitia.ejs)
  const adminBundle = createSafeBundle({
    allRiders: combinedRegistrations,
    pendaftar: pendaftarList,
    pendaftarList,
    registrations: pendaftarList,
    riders: riderList,
    riderList,
    activeRiders: riderList,
    pelatih: pelatihList,
    pelatihList,
    coaches: pelatihList,
    stables: stableList,
    stable: stableList,
    stableList,
    seri: seriList,
    series: seriList,
    seriList,
    kelas: kelasList,
    classes: kelasList,
    kelasList,
    acara: kelasList,
    lintasan: lintasanList,
    tracks: lintasanList,
    lintasanList,
    runs: scoreRunList,
    scoreRuns: scoreRunList,
    scoreRunList,
    penilaian: scoreRunList,
    standings,
    poin: standings,
    juara: standings,
    leaderboard: standings,
    panitia: panitiaList,
    panitiaList,
    users: panitiaList,
    committees: panitiaList,
    unduhan: dokumenList,
    dokumen: dokumenList,
    dokumenList,
    documents: dokumenList,
    berita: beritaList,
    beritaList,
    news: beritaList,
    articles: beritaList,
    stats,
    setting,
    scoreboardByKelas,
    poinTable: POIN_JUARA_MAP
  });

  const ctx = {
    title: `${pageTitle} — ${setting.eventName}`,
    activePage,
    setting,
    stats,
    profiles,
    adminBundle,
    query: req.query || {},
    success: Boolean(req.query && req.query.success === '1'),
    error: req.query && req.query.error ? String(req.query.error) : null,
    message: req.query && req.query.message ? String(req.query.message) : null,

    // Seri & Kelas & Skor
    seriList,
    selectedSeriId,
    selectedSeri,
    activeSeri: selectedSeri,
    lintasanList,
    kelasList,
    kelasWithScores: activeKelasList,
    kelasWithLeaderboard: activeKelasList,
    selectedKelasId,
    selectedKelas,
    scoreboardByKelas,
    scoreRunList,
    runsList: scoreRunList,

    // Klasemen Juara Umum
    standings: filteredStandings,
    allStandings: standings,
    juaraList: filteredStandings,
    leaderboard: filteredStandings,
    selectedKategori,
    kategoriFilter: selectedKategori,
    poinTable: POIN_JUARA_MAP,
    poinMap: POIN_JUARA_MAP,
    distribusiPoin: POIN_JUARA_MAP,

    // Direktori & Detail
    activeTab: (req.query && req.query.tab) ? String(req.query.tab) : 'rider',
    searchQuery: (req.query && (req.query.q || req.query.search)) ? String(req.query.q || req.query.search).trim() : '',
    riderDetail,
    selectedRider: riderDetail,
    riderRuns,
    riderClasses,
    riderList,
    riders: riderList,
    pelatihList,
    coaches: pelatihList,
    stableList,
    stables: stableList,
    panitiaList,
    committees: panitiaList,
    pendaftarList,
    registrations: pendaftarList,
    dokumenList,
    unduhanList: dokumenList,
    documents: dokumenList,
    beritaList,
    newsList: beritaList,
    beritaDetail: null,
    newsDetail: null
  };

  if (viewName) {
    const usedVars = getTemplateVariables(viewName);
    usedVars.forEach(vName => {
      if (!(vName in ctx)) {
        if (vName.endsWith('List') || vName.endsWith('s')) ctx[vName] = [];
        else if (vName.startsWith('is') || vName.startsWith('has') || vName.startsWith('show')) ctx[vName] = false;
        else if (vName.endsWith('Id') || vName.endsWith('Count') || vName.startsWith('total')) ctx[vName] = 0;
        else if (vName.endsWith('Detail') || vName.startsWith('selected')) ctx[vName] = null;
        else ctx[vName] = createSafeBundle({});
      }
    });
  }

  return ctx;
}

function safeRoute(pageKey, pageTitle, viewName) {
  return async (req, res) => {
    try {
      const ctx = await buildViewContext(req, pageKey, pageTitle, viewName);
      res.render(viewName, ctx);
    } catch (err) {
      console.error(`Error rendering ${viewName}:`, err);
      res.status(500).send(`
        <div style="font-family:sans-serif;padding:2rem;max-width:720px;margin:auto;">
          <h3 style="color:#b91c1c;">Terjadi Kesalahan Tampilan (${viewName})</h3>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto;">${err.message}</pre>
          <a href="/" style="display:inline-block;margin-top:1rem;padding:0.5rem 1rem;background:#072619;color:#fff;text-decoration:none;border-radius:6px;">&larr; Kembali ke Beranda</a>
        </div>
      `);
    }
  };
}

router.get('/', safeRoute('beranda', 'Beranda', 'pages/beranda'));
router.get('/event', safeRoute('event', 'Event & Jadwal Seri 1', 'pages/event'));
router.get(['/seri', '/serie'], safeRoute('seri', 'Roadmap Seri 1–3', 'pages/seri'));
router.get('/aturan', safeRoute('aturan', 'Aturan & Sistem Penilaian', 'pages/aturan'));
router.get('/unduhan', safeRoute('unduhan', 'Pusat Unduhan Dokumen', 'pages/unduhan'));
router.get('/skor', safeRoute('skor', 'Papan Skor Pertandingan', 'pages/skor'));
router.get('/juara', safeRoute('juara', 'Klasemen Poin Juara Umum', 'pages/juara'));
router.get(['/profile', '/rider', '/rider-detail'], safeRoute('profile', 'Profil Ekosistem STHAC', 'pages/profile'));
router.get(['/news', '/berita'], safeRoute('news', 'Warta & Pengumuman', 'pages/news'));
router.get(['/pendaftaran', '/daftar'], safeRoute('pendaftaran', 'Formulir Pendaftaran Seri 1', 'pages/pendaftaran'));
router.get(['/panitia', '/admin'], safeRoute('panitia', 'Panel Panitia', 'pages/panitia'));

module.exports = router;
module.exports.buildViewContext = buildViewContext;
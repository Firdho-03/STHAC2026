const fs = require('fs');
const path = require('path');

function splitClean(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
  return String(raw)
    .split(/[|,;/]+/)
    .map(s => s.trim())
    .filter(s => s && s.toLowerCase() !== 'kelas' && s !== '-' && !s.toLowerCase().includes('belum menentukan'));
}

function parseKategoriList(rider) {
  const katArr = splitClean(rider.kategori || rider.kategoriRider || '');
  const kelasArr = splitClean(rider.kelasYangDiikuti || rider.kelasPertandingan || '');
  if (katArr.length > 0) return katArr;
  if (kelasArr.length > 0) return kelasArr;
  return ['U14'];
}

function buildOfficialKlasemen(locals) {
  if (!locals || typeof locals !== 'object') return locals;

  const pointScale = [10, 8, 6, 5, 4, 3, 2, 1];

  // Ambil daftar rider dari locals atau sthac-unified-store.json
  let riders = [];
  if (Array.isArray(locals.riderList) && locals.riderList.length > 0) {
    riders = locals.riderList;
  } else if (Array.isArray(locals.riders) && locals.riders.length > 0) {
    riders = locals.riders;
  } else {
    try {
      const storePath = path.join(process.cwd(), 'prisma', 'sthac-unified-store.json');
      if (fs.existsSync(storePath)) {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        if (Array.isArray(store.rider)) riders = store.rider;
      }
    } catch (e) {}
  }

  const scoreboard = Array.isArray(locals.scoreboardByClass) ? locals.scoreboardByClass : [];
  const existingKlasemen = Array.isArray(locals.klasemenList) ? locals.klasemenList : [];
  const sourceList = existingKlasemen.length > 0 ? existingKlasemen : riders;

  const updatedList = sourceList.map((item, idx) => {
    const itemCode = String(item.kodeRider || item.kode || '').trim().toUpperCase();
    const itemName = String(item.namaLengkap || item.namaRider || item.riderName || item.nama || '').trim().toLowerCase();

    const matchedRider = riders.find(r =>
      String(r.kodeRider || r.kode || '').trim().toUpperCase() === itemCode ||
      String(r.namaLengkap || r.namaRider || r.nama || '').trim().toLowerCase() === itemName
    ) || {};

    const merged = { ...matchedRider, ...item };
    const kategoriRows = parseKategoriList(matchedRider.kategori ? matchedRider : merged);

    // Hitung nilai posisi untuk setiap kategori/kelas yang diikuti
    const scoreRows = kategoriRows.map((katName) => {
      const katLower = katName.toLowerCase();
      // Cek apakah ada posisi peringkat dari scoreboardByClass untuk kategori ini
      const matchedCls = scoreboard.find(cls =>
        String(cls.kategori || '').toLowerCase() === katLower ||
        String(cls.namaKelas || '').toLowerCase().includes(katLower)
      );

      if (matchedCls && Array.isArray(matchedCls.rows) && matchedCls.rows.length > 0) {
        const rIdx = matchedCls.rows.findIndex(row =>
          String(row.kodeRider || '').trim().toUpperCase() === itemCode ||
          String(row.namaRider || '').trim().toLowerCase() === itemName
        );
        if (rIdx !== -1) {
          return pointScale[rIdx] || 0;
        }
      }
      // Jika urutan berdasarkan indeks peserta pada kelas tersebut
      return pointScale[idx] !== undefined ? pointScale[idx] : 0;
    });

    // POIN KEJUARAAN = Penjumlahan langsung dari seluruh nilai di kolom TOTAL SKOR RUN
    const totalPoinKejuaraan = scoreRows.reduce((sum, val) => sum + Number(val || 0), 0);
    const stableVal = merged.asalStable || merged.namaStable || merged.stableName || merged.stable || merged.klub || '-';

    return {
      ...merged,
      kodeRider: merged.kodeRider || merged.kode || ('R-00' + (idx + 1)),
      namaLengkap: merged.namaLengkap || merged.namaRider || merged.riderName || merged.nama || 'Rider',
      asalStable: stableVal,
      namaStable: stableVal,
      stableName: stableVal,
      kategoriRows,
      scoreRows,
      splitRows: kategoriRows.map((kName, i) => ({
        namaKelas: kName,
        poinKelas: scoreRows[i]
      })),
      poinKejuaraan: totalPoinKejuaraan,
      totalPoin: totalPoinKejuaraan,
      poin: totalPoinKejuaraan
    };
  })
  .sort((a, b) => b.poinKejuaraan - a.poinKejuaraan)
  .map((item, idx) => ({
    ...item,
    peringkat: idx + 1,
    rank: idx + 1
  }));

  locals.klasemenList = updatedList;
  locals.standings = updatedList;
  locals.leaderboard = updatedList;
  return locals;
}

module.exports = { buildOfficialKlasemen };

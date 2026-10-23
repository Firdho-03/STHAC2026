const db = require('../config/Database').getClient();

class ScoringService {
  // Parse string "1:0.5, 2:1, 3:1.5" menjadi objek map { 1: 0.5, 2: 1, 3: 1.5 }
  parseMultiplierMap(str) {
    const map = {};
    if (!str || !str.trim()) return map;
    str.split(',').forEach(part => {
      const [k, v] = part.split(':').map(s => s.trim());
      if (k && v && !isNaN(parseFloat(v))) {
        map[parseInt(k)] = parseFloat(v);
      }
    });
    return map;
  }

  // Kalkulasi otomatis 1 Run berdasarkan konfigurasi Lintasan
  calculateRunScore(input, lintasan = null) {
    const t1 = parseFloat(input.target1) || 0;
    const t2 = parseFloat(input.target2) || 0;
    const t3 = parseFloat(input.target3) || 0;
    const t4 = parseFloat(input.target4) || 0;
    const t5 = parseFloat(input.target5) || 0;
    const targets = [t1, t2, t3, t4, t5];

    const hitsCount = targets.filter(v => v > 0).length;
    let poinTarget = targets.reduce((a, b) => a + b, 0);

    const waktuTempuh = parseFloat(input.waktuTempuh) || 0;
    const parTime = lintasan ? parseFloat(lintasan.parTime) || 0 : (parseFloat(input.batasWaktu) || 0);
    const batasWaktu = lintasan && lintasan.batasWaktu > 0 ? parseFloat(lintasan.batasWaktu) : parTime;

    let bonusWaktu = 0;
    let bonusLain = parseFloat(input.bonusLain) || 0;

    // Cek apabila melewati batas waktu maksimal
    if (batasWaktu > 0 && waktuTempuh > batasWaktu) {
      if (lintasan && lintasan.aturanOvertime === 'Diskualifikasi / Skor 0') {
        return { poinTarget: 0, bonusWaktu: 0, bonusLain: 0, totalSkor: 0 };
      }
    }

    // Hitung bonus / penalti waktu terhadap Par Time (IHAA)
    if (parTime > 0 && waktuTempuh > 0 && hitsCount >= (lintasan?.minTargetKenaBonus || 1)) {
      const diff = parTime - waktuTempuh;
      if (diff >= 0) {
        bonusWaktu = diff * (lintasan?.bonusWaktuPerDetik ?? 1.0);
        const multMap = this.parseMultiplierMap(lintasan?.pengaliBonusWaktu || '');
        if (multMap[hitsCount] !== undefined) {
          bonusWaktu *= multMap[hitsCount];
        }
        if (lintasan?.bonusWaktuMaks > 0) {
          bonusWaktu = Math.min(bonusWaktu, lintasan.bonusWaktuMaks);
        }
      } else {
        bonusWaktu = diff * (lintasan?.penaltiWaktuPerDtk ?? 1.0);
      }
    }

    // Bonus mengenai seluruh target (Sapu Bersih)
    if (lintasan && lintasan.bonusSapuBersih > 0 && hitsCount >= (lintasan.jumlahTarget || 3)) {
      bonusLain += parseFloat(lintasan.bonusSapuBersih);
    }

    const totalSkor = Math.max(0, parseFloat((poinTarget + bonusWaktu + bonusLain).toFixed(2)));
    return {
      poinTarget: parseFloat(poinTarget.toFixed(2)),
      bonusWaktu: parseFloat(bonusWaktu.toFixed(2)),
      bonusLain: parseFloat(bonusLain.toFixed(2)),
      totalSkor
    };
  }

  async recordScore(payload) {
    const riderId = parseInt(payload.riderId);
    const seriId = parseInt(payload.seriId) || 1;
    const kelasId = payload.kelasId ? parseInt(payload.kelasId) : null;
    const runNumber = parseInt(payload.runNumber) || 1;

    let lintasan = null;
    let kelasObj = null;
    if (kelasId) {
      kelasObj = await db.kelasPertandingan.findUnique({
        where: { id: kelasId },
        include: { lintasanRel: true }
      });
      lintasan = kelasObj?.lintasanRel || null;
    }

    const rider = await db.rider.findUnique({ where: { id: riderId } });
    const calc = this.calculateRunScore(payload, lintasan);

    // Cek apakah runNumber untuk rider & kelas ini sudah ada -> update jika ada, create jika belum
    const existing = await db.scoreRun.findFirst({
      where: {
        riderId,
        seriId,
        kelas: kelasObj ? kelasObj.namaKelas : (payload.kelas || 'Beginner ( Walk )'),
        runNumber
      }
    });

    const dataToSave = {
      riderId,
      seriId,
      kelasId: kelasObj ? kelasObj.id : null,
      kelas: kelasObj ? kelasObj.namaKelas : (payload.kelas || 'Beginner ( Walk )'),
      noBib: parseInt(payload.noBib) || rider?.noBib || 1,
      runNumber,
      target1: parseFloat(payload.target1) || 0,
      target2: parseFloat(payload.target2) || 0,
      target3: parseFloat(payload.target3) || 0,
      target4: parseFloat(payload.target4) || 0,
      target5: parseFloat(payload.target5) || 0,
      waktuTempuh: parseFloat(payload.waktuTempuh) || 0,
      batasWaktu: parseFloat(payload.batasWaktu) || lintasan?.parTime || 14.0,
      poinTarget: calc.poinTarget,
      bonusWaktu: calc.bonusWaktu,
      bonusLain: calc.bonusLain,
      totalSkor: payload.manualTotal ? parseFloat(payload.manualTotal) : calc.totalSkor
    };

    if (existing) {
      return await db.scoreRun.update({ where: { id: existing.id }, data: dataToSave, include: { rider: true } });
    }
    return await db.scoreRun.create({ data: dataToSave, include: { rider: true } });
  }

  // Menyusun papan skor lengkap per kelas pada suatu Seri (Persis skor.php)
  async getClassScoreboards(seriId = 1) {
    const [kelasList, riders, runs] = await Promise.all([
      db.kelasPertandingan.findMany({ where: { seriId: parseInt(seriId) }, orderBy: { id: 'asc' } }),
      db.rider.findMany({ where: { statusAcc: 'Diterima' }, orderBy: { noBib: 'asc' } }),
      db.scoreRun.findMany({ where: { seriId: parseInt(seriId) }, include: { rider: true }, orderBy: { runNumber: 'asc' } })
    ]);

    return kelasList.map(k => {
      // Peserta yang terdaftar di kelas ini atau punya skor di kelas ini
      const classRiders = riders.filter(r =>
        r.kelasDiikuti.toLowerCase().includes(k.namaKelas.toLowerCase()) &&
        r.kategori.toLowerCase() === k.kategori.toLowerCase()
      );

      const rows = classRiders.map(r => {
        const riderRuns = runs.filter(rn => rn.riderId === r.id && rn.kelas.toLowerCase() === k.namaKelas.toLowerCase());
        const scoresArr = riderRuns.map(rn => rn.totalSkor);
        const targetPts = riderRuns.reduce((sum, rn) => sum + (rn.poinTarget || rn.totalSkor), 0);
        const bestRun = scoresArr.length > 0 ? Math.max(...scoresArr) : 0;

        let total = scoresArr.reduce((sum, v) => sum + v, 0);
        // Jika opsi "Buang 1 skor run terendah" aktif dan peserta menyelesaikan lebih dari 1 run
        if (k.buangSkorTerendah && scoresArr.length > 1) {
          const minScore = Math.min(...scoresArr);
          total -= minScore;
        }

        return {
          riderId: r.id,
          kodeRider: r.kodeRider,
          noBib: riderRuns[0]?.noBib || r.noBib,
          namaLengkap: r.namaLengkap,
          asalStable: r.asalStable,
          runsCompleted: riderRuns.length,
          maxRuns: k.jumlahRun,
          runsLabel: `${riderRuns.length}/${k.jumlahRun}`,
          targetPoints: parseFloat(targetPts.toFixed(2)),
          bestRun: parseFloat(bestRun.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          runDetails: riderRuns
        };
      });

      // Urutkan berdasarkan Total Skor tertinggi, lalu Best Run tertinggi
      rows.sort((a, b) => (b.total - a.total) || (b.bestRun - a.bestRun));

      // Berikan peringkat (Rank): Jika skor 0 maka peringkat mengikuti posisi bawah seperti di sthac.com
      let currentRank = 1;
      rows.forEach((row, idx) => {
        if (row.total > 0) {
          row.rank = currentRank++;
        } else {
          row.rank = currentRank;
        }
      });

      return {
        kelas: k,
        standings: rows
      };
    });
  }

  // Menghitung Poin Kejuaraan / Juara Umum (Persis juara.php & Homepage Top 3)
  async getChampionshipStandings() {
    const setting = await db.siteSetting.findFirst();
    let pointsMap = { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };
    try {
      if (setting?.pointsMapJson) {
        const parsed = JSON.parse(setting.pointsMapJson);
        pointsMap = { ...pointsMap, ...parsed };
      }
    } catch (_) {}

    // Skema poin standar sthac.com: Juara 1 kelas dapat 10 poin, Juara 2 dapat 8 poin, dst.
    // Tristiyan Juara 1 di 2 kelas (Walk & Trot) -> 10 + 10 = 20 pts!
    // Archer Juara 2 di Walk -> 8 pts!
    // Carla Juara 2 di Trot -> 8 pts!
    const defaultClassRankPoints = { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

    const seriList = await db.seriEvent.findMany({ orderBy: { nomorSeri: 'asc' } });
    const riderTotals = new Map();

    for (const s of seriList) {
      const classBoards = await this.getClassScoreboards(s.id);
      for (const board of classBoards) {
        if (!board.kelas.hitungPoinJuara) continue;

        board.standings.forEach(row => {
          if (row.total <= 0) return; // Hanya peserta yang sudah bertanding & punya skor > 0
          const pts = defaultClassRankPoints[row.rank] ?? (setting?.poinLuarDaftar || 1);

          // Gabungkan berdasarkan nama rider (karena 1 rider bisa punya kode R-001 di U14 & ikut juga di Terbuka)
          const key = row.namaLengkap.toLowerCase();
          if (!riderTotals.has(key)) {
            riderTotals.set(key, {
              kodeRider: row.kodeRider,
              namaLengkap: row.namaLengkap,
              asalStable: row.asalStable,
              totalPoints: 0,
              totalScoreAccum: 0,
              classesJoined: 0
            });
          }
          const entry = riderTotals.get(key);
          entry.totalPoints += pts;
          entry.totalScoreAccum += row.total;
          entry.classesJoined += 1;
        });
      }
    }

    const result = Array.from(riderTotals.values()).sort((a, b) =>
      (b.totalPoints - a.totalPoints) || (b.totalScoreAccum - a.totalScoreAccum)
    );

    result.forEach((r, idx) => { r.peringkat = idx + 1; });
    return result;
  }

  async getLeaderboard() {
    return await db.scoreRun.findMany({
      include: { rider: true, seri: true },
      orderBy: [{ totalSkor: 'desc' }, { waktuTempuh: 'asc' }]
    });
  }
}

module.exports = new ScoringService();
const prisma = require('../config/Database').getClient
  ? require('../config/Database').getClient()
  : (require('../config/Database').prisma || require('../config/Database'));

function attachScoreFixRoutes(app, io) {
  // Endpoint universal untuk menyimpan & menghapus skor run dari Panel Panitia
  const handleSaveScore = async (req, res) => {
    try {
      const body = req.body || {};
      const kelasId = parseInt(body.kelasId || body.classId, 10);
      const riderId = parseInt(body.riderId, 10);
      const runNumber = parseInt(body.runNumber || body.runKe || 1, 10);
      const t1 = parseFloat(body.t1 ?? body.target1 ?? 0) || 0;
      const t2 = parseFloat(body.t2 ?? body.target2 ?? 0) || 0;
      const t3 = parseFloat(body.t3 ?? body.target3 ?? 0) || 0;
      const t4 = parseFloat(body.t4 ?? body.target4 ?? 0) || 0;
      const t5 = parseFloat(body.t5 ?? body.target5 ?? 0) || 0;
      const waktuTempuh = parseFloat(body.waktuTempuh ?? body.timeSeconds ?? body.waktu ?? 0) || 0;

      if (!kelasId || !riderId || !runNumber) {
        return res.status(400).json({ ok: false, success: false, message: 'Pilih Kelas, Rider, dan nomor Run terlebih dahulu.' });
      }

      // Ambil data kelas & lintasan untuk perhitungan otomatis sesuai aturan IHAA / Pordasi
      const kelas = await prisma.kelasPertandingan.findUnique({
        where: { id: kelasId },
        include: { lintasan: true }
      });

      if (!kelas) {
        return res.status(404).json({ ok: false, success: false, message: 'Kelas pertandingan tidak ditemukan.' });
      }

      const lint = kelas.lintasan || {};
      const targets = [t1, t2, t3, t4, t5].slice(0, lint.jumlahTarget || 3);
      const poinTarget = targets.reduce((acc, v) => acc + (Number(v) || 0), 0);
      const hitCount = targets.filter(v => Number(v) > 0).length;

      let poinWaktu = 0;
      const parTime = Number(lint.parTime || 0);
      if (parTime > 0 && waktuTempuh > 0 && hitCount > 0) {
        const diff = parTime - waktuTempuh;
        if (diff >= 0) {
          poinWaktu = diff * Number(lint.poinPerDetikCepat || 1);
          if (lint.batasBonusWaktu > 0) {
            poinWaktu = Math.min(poinWaktu, Number(lint.batasBonusWaktu));
          }
        } else {
          poinWaktu = diff * Number(lint.penaltiPerDetikLambat || 1);
        }
      }

      let bonusTambahan = 0;
      if ((lint.jumlahTarget || 3) > 0 && hitCount === (lint.jumlahTarget || 3) && Number(lint.bonusSapuBersih || 0) > 0) {
        bonusTambahan += Number(lint.bonusSapuBersih);
      }

      let totalSkorRun = poinTarget + poinWaktu + bonusTambahan;
      if (!lint.bolehSkorNegatif) {
        totalSkorRun = Math.max(0, totalSkorRun);
      }
      totalSkorRun = Number(totalSkorRun.toFixed(2));
      poinWaktu = Number(poinWaktu.toFixed(2));

      // Pastikan rider sudah terdaftar di KelasPeserta / Enrollment bila tabelnya ada
      if (prisma.kelasPeserta) {
        const existingEnroll = await prisma.kelasPeserta.findFirst({
          where: { kelasId, riderId }
        });
        if (!existingEnroll) {
          await prisma.kelasPeserta.create({ data: { kelasId, riderId } }).catch(() => {});
        }
      }

      // Cek apakah ScoreRun untuk kelasId + riderId + runNumber sudah ada
      const existingRun = await prisma.scoreRun.findFirst({
        where: { kelasId, riderId, runNumber }
      });

      const runPayload = {
        kelasId,
        riderId,
        runNumber,
        target1: t1,
        target2: t2,
        target3: t3,
        target4: t4,
        target5: t5,
        poinTarget,
        waktuTempuh,
        poinWaktu,
        bonusTambahan,
        totalSkor: totalSkorRun
      };

      // Sesuaikan dengan kolom yang tersedia pada model ScoreRun di schema.prisma
      const dmmfModel = prisma._runtimeDataModel?.models?.ScoreRun;
      const validData = {};
      if (dmmfModel && dmmfModel.fields) {
        const allowedFields = new Set(dmmfModel.fields.map(f => f.name));
        for (const [k, v] of Object.entries(runPayload)) {
          if (allowedFields.has(k)) validData[k] = v;
        }
        // Dukungan nama kolom alternatif bila ada di skema
        if (allowedFields.has('targetScoresJson')) validData.targetScoresJson = JSON.stringify(targets);
        if (allowedFields.has('skorAkhir')) validData.skorAkhir = totalSkorRun;
        if (allowedFields.has('totalRun')) validData.totalRun = totalSkorRun;
        if (allowedFields.has('timeSeconds')) validData.timeSeconds = waktuTempuh;
        if (allowedFields.has('targetPoints')) validData.targetPoints = poinTarget;
        if (allowedFields.has('timePoints')) validData.timePoints = poinWaktu;
        if (allowedFields.has('bonusPoints')) validData.bonusPoints = bonusTambahan;
      } else {
        Object.assign(validData, runPayload);
      }

      let saved;
      if (existingRun) {
        saved = await prisma.scoreRun.update({
          where: { id: existingRun.id },
          data: validData
        });
      } else {
        saved = await prisma.scoreRun.create({
          data: validData
        });
      }

      if (io) {
        io.emit('score_updated', { kelasId, riderId, runNumber, totalSkorRun });
      }

      return res.json({
        ok: true,
        success: true,
        message: `Nilai Run #${runNumber} berhasil disimpan! Total Skor: ${totalSkorRun} pts`,
        data: saved,
        summary: { poinTarget, poinWaktu, bonusTambahan, totalSkorRun }
      });
    } catch (err) {
      console.error('❌ Error Save ScoreRun:', err);
      return res.status(500).json({ ok: false, success: false, message: 'Gagal menyimpan nilai: ' + err.message });
    }
  };

  // Daftarkan pada semua kemungkinan path API agar frontend pasti terhubung
  app.post('/api/panitia/score-run', handleSaveScore);
  app.post('/api/admin/score', handleSaveScore);
  app.post('/api/scores', handleSaveScore);
  app.post('/panitia/score', handleSaveScore);
}

module.exports = { attachScoreFixRoutes };
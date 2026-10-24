const fs = require('fs');
const path = require('path');
const {
  resolveDelegate,
  safeFindMany,
  safeFindFirst,
  safeCreate,
  safeUpdate,
  safeDelete,
  safeDeleteMany,
  safeCount,
  saveSiteSettings
} = require('../config/ModelAdapter');

const EmailService = fs.existsSync(path.join(__dirname, 'EmailService.js'))
  ? require('./EmailService')
  : null;

const CANDIDATES = {
  seri: ['seriKejuaraan', 'seri', 'series', 'eventSeries'],
  lintasan: ['lintasan', 'track', 'masterLintasan', 'course'],
  kelas: ['kelasPertandingan', 'kelas', 'competitionClass', 'eventClass'],
  rider: ['rider', 'pesertaRider', 'atlet'],
  pelatih: ['pelatih', 'coach', 'trainer'],
  stable: ['stable', 'klub', 'club'],
  pendaftar: ['pendaftaran', 'registration', 'pendaftar', 'registrasi'],
  scoreRun: ['scoreRun', 'runScore', 'penilaian', 'skorRun', 'hasilRun', 'score'],
  panitia: ['panitiaUser', 'panitia', 'adminUser', 'user', 'committee'],
  unduhan: ['dokumenUnduhan', 'dokumen', 'unduhan', 'document', 'download'],
  berita: ['berita', 'news', 'warta', 'artikel', 'post'],
  otp: ['otpToken', 'otp', 'emailOtp']
};

function attachUniversalCrudRoutes(app, io) {
  // -------------------------------------------------------------------
  // 1. INPUT & EDIT NILAI RUN PESERTA (PENILAIAN PANITIA)
  // -------------------------------------------------------------------
  const saveScoreHandler = async (req, res) => {
    try {
      const b = req.body || {};
      const kelasId = parseInt(b.kelasId || b.classId, 10);
      const riderId = parseInt(b.riderId, 10);
      const runNumber = parseInt(b.runNumber || b.runKe || b.nomorRun || 1, 10);

      const t1 = parseFloat(b.t1 ?? b.target1 ?? 0) || 0;
      const t2 = parseFloat(b.t2 ?? b.target2 ?? 0) || 0;
      const t3 = parseFloat(b.t3 ?? b.target3 ?? 0) || 0;
      const t4 = parseFloat(b.t4 ?? b.target4 ?? 0) || 0;
      const t5 = parseFloat(b.t5 ?? b.target5 ?? 0) || 0;
      const waktuTempuh = parseFloat(b.waktuTempuh ?? b.timeSeconds ?? b.waktu ?? 0) || 0;
      const bonusInput = parseFloat(b.bonusTambahan ?? b.bonusQabaq ?? b.bonusPoints ?? 0) || 0;

      if (!kelasId || !riderId || !runNumber) {
        return res.status(400).json({ ok: false, success: false, message: 'Kelas, Rider, dan Run ke- wajib dipilih.' });
      }

      const allKelas = await safeFindMany(CANDIDATES.kelas);
      const allLintasan = await safeFindMany(CANDIDATES.lintasan);
      const kelas = allKelas.find(k => k.id === kelasId) || {};
      const lint = allLintasan.find(l => l.id === (kelas.lintasanId || kelas.trackId)) || {};

      const jmlTarget = Number(lint.jumlahTarget || lint.targetCount || 3);
      const arrTargets = [t1, t2, t3, t4, t5].slice(0, jmlTarget);
      const poinTarget = arrTargets.reduce((sum, v) => sum + (Number(v) || 0), 0);
      const targetKena = arrTargets.filter(v => Number(v) > 0).length;

      let poinWaktu = 0;
      const parTime = Number(lint.parTime || lint.batasWaktu || 0);
      if (parTime > 0 && waktuTempuh > 0 && targetKena > 0) {
        const diff = parTime - waktuTempuh;
        if (diff >= 0) {
          let mult = 1;
          const lName = String(lint.namaLintasan || lint.nama || '').toUpperCase();
          if (lName.includes('TABLA-4') || lName.includes('T4')) {
            mult = targetKena === 1 ? 0.5 : (targetKena === 2 ? 1.0 : 1.5);
          }
          poinWaktu = diff * Number(lint.poinPerDetikCepat || 1) * mult;
          if (Number(lint.batasBonusWaktu || 0) > 0) {
            poinWaktu = Math.min(poinWaktu, Number(lint.batasBonusWaktu));
          }
        } else {
          poinWaktu = diff * Number(lint.penaltiPerDetikLambat || 1);
        }
      }

      let bonusTambahan = bonusInput;
      const sapuBersih = Number(lint.bonusSapuBersih || lint.bonusSemuaTarget || 0);
      if (jmlTarget > 0 && targetKena === jmlTarget && sapuBersih > 0) {
        bonusTambahan += sapuBersih;
      }

      let totalSkor = poinTarget + poinWaktu + bonusTambahan;
      if (!lint.bolehSkorNegatif) totalSkor = Math.max(0, totalSkor);
      poinWaktu = Number(poinWaktu.toFixed(2));
      totalSkor = Number(totalSkor.toFixed(2));

      // Siapkan semua kemungkinan nama kolom ScoreRun di schema.prisma
      const rawRunPayload = {
        kelasId,
        classId: kelasId,
        riderId,
        runNumber,
        runKe: runNumber,
        nomorRun: runNumber,
        target1: t1,
        target2: t2,
        target3: t3,
        target4: t4,
        target5: t5,
        t1,
        t2,
        t3,
        t4,
        t5,
        targetScoresJson: JSON.stringify(arrTargets),
        targetsJson: JSON.stringify(arrTargets),
        detailTarget: arrTargets.join('/'),
        poinTarget,
        skorTarget: poinTarget,
        targetPoints: poinTarget,
        waktuTempuh,
        waktu: waktuTempuh,
        timeSeconds: waktuTempuh,
        poinWaktu,
        skorWaktu: poinWaktu,
        timePoints: poinWaktu,
        bonusTambahan,
        poinBonus: bonusTambahan,
        bonus: bonusTambahan,
        bonusPoints: bonusTambahan,
        totalSkor,
        skorAkhir: totalSkor,
        totalRun: totalSkor,
        finalScore: totalSkor,
        skor: totalSkor,
        catatanJuri: b.catatanJuri || ''
      };

      const allRuns = await safeFindMany(CANDIDATES.scoreRun);
      const existing = allRuns.find(r =>
        (r.kelasId === kelasId || r.classId === kelasId) &&
        r.riderId === riderId &&
        (r.runNumber === runNumber || r.runKe === runNumber || r.nomorRun === runNumber)
      );

      let saved;
      if (existing) {
        saved = await safeUpdate(CANDIDATES.scoreRun, existing.id, rawRunPayload);
      } else {
        saved = await safeCreate(CANDIDATES.scoreRun, rawRunPayload);
      }

      if (io) io.emit('score_updated', { kelasId, riderId, runNumber, totalSkor });

      return res.json({
        ok: true,
        success: true,
        message: `Nilai Run #${runNumber} berhasil disimpan! (Target: ${poinTarget} | Waktu: ${poinWaktu} | Bonus: ${bonusTambahan} => Total: ${totalSkor} pts)`,
        data: saved
      });
    } catch (err) {
      console.error('Error saveScoreHandler:', err);
      return res.status(500).json({ ok: false, success: false, message: 'Gagal menyimpan skor: ' + err.message });
    }
  };

  app.post(['/api/panitia/score-run', '/api/admin/score', '/api/scores', '/panitia/score'], saveScoreHandler);

  const deleteScoreHandler = async (req, res) => {
    try {
      const id = parseInt(req.body.id || req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, message: 'ID Skor tidak valid.' });
      await safeDelete(CANDIDATES.scoreRun, id);
      if (io) io.emit('score_updated', { deletedId: id });
      return res.json({ ok: true, success: true, message: 'Nilai Run berhasil dihapus!' });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  };
  app.post('/api/panitia/score-run/delete', deleteScoreHandler);
  app.delete(['/api/panitia/score-run/:id', '/api/scores/:id'], deleteScoreHandler);

  // -------------------------------------------------------------------
  // 2. LOGIN & OTP PANITIA
  // -------------------------------------------------------------------
  app.post(['/api/auth/request-otp', '/api/panitia/request-otp', '/api/otp/send'], async (req, res) => {
    try {
      const { email, namaLengkap, jabatan, purpose } = req.body || {};
      if (!email) return res.status(400).json({ ok: false, message: 'Email wajib diisi.' });
      const cleanEmail = String(email).trim().toLowerCase();
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      global.sthacOtpStore = global.sthacOtpStore || {};
      global.sthacOtpStore[cleanEmail] = {
        otpCode,
        namaLengkap: namaLengkap || 'Panitia STHAC',
        jabatan: jabatan || 'Panitia Teknis',
        expiresAt
      };

      if (EmailService && EmailService.sendOtpEmail) {
        await EmailService.sendOtpEmail(cleanEmail, namaLengkap || 'Panitia STHAC', otpCode, purpose || 'LOGIN').catch(() => {});
      }

      return res.json({ ok: true, success: true, message: `Kode OTP telah dikirim ke ${cleanEmail}` });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  });

  app.post(['/api/auth/verify-otp', '/api/panitia/verify-otp', '/api/otp/verify'], async (req, res) => {
    try {
      const { email, otpCode, otp } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const code = String(otpCode || otp || '').trim();
      const mem = (global.sthacOtpStore || {})[cleanEmail];

      if (!mem || mem.otpCode !== code) {
        return res.status(400).json({ ok: false, success: false, message: 'Kode OTP salah atau sudah kedaluwarsa.' });
      }
      delete global.sthacOtpStore[cleanEmail];

      const listPanitia = await safeFindMany(CANDIDATES.panitia);
      let user = listPanitia.find(u => String(u.email || '').toLowerCase() === cleanEmail);
      if (!user) {
        user = await safeCreate(CANDIDATES.panitia, {
          namaLengkap: mem.namaLengkap,
          nama: mem.namaLengkap,
          email: cleanEmail,
          jabatan: mem.jabatan,
          peran: mem.jabatan,
          peranAkses: 'Admin',
          statusAktif: true
        }).catch(() => ({ namaLengkap: mem.namaLengkap, email: cleanEmail, jabatan: mem.jabatan }));
      }
      return res.json({ ok: true, success: true, user });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  });

  app.post(['/api/auth/quick-login', '/api/panitia/login', '/api/admin/login'], async (req, res) => {
    const { password } = req.body || {};
    if (password !== 'sthac2026') {
      return res.status(401).json({ ok: false, success: false, message: 'Sandi cepat salah (Gunakan: sthac2026).' });
    }
    const firstUser = await safeFindFirst(CANDIDATES.panitia);
    return res.json({
      ok: true,
      success: true,
      user: firstUser || { namaLengkap: 'Firdho Aulia', jabatan: 'Juri Utama', email: 'admin@sthac.com' }
    });
  });

  // -------------------------------------------------------------------
  // 3. PENDAFTARAN PUBLIK
  // -------------------------------------------------------------------
  const registerHandler = async (req, res) => {
    try {
      const b = req.body || {};
      const birthYear = b.tanggalLahir ? new Date(b.tanggalLahir).getFullYear() : 2010;
      const umur = !isNaN(birthYear) ? (2026 - birthYear) : (parseInt(b.umur, 10) || 16);
      const rawReg = {
        ...b,
        peranPendaftar: b.peranPendaftar || b.peran || 'Rider',
        peran: b.peranPendaftar || b.peran || 'Rider',
        namaLengkap: b.namaLengkap || b.nama || 'Peserta Baru',
        nama: b.namaLengkap || b.nama || 'Peserta Baru',
        gender: b.gender || 'Putra',
        tanggalLahir: b.tanggalLahir || '2010-01-01',
        umur,
        kategoriUmur: umur <= 14 ? 'U14' : 'Terbuka',
        asalStable: b.asalStable || b.namaStable || b.stable || 'Independen',
        namaStable: b.asalStable || b.namaStable || b.stable || 'Independen',
        namaPelatih: b.namaPelatih || b.pelatih || '-',
        kotaAsal: b.kotaAsal || b.kota || 'Tangerang Selatan',
        kota: b.kotaAsal || b.kota || 'Tangerang Selatan',
        provinsi: b.provinsi || 'Banten',
        noWhatsapp: b.noWhatsapp || b.whatsapp || b.noHp || '-',
        whatsapp: b.noWhatsapp || b.whatsapp || b.noHp || '-',
        email: b.email || '-',
        kelasPilihan: b.kelasPilihan || b.namaKelas || 'Beginner ( Walk )',
        namaKuda: b.namaKuda || b.kuda || '-',
        statusVerifikasi: 'Menunggu ACC',
        status: 'Menunggu ACC'
      };
      const created = await safeCreate(CANDIDATES.pendaftar, rawReg);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ ok: true, success: true, message: 'Pendaftaran berhasil dikirim!', data: created });
      }
      return res.redirect('/pendaftaran?success=1');
    } catch (err) {
      return res.status(500).json({ ok: false, success: false, message: 'Gagal mendaftar: ' + err.message });
    }
  };
  app.post(['/api/pendaftaran', '/pendaftaran'], registerHandler);

  // -------------------------------------------------------------------
  // 4. UNIVERSAL CRUD UNTUK SELURUH 13 MENU PANEL PANITIA
  // -------------------------------------------------------------------
  const crudHandler = async (req, res) => {
    try {
      const entity = String(req.body.entity || req.params.entity || '').toLowerCase();
      const action = String(req.body.action || (req.method === 'DELETE' ? 'delete' : (req.body.id || req.params.id ? 'update' : 'create'))).toLowerCase();
      const numId = parseInt(req.body.id || req.params.id, 10) || null;
      const payload = { ...(req.body.data || req.body || {}) };

      if (entity === 'demo' && action === 'clear') {
        await safeDeleteMany(CANDIDATES.scoreRun, {});
        await safeDeleteMany(CANDIDATES.pendaftar, {});
        if (io) io.emit('score_updated', {});
        return res.json({ ok: true, success: true, message: 'Data contoh berhasil dibersihkan!' });
      }

      if (entity === 'setelan' || entity === 'setting') {
        const saved = await saveSiteSettings(payload);
        return res.json({ ok: true, success: true, message: 'Pengaturan situs berhasil disimpan!', data: saved });
      }

      if (entity === 'pendaftar' || entity === 'pendaftaran') {
        if ((action === 'approve' || action === 'acc') && numId) {
          const allReg = await safeFindMany(CANDIDATES.pendaftar);
          const reg = allReg.find(r => r.id === numId);
          if (!reg) return res.status(404).json({ ok: false, message: 'Data pendaftar tidak ditemukan.' });

          await safeUpdate(CANDIDATES.pendaftar, numId, { statusVerifikasi: 'Diterima', status: 'Diterima' });

          const namaRider = reg.namaLengkap || reg.nama || 'Rider Baru';
          const namaStable = reg.asalStable || reg.namaStable || reg.stable || 'Independen';
          const namaPelatih = reg.namaPelatih || reg.pelatih || '-';
          const kota = reg.kotaAsal || reg.kota || 'Tangerang Selatan';
          const prov = reg.provinsi || 'Banten';
          const wa = reg.noWhatsapp || reg.whatsapp || '-';
          const umur = reg.umur || 14;

          // Otomatis tambahkan ke Stable jika belum ada
          if (namaStable && namaStable !== 'Independen') {
            const stables = await safeFindMany(CANDIDATES.stable);
            if (!stables.some(s => (s.namaStable || s.nama) === namaStable)) {
              await safeCreate(CANDIDATES.stable, {
                kodeStable: `S-${String(stables.length + 1).padStart(3, '0')}`,
                kode: `S-${String(stables.length + 1).padStart(3, '0')}`,
                namaStable,
                nama: namaStable,
                kota,
                kotaAsal: kota,
                provinsi: prov,
                kontakWa: wa,
                noWhatsapp: wa
              }).catch(() => {});
            }
          }

          // Otomatis tambahkan ke Pelatih jika belum ada
          if (namaPelatih && namaPelatih !== '-') {
            const coaches = await safeFindMany(CANDIDATES.pelatih);
            if (!coaches.some(c => (c.namaLengkap || c.nama) === namaPelatih)) {
              await safeCreate(CANDIDATES.pelatih, {
                kodePelatih: `C-${String(coaches.length + 1).padStart(3, '0')}`,
                kode: `C-${String(coaches.length + 1).padStart(3, '0')}`,
                namaLengkap: namaPelatih,
                nama: namaPelatih,
                asalStable: namaStable,
                namaStable,
                kotaAsal: kota,
                kota,
                provinsi: prov,
                noWhatsapp: wa,
                lisensi: 'Pordasi / IHAA'
              }).catch(() => {});
            }
          }

          // Otomatis tambahkan ke Rider jika belum ada
          const riders = await safeFindMany(CANDIDATES.rider);
          if (!riders.some(r => (r.namaLengkap || r.nama) === namaRider)) {
            await safeCreate(CANDIDATES.rider, {
              kodeRider: `R-${String(riders.length + 1).padStart(3, '0')}`,
              kode: `R-${String(riders.length + 1).padStart(3, '0')}`,
              namaLengkap: namaRider,
              nama: namaRider,
              gender: reg.gender || 'Putra',
              tanggalLahir: reg.tanggalLahir || '2012-01-01',
              umur,
              kategoriUmur: umur <= 14 ? 'U14' : 'Terbuka',
              kategori: umur <= 14 ? 'U14' : 'Terbuka',
              asalStable: namaStable,
              namaStable,
              namaPelatih,
              kotaAsal: kota,
              kota,
              provinsi: prov,
              noWhatsapp: wa,
              statusAktif: true
            }).catch(() => {});
          }

          return res.json({ ok: true, success: true, message: `Pendaftar ${namaRider} berhasil di-ACC dan otomatis masuk ke direktori Rider/Stable!` });
        }

        if ((action === 'reject' || action === 'delete') && numId) {
          await safeDelete(CANDIDATES.pendaftar, numId);
          return res.json({ ok: true, success: true, message: 'Data pendaftar berhasil dihapus.' });
        }
      }

      const entityMap = {
        rider: { c: CANDIDATES.rider, prefix: 'R-', codeField: 'kodeRider' },
        pelatih: { c: CANDIDATES.pelatih, prefix: 'C-', codeField: 'kodePelatih' },
        coach: { c: CANDIDATES.pelatih, prefix: 'C-', codeField: 'kodePelatih' },
        stable: { c: CANDIDATES.stable, prefix: 'S-', codeField: 'kodeStable' },
        kelas: { c: CANDIDATES.kelas },
        acara: { c: CANDIDATES.kelas },
        seri: { c: CANDIDATES.seri },
        lintasan: { c: CANDIDATES.lintasan, prefix: 'L-', codeField: 'kodeLintasan' },
        panitia: { c: CANDIDATES.panitia },
        unduhan: { c: CANDIDATES.unduhan },
        dokumen: { c: CANDIDATES.unduhan },
        berita: { c: CANDIDATES.berita },
        news: { c: CANDIDATES.berita }
      };

      const target = entityMap[entity];
      if (!target) {
        return res.status(400).json({ ok: false, message: `Entitas '${entity}' tidak dikenali.` });
      }

      if (action === 'delete' && numId) {
        if (entity === 'rider') await safeDeleteMany(CANDIDATES.scoreRun, { riderId: numId });
        if (entity === 'kelas' || entity === 'acara') await safeDeleteMany(CANDIDATES.scoreRun, { kelasId: numId });
        await safeDelete(target.c, numId);
        return res.json({ ok: true, success: true, message: `Data ${entity} berhasil dihapus.` });
      }

      // Lengkapi sinonim field agar cocok dengan kolom mana pun di schema.prisma
      if (payload.namaLengkap && !payload.nama) payload.nama = payload.namaLengkap;
      if (payload.nama && !payload.namaLengkap) payload.namaLengkap = payload.nama;
      if (payload.namaStable && !payload.asalStable) payload.asalStable = payload.namaStable;
      if (payload.asalStable && !payload.namaStable) payload.namaStable = payload.asalStable;
      if (payload.kota && !payload.kotaAsal) payload.kotaAsal = payload.kota;
      if (payload.kotaAsal && !payload.kota) payload.kota = payload.kotaAsal;
      if (payload.kontakWa && !payload.noWhatsapp) payload.noWhatsapp = payload.kontakWa;
      if (payload.noWhatsapp && !payload.kontakWa) payload.kontakWa = payload.noWhatsapp;

      if (entity === 'rider' && payload.tanggalLahir) {
        const y = new Date(payload.tanggalLahir).getFullYear();
        if (!isNaN(y)) {
          payload.umur = 2026 - y;
          payload.kategoriUmur = payload.umur <= 14 ? 'U14' : 'Terbuka';
          payload.kategori = payload.kategoriUmur;
        }
      }

      if ((entity === 'kelas' || entity === 'acara') && payload.lintasanId) {
        const allLint = await safeFindMany(CANDIDATES.lintasan);
        const lObj = allLint.find(l => l.id === parseInt(payload.lintasanId, 10));
        if (lObj) payload.namaLintasan = lObj.namaLintasan || lObj.nama;
        if (!payload.seriId) {
          const firstSeri = await safeFindFirst(CANDIDATES.seri);
          if (firstSeri) payload.seriId = firstSeri.id;
        }
      }

      if (action === 'update' && numId) {
        const updated = await safeUpdate(target.c, numId, payload);
        return res.json({ ok: true, success: true, message: `Data ${entity} berhasil diperbarui!`, data: updated });
      } else {
        if (target.prefix) {
          const cnt = await safeCount(target.c);
          const genCode = `${target.prefix}${String(cnt + 1).padStart(3, '0')}`;
          if (!payload[target.codeField]) payload[target.codeField] = genCode;
          if (!payload.kode) payload.kode = genCode;
        }
        if ((entity === 'berita' || entity === 'news') && !payload.slug) {
          payload.slug = String(payload.judul || 'warta-sthac').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
        }
        const created = await safeCreate(target.c, payload);
        return res.json({ ok: true, success: true, message: `Data ${entity} baru berhasil ditambahkan!`, data: created });
      }
    } catch (err) {
      console.error('CRUD Error:', err);
      return res.status(500).json({ ok: false, success: false, message: 'Gagal memproses: ' + err.message });
    }
  };

  app.post('/api/panitia/crud', crudHandler);
  app.post('/api/panitia/:entity', crudHandler);
  app.put('/api/panitia/:entity/:id', crudHandler);
  app.delete('/api/panitia/:entity/:id', crudHandler);
  app.post('/api/panitia/:entity/:id/delete', (req, res) => { req.body.action = 'delete'; return crudHandler(req, res); });
  app.post('/api/panitia/pendaftar/:id/approve', (req, res) => { req.params.entity = 'pendaftar'; req.body.action = 'approve'; return crudHandler(req, res); });
  app.post('/api/panitia/pendaftar/:id/reject', (req, res) => { req.params.entity = 'pendaftar'; req.body.action = 'reject'; return crudHandler(req, res); });
}

module.exports = { attachUniversalCrudRoutes, CANDIDATES };
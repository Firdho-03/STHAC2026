const db = require('../config/Database').getClient();
const emailService = require('./EmailService');
const registrationService = require('./RegistrationService');
const scoringService = require('./ScoringService');

class PanitiaService {
  constructor() {
    this.pendingRegistrations = new Map();
  }

  generateSixDigitOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Login Cepat dengan Password Panitia (sthac2026)
  async loginWithPassword(passwordInput) {
    const setting = await db.siteSetting.findFirst();
    const validPass = setting?.adminPassword || 'sthac2026';
    if ((passwordInput || '').trim() !== validPass) {
      throw new Error('Kata sandi panitia tidak sesuai!');
    }
    return {
      id: 0,
      namaLengkap: setting?.adminDisplayName || 'Panitia STHAC',
      peran: 'Super Admin',
      email: setting?.email || 'hbatangsel.official@gmail.com'
    };
  }

  // Request OTP untuk Pendaftaran Panitia Baru
  async requestRegisterOtp(data, file) {
    const email = (data.email || '').trim().toLowerCase();
    if (!email) throw new Error('Email wajib diisi!');

    const existing = await db.panitiaJuri.findUnique({ where: { email } });
    if (existing) throw new Error('Email sudah terdaftar di tabel Panitia. Silakan langsung Login dengan OTP!');

    const otpCode = this.generateSixDigitOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    const fotoUrl = file ? `/uploads/${file.filename}` : (data.urlFoto || null);

    this.pendingRegistrations.set(email, {
      namaLengkap: data.namaLengkap || '-',
      panggilan: data.panggilan || '-',
      peran: data.peran || 'Panitia',
      urutanTampil: parseInt(data.urutanTampil) || 8,
      sertif: data.sertif || '-',
      kontakWa: data.kontakWa || '-',
      email,
      fotoUrl,
      bioTugas: data.bioTugas || '-',
      otpCode,
      otpExpiry
    });

    const mailResult = await emailService.sendOtpEmail(email, data.namaLengkap, otpCode, 'REGISTER');
    return { email, sentViaSmtp: mailResult.sentViaSmtp, demoOtp: mailResult.demoOtp };
  }

  async verifyRegisterOtp(emailInput, otpInput) {
    const email = (emailInput || '').trim().toLowerCase();
    const pending = this.pendingRegistrations.get(email);
    if (!pending) throw new Error('Data pendaftaran tidak ditemukan atau sudah kadaluarsa.');
    if (new Date() > pending.otpExpiry) {
      this.pendingRegistrations.delete(email);
      throw new Error('Kode OTP sudah kadaluarsa (lebih dari 5 menit).');
    }
    if (pending.otpCode !== (otpInput || '').trim()) throw new Error('Kode unik OTP salah!');

    this.pendingRegistrations.delete(email);
    return await db.panitiaJuri.create({
      data: {
        namaLengkap: pending.namaLengkap,
        panggilan: pending.panggilan,
        peran: pending.peran,
        urutanTampil: pending.urutanTampil,
        sertif: pending.sertif,
        kontakWa: pending.kontakWa,
        email: pending.email,
        kodeAkses: `OTP-${pending.otpCode}`,
        status: 'Aktif',
        fotoUrl: pending.fotoUrl,
        bioTugas: pending.bioTugas
      }
    });
  }

  // Request OTP untuk Login Panitia
  async requestLoginOtp(emailInput) {
    const email = (emailInput || '').trim().toLowerCase();
    const member = await db.panitiaJuri.findUnique({ where: { email } });
    if (!member) throw new Error('Email belum terdaftar sebagai Panitia/Juri. Silakan daftar terlebih dahulu!');

    const otpCode = this.generateSixDigitOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.panitiaJuri.update({
      where: { email },
      data: { otpCode, otpExpiry, kodeAkses: `OTP-${otpCode}` }
    });

    const mailResult = await emailService.sendOtpEmail(email, member.namaLengkap, otpCode, 'LOGIN');
    return { email, nama: member.namaLengkap, sentViaSmtp: mailResult.sentViaSmtp, demoOtp: mailResult.demoOtp };
  }

  async verifyLoginOtp(emailInput, otpInput) {
    const email = (emailInput || '').trim().toLowerCase();
    const member = await db.panitiaJuri.findUnique({ where: { email } });
    if (!member || !member.otpCode) throw new Error('Belum ada permintaan OTP atau kode sudah dipakai.');
    if (member.otpExpiry && new Date() > new Date(member.otpExpiry)) throw new Error('Kode OTP sudah kadaluarsa.');
    if (member.otpCode !== (otpInput || '').trim()) throw new Error('Kode OTP salah!');

    return await db.panitiaJuri.update({
      where: { email },
      data: { otpCode: null, otpExpiry: null }
    });
  }

  // Bundle Data Komprehensif untuk Seluruh Menu Panel Panitia
  async getDashboardBundle() {
    const [setting, profs, scores, seri, kelasList, lintasanList, dokumen, news, champStandings] = await Promise.all([
      db.siteSetting.findFirst(),
      registrationService.getAllProfiles(),
      db.scoreRun.findMany({ include: { rider: true, seri: true }, orderBy: { id: 'desc' } }),
      db.seriEvent.findMany({ include: { kelasList: true }, orderBy: { nomorSeri: 'asc' } }),
      db.kelasPertandingan.findMany({ include: { seri: true, lintasanRel: true }, orderBy: [{ seriId: 'asc' }, { urutanTampil: 'asc' }] }),
      db.lintasan.findMany({ orderBy: { urutanTampil: 'asc' } }),
      db.dokumen.findMany({ orderBy: { id: 'asc' } }),
      db.news.findMany({ orderBy: { publishedAt: 'desc' } }),
      scoringService.getChampionshipStandings()
    ]);

    const allRiders = profs.allRiders;
    const menungguAcc = allRiders.filter(r => r.statusAcc === 'Pending').length;
    const riderAktif = allRiders.filter(r => r.statusAcc === 'Diterima').length;
    const ditolak = allRiders.filter(r => r.statusAcc === 'Ditolak').length;
    const diterima = riderAktif + profs.stables.length; // 7 rider + 2 stable = 9 diterima (persis sthac.com)

    return {
      setting: setting || {},
      stats: {
        menungguAcc,
        diterima,
        ditolak,
        semuaPendaftar: menungguAcc + diterima + ditolak,
        riderAktif,
        pelatih: profs.pelatih.length,
        stable: profs.stables.length,
        hasilRun: scores.length,
        panitiaJuri: profs.panitia.length,
        dokumen: dokumen.length
      },
      registrationOpen: setting ? setting.registrationOpen : true,
      allRiders,
      riders: profs.riders,
      pelatih: profs.pelatih,
      stables: profs.stables,
      panitia: profs.panitia,
      seri,
      kelasList,
      lintasanList,
      dokumen,
      news,
      scores,
      champStandings
    };
  }

  // Verifikasi ACC / Tolak Pendaftar
  async verifyRegistrant(id, statusAcc, catatanPanitia = '', alasanPenolakan = '') {
    return await db.rider.update({
      where: { id: parseInt(id) },
      data: { statusAcc, catatanPanitia, alasanPenolakan }
    });
  }

  // Hapus Permanen Pendaftar dengan Konfirmasi Ketik "HAPUS"
  async deleteRegistrantPermanent(id, confirmWord) {
    if ((confirmWord || '').trim() !== 'HAPUS') {
      throw new Error('Konfirmasi gagal! Anda wajib mengetik kata HAPUS dengan huruf kapital.');
    }
    return await db.rider.delete({ where: { id: parseInt(id) } });
  }

  // CRUD Seri & Kelas
  async saveSeri(id, data) {
    const payload = {
      nomorSeri: parseInt(data.nomorSeri) || 1,
      namaSeri: data.namaSeri,
      tanggalMulai: data.tanggalMulai || '2026-11-14',
      tanggalSelesai: data.tanggalSelesai || '2026-11-14',
      tanggalTampil: data.tanggalTampil || data.tanggalMulai || '14 Nov 2026',
      tempat: data.tempat || 'Saiga Stable',
      kota: data.kota || 'Tangerang Selatan, Banten',
      status: data.status || 'Pendaftaran dibuka',
      deskripsi: data.deskripsi || '-'
    };
    if (id && parseInt(id) > 0) {
      return await db.seriEvent.update({ where: { id: parseInt(id) }, data: payload });
    }
    return await db.seriEvent.create({ data: payload });
  }

  async deleteSeriPermanent(id, confirmWord) {
    if ((confirmWord || '').trim() !== 'HAPUS') {
      throw new Error('Ketik HAPUS untuk mengonfirmasi penghapusan Seri beserta seluruh kelas di dalamnya.');
    }
    return await db.seriEvent.delete({ where: { id: parseInt(id) } });
  }

  async createKelas(data) {
    let namaLintasan = data.namaLintasan || 'Arena Walk-Trot';
    let lintasanId = data.lintasanId ? parseInt(data.lintasanId) : null;
    if (lintasanId) {
      const l = await db.lintasan.findUnique({ where: { id: lintasanId } });
      if (l) namaLintasan = l.namaLintasan;
    }

    return await db.kelasPertandingan.create({
      data: {
        seriId: parseInt(data.seriId) || 1,
        lintasanId,
        namaKelas: data.namaKelas || 'Beginner ( Walk )',
        labelJenjangInggris: data.labelJenjangInggris || 'Beginner',
        kategori: data.kategori || 'U14',
        namaLintasan,
        jumlahRun: parseInt(data.jumlahRun) || 4,
        biayaPendaftaran: parseInt(data.biayaPendaftaran) || 0,
        kuotaPeserta: parseInt(data.kuotaPeserta) || 20,
        urutanTampil: parseInt(data.urutanTampil) || 1,
        juriUtamaKelas: data.juriUtamaKelas || 'Belum ditentukan',
        pencatatSkorKelas: data.pencatatSkorKelas || 'Belum ditentukan',
        buangSkorTerendah: data.buangSkorTerendah === 'true' || data.buangSkorTerendah === true || data.buangSkorTerendah === 'on',
        hitungPoinJuara: data.hitungPoinJuara !== 'false' && data.hitungPoinJuara !== false,
        statusKelas: 'AKTIF'
      }
    });
  }

  async toggleKelasPoin(id) {
    const k = await db.kelasPertandingan.findUnique({ where: { id: parseInt(id) } });
    if (!k) throw new Error('Kelas tidak ditemukan');
    return await db.kelasPertandingan.update({
      where: { id: k.id },
      data: { hitungPoinJuara: !k.hitungPoinJuara }
    });
  }

  async deleteKelas(id) {
    return await db.kelasPertandingan.delete({ where: { id: parseInt(id) } });
  }

  // CRUD Master Lintasan (IHAA & Pordasi)
  async saveLintasan(data) {
    const payload = {
      kodeLintasan: (data.kodeLintasan || `TRK-${Date.now()}`).toUpperCase().trim(),
      namaLintasan: data.namaLintasan || 'Lintasan Baru',
      sistem: data.sistem || 'IHAA',
      gambarUrl: data.gambarUrl || null,
      panjangMeter: parseFloat(data.panjangMeter) || 0,
      jumlahTarget: parseInt(data.jumlahTarget) || 3,
      nilaiZonaTarget: data.nilaiZonaTarget || '6,4,2',
      parTime: parseFloat(data.parTime) || 0,
      batasWaktu: parseFloat(data.batasWaktu) || 0,
      bonusWaktuPerDetik: parseFloat(data.bonusWaktuPerDetik) || 1,
      penaltiWaktuPerDtk: parseFloat(data.penaltiWaktuPerDtk) || 1,
      bonusWaktuMaks: parseFloat(data.bonusWaktuMaks) || 0,
      minTargetKenaBonus: parseInt(data.minTargetKenaBonus) || 1,
      pengaliBonusWaktu: data.pengaliBonusWaktu || '',
      bonusSapuBersih: parseFloat(data.bonusSapuBersih) || 0,
      syaratBonusSapu: data.syaratBonusSapu || 'Semua target kena',
      aturanOvertime: data.aturanOvertime || 'Poin target tetap dihitung',
      namaBonusSatuan: data.namaBonusSatuan || '',
      poinBonusSatuan: parseFloat(data.poinBonusSatuan) || 0,
      dendaBonusSatuan: parseFloat(data.dendaBonusSatuan) || 0,
      urutanTampil: parseInt(data.urutanTampil) || 1
    };

    if (data.id && parseInt(data.id) > 0) {
      return await db.lintasan.update({ where: { id: parseInt(data.id) }, data: payload });
    }
    return await db.lintasan.upsert({
      where: { kodeLintasan: payload.kodeLintasan },
      update: payload,
      create: payload
    });
  }

  // CRUD Panitia & Juri
  async createPanitia(data, file) {
    const fotoUrl = file ? `/uploads/${file.filename}` : (data.urlFoto || null);
    return await db.panitiaJuri.create({
      data: {
        namaLengkap: data.namaLengkap,
        panggilan: data.panggilan || data.namaLengkap,
        peran: data.peran || 'Juri',
        urutanTampil: parseInt(data.urutanTampil) || 8,
        sertif: data.sertif || '-',
        kontakWa: data.kontakWa || '-',
        email: (data.email || `panitia${Date.now()}@sthac.com`).trim().toLowerCase(),
        kodeAkses: 'sthac2026',
        status: data.status || 'Aktif',
        fotoUrl,
        bioTugas: data.bioTugas || '-'
      }
    });
  }

  async updatePanitia(id, data, file) {
    const updateData = {
      namaLengkap: data.namaLengkap,
      panggilan: data.panggilan,
      peran: data.peran,
      urutanTampil: parseInt(data.urutanTampil) || 1,
      sertif: data.sertif,
      kontakWa: data.kontakWa,
      email: data.email.trim().toLowerCase(),
      status: data.status,
      bioTugas: data.bioTugas
    };
    if (file) updateData.fotoUrl = `/uploads/${file.filename}`;
    else if (data.urlFoto) updateData.fotoUrl = data.urlFoto;

    return await db.panitiaJuri.update({ where: { id: parseInt(id) }, data: updateData });
  }

  async deletePanitia(id) {
    return await db.panitiaJuri.delete({ where: { id: parseInt(id) } });
  }

  // CRUD Dokumen & Berita
  async createDokumen(data, file) {
    const fileUrl = file ? `/uploads/${file.filename}` : (data.fileUrl || '#');
    return await db.dokumen.create({
      data: {
        judul: data.judul,
        kodeBadge: data.kodeBadge || 'DOC',
        kategori: data.kategori || 'Dokumen',
        statusInfo: file || (data.fileUrl && data.fileUrl !== '#') ? 'Tersedia' : 'Menyusul',
        ukuran: file ? `${(file.size / 1024).toFixed(0)} KB` : (data.ukuran || 'PDF'),
        fileUrl
      }
    });
  }

  async deleteDokumen(id) {
    return await db.dokumen.delete({ where: { id: parseInt(id) } });
  }

  async createNews(data, file) {
    const gambarUrl = file ? `/uploads/${file.filename}` : (data.gambarUrl || null);
    return await db.news.create({
      data: {
        judul: data.judul,
        kategori: data.kategori || 'PENGUMUMAN',
        ringkasan: data.ringkasan || '-',
        isiBerita: data.isiBerita || '-',
        gambarUrl
      }
    });
  }

  async deleteNews(id) {
    return await db.news.delete({ where: { id: parseInt(id) } });
  }

  // Simpan Setelan Situs & Skema Poin
  async updateSiteSettings(data) {
    const current = await db.siteSetting.findFirst();
    const updatePayload = {};
    const fields = [
      'eventName', 'shortCode', 'tagline', 'headline', 'eventDate',
      'location', 'mapUrl', 'whatsapp', 'contactName', 'email',
      'instagram', 'footerOrg', 'bgColor', 'goldColor', 'brightGoldColor',
      'adminDisplayName', 'adminPassword', 'kategoriList', 'pointsMapJson'
    ];
    fields.forEach(f => {
      if (data[f] !== undefined) updatePayload[f] = data[f];
    });
    if (data.poinLuarDaftar !== undefined) updatePayload.poinLuarDaftar = parseInt(data.poinLuarDaftar) || 1;
    if (data.hitungNKelasTerbaik !== undefined) updatePayload.hitungNKelasTerbaik = parseInt(data.hitungNKelasTerbaik) || 0;
    if (data.registrationOpen !== undefined) {
      updatePayload.registrationOpen = data.registrationOpen === 'true' || data.registrationOpen === true;
    }

    return await db.siteSetting.update({
      where: { id: current ? current.id : 1 },
      data: updatePayload
    });
  }

  async toggleRegistrationStatus() {
    const current = await db.siteSetting.findFirst();
    const nextState = !(current?.registrationOpen ?? true);
    await db.siteSetting.update({ where: { id: current.id }, data: { registrationOpen: nextState } });
    return nextState;
  }

  async clearDemoData() {
    await db.scoreRun.deleteMany({});
    await db.rider.deleteMany({});
    await db.pelatih.deleteMany({});
    await db.stable.deleteMany({});
    return true;
  }
}

module.exports = new PanitiaService();
const db = require('../config/Database').getClient();

class RegistrationService {
  calculateAgeInfo(dobString) {
    if (!dobString || dobString === '-') return { formattedDate: '-', ageText: '' };
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return { formattedDate: dobString, ageText: '' };

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formattedDate = `${dob.getDate()} ${months[dob.getMonth()]} ${dob.getFullYear()}`;
    const refYear = 2026;
    const age = refYear - dob.getFullYear();
    return {
      formattedDate,
      ageText: age > 0 && age < 90 ? `${age} tahun` : ''
    };
  }

  async generateNextRiderCode() {
    const count = await db.rider.count();
    return `R-${String(count + 1).padStart(3, '0')}`;
  }

  async generateNextPelatihCode() {
    const count = await db.pelatih.count();
    return `P-${String(count + 1).padStart(3, '0')}`;
  }

  async registerRider(data, file, isManualAdmin = false) {
    const kodeRider = data.kodeRider && data.kodeRider.trim() !== '' && !data.kodeRider.includes('otomatis')
      ? data.kodeRider.trim()
      : await this.generateNextRiderCode();

    const count = await db.rider.count();
    const fotoUrl = file ? `/uploads/${file.filename}` : (data.urlFoto || null);

    return await db.rider.create({
      data: {
        kodeRider,
        noBib: parseInt(data.noBib) || (count + 1),
        namaLengkap: data.namaLengkap || '-',
        namaPanggilan: data.namaPanggilan || '-',
        kategori: data.kategori || 'Terbuka',
        jenjangKelas: data.jenjangKelas || 'Beginner (Pemula)',
        kelasDiikuti: data.kelasDiikuti || 'Beginner ( Walk )',
        tanggalLahir: data.tanggalLahir || '2012-01-01',
        asalStable: data.asalStable || 'SAIGA STABLE',
        pelatihNama: data.pelatihNama || '-',
        kotaKabupaten: data.kotaKabupaten || 'Tangerang Selatan',
        noWa: data.noWa || '-',
        email: data.email || '-',
        pengalaman: data.pengalaman || '-',
        fotoUrl,
        catatanTambahan: data.catatanTambahan || '',
        statusAcc: isManualAdmin ? 'Diterima' : 'Pending'
      }
    });
  }

  async registerPelatih(data, file, isManualAdmin = false) {
    const kodePelatih = data.kodePelatih && data.kodePelatih.trim() !== '' && !data.kodePelatih.includes('otomatis')
      ? data.kodePelatih.trim()
      : await this.generateNextPelatihCode();

    const fotoUrl = file ? `/uploads/${file.filename}` : (data.urlFoto || null);
    return await db.pelatih.create({
      data: {
        kodePelatih,
        namaLengkap: data.namaLengkap || '-',
        namaPanggilan: data.namaPanggilan || '-',
        spesialis: data.spesialis || 'Berkuda Memanah',
        sertifikasi: data.sertifikasi || '-',
        pengalamanMelatih: data.pengalamanMelatih || '-',
        noWa: data.noWa || '-',
        email: data.email || '-',
        stableAsal: data.stableAsal || '-',
        kota: data.kota || 'Tangerang Selatan',
        status: data.status || 'Aktif',
        fotoUrl,
        bio: data.bio || data.pengalamanMelatih || '-',
        statusAcc: isManualAdmin ? 'Diterima' : 'Pending'
      }
    });
  }

  async registerStable(data, file, isManualAdmin = false) {
    const logoUrl = file ? `/uploads/${file.filename}` : (data.urlLogo || null);
    return await db.stable.create({
      data: {
        namaStable: data.namaStable || '-',
        kotaKabupaten: data.kotaKabupaten || 'Tangerang Selatan',
        provinsi: data.provinsi || 'Banten',
        alamat: data.alamat || '-',
        noWa: data.noWa || '-',
        email: data.email || '-',
        pelatihUtama: data.pelatihUtama || '-',
        status: data.status || 'Aktif',
        logoUrl,
        deskripsi: data.deskripsi || data.catatanTambahan || '-',
        statusAcc: isManualAdmin ? 'Diterima' : 'Pending'
      }
    });
  }

  async getAllProfiles(filters = {}) {
    const [allRiders, pelatih, stables, panitia] = await Promise.all([
      db.rider.findMany({ orderBy: { id: 'asc' } }),
      db.pelatih.findMany({ orderBy: { id: 'asc' } }),
      db.stable.findMany({ orderBy: { id: 'asc' } }),
      db.panitiaJuri.findMany({ orderBy: { urutanTampil: 'asc' } })
    ]);

    const enrichedRiders = allRiders.map(r => {
      const ageInfo = this.calculateAgeInfo(r.tanggalLahir);
      return { ...r, ...ageInfo };
    });

    // Hitung jumlah rider aktif di setiap stable (Contoh: SAIGA STABLE = 4 Rider, Wenning academy = 2 Rider)
    const activeRiders = enrichedRiders.filter(r => r.statusAcc === 'Diterima');
    const enrichedStables = stables.map(s => {
      const uniqueRiderNames = new Set(
        activeRiders
          .filter(r => (r.asalStable || '').toLowerCase() === (s.namaStable || '').toLowerCase())
          .map(r => r.namaLengkap.toLowerCase())
      );
      return { ...s, riderCount: uniqueRiderNames.size };
    });

    let filteredRiders = activeRiders;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      filteredRiders = filteredRiders.filter(r =>
        r.namaLengkap.toLowerCase().includes(q) ||
        r.kodeRider.toLowerCase().includes(q) ||
        r.asalStable.toLowerCase().includes(q)
      );
    }
    if (filters.kategori && filters.kategori !== 'all') {
      filteredRiders = filteredRiders.filter(r => r.kategori.toLowerCase() === filters.kategori.toLowerCase());
    }
    if (filters.stable && filters.stable !== 'all') {
      filteredRiders = filteredRiders.filter(r => r.asalStable.toLowerCase() === filters.stable.toLowerCase());
    }

    return {
      allRiders: enrichedRiders,
      riders: filteredRiders,
      pelatih,
      stables: enrichedStables,
      panitia
    };
  }
}

module.exports = new RegistrationService();
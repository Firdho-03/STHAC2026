const { PrismaClient } = require('@prisma/client');

class Database {
  constructor() {
    if (!Database.instance) {
      this.prisma = new PrismaClient();
      Database.instance = this;
    }
    return Database.instance;
  }

  getClient() {
    return this.prisma;
  }

  async seedInitialData() {
    // 1. Seed Site Settings
    const settingCount = await this.prisma.siteSetting.count();
    if (settingCount === 0) {
      await this.prisma.siteSetting.create({ data: { id: 1 } });
    }

    // 2. Seed Master Lintasan (IHAA & Pordasi Berkuda Memanah)
    const lintasanCount = await this.prisma.lintasan.count();
    let arenaWt = null;
    if (lintasanCount === 0) {
      arenaWt = await this.prisma.lintasan.create({
        data: {
          kodeLintasan: 'ARENA-WT',
          namaLintasan: 'Arena Walk-Trot',
          sistem: 'IHAA',
          panjangMeter: 50,
          jumlahTarget: 3,
          nilaiZonaTarget: '5,4,3,2,1',
          parTime: 0,
          batasWaktu: 0,
          urutanTampil: 1
        }
      });

      await this.prisma.lintasan.createMany({
        data: [
          { kodeLintasan: 'ARENA-50', namaLintasan: 'Arena 50 — Walk Course', sistem: 'IHAA', panjangMeter: 50, jumlahTarget: 3, nilaiZonaTarget: '5,4,3,2,1', parTime: 0, urutanTampil: 2 },
          { kodeLintasan: 'ARENA-30', namaLintasan: 'Arena 30 Walk & Trot', sistem: 'IHAA', panjangMeter: 30, jumlahTarget: 3, nilaiZonaTarget: '5,4,3,2,1', parTime: 0, urutanTampil: 3 },
          { kodeLintasan: 'CLUB3-FFE', namaLintasan: 'Club 3 (FFE) — Walk', sistem: 'IHAA', panjangMeter: 30, jumlahTarget: 3, nilaiZonaTarget: '4,3,2', parTime: 0, urutanTampil: 4 },
          { kodeLintasan: 'KOREAN', namaLintasan: 'Korean Track (5 zones)', sistem: 'IHAA', panjangMeter: 90, jumlahTarget: 3, nilaiZonaTarget: '5,4,3,2,1', parTime: 14, urutanTampil: 5 },
          { kodeLintasan: 'HUNGARIAN', namaLintasan: 'Hungarian Track', sistem: 'IHAA', panjangMeter: 99, jumlahTarget: 3, nilaiZonaTarget: '5,4,3,2,1', parTime: 16, urutanTampil: 6 },
          { kodeLintasan: 'TT90', namaLintasan: 'Turkish Tabla 90', sistem: 'IHAA', panjangMeter: 90, jumlahTarget: 3, nilaiZonaTarget: '6,4,2', parTime: 14, urutanTampil: 7 },
          { kodeLintasan: 'T4', namaLintasan: 'Tabla-4 (T4)', sistem: 'IHAA', panjangMeter: 90, jumlahTarget: 4, nilaiZonaTarget: '6,4,2', parTime: 14, pengaliBonusWaktu: '1:0.5, 2:1, 3:1.5', urutanTampil: 8 },
          { kodeLintasan: 'QABAQ', namaLintasan: "Devil's Qabaq", sistem: 'IHAA', panjangMeter: 60, jumlahTarget: 1, nilaiZonaTarget: '5', parTime: 10, namaBonusSatuan: 'Qabaq', poinBonusSatuan: 5, urutanTampil: 9 },
          { kodeLintasan: 'FASTSHOOT', namaLintasan: 'Fast Shooting', sistem: 'Pordasi Berkuda Memanah', panjangMeter: 0, jumlahTarget: 1, nilaiZonaTarget: '5,4,3,2,1', batasWaktu: 30, urutanTampil: 10 },
          { kodeLintasan: 'PD-LURUS', namaLintasan: 'Track Lurus (Pordasi)', sistem: 'Pordasi Berkuda Memanah', panjangMeter: 90, jumlahTarget: 3, nilaiZonaTarget: '6,4,2', parTime: 14, urutanTampil: 11 },
          { kodeLintasan: 'PD-CIRCLE', namaLintasan: 'Track Circle (Pordasi)', sistem: 'Pordasi Berkuda Memanah', panjangMeter: 60, jumlahTarget: 3, nilaiZonaTarget: '6,4,2', batasWaktu: 60, urutanTampil: 12 }
        ]
      });
    } else {
      arenaWt = await this.prisma.lintasan.findFirst({ where: { kodeLintasan: 'ARENA-WT' } });
    }

    // 3. Seed Seri 1, 2, 3 & Kelas Pertandingan Seri 1
    const seriCount = await this.prisma.seriEvent.count();
    if (seriCount === 0) {
      const s1 = await this.prisma.seriEvent.create({
        data: {
          nomorSeri: 1,
          namaSeri: 'Seri 1 — South Tangerang Horseback Archery Cup',
          tanggalMulai: '2026-11-14',
          tanggalSelesai: '2026-11-14',
          tanggalTampil: '14 Nov 2026',
          tempat: 'Saiga Stable',
          kota: 'Tangerang Selatan, Banten',
          status: 'Pendaftaran dibuka',
          deskripsi: 'Seri pembuka kejuaraan. Kelas Beginner U14 ( Walk ) & Open ( Trot ). Penilaian mengacu sistem IHAA.',
          susunanAcara: '07:00 Registrasi ulang & cek anak panah | 07:30 Briefing panitia, juri & course designer | 08:00 Pemanasan lintasan | 08:30 Kelas Beginner | 10:00 Kelas Intermediate | 12:00 Ishoma | 13:00 Kelas Advanced | 15:30 Kelas Open Qabaq | 16:30 Penyerahan medali'
        }
      });

      await this.prisma.seriEvent.createMany({
        data: [
          { nomorSeri: 2, namaSeri: 'Seri 2 — South Tangerang Horseback Archery Cup', tanggalTampil: 'Menyusul', tempat: 'Menyusul', status: 'Akan datang', deskripsi: 'Seri kedua kejuaraan berjenjang STHAC.' },
          { nomorSeri: 3, namaSeri: 'Seri 3 — Grand Final', tanggalTampil: 'Menyusul', tempat: 'Menyusul', status: 'Akan datang', deskripsi: 'Babak puncak penentuan Juara Umum STHAC 2026.' }
        ]
      });

      const kWalk = await this.prisma.kelasPertandingan.create({
        data: {
          seriId: s1.id,
          lintasanId: arenaWt ? arenaWt.id : null,
          namaKelas: 'Beginner ( Walk )',
          labelJenjangInggris: 'Beginner',
          kategori: 'U14',
          namaLintasan: 'Arena Walk-Trot',
          jumlahRun: 6,
          kuotaPeserta: 20,
          pesertaTerisi: 4,
          urutanTampil: 1,
          hitungPoinJuara: true,
          statusKelas: 'AKTIF'
        }
      });

      const kTrot = await this.prisma.kelasPertandingan.create({
        data: {
          seriId: s1.id,
          lintasanId: arenaWt ? arenaWt.id : null,
          namaKelas: 'Beginner ( Trot )',
          labelJenjangInggris: 'Beginner',
          kategori: 'Terbuka',
          namaLintasan: 'Arena Walk-Trot',
          jumlahRun: 3,
          kuotaPeserta: 15,
          pesertaTerisi: 5,
          urutanTampil: 1,
          hitungPoinJuara: true,
          statusKelas: 'AKTIF'
        }
      });

      // 4. Seed Stables & Pelatih
      await this.prisma.stable.createMany({
        data: [
          { namaStable: 'SAIGA STABLE', kotaKabupaten: 'TANGERANG SELATAN', provinsi: 'Banten', alamat: 'Serua, Ciputat, Tangerang Selatan', pelatihUtama: 'Muhammad Ridwan Firdaus', noWa: '081586844344', email: 'hbatangsel.official@gmail.com', status: 'Aktif', statusAcc: 'Diterima', deskripsi: 'Penyelenggara & Host Venue Seri 1 STHAC 2026' },
          { namaStable: 'Wenning academy', kotaKabupaten: 'Tangerang Selatan', provinsi: 'Banten', alamat: 'Tangerang Selatan', pelatihUtama: 'Coach Wenning', noWa: '081200001111', email: 'info@wenning.id', status: 'Aktif', statusAcc: 'Diterima', deskripsi: 'Akademi Berkuda Memanah Terafiliasi' }
        ]
      });

      await this.prisma.pelatih.createMany({
        data: [
          { kodePelatih: 'P-001', namaLengkap: 'Muhammad Ridwan Firdaus', namaPanggilan: 'Ridwan', spesialis: 'Berkuda Memanah', stableAsal: 'SAIGA STABLE', sertifikasi: 'Pelatih Berkuda Memanah Nasional', pengalamanMelatih: '5 Tahun', status: 'Aktif', statusAcc: 'Diterima' },
          { kodePelatih: 'P-002', namaLengkap: 'Hendra Kusuma', namaPanggilan: 'Hendra', spesialis: 'Berkuda Memanah', stableAsal: 'Wenning academy', sertifikasi: 'Instruktur Panahan Berkuda', pengalamanMelatih: '4 Tahun', status: 'Aktif', statusAcc: 'Diterima' }
        ]
      });

      // 5. Seed 7 Rider Aktif + 1 Pendaftar Menunggu ACC (Mileva #7)
      const r1 = await this.prisma.rider.create({ data: { kodeRider: 'R-001', noBib: 1, namaLengkap: 'Tristiyan Abiy Pratama', namaPanggilan: 'Abiy', jenjangKelas: 'Beginner (Pemula)', kategori: 'U14', kelasDiikuti: 'Beginner ( Walk )', tanggalLahir: '2013-05-10', asalStable: 'SAIGA STABLE', kotaKabupaten: 'Tangerang Selatan', noWa: '081211110001', email: 'tristiyan@saiga.id', statusAcc: 'Diterima' } });
      const r2 = await this.prisma.rider.create({ data: { kodeRider: 'R-002', noBib: 1, namaLengkap: 'carla cahya permata', namaPanggilan: 'Carla', jenjangKelas: 'Beginner (Pemula)', kategori: 'Terbuka', kelasDiikuti: 'Beginner ( Trot )', tanggalLahir: '2008-08-19', asalStable: 'SAIGA STABLE', kotaKabupaten: 'Tangerang Selatan', noWa: '081211110002', email: 'carla@saiga.id', statusAcc: 'Diterima' } });
      const r3 = await this.prisma.rider.create({ data: { kodeRider: 'R-003', noBib: 3, namaLengkap: 'Mileva Almahira Baihaqi', namaPanggilan: 'Mileva', jenjangKelas: 'Beginner (Pemula)', kategori: 'U14', kelasDiikuti: 'Beginner ( Walk )', tanggalLahir: '2017-04-22', asalStable: 'SAIGA STABLE', kotaKabupaten: 'Tangerang Selatan', noWa: '082125506987', email: 'desyy87@yahoo.co.id', statusAcc: 'Diterima' } });
      const r4 = await this.prisma.rider.create({ data: { kodeRider: 'R-004', noBib: 2, namaLengkap: 'Mileva Almahira Baihaqi', namaPanggilan: 'Mileva', jenjangKelas: 'Beginner (Pemula)', kategori: 'Terbuka', kelasDiikuti: 'Beginner ( Trot )', tanggalLahir: '2017-04-22', asalStable: 'SAIGA STABLE', kotaKabupaten: 'Tangerang Selatan', noWa: '082125506987', email: 'desyy87@yahoo.co.id', statusAcc: 'Diterima' } });
      const r5 = await this.prisma.rider.create({ data: { kodeRider: 'R-005', noBib: 2, namaLengkap: 'Archer abrisam', namaPanggilan: 'Archer', jenjangKelas: 'Beginner (Pemula)', kategori: 'U14', kelasDiikuti: 'Beginner ( Walk )', tanggalLahir: '2014-02-14', asalStable: 'Wenning academy', kotaKabupaten: 'Tangerang Selatan', noWa: '081211110005', email: 'archer@wenning.id', statusAcc: 'Diterima' } });
      const r6 = await this.prisma.rider.create({ data: { kodeRider: 'R-006', noBib: 3, namaLengkap: 'Archer abrisam', namaPanggilan: 'Archer', jenjangKelas: 'Beginner (Pemula)', kategori: 'Terbuka', kelasDiikuti: 'Beginner ( Trot )', tanggalLahir: '2014-02-14', asalStable: 'Wenning academy', kotaKabupaten: 'Tangerang Selatan', noWa: '081211110006', email: 'archer@wenning.id', statusAcc: 'Diterima' } });
      const r7 = await this.prisma.rider.create({ data: { kodeRider: 'R-007', noBib: 4, namaLengkap: 'RITAJ AMANI', namaPanggilan: 'Ritaj', jenjangKelas: 'Beginner (Pemula)', kategori: 'U14', kelasDiikuti: 'Beginner ( Walk )', tanggalLahir: '2015-09-01', asalStable: 'SAIGA STABLE', kotaKabupaten: 'Tangerang Selatan', noWa: '081211110007', email: 'ritaj@saiga.id', statusAcc: 'Diterima' } });

      // Pendaftaran #7 yang berstatus Pending (Menunggu ACC) persis screenshot
      await this.prisma.rider.create({
        data: {
          kodeRider: 'R-008',
          noBib: 7,
          namaLengkap: 'MILEVA ALMAHIRA BAIHAQI',
          namaPanggilan: 'Mileva',
          jenjangKelas: 'Beginner (Pemula)',
          kategori: 'Terbuka',
          kelasDiikuti: 'Beginner ( Trot ) (Terbuka)',
          tanggalLahir: '2017-04-22',
          asalStable: 'Saiga Stable',
          kotaKabupaten: 'Tangerang Selatan',
          noWa: '082125506987',
          email: 'desyy87@yahoo.co.id',
          pengalaman: 'Latihan rutin di Saiga Stable',
          statusAcc: 'Pending'
        }
      });

      // 6. Seed 18 Hasil Run Tersimpan (Persis Skor Seri 1 di Laporan Riset)
      // Kelas Beginner (Walk) U14: Tristiyan 6 run = 77 pts (best 15), Archer 6 run = 67 pts (best 15)
      const walkRunsTristiyan = [13, 12, 15, 13, 12, 12]; // Total 77
      for (let i = 0; i < 6; i++) {
        await this.prisma.scoreRun.create({
          data: { riderId: r1.id, seriId: s1.id, kelasId: kWalk.id, kelas: 'Beginner ( Walk )', noBib: 1, runNumber: i + 1, target1: 5, target2: 4, target3: walkRunsTristiyan[i] - 9, waktuTempuh: 12.0, poinTarget: walkRunsTristiyan[i], totalSkor: walkRunsTristiyan[i] }
        });
      }

      const walkRunsArcher = [11, 10, 15, 11, 10, 10]; // Total 67
      for (let i = 0; i < 6; i++) {
        await this.prisma.scoreRun.create({
          data: { riderId: r5.id, seriId: s1.id, kelasId: kWalk.id, kelas: 'Beginner ( Walk )', noBib: 2, runNumber: i + 1, target1: 4, target2: 4, target3: walkRunsArcher[i] - 8, waktuTempuh: 12.5, poinTarget: walkRunsArcher[i], totalSkor: walkRunsArcher[i] }
        });
      }

      // Kelas Beginner (Trot) Terbuka: Tristiyan 3 run = 45 pts (best 15), Carla 3 run = 43 pts (best 15)
      const trotRunsTristiyan = [15, 15, 15]; // Total 45
      for (let i = 0; i < 3; i++) {
        await this.prisma.scoreRun.create({
          data: { riderId: r1.id, seriId: s1.id, kelasId: kTrot.id, kelas: 'Beginner ( Trot )', noBib: 5, runNumber: i + 1, target1: 5, target2: 5, target3: 5, waktuTempuh: 11.0, poinTarget: trotRunsTristiyan[i], totalSkor: trotRunsTristiyan[i] }
        });
      }

      const trotRunsCarla = [14, 15, 14]; // Total 43
      for (let i = 0; i < 3; i++) {
        await this.prisma.scoreRun.create({
          data: { riderId: r2.id, seriId: s1.id, kelasId: kTrot.id, kelas: 'Beginner ( Trot )', noBib: 1, runNumber: i + 1, target1: 5, target2: 5, target3: trotRunsCarla[i] - 10, waktuTempuh: 11.5, poinTarget: trotRunsCarla[i], totalSkor: trotRunsCarla[i] }
        });
      }
    }

    // 7. Seed 7 Anggota Panitia & Dewan Juri (Persis Screenshot Panitia)
    if ((await this.prisma.panitiaJuri.count()) === 0) {
      await this.prisma.panitiaJuri.createMany({
        data: [
          { namaLengkap: 'Mardiansyah', panggilan: 'Mardi', peran: 'Juri Utama', urutanTampil: 1, sertif: 'Juri Berkuda Memanah Nasional', kontakWa: '081586844344', email: 'mardiansyah@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Ketua Dewan Juri & Validator Skor Utama' },
          { namaLengkap: 'Sari Puspita', panggilan: 'Sari', peran: 'Juri', urutanTampil: 2, sertif: 'Juri IHAA & Pordasi', kontakWa: '081210002002', email: 'sari@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Juri Penilaian Zona Target' },
          { namaLengkap: 'Andi Nugraha', panggilan: 'Andi', peran: 'Scorer/Pencatat', urutanTampil: 3, sertif: 'Official Scorer STHAC', kontakWa: '081210002003', email: 'andi@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Pencatat Skor & Operator Tabulasi Poin' },
          { namaLengkap: 'Bimo Saputra', panggilan: 'Bimo', peran: 'Timer', urutanTampil: 4, sertif: 'Official Timer', kontakWa: '081210002004', email: 'bimo@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Pengukur Waktu Tempuh Lintasan' },
          { namaLengkap: 'Yusuf Maulana', panggilan: 'Yusuf', peran: 'Course Designer', urutanTampil: 5, sertif: 'Course Designer L1', kontakWa: '081210002005', email: 'yusuf@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Perancang & Pengawas Lintasan Pertandingan' },
          { namaLengkap: 'Dewi Anggraini', panggilan: 'Dewi', peran: 'Starter', urutanTampil: 6, sertif: 'Marshal & Starter', kontakWa: '081210002006', email: 'dewi@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Pengatur Urutan Start Peserta (Bib)' },
          { namaLengkap: 'dr. Fitri Handayani', panggilan: 'dr. Fitri', peran: 'Tim Medis', urutanTampil: 7, sertif: 'Tim Medis & Vet Check', kontakWa: '081210002007', email: 'medis@sthac.com', kodeAkses: 'sthac2026', status: 'Aktif', bioTugas: 'Pemeriksaan Kesehatan Rider & Kesejahteraan Kuda' }
        ]
      });
    }

    // 8. Seed 4 Dokumen Unduhan
    if ((await this.prisma.dokumen.count()) === 0) {
      await this.prisma.dokumen.createMany({
        data: [
          { judul: 'Technical Handbook Seri 1', kodeBadge: 'THB', kategori: 'Handbook', statusInfo: 'Menyusul', ukuran: 'PDF', fileUrl: '#' },
          { judul: 'Peraturan Pertandingan STHAC 2026', kodeBadge: 'RULE', kategori: 'Regulasi', statusInfo: 'Menyusul', ukuran: 'PDF', fileUrl: '#' },
          { judul: 'Formulir Pendaftaran (unduh manual)', kodeBadge: 'FORM', kategori: 'Formulir Kolektif Stable', statusInfo: 'Menyusul', ukuran: 'PDF/XLSX', fileUrl: '#' },
          { judul: 'Skema Lintasan IHAA & Pordasi 2026', kodeBadge: 'TRACK', kategori: 'Lintasan', statusInfo: 'Tersedia', ukuran: '1.8 MB', fileUrl: '#' }
        ]
      });
    }

    // 9. Seed Berita / Warta
    if ((await this.prisma.news.count()) === 0) {
      await this.prisma.news.createMany({
        data: [
          {
            judul: 'Pendaftaran Seri 1 South Tangerang Horseback Archery Cup 2026 Resmi Dibuka',
            kategori: 'PENGUMUMAN',
            ringkasan: 'Diselenggarakan di Saiga Stable, Tangerang Selatan pada Sabtu, 14 November 2026.',
            isiBerita: 'Pendaftaran terbuka untuk kelas Beginner U14 (Walk) dan Open (Trot) serta kelas berjenjang lainnya dengan mengacu pada sistem penilaian IHAA dan format nasional Pordasi Berkuda Memanah.'
          },
          {
            judul: '7 Peraturan Umum & Protokol Kesejahteraan Kuda (Horse Welfare) STHAC',
            kategori: 'REGULASI',
            ringkasan: 'Seluruh peserta wajib mengenakan helm berkuda, sepatu boots berhak, serta melewati pemeriksaan anak panah pukul 07:00 WIB.',
            isiBerita: 'Untuk nomor Qabaq hanya diperbolehkan menggunakan anak panah flu-flu (blunt). Tim medis dan panitia berhak menghentikan peserta atau kuda yang dinilai tidak bugar.'
          }
        ]
      });
    }
  }
}

module.exports = new Database();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const database = require('./config/Database');
const upload = require('./config/UploadMiddleware');
const ApiController = require('./controllers/ApiController');
const pageController = require('./controllers/PageController');

class AppServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, { cors: { origin: '*' } });
    this.controller = new ApiController(this.io);
    this.configureMiddleware();
    this.configureRoutes();
  }

  configureMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // EJS View Engine + Base Layout
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));
    this.app.use(expressLayouts);
    this.app.set('layout', 'layouts/main');

    // Static Assets
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  configureRoutes() {
    // 1. RUTE HALAMAN UTAMA & ALIAS STHAC.COM
    this.app.get('/', pageController.renderPage('beranda', 'Beranda'));
    this.app.get('/event', pageController.renderPage('event', 'Event & Jadwal Seri'));
    this.app.get(['/seri', '/serie'], pageController.renderPage('seri', 'Seri Kejuaraan'));
    this.app.get('/juara', pageController.renderPage('juara', 'Klasemen Poin Juara Umum'));
    this.app.get(['/profile', '/rider'], pageController.renderPage('profile', 'Profil Rider, Pelatih & Stable'));
    this.app.get('/skor', pageController.renderPage('skor', 'Papan Skor Live'));
    this.app.get('/aturan', pageController.renderPage('aturan', 'Aturan & Sistem Penilaian'));
    this.app.get('/unduhan', pageController.renderPage('unduhan', 'Unduhan Dokumen'));
    this.app.get(['/news', '/berita'], pageController.renderPage('news', 'Berita & Pengumuman'));
    this.app.get(['/pendaftaran', '/daftar'], pageController.renderPage('pendaftaran', 'Formulir Pendaftaran'));
    this.app.get(['/panitia', '/admin', '/admin-login'], pageController.renderPage('panitia', 'Panel Panitia'));

    // 2. RUTE API PENDAFTARAN & PUBLIC DATA
    this.app.post('/api/register/rider', upload.single('fotoFile'), this.controller.registerRider);
    this.app.post('/api/register/pelatih', upload.single('fotoFile'), this.controller.registerPelatih);
    this.app.post('/api/register/stable', upload.single('logoFile'), this.controller.registerStable);
    this.app.get('/api/profiles', this.controller.getProfiles);
    this.app.post('/api/scores', this.controller.submitScore);
    this.app.get('/api/leaderboard', this.controller.getLeaderboard);

    // 3. RUTE API AUTENTIKASI PANITIA (EMAIL OTP SEKALI PAKAI + PASSWORD)
    this.app.post('/api/panitia/login/password', this.controller.loginWithPassword);
    this.app.post('/api/panitia/login/request-otp', this.controller.requestLoginOtp);
    this.app.post('/api/panitia/login/verify-otp', this.controller.verifyLoginOtp);
    this.app.post('/api/panitia/register/request-otp', upload.single('fotoFile'), this.controller.requestRegisterOtp);
    this.app.post('/api/panitia/register/verify-otp', this.controller.verifyRegisterOtp);

    // 4. RUTE API CRUD LENGKAP PANEL PANITIA
    this.app.get('/api/panitia/dashboard', this.controller.getAdminDashboard);
    this.app.put('/api/panitia/rider/:id/acc', this.controller.verifyRegistrant);
    this.app.post('/api/panitia/rider/:id/delete', this.controller.deleteRegistrant);

    this.app.put('/api/panitia/seri/:id', this.controller.saveSeri);
    this.app.post('/api/panitia/seri/:id/delete', this.controller.deleteSeri);

    this.app.post('/api/panitia/kelas', this.controller.createKelas);
    this.app.put('/api/panitia/kelas/:id/toggle-poin', this.controller.toggleKelasPoin);
    this.app.delete('/api/panitia/kelas/:id', this.controller.deleteKelas);

    this.app.post('/api/panitia/lintasan', this.controller.saveLintasan);

    this.app.post('/api/panitia/members', upload.single('fotoFile'), this.controller.createPanitia);
    this.app.put('/api/panitia/members/:id', upload.single('fotoFile'), this.controller.updatePanitia);
    this.app.delete('/api/panitia/members/:id', this.controller.deletePanitia);

    this.app.post('/api/panitia/dokumen', upload.single('docFile'), this.controller.createDokumen);
    this.app.delete('/api/panitia/dokumen/:id', this.controller.deleteDokumen);

    this.app.post('/api/panitia/news', upload.single('gambarFile'), this.controller.createNews);
    this.app.delete('/api/panitia/news/:id', this.controller.deleteNews);

    this.app.put('/api/panitia/settings', this.controller.updateSettings);
    this.app.post('/api/panitia/toggle-reg', this.controller.toggleRegStatus);
    this.app.post('/api/panitia/clear-demo', this.controller.clearDemoData);
  }

  async start() {
    await database.seedInitialData();
    this.server.listen(this.port, () => {
      console.log('================================================================');
      console.log(`🏛️  STHAC 2026 Reworked MVC + OOP : http://localhost:${this.port}`);
      console.log(`🛡️  Panel Panitia (OTP & Pass)    : http://localhost:${this.port}/panitia`);
      console.log('================================================================');
    });
  }
}

module.exports = AppServer;
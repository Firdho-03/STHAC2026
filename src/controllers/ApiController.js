const registrationService = require('../services/RegistrationService');
const scoringService = require('../services/ScoringService');
const panitiaService = require('../services/PanitiaService');

class ApiController {
  constructor(io) {
    this.io = io;
  }

  // ==================== API PENDAFTARAN PUBLIK ====================
  registerRider = async (req, res) => {
    try {
      if (req.body.website_hp) return res.json({ success: true }); // Honeypot anti-spam
      const isManual = req.body.isManualAdmin === 'true';
      const data = await registrationService.registerRider(req.body, req.file, isManual);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  registerPelatih = async (req, res) => {
    try {
      const isManual = req.body.isManualAdmin === 'true';
      const data = await registrationService.registerPelatih(req.body, req.file, isManual);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  registerStable = async (req, res) => {
    try {
      const isManual = req.body.isManualAdmin === 'true';
      const data = await registrationService.registerStable(req.body, req.file, isManual);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  getProfiles = async (req, res) => {
    try { res.json(await registrationService.getAllProfiles(req.query)); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  // ==================== API PENILAIAN & SKOR REAL-TIME ====================
  submitScore = async (req, res) => {
    try {
      const savedRun = await scoringService.recordScore(req.body);
      this.io.emit('score_updated', savedRun);
      res.json({ success: true, data: savedRun });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  getLeaderboard = async (req, res) => {
    try {
      const seriId = parseInt(req.query.seri) || 1;
      const [classBoards, champStandings] = await Promise.all([
        scoringService.getClassScoreboards(seriId),
        scoringService.getChampionshipStandings()
      ]);
      res.json({ classBoards, champStandings });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  // ==================== API AUTENTIKASI PANITIA (OTP & PASSWORD) ====================
  loginWithPassword = async (req, res) => {
    try {
      const user = await panitiaService.loginWithPassword(req.body.password);
      res.json({ success: true, user });
    } catch (e) { res.status(401).json({ success: false, error: e.message }); }
  };

  requestLoginOtp = async (req, res) => {
    try { res.json({ success: true, ...(await panitiaService.requestLoginOtp(req.body.email)) }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  };

  verifyLoginOtp = async (req, res) => {
    try { res.json({ success: true, user: await panitiaService.verifyLoginOtp(req.body.email, req.body.otpCode) }); }
    catch (e) { res.status(401).json({ success: false, error: e.message }); }
  };

  requestRegisterOtp = async (req, res) => {
    try { res.json({ success: true, ...(await panitiaService.requestRegisterOtp(req.body, req.file)) }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  };

  verifyRegisterOtp = async (req, res) => {
    try { res.json({ success: true, user: await panitiaService.verifyRegisterOtp(req.body.email, req.body.otpCode) }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  };

  // ==================== API MANAJEMEN PANEL PANITIA (13 MENU) ====================
  getAdminDashboard = async (req, res) => {
    try { res.json(await panitiaService.getDashboardBundle()); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  verifyRegistrant = async (req, res) => {
    try {
      const { statusAcc, catatanPanitia, alasanPenolakan } = req.body;
      const data = await panitiaService.verifyRegistrant(req.params.id, statusAcc, catatanPanitia, alasanPenolakan);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  deleteRegistrant = async (req, res) => {
    try {
      await panitiaService.deleteRegistrantPermanent(req.params.id, req.body.confirmWord);
      res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  };

  saveSeri = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.saveSeri(req.params.id, req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  deleteSeri = async (req, res) => {
    try {
      await panitiaService.deleteSeriPermanent(req.params.id, req.body.confirmWord);
      res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  };

  createKelas = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.createKelas(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  toggleKelasPoin = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.toggleKelasPoin(req.params.id) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  deleteKelas = async (req, res) => {
    try { await panitiaService.deleteKelas(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  saveLintasan = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.saveLintasan(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  createPanitia = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.createPanitia(req.body, req.file) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  updatePanitia = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.updatePanitia(req.params.id, req.body, req.file) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  deletePanitia = async (req, res) => {
    try { await panitiaService.deletePanitia(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  createDokumen = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.createDokumen(req.body, req.file) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  deleteDokumen = async (req, res) => {
    try { await panitiaService.deleteDokumen(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  createNews = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.createNews(req.body, req.file) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  deleteNews = async (req, res) => {
    try { await panitiaService.deleteNews(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  updateSettings = async (req, res) => {
    try { res.json({ success: true, data: await panitiaService.updateSiteSettings(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  toggleRegStatus = async (req, res) => {
    try { res.json({ success: true, registrationOpen: await panitiaService.toggleRegistrationStatus() }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };

  clearDemoData = async (req, res) => {
    try {
      await panitiaService.clearDemoData();
      this.io.emit('score_updated');
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  };
}

module.exports = ApiController;
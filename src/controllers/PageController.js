const db = require('../config/Database').getClient();
const registrationService = require('../services/RegistrationService');
const scoringService = require('../services/ScoringService');
const panitiaService = require('../services/PanitiaService');

class PageController {
  async buildPageContext(req) {
    const selectedSeriId = parseInt(req.query.seri) || 1;
    const selectedAdminTab = req.query.tab || 'ringkasan';

    const [
      adminBundle,
      classScoreboards,
      champStandings,
      filteredProfiles
    ] = await Promise.all([
      panitiaService.getDashboardBundle(),
      scoringService.getClassScoreboards(selectedSeriId),
      scoringService.getChampionshipStandings(),
      registrationService.getAllProfiles({
        q: req.query.q || '',
        kategori: req.query.kategori || 'all',
        stable: req.query.stable || 'all'
      })
    ]);

    // Papan skor per masing-masing seri (untuk pratinjau per seri di halaman Juara & Admin Poin)
    const seriScoreboardsMap = {};
    for (const s of adminBundle.seri) {
      seriScoreboardsMap[s.id] = await scoringService.getClassScoreboards(s.id);
    }

    // Jika membuka detail rider spesifik (?id=X)
    let riderDetail = null;
    if (req.query.id) {
      const rId = parseInt(req.query.id);
      riderDetail = adminBundle.allRiders.find(r => r.id === rId) || null;
      if (riderDetail) {
        riderDetail.runs = adminBundle.scores.filter(sc => sc.riderId === rId);
      }
    }

    return {
      setting: adminBundle.setting,
      stats: adminBundle.stats,
      seriList: adminBundle.seri,
      kelasList: adminBundle.kelasList,
      lintasanList: adminBundle.lintasanList,
      dokumenList: adminBundle.dokumen,
      newsList: adminBundle.news,
      scores: adminBundle.scores,
      standings: champStandings,
      classScoreboards,
      seriScoreboardsMap,
      profiles: filteredProfiles,
      adminBundle,
      riderDetail,
      selectedSeriId,
      selectedAdminTab,
      query: req.query
    };
  }

  renderPage = (pageName, pageTitle) => async (req, res) => {
    try {
      const ctx = await this.buildPageContext(req);
      res.render(`pages/${pageName}`, {
        title: `${pageTitle} · ${ctx.setting.shortCode || 'STHAC 2026'}`,
        activePage: pageName,
        ...ctx
      });
    } catch (err) {
      console.error(`Error rendering page ${pageName}:`, err);
      res.status(500).send(`Terjadi kesalahan saat memuat halaman ${pageName}: ${err.message}`);
    }
  };
}

module.exports = new PageController();
class SthacApp {
  constructor() {
    this.socket = io();
    this.viewport = document.getElementById('app-viewport');
    this.currentRoute = 'beranda';
    this.state = {
      profiles: { riders: [], pelatih: [], stables: [] },
      scores: [],
      admin: null
    };

    this.views = {
      beranda: new BerandaView(this),
      pendaftaran: new PendaftaranView(this),
      event: new EventView(this),
      seri: new SeriKejuaraanView(this),
      skor: new PapanSkorView(this),
      juara: new JuaraView(this),
      profile: new ProfileView(this),
      aturan: new AturanView(this),
      unduhan: new UnduhanView(this),
      news: new NewsView(this),
      panitia: new PanitiaView(this)
    };

    this.initSocket();
    this.loadAllData();
  }

  async loadAllData() {
    const [profRes, scoreRes, admRes] = await Promise.all([
      fetch('/api/profiles'),
      fetch('/api/leaderboard'),
      fetch('/api/panitia/dashboard')
    ]);
    this.state.profiles = await profRes.json();
    this.state.scores = await scoreRes.json();
    this.state.admin = await admRes.json();
    this.renderCurrentView();
  }

  navigate(routeKey) {
    if (!this.views[routeKey]) return;
    this.currentRoute = routeKey;
    this.renderCurrentView();
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.getAttribute('data-nav') === routeKey));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentView() {
    const activeView = this.views[this.currentRoute];
    this.viewport.innerHTML = `<div class="fade-in-tab">${activeView.render()}</div>`;
    activeView.afterMount();
  }

  async submitRegistration(event, endpoint, roleLabel) {
    event.preventDefault();
    const res = await fetch(endpoint, { method: 'POST', body: new FormData(event.target) });
    const result = await res.json();
    if (result.success) {
      alert(`Berhasil! Data ${roleLabel} telah disimpan ke Database.`);
      await this.loadAllData();
      this.navigate('profile');
    } else {
      alert(`Gagal menyimpan: ${result.error}`);
    }
  }

  initSocket() {
    this.socket.on('score_updated', () => this.loadAllData());
  }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new SthacApp(); });
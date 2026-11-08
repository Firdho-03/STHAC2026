/**
 * STHAC 2026 — PANITIA DASHBOARD OOP ARCHITECTURE
 */
class PopupDialogManager {
  constructor() {
    this.confirmCallback = null;
  }
  show(title, message, type = 'error', onConfirm = null) {
    const backdrop = document.getElementById('sthac-popup-backdrop');
    const iconWrap = document.getElementById('popup-icon-wrap');
    const iconEl = document.getElementById('popup-icon');
    const titleEl = document.getElementById('popup-title');
    const msgEl = document.getElementById('popup-message');
    const btnCancel = document.getElementById('popup-btn-cancel');
    const btnOk = document.getElementById('popup-btn-ok');
    if (!backdrop) return;
    titleEl.innerText = title;
    msgEl.innerHTML = message;
    this.confirmCallback = onConfirm;
    if (type === 'success') {
      iconWrap.style.background = 'rgba(16, 185, 129, 0.16)';
      iconWrap.style.color = '#10B981';
      iconEl.className = 'bi bi-check-circle-fill';
      btnCancel.classList.add('d-none');
      btnOk.innerText = 'Selesai';
    } else if (type === 'confirm') {
      iconWrap.style.background = 'rgba(245, 158, 11, 0.16)';
      iconWrap.style.color = '#F59E0B';
      iconEl.className = 'bi bi-question-circle-fill';
      btnCancel.classList.remove('d-none');
      btnOk.innerText = 'Ya, Lanjutkan';
    } else {
      iconWrap.style.background = 'rgba(220, 38, 38, 0.16)';
      iconWrap.style.color = '#EF4444';
      iconEl.className = 'bi bi-exclamation-triangle-fill';
      btnCancel.classList.add('d-none');
      btnOk.innerText = 'Coba Lagi';
    }
    backdrop.style.display = 'flex';
  }
  close(confirmed = false) {
    const backdrop = document.getElementById('sthac-popup-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    if (confirmed && typeof this.confirmCallback === 'function') {
      const cb = this.confirmCallback;
      this.confirmCallback = null;
      cb();
    } else {
      this.confirmCallback = null;
    }
  }
}

class AdminTabRouter {
  constructor(app) {
    this.app = app;
    this.groups = {
      ringkasan: ['ringkasan'],
      peserta: ['pendaftar', 'rider', 'pelatih', 'stable'],
      teknis: ['acara', 'lintasan', 'penilaian', 'poin'],
      sistem: ['panitia', 'unduhan', 'berita', 'rundown', 'sponsor'],
      setelan: ['setelan']
    };
  }
  init() {
    document.querySelectorAll('#admin-nav-pills .dropdown-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllDropdowns(btn));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#admin-nav-pills')) {
        this.closeAllDropdowns();
      }
    });
  }
  closeAllDropdowns(exceptToggle = null) {
    document.querySelectorAll('#admin-nav-pills .dropdown').forEach(dropWrapper => {
      const toggleBtn = dropWrapper.querySelector('.dropdown-toggle');
      const menuEl = dropWrapper.querySelector('.dropdown-menu');
      if (exceptToggle && toggleBtn === exceptToggle) return;
      if (toggleBtn && window.bootstrap && bootstrap.Dropdown) {
        const inst = bootstrap.Dropdown.getInstance(toggleBtn);
        if (inst) { try { inst.hide(); } catch (e) {} }
      }
      if (toggleBtn) {
        toggleBtn.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
      if (menuEl) {
        menuEl.classList.remove('show');
        menuEl.removeAttribute('data-bs-popper');
        menuEl.style.display = '';
      }
    });
  }
  openTab(tabName) {
    this.closeAllDropdowns();
    sessionStorage.setItem('sthac_active_adm_tab', tabName);
    document.querySelectorAll('.admin-section').forEach(el => { el.style.display = 'none'; });
    const target = document.getElementById('adm-sec-' + tabName);
    if (target) target.style.display = 'block';
    Object.keys(this.groups).forEach(gKey => {
      const btn = document.getElementById('adm-group-' + gKey);
      if (!btn) return;
      const isActive = this.groups[gKey].includes(tabName);
      btn.classList.remove('btn-gold-pill', 'btn-dark-pill', 'show');
      btn.classList.add(isActive ? 'btn-gold-pill' : 'btn-dark-pill');
      btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.adm-sub-link').forEach(link => {
      if (link.getAttribute('data-tab') === tabName) link.classList.add('active-sub');
      else link.classList.remove('active-sub');
    });
    if (tabName === 'rundown' && this.app.rundownManager) {
      this.app.rundownManager.fetchAndRender();
    }
  }
}

class PanitiaAuthManager {
  constructor(app) {
    this.app = app;
    this.pendingEmail = '';
    this.pendingName = '';
    this.pendingRole = '';
    this.pendingPurpose = 'LOGIN';
  }
  switchMode(mode) {
    ['login-otp', 'register-otp', 'quick-pass'].forEach(m => {
      const pane = document.getElementById('auth-pane-' + m);
      const btn = document.getElementById('tab-btn-' + m);
      if (pane) pane.style.display = (m === mode) ? 'block' : 'none';
      if (btn) btn.className = 'btn btn-sm flex-fill py-2 ' + (m === mode ? 'btn-gold-pill' : 'btn-dark-pill');
    });
    const verifyBox = document.getElementById('auth-otp-verify-box');
    if (verifyBox) verifyBox.style.display = 'none';
  }
  resetOtpView() {
    this.switchMode(this.pendingPurpose === 'REGISTER' ? 'register-otp' : 'login-otp');
  }
  resendOtp() {
    if (!this.pendingEmail) return;
    this.requestOtpFromServer(this.pendingEmail, this.pendingName, this.pendingRole, this.pendingPurpose);
  }
  handleRequestOtp(e, purpose) {
    e.preventDefault();
    const email = purpose === 'REGISTER'
      ? document.getElementById('inp-reg-email').value.trim()
      : document.getElementById('inp-login-email').value.trim();
    const namaLengkap = purpose === 'REGISTER'
      ? document.getElementById('inp-reg-name').value.trim()
      : email.split('@')[0];
    const jabatan = purpose === 'REGISTER'
      ? document.getElementById('inp-reg-role').value
      : 'Dewan Juri & Panitia';
    if (!email) return this.app.popup.show('Email Belum Diisi', 'Masukkan alamat email resmi Anda.', 'error');
    this.pendingEmail = email;
    this.pendingName = namaLengkap;
    this.pendingRole = jabatan;
    this.pendingPurpose = purpose;
    this.requestOtpFromServer(email, namaLengkap, jabatan, purpose);
  }
  async requestOtpFromServer(email, namaLengkap, jabatan, purpose) {
    try {
      const res = await fetch('/api/panitia/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, namaLengkap, jabatan, purpose })
      });
      const out = await res.json();
      if (out.ok || out.success) {
        document.getElementById('auth-pane-login-otp').style.display = 'none';
        document.getElementById('auth-pane-register-otp').style.display = 'none';
        document.getElementById('auth-otp-verify-box').style.display = 'block';
        document.getElementById('lbl-target-otp-email').innerText = email;
        const codeInp = document.getElementById('inp-verify-otp-code');
        codeInp.value = '';
        codeInp.focus();
      } else {
        this.app.popup.show('Gagal Mengirim OTP', out.message || 'Tidak dapat mengirim kode OTP.', 'error');
      }
    } catch (err) {
      this.app.popup.show('Gangguan Koneksi', 'Tidak dapat terhubung ke server: ' + err.message, 'error');
    }
  }
  async handleVerifyOtp(e) {
    e.preventDefault();
    const codeInp = document.getElementById('inp-verify-otp-code');
    const otpCode = codeInp.value.trim();
    if (!otpCode || otpCode.length < 6) {
      return this.app.popup.show('Kode OTP Belum Lengkap', 'Masukkan 6 digit angka kode OTP yang dikirim ke email Anda.', 'error');
    }
    try {
      const res = await fetch('/api/panitia/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.pendingEmail, otpCode })
      });
      const out = await res.json();
      if (res.ok && (out.ok || out.success)) {
        this.activateSession(out.user || { namaLengkap: this.pendingName, jabatan: this.pendingRole, email: this.pendingEmail });
      } else {
        codeInp.value = '';
        codeInp.focus();
        this.app.popup.show('Kode OTP Salah!', out.message || 'Kode OTP yang Anda masukkan tidak sesuai.', 'error');
      }
    } catch (err) {
      this.app.popup.show('Gagal Memverifikasi OTP', 'Terjadi kesalahan saat memverifikasi kode OTP.', 'error');
    }
  }
  async handleQuickLogin(e) {
    e.preventDefault();
    const passInp = document.getElementById('inp-quick-password');
    const password = passInp.value.trim();
    try {
      const res = await fetch('/api/panitia/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const out = await res.json();
      if (res.ok && (out.ok || out.success)) {
        this.activateSession(out.user || { namaLengkap: 'Panitia Utama', jabatan: 'Dewan Juri', email: 'admin@sthac.com' });
      } else {
        passInp.value = '';
        passInp.focus();
        this.app.popup.show('Sandi Otorisasi Salah', 'Kode sandi akses yang Anda masukkan tidak valid.', 'error');
      }
    } catch (err) {
      this.app.popup.show('Gangguan Koneksi', 'Gagal memverifikasi sandi akses.', 'error');
    }
  }
  activateSession(user) {
    sessionStorage.setItem('sthac_admin_auth', '1');
    sessionStorage.setItem('sthac_admin_user', JSON.stringify(user));
    localStorage.setItem('sthac_admin_auth', '1');
    localStorage.setItem('sthac_admin_user', JSON.stringify(user));
    this.renderSessionState();
  }
  logout() {
    sessionStorage.removeItem('sthac_admin_auth');
    sessionStorage.removeItem('sthac_admin_user');
    localStorage.removeItem('sthac_admin_auth');
    localStorage.removeItem('sthac_admin_user');
    window.location.reload();
  }
  renderSessionState() {
    const isAuth = sessionStorage.getItem('sthac_admin_auth') === '1' || localStorage.getItem('sthac_admin_auth') === '1';
    const gate = document.getElementById('admin-login-gate');
    const panel = document.getElementById('admin-dashboard-panel');
    if (isAuth) {
      if (gate) gate.style.display = 'none';
      if (panel) panel.style.display = 'block';
      try {
        const u = JSON.parse(localStorage.getItem('sthac_admin_user') || sessionStorage.getItem('sthac_admin_user') || '{}');
        if (u && u.namaLengkap) {
          const lblUser = document.getElementById('lbl-active-admin-user');
          if (lblUser) lblUser.innerText = u.namaLengkap + ' · ' + (u.jabatan || 'Panitia');
          const wEl = document.getElementById('lbl-welcome-admin');
          if (wEl) wEl.innerText = u.namaLengkap + ' (' + (u.jabatan || 'Super Admin') + ')';
        }
      } catch (e) {}
      const savedTab = sessionStorage.getItem('sthac_active_adm_tab') || 'ringkasan';
      this.app.router.openTab(savedTab);
      this.app.scoreCalculator.syncExistingRunToForm();
    } else {
      if (gate) gate.style.display = 'block';
      if (panel) panel.style.display = 'none';
    }
  }
}

class EntityCrudController {
  constructor(app) {
    this.app = app;
  }
  async sendCrudRequest(entity, action, id = null, data = {}) {
    try {
      const res = await fetch('/api/panitia/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, action, id, data })
      });
      const out = await res.json();
      if (res.ok && (out.ok || out.success)) {
        this.app.popup.show('Berhasil Disimpan', out.message || 'Data berhasil diperbarui.', 'success', () => {
          window.location.reload();
        });
      } else {
        this.app.popup.show('Gagal Memproses Data', out.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
      }
    } catch (err) {
      this.app.popup.show('Gangguan Koneksi', 'Tidak dapat menghubungi server: ' + err.message, 'error');
    }
  }
  submitForm(e, entity) {
    e.preventDefault();
    if (entity === 'rider') {
      this.syncKatAndKelas();
    }
    const form = e.target;
    const fd = new FormData(form);
    const dataObj = {};
    fd.forEach((v, k) => {
      if (Object.prototype.hasOwnProperty.call(dataObj, k)) {
        if (v && !String(dataObj[k]).split(' | ').includes(String(v))) {
          dataObj[k] = dataObj[k] + ' | ' + v;
        }
      } else {
        dataObj[k] = v;
      }
    });
    if (entity === 'rider') {
      dataObj.kategoriUmur = dataObj.kategori || dataObj.kategoriUmur || 'U14';
      dataObj.kelasPilihan = dataObj.kelasYangDiikuti || dataObj.kelasPilihan || '';
    }
    const idVal = dataObj.id ? parseInt(dataObj.id, 10) : null;
    this.sendCrudRequest(entity, idVal ? 'update' : 'create', idVal, dataObj);
  }
  resetForm(formId, hiddenIdField, titleId, defaultTitle) {
    const f = document.getElementById(formId);
    if (f) f.reset();
    const h = document.getElementById(hiddenIdField);
    if (h) h.value = '';
    const t = document.getElementById(titleId);
    if (t) t.innerText = defaultTitle;
    if (formId === 'form-crud-berita') {
      this.clearBeritaPhoto();
      const bMode = document.getElementById('badge-mode-berita');
      if (bMode) bMode.innerText = 'EDITOR WARTA';
    }
    if (formId === 'form-crud-rider') {
      const bMode = document.getElementById('badge-mode-rider');
      if (bMode) bMode.innerText = 'MODE TAMBAH';
      this.syncKatAndKelas();
    }
  }
  deleteEntity(entity, id, label = '') {
    this.app.popup.show(
      'Konfirmasi Hapus Data',
      'Apakah Anda yakin ingin menghapus <strong>' + (label || entity) + '</strong> secara permanen?',
      'confirm',
      () => this.sendCrudRequest(entity, 'delete', id)
    );
  }
  filterTableRows(tableId, query) {
    const q = String(query || '').toLowerCase().trim();
    const tbl = document.getElementById(tableId);
    if (!tbl) return;
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const text = tr.innerText.toLowerCase();
      tr.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  }
  filterPendaftarCards(status, btnEl) {
    if (btnEl && btnEl.parentElement) {
      btnEl.parentElement.querySelectorAll('.saiga-filter-chip').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    document.querySelectorAll('.pendaftar-card-item').forEach(card => {
      const st = card.getAttribute('data-status') || '';
      card.style.display = (status === 'ALL' || st.toLowerCase() === status.toLowerCase()) ? '' : 'none';
    });
  }
  searchPendaftarCards(val) {
    const q = String(val || '').toLowerCase().trim();
    document.querySelectorAll('.pendaftar-card-item').forEach(card => {
      const hay = card.getAttribute('data-search') || '';
      card.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
  }
  filterBeritaCards(val) {
    const q = String(val || '').toLowerCase().trim();
    document.querySelectorAll('.berita-card-item').forEach(card => {
      const hay = card.getAttribute('data-search') || '';
      card.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
  }
  syncKatAndKelas() {
    const klsChecked = Array.from(document.querySelectorAll('.chk-adm-kls:checked')).map(c => c.value.trim());
    const katSet = new Set();
    klsChecked.forEach(kName => {
      if (/u14/i.test(kName)) katSet.add('U14');
      if (/terbuka|open/i.test(kName)) katSet.add('Terbuka');
    });
    const katArr = katSet.size > 0 ? Array.from(katSet) : ['U14'];
    const katInp = document.getElementById('inp-rider-kategori');
    if (katInp) katInp.value = katArr.join(' | ');
    const klsInp = document.getElementById('inp-rider-kelas');
    if (klsInp) klsInp.value = klsChecked.join(' | ');
  }
  fillRiderEdit(r) {
    document.getElementById('inp-rider-id').value = r.id;
    document.getElementById('inp-rider-kode').value = r.kodeRider || '';
    document.getElementById('inp-rider-nama').value = r.namaLengkap || '';
    document.getElementById('inp-rider-gender').value = r.gender || 'Putra';
    document.getElementById('inp-rider-umur').value = r.umur || 15;
    const rawKat = String(r.kategoriUmur || r.kategori || 'U14');
    const rawKls = String(r.kelasYangDiikuti || r.kelasPilihan || '');
    const klsParts = rawKls.split(/[|,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    const katParts = rawKat.split(/[|,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    document.querySelectorAll('.chk-adm-kls').forEach(chk => {
      const valLow = chk.value.trim().toLowerCase();
      const matchByKls = klsParts.some(p => p === valLow || valLow.includes(p) || p.includes(valLow));
      const matchByKat = klsParts.length === 0 && katParts.some(k => valLow.includes(k));
      chk.checked = matchByKls || matchByKat;
    });
    this.syncKatAndKelas();
    document.getElementById('inp-rider-stable').value = r.asalStable || '';
    document.getElementById('inp-rider-pelatih').value = r.namaPelatih || '';
    document.getElementById('inp-rider-kota').value = r.kotaAsal || '';
    document.getElementById('inp-rider-wa').value = r.noWhatsapp || '';
    document.getElementById('title-form-rider').innerText = 'EDIT RIDER: ' + r.namaLengkap;
    const bMode = document.getElementById('badge-mode-rider');
    if (bMode) bMode.innerText = 'MODE EDIT';
    document.getElementById('card-form-rider').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillPelatihEdit(c) {
    document.getElementById('inp-pelatih-id').value = c.id;
    document.getElementById('inp-pelatih-nama').value = c.namaLengkap || '';
    document.getElementById('inp-pelatih-stable').value = c.asalStable || '';
    document.getElementById('inp-pelatih-kota').value = c.kotaAsal || '';
    document.getElementById('inp-pelatih-wa').value = c.noWhatsapp || '';
    if (document.getElementById('inp-pelatih-lisensi')) document.getElementById('inp-pelatih-lisensi').value = c.lisensi || 'Pordasi / IHAA';
    document.getElementById('title-form-pelatih').innerText = 'EDIT PELATIH: ' + c.namaLengkap;
    document.getElementById('card-form-pelatih').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillStableEdit(s) {
    document.getElementById('inp-stable-id').value = s.id;
    document.getElementById('inp-stable-nama').value = s.namaStable || '';
    document.getElementById('inp-stable-kota').value = s.kota || '';
    document.getElementById('inp-stable-prov').value = s.provinsi || '';
    document.getElementById('inp-stable-wa').value = s.kontakWa || '';
    document.getElementById('title-form-stable').innerText = 'EDIT STABLE: ' + s.namaStable;
    document.getElementById('card-form-stable').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillKelasEdit(k) {
    document.getElementById('inp-kelas-id').value = k.id;
    document.getElementById('inp-kelas-nama').value = k.namaKelas || '';
    document.getElementById('inp-kelas-kategori').value = k.kategori || 'Terbuka';
    document.getElementById('inp-kelas-lintasan').value = k.lintasanId || 1;
    document.getElementById('inp-kelas-run').value = k.jumlahRun || 3;
    document.getElementById('title-form-kelas').innerText = 'EDIT KELAS: ' + k.namaKelas;
    document.getElementById('card-form-kelas').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillLintasanEdit(l) {
    document.getElementById('inp-lintasan-id').value = l.id;
    document.getElementById('inp-lintasan-nama').value = l.namaLintasan || '';
    document.getElementById('inp-lintasan-sistem').value = l.sistem || 'IHAA';
    document.getElementById('inp-lintasan-panjang').value = l.panjangMeter || 90;
    document.getElementById('inp-lintasan-target').value = l.jumlahTarget || 3;
    document.getElementById('inp-lintasan-par').value = l.parTime || 0;
    document.getElementById('inp-lintasan-zona').value = l.nilaiZonaTarget || '5 / 4 / 3 / 2 / 1';
    document.getElementById('inp-lintasan-bonus').value = l.bonusSapuBersih || 0;
    document.getElementById('inp-lintasan-aturan').value = l.aturanOvertime || '';
    document.getElementById('title-form-lintasan').innerText = 'EDIT LINTASAN: ' + l.namaLintasan;
    document.getElementById('card-form-lintasan').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillPanitiaEdit(u) {
    document.getElementById('inp-panitia-id').value = u.id;
    document.getElementById('inp-panitia-nama').value = u.namaLengkap || '';
    document.getElementById('inp-panitia-email').value = u.email || '';
    document.getElementById('inp-panitia-jabatan').value = u.jabatan || '';
    document.getElementById('title-form-panitia').innerText = 'EDIT PETUGAS: ' + u.namaLengkap;
    document.getElementById('card-form-panitia').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillUnduhanEdit(d) {
    document.getElementById('inp-unduhan-id').value = d.id;
    document.getElementById('inp-unduhan-kode').value = d.kodeBadge || 'DOC';
    document.getElementById('inp-unduhan-judul').value = d.judul || '';
    document.getElementById('inp-unduhan-kategori').value = d.kategori || '';
    document.getElementById('inp-unduhan-url').value = d.fileUrl || '';
    document.getElementById('title-form-unduhan').innerText = 'EDIT DOKUMEN: ' + d.judul;
    document.getElementById('card-form-unduhan').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  updateBeritaPreviewBox(src) {
    const wrap = document.getElementById('berita-preview-wrap');
    const img = document.getElementById('img-berita-preview');
    const txt = document.getElementById('txt-berita-nopreview');
    const btnClear = document.getElementById('btn-clear-berita-foto');
    if (!img || !txt) return;
    if (src && src.trim().length > 4) {
      img.src = src.trim();
      img.style.display = 'block';
      txt.style.display = 'none';
      if (btnClear) btnClear.classList.remove('d-none');
      if (wrap) wrap.style.borderColor = 'rgba(217, 180, 92, 0.6)';
    } else {
      img.src = '';
      img.style.display = 'none';
      txt.style.display = 'inline';
      if (btnClear) btnClear.classList.add('d-none');
      if (wrap) wrap.style.borderColor = '';
    }
  }
  previewBeritaFile(fileInp) {
    const file = fileInp && fileInp.files && fileInp.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const maxDim = 960;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outType, 0.86);
        const fotoInp = document.getElementById('inp-berita-foto');
        if (fotoInp) fotoInp.value = dataUrl;
        this.updateBeritaPreviewBox(dataUrl);
        try {
          const judulVal = document.getElementById('inp-berita-judul')?.value.trim() || '';
          const res = await fetch('/api/sthac-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, nama: judulVal })
          });
          const out = await res.json();
          if (out && out.ok && out.url) {
            if (fotoInp) fotoInp.value = out.url;
            this.updateBeritaPreviewBox(out.url);
          }
        } catch (err) {}
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  clearBeritaPhoto() {
    const fotoInp = document.getElementById('inp-berita-foto');
    const fileInp = document.getElementById('inp-berita-file');
    if (fotoInp) fotoInp.value = '';
    if (fileInp) fileInp.value = '';
    this.updateBeritaPreviewBox('');
  }
  fillBeritaEdit(b) {
    document.getElementById('inp-berita-id').value = b.id;
    document.getElementById('inp-berita-judul').value = b.judul || '';
    document.getElementById('inp-berita-kategori').value = b.kategori || 'Pengumuman';
    document.getElementById('inp-berita-tanggal').value = b.tanggalTerbit || '';
    document.getElementById('inp-berita-ringkasan').value = b.ringkasan || '';
    const fotoUrl = b.fotoUrl || b.foto || b.gambar || '';
    const fotoInp = document.getElementById('inp-berita-foto');
    if (fotoInp) fotoInp.value = fotoUrl;
    const fileInp = document.getElementById('inp-berita-file');
    if (fileInp) fileInp.value = '';
    this.updateBeritaPreviewBox(fotoUrl);
    document.getElementById('title-form-berita').innerText = 'EDIT WARTA: ' + b.judul;
    const bMode = document.getElementById('badge-mode-berita');
    if (bMode) bMode.innerText = 'MODE EDIT';
    document.getElementById('card-form-berita').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

class LiveScoreCalculator {
  constructor(app, existingRuns = []) {
    this.app = app;
    this.existingRuns = existingRuns;
  }
  syncExistingRunToForm() {
    const kId = Number(document.getElementById('inp-score-kelas')?.value || 0);
    const rId = Number(document.getElementById('inp-score-rider')?.value || 0);
    const runNo = Number(document.getElementById('inp-score-run')?.value || 1);
    const match = this.existingRuns.find(x => Number(x.kelasId) === kId && Number(x.riderId) === rId && Number(x.runNumber) === runNo);
    if (match) {
      document.getElementById('inp-score-t1').value = match.t1;
      document.getElementById('inp-score-t2').value = match.t2;
      document.getElementById('inp-score-t3').value = match.t3;
      document.getElementById('inp-score-waktu').value = match.waktu;
    }
    this.recalcPreview();
  }
  stepRunNumber(delta) {
    const inp = document.getElementById('inp-score-run');
    if (!inp) return;
    inp.value = Math.max(1, Math.min(10, (parseInt(inp.value, 10) || 1) + delta));
    this.syncExistingRunToForm();
  }
  recalcPreview() {
    const t1 = parseFloat(document.getElementById('inp-score-t1')?.value) || 0;
    const t2 = parseFloat(document.getElementById('inp-score-t2')?.value) || 0;
    const t3 = parseFloat(document.getElementById('inp-score-t3')?.value) || 0;
    const waktu = parseFloat(document.getElementById('inp-score-waktu')?.value) || 0;
    const selKelas = document.getElementById('inp-score-kelas');
    const opt = selKelas && selKelas.selectedOptions ? selKelas.selectedOptions[0] : null;
    const parTime = opt ? (parseFloat(opt.getAttribute('data-partime')) || 0) : 0;
    const bonusSapu = opt ? (parseFloat(opt.getAttribute('data-bonus')) || 0) : 0;
    const poinTarget = t1 + t2 + t3;
    const kenaCount = [t1, t2, t3].filter(v => v > 0).length;
    let poinWaktu = 0;
    if (parTime > 0 && waktu > 0 && kenaCount > 0) {
      poinWaktu = parTime - waktu;
    }
    const bonus = (kenaCount === 3 && bonusSapu > 0) ? bonusSapu : 0;
    const total = Math.max(0, poinTarget + poinWaktu + bonus);
    const elT = document.getElementById('prev-poin-target');
    const elW = document.getElementById('prev-poin-waktu');
    const elTot = document.getElementById('prev-total-skor');
    if (elT) elT.innerText = poinTarget.toFixed(1) + ' Pts';
    if (elW) elW.innerText = poinWaktu.toFixed(2) + ' Pts';
    if (elTot) elTot.innerText = total.toFixed(2) + ' Pts';
  }
  selectKelasForInput(kelasId, maxRun) {
    this.app.router.openTab('penilaian');
    const sel = document.getElementById('inp-score-kelas');
    if (sel) sel.value = String(kelasId);
    const runInp = document.getElementById('inp-score-run');
    if (runInp && maxRun) runInp.max = maxRun;
    this.recalcPreview();
    document.getElementById('card-form-penilaian')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  fillEditScore(kelasId, riderId, runNumber, t1, t2, t3, waktu) {
    this.app.router.openTab('penilaian');
    document.getElementById('inp-score-kelas').value = String(kelasId);
    document.getElementById('inp-score-rider').value = String(riderId);
    document.getElementById('inp-score-run').value = runNumber;
    document.getElementById('inp-score-t1').value = t1;
    document.getElementById('inp-score-t2').value = t2;
    document.getElementById('inp-score-t3').value = t3;
    document.getElementById('inp-score-waktu').value = waktu;
    this.recalcPreview();
    document.getElementById('card-form-penilaian')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  async submitScoreRun(e) {
    e.preventDefault();
    const payload = {
      kelasId: document.getElementById('inp-score-kelas').value,
      riderId: document.getElementById('inp-score-rider').value,
      runNumber: document.getElementById('inp-score-run').value,
      t1: document.getElementById('inp-score-t1').value,
      t2: document.getElementById('inp-score-t2').value,
      t3: document.getElementById('inp-score-t3').value,
      waktuTempuh: document.getElementById('inp-score-waktu').value
    };
    try {
      const res = await fetch('/api/panitia/score-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const out = await res.json();
      if (res.ok && (out.ok || out.success)) {
        sessionStorage.setItem('sthac_active_adm_tab', 'penilaian');
        this.app.popup.show('Nilai Run Tersimpan', out.message, 'success', () => window.location.reload());
      } else {
        this.app.popup.show('Gagal Menyimpan Skor', out.message || 'Periksa kembali input nilai Anda.', 'error');
      }
    } catch (err) {
      this.app.popup.show('Gangguan Koneksi', 'Gagal menghubungi server: ' + err.message, 'error');
    }
  }
  deleteScoreRun(id) {
    this.app.popup.show('Hapus Nilai Run?', 'Apakah Anda yakin ingin menghapus catatan nilai run ini?', 'confirm', async () => {
      const res = await fetch('/api/panitia/score-run/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const out = await res.json();
      if (out.ok || out.success) {
        sessionStorage.setItem('sthac_active_adm_tab', 'penilaian');
        window.location.reload();
      }
    });
  }
}

class SponsorSlotManager {
  constructor(app, slots = []) {
    this.app = app;
    this.slots = Array.isArray(slots) ? slots : [];
  }
  esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  async fetchAndRender() {
    try {
      const res = await fetch('/api/sthac-sponsors');
      const out = await res.json();
      if (out && out.ok && Array.isArray(out.sponsorList)) {
        this.slots = out.sponsorList;
        this.renderAdminGrid();
      }
    } catch (e) {}
  }
  renderAdminGrid() {
    document.querySelectorAll('#kpi-sponsor-count, #lbl-sponsor-count, #badge-nav-sponsor').forEach(el => {
      el.innerText = this.slots.length;
    });
    const navLink = document.querySelector('.adm-sub-link[data-tab="sponsor"]');
    if (navLink) {
      navLink.innerHTML = '<i class="bi bi-patch-check-fill me-2 text-warning"></i> Sponsor &amp; Mitra (' + this.slots.length + ')';
    }
    const container = document.getElementById('admin-sponsor-grid-container');
    if (!container) return;
    if (!this.slots || this.slots.length === 0) {
      container.innerHTML =
        '<div class="p-5 rounded-3 text-center" style="background:var(--bg-table-head); border:1px dashed var(--border-main);">' +
          '<i class="bi bi-patch-plus fs-1 text-warning d-block mb-2"></i>' +
          '<h6 class="fw-bold text-white mb-1">Belum Ada Sponsor Ditambahkan</h6>' +
          '<p class="small text-white-50 mb-0">Gunakan formulir di sebelah kiri untuk mengunggah logo/foto sponsor pertama Anda.</p>' +
        '</div>';
      return;
    }
    container.innerHTML = '<div class="row g-3" style="max-height: 620px; overflow-y: auto; padding-right: 4px;">' +
      this.slots.map((sp, idx) =>
        '<div class="col-sm-6 col-md-4 sponsor-admin-card-item" data-search="' + this.esc((sp.namaSponsor + ' ' + sp.kategori).toLowerCase()) + '">' +
          '<div class="p-3 rounded-3 h-100 d-flex flex-column justify-content-between" style="background:var(--bg-table-head); border:1px solid var(--border-main);">' +
            '<div>' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="badge bg-warning text-dark fw-bold">#' + (idx + 1) + '</span>' +
                '<span class="badge bg-success-subtle text-success" style="font-size:0.65rem;">Aktif</span>' +
              '</div>' +
              '<div class="rounded-3 mb-2 d-flex align-items-center justify-content-center overflow-hidden" style="height:105px; background:#FFFFFF; border:1px solid var(--border-main); padding:0.5rem;">' +
                '<img src="' + this.esc(sp.fotoUrl) + '" alt="' + this.esc(sp.namaSponsor) + '" style="max-height:92px; max-width:100%; object-fit:contain;" />' +
              '</div>' +
              '<div class="fw-bold text-white text-truncate small" title="' + this.esc(sp.namaSponsor) + '">' + this.esc(sp.namaSponsor) + '</div>' +
              '<div class="text-white-50 text-truncate" style="font-size:0.68rem;">' + this.esc(sp.kategori) + '</div>' +
            '</div>' +
            '<div class="d-flex gap-1 mt-3 pt-2 border-top" style="border-color:var(--border-main) !important;">' +
              '<button type="button" onclick="onSelectSponsorSlot(' + (sp.id || sp.slotNumber) + ', true)" class="btn btn-sm btn-gold-pill flex-grow-1 py-1" style="font-size:0.74rem;">' +
                '<i class="bi bi-pencil-square me-1"></i> Edit' +
              '</button>' +
              '<button type="button" onclick="clearSponsorSlot(' + (sp.id || sp.slotNumber) + ')" class="btn btn-sm btn-logout-pill px-2 py-1" title="Hapus Sponsor">' +
                '<i class="bi bi-trash"></i>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      ).join('') +
    '</div>';
  }
  updatePreviewBox(src) {
    const img = document.getElementById('img-sponsor-preview');
    const txt = document.getElementById('txt-sponsor-nopreview');
    if (!img || !txt) return;
    if (src && src.trim().length > 4) {
      img.src = src.trim();
      img.style.display = 'block';
      txt.style.display = 'none';
    } else {
      img.src = '';
      img.style.display = 'none';
      txt.style.display = 'inline';
    }
  }
  previewFile(fileInp) {
    const file = fileInp && fileInp.files && fileInp.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = async () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outType, 0.88);
        const fotoInp = document.getElementById('inp-sponsor-foto');
        if (fotoInp) fotoInp.value = dataUrl;
        this.updatePreviewBox(dataUrl);
        try {
          const namaSp = document.getElementById('inp-sponsor-nama')?.value.trim() || 'sponsor';
          const res = await fetch('/api/sthac-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, nama: namaSp })
          });
          const out = await res.json();
          if (out && out.ok && out.url) {
            if (fotoInp) fotoInp.value = out.url;
            this.updatePreviewBox(out.url);
          }
        } catch (err) {}
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
  resetFormToCreate() {
    const idInp = document.getElementById('inp-sponsor-id');
    const namaInp = document.getElementById('inp-sponsor-nama');
    const katInp = document.getElementById('inp-sponsor-kategori');
    const fotoInp = document.getElementById('inp-sponsor-foto');
    const fileInp = document.getElementById('inp-sponsor-file');
    const webInp = document.getElementById('inp-sponsor-web');
    const titleEl = document.getElementById('title-form-sponsor');
    const badgeEl = document.getElementById('badge-slot-sponsor');
    const btnLabel = document.getElementById('btn-label-sponsor');
    if (idInp) idInp.value = '';
    if (namaInp) namaInp.value = '';
    if (katInp) katInp.value = 'Main Sponsor';
    if (fotoInp) fotoInp.value = '';
    if (fileInp) fileInp.value = '';
    if (webInp) webInp.value = '#';
    if (titleEl) titleEl.innerText = 'TAMBAH SPONSOR & MITRA BARU';
    if (badgeEl) badgeEl.innerText = 'MODE TAMBAH';
    if (btnLabel) btnLabel.innerText = 'Tambah Sponsor ke Beranda';
    this.updatePreviewBox('');
  }
  selectSlot(idOrSlot, scrollToForm = false) {
    if (!idOrSlot) { this.resetFormToCreate(); return; }
    const num = Number(idOrSlot);
    const found = this.slots.find(s => Number(s.id) === num || Number(s.slotNumber) === num);
    if (!found) { this.resetFormToCreate(); return; }
    const idInp = document.getElementById('inp-sponsor-id');
    if (idInp) idInp.value = String(found.id || found.slotNumber);
    const namaInp = document.getElementById('inp-sponsor-nama');
    if (namaInp) namaInp.value = found.namaSponsor || '';
    const katInp = document.getElementById('inp-sponsor-kategori');
    if (katInp) katInp.value = found.kategori || 'Main Sponsor';
    const fotoInp = document.getElementById('inp-sponsor-foto');
    if (fotoInp) fotoInp.value = found.fotoUrl || '';
    const fileInp = document.getElementById('inp-sponsor-file');
    if (fileInp) fileInp.value = '';
    const webInp = document.getElementById('inp-sponsor-web');
    if (webInp) webInp.value = found.websiteUrl || '#';
    const titleEl = document.getElementById('title-form-sponsor');
    if (titleEl) titleEl.innerText = 'EDIT SPONSOR: ' + (found.namaSponsor || ('#' + num));
    const badgeEl = document.getElementById('badge-slot-sponsor');
    if (badgeEl) badgeEl.innerText = 'EDIT #' + (found.slotNumber || num);
    const btnLabel = document.getElementById('btn-label-sponsor');
    if (btnLabel) btnLabel.innerText = 'Simpan Perubahan Sponsor';
    this.updatePreviewBox(found.fotoUrl || '');
    if (scrollToForm) {
      document.getElementById('card-form-sponsor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  async submitForm(e) {
    e.preventDefault();
    const idVal = parseInt(document.getElementById('inp-sponsor-id')?.value || '', 10) || null;
    const payload = {
      id: idVal,
      namaSponsor: document.getElementById('inp-sponsor-nama').value.trim(),
      kategori: document.getElementById('inp-sponsor-kategori').value,
      fotoUrl: document.getElementById('inp-sponsor-foto').value.trim(),
      websiteUrl: document.getElementById('inp-sponsor-web').value.trim() || '#'
    };
    if (!payload.fotoUrl) {
      return this.app.popup.show('Foto Belum Dipilih', 'Silakan pilih file logo/foto sponsor atau tempel URL gambar terlebih dahulu.', 'error');
    }
    sessionStorage.setItem('sthac_active_adm_tab', 'sponsor');
    try {
      const res = await fetch('/api/sthac-sponsors/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const out = await res.json();
      if (res.ok && out && out.ok) {
        this.slots = out.sponsorList || [];
        this.resetFormToCreate();
        this.renderAdminGrid();
        this.app.popup.show('Sponsor Tersimpan!', out.message || 'Sponsor berhasil ditambahkan dan ditampilkan di Beranda.', 'success');
      } else {
        this.app.popup.show('Gagal Menyimpan Sponsor', (out && out.message) || 'Terjadi kesalahan saat menyimpan sponsor.', 'error');
      }
    } catch (err) {
      this.app.popup.show('Gangguan Koneksi', 'Tidak dapat menghubungi server: ' + err.message, 'error');
    }
  }
  clearSlot(idParam) {
    const targetId = idParam || parseInt(document.getElementById('inp-sponsor-id')?.value || '', 10);
    if (!targetId) { this.resetFormToCreate(); return; }
    const found = this.slots.find(s => Number(s.id) === Number(targetId) || Number(s.slotNumber) === Number(targetId));
    const label = found ? found.namaSponsor : ('Sponsor #' + targetId);
    this.app.popup.show(
      'Hapus ' + label + '?',
      'Sponsor <strong>' + label + '</strong> akan dihapus dari daftar sponsor Beranda.',
      'confirm',
      async () => {
        try {
          const res = await fetch('/api/sthac-sponsors/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: targetId })
          });
          const out = await res.json();
          if (out && out.ok) {
            this.slots = out.sponsorList || [];
            this.resetFormToCreate();
            this.renderAdminGrid();
          }
        } catch (err) {}
      }
    );
  }
  filterCards(query) {
    const q = String(query || '').toLowerCase().trim();
    document.querySelectorAll('.sponsor-admin-card-item').forEach(col => {
      const hay = (col.getAttribute('data-search') || '').toLowerCase();
      col.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
  }
}

class RundownAturanManager {
  constructor(app) {
    this.app = app;
    this.rundownList = [
      { id: 1, jam: '07.00', kegiatan: 'Registrasi ulang peserta & pemeriksaan anak panah' },
      { id: 2, jam: '07.30', kegiatan: 'Briefing panitia, juri, dan course designer' },
      { id: 3, jam: '08.00', kegiatan: 'Pemanasan lintasan (walk/trot) untuk kelas Beginner' },
      { id: 4, jam: '08.30', kegiatan: 'Kelas Beginner (Pemula) dimulai' },
      { id: 5, jam: '10.00', kegiatan: 'Kelas Intermediate (Menengah)' },
      { id: 6, jam: '12.00', kegiatan: 'Ishoma' },
      { id: 7, jam: '13.00', kegiatan: 'Kelas Advanced (Mahir)' },
      { id: 8, jam: '15.30', kegiatan: 'Kelas Open Qabaq (Exhibition)' },
      { id: 9, jam: '16.30', kegiatan: 'Penyerahan medali & penutupan' }
    ];
    this.peraturanList = [
      { id: 1, isi: 'Peserta wajib mengenakan <strong>helm berkuda</strong> dan <strong>sepatu riding boots berhak (heels)</strong>.' },
      { id: 2, isi: 'Anak panah wajib diperiksa oleh panitia sebelum bertanding; untuk tembakan <em>Qabaq</em> hanya diperbolehkan memakai <strong>anak panah flu-flu (blunt)</strong>.' },
      { id: 3, isi: 'Peserta wajib mengenakan <strong>nomor dada (Bib number)</strong> yang dibagikan panitia.' },
      { id: 4, isi: 'Kuda dan rider diperiksa oleh <strong>tim medis</strong> sebelum berlaga; panitia berhak menghentikan peserta yang dinilai tidak bugar.' },
      { id: 5, isi: 'Keputusan juri bersifat mengikat; protes diajukan secara tertulis maksimal <strong>15 menit setelah kelas berakhir</strong>.' },
      { id: 6, isi: 'Peserta yang tidak hadir setelah <strong>dipanggil 3 kali</strong> dianggap mengundurkan diri (<em>walkover</em>).' },
      { id: 7, isi: '<strong>Kesejahteraan kuda (Horse Welfare)</strong> menjadi prioritas utama: segala bentuk kekerasan terhadap kuda berakibat diskualifikasi langsung.' }
    ];
  }
  esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  async fetchAndRender() {
    this.render();
    try {
      const res = await fetch('/api/sthac-content');
      const out = await res.json();
      if (out && out.ok) {
        if (Array.isArray(out.rundown) && out.rundown.length > 0) this.rundownList = out.rundown;
        if (Array.isArray(out.peraturan) && out.peraturan.length > 0) this.peraturanList = out.peraturan;
        this.render();
      }
    } catch (e) {}
  }
  render() {
    ['badge-nav-rundown', 'kpi-rundown-count', 'lbl-rundown-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = this.rundownList.length;
    });
    ['kpi-aturan-count', 'lbl-aturan-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = this.peraturanList.length;
    });
    const rndTbody = document.getElementById('oop-rundown-tbody');
    if (rndTbody) {
      rndTbody.innerHTML = this.rundownList.map(item =>
        '<tr>' +
          '<td><input type="text" class="form-control form-control-sm sthac-input fw-bold text-warning" id="oop-row-jam-' + item.id + '" value="' + this.esc(item.jam) + '" /></td>' +
          '<td><input type="text" class="form-control form-control-sm sthac-input" id="oop-row-keg-' + item.id + '" value="' + this.esc(item.kegiatan) + '" /></td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-forest-pill px-2 py-1 me-1" title="Simpan Baris Ini" onclick="window.sthacPanitiaApp.rundownManager.saveInlineRow(' + item.id + ')"><i class="bi bi-check-lg text-warning"></i></button>' +
            '<button type="button" class="btn btn-sm btn-dark-pill px-2 py-1 me-1" title="Edit di Form Kiri" onclick="window.sthacPanitiaApp.rundownManager.loadRundownToForm(' + item.id + ')"><i class="bi bi-pencil"></i></button>' +
            '<button type="button" class="btn btn-sm btn-logout-pill px-2 py-1" title="Hapus Jadwal" onclick="window.sthacPanitiaApp.rundownManager.deleteRundown(' + item.id + ')"><i class="bi bi-trash"></i></button>' +
          '</td>' +
        '</tr>'
      ).join('');
    }
    const prtTbody = document.getElementById('oop-aturan-tbody');
    if (prtTbody) {
      prtTbody.innerHTML = this.peraturanList.map((p, idx) =>
        '<tr>' +
          '<td class="fw-bold text-warning">' + (idx + 1) + '.</td>' +
          '<td style="line-height: 1.55;">' + p.isi + '</td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-dark-pill px-2 py-1 me-1" title="Edit Aturan" onclick="window.sthacPanitiaApp.rundownManager.loadAturanToForm(' + p.id + ')"><i class="bi bi-pencil"></i></button>' +
            '<button type="button" class="btn btn-sm btn-logout-pill px-2 py-1" title="Hapus Aturan" onclick="window.sthacPanitiaApp.rundownManager.deleteAturan(' + p.id + ')"><i class="bi bi-trash"></i></button>' +
          '</td>' +
        '</tr>'
      ).join('');
    }
  }
  loadRundownToForm(id) {
    const item = this.rundownList.find(r => Number(r.id) === Number(id));
    if (!item) return;
    document.getElementById('oop-inp-rnd-id').value = item.id;
    document.getElementById('oop-inp-rnd-jam').value = item.jam;
    document.getElementById('oop-inp-rnd-keg').value = item.kegiatan;
    document.getElementById('oop-badge-mode-rnd').innerText = 'MODE EDIT';
    document.getElementById('oop-btn-label-rnd').innerText = 'Update Jadwal';
    document.getElementById('oop-inp-rnd-jam').focus();
  }
  resetRundownForm() {
    document.getElementById('oop-inp-rnd-id').value = '';
    document.getElementById('oop-inp-rnd-jam').value = '';
    document.getElementById('oop-inp-rnd-keg').value = '';
    document.getElementById('oop-badge-mode-rnd').innerText = 'MODE TAMBAH';
    document.getElementById('oop-btn-label-rnd').innerText = 'Simpan Jadwal';
  }
  async submitRundownForm(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('oop-inp-rnd-id').value;
    const jam = document.getElementById('oop-inp-rnd-jam').value.trim();
    const kegiatan = document.getElementById('oop-inp-rnd-keg').value.trim();
    if (!jam || !kegiatan) {
      return this.app.popup.show('Data Belum Lengkap', 'Kolom Waktu / Jam dan Teks Kegiatan wajib diisi.', 'error');
    }
    const res = await fetch('/api/sthac-content/rundown/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, jam, kegiatan })
    });
    const out = await res.json();
    if (out && out.ok) {
      this.rundownList = out.rundown;
      this.resetRundownForm();
      this.render();
    }
  }
  async saveInlineRow(id) {
    const jamEl = document.getElementById('oop-row-jam-' + id);
    const kegEl = document.getElementById('oop-row-keg-' + id);
    if (!jamEl || !kegEl) return;
    const res = await fetch('/api/sthac-content/rundown/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, jam: jamEl.value.trim(), kegiatan: kegEl.value.trim() })
    });
    const out = await res.json();
    if (out && out.ok) {
      this.rundownList = out.rundown;
      this.render();
      this.app.popup.show('Jadwal Tersimpan', 'Perubahan waktu & kegiatan acara berhasil disimpan.', 'success');
    }
  }
  deleteRundown(id) {
    this.app.popup.show('Hapus Jadwal Acara?', 'Jadwal ini akan dihapus dari Susunan Acara Hari-H.', 'confirm', async () => {
      const res = await fetch('/api/sthac-content/rundown/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const out = await res.json();
      if (out && out.ok) {
        this.rundownList = out.rundown;
        this.render();
      }
    });
  }
  restoreDefaultRundown() {
    this.app.popup.show('Reset Default Susunan Acara?', 'Kembalikan 9 jadwal default (07.00 - 16.30)?', 'confirm', async () => {
      const res = await fetch('/api/sthac-content/rundown/reset', { method: 'POST' });
      const out = await res.json();
      if (out && out.ok) {
        this.rundownList = out.rundown;
        this.render();
      }
    });
  }
  loadAturanToForm(id) {
    const item = this.peraturanList.find(p => Number(p.id) === Number(id));
    if (!item) return;
    document.getElementById('oop-inp-prt-id').value = item.id;
    document.getElementById('oop-inp-prt-isi').value = item.isi;
    document.getElementById('oop-badge-mode-prt').innerText = 'MODE EDIT';
    document.getElementById('oop-btn-label-prt').innerText = 'Update Aturan';
    document.getElementById('oop-inp-prt-isi').focus();
  }
  resetAturanForm() {
    document.getElementById('oop-inp-prt-id').value = '';
    document.getElementById('oop-inp-prt-isi').value = '';
    document.getElementById('oop-badge-mode-prt').innerText = 'MODE TAMBAH';
    document.getElementById('oop-btn-label-prt').innerText = 'Simpan Aturan';
  }
  async submitAturanForm(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('oop-inp-prt-id').value;
    const isi = document.getElementById('oop-inp-prt-isi').value.trim();
    if (!isi) {
      return this.app.popup.show('Data Belum Lengkap', 'Teks butir aturan umum pertandingan wajib diisi.', 'error');
    }
    const res = await fetch('/api/sthac-content/peraturan/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isi })
    });
    const out = await res.json();
    if (out && out.ok) {
      this.peraturanList = out.peraturan;
      this.resetAturanForm();
      this.render();
    }
  }
  deleteAturan(id) {
    this.app.popup.show('Hapus Aturan Ini?', 'Butir aturan ini akan dihapus dari daftar Aturan Umum Pertandingan.', 'confirm', async () => {
      const res = await fetch('/api/sthac-content/peraturan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const out = await res.json();
      if (out && out.ok) {
        this.peraturanList = out.peraturan;
        this.render();
      }
    });
  }
  restoreDefaultAturan() {
    this.app.popup.show('Reset 7 Aturan Default?', 'Kembalikan daftar aturan umum ke 7 butir aturan standar?', 'confirm', async () => {
      const res = await fetch('/api/sthac-content/peraturan/reset', { method: 'POST' });
      const out = await res.json();
      if (out && out.ok) {
        this.peraturanList = out.peraturan;
        this.render();
      }
    });
  }
}

class PanitiaDashboardApp {
  constructor(config = {}) {
    this.popup = new PopupDialogManager();
    this.router = new AdminTabRouter(this);
    this.auth = new PanitiaAuthManager(this);
    this.crud = new EntityCrudController(this);
    this.scoreCalculator = new LiveScoreCalculator(this, config.existingRuns || []);
    this.sponsorManager = new SponsorSlotManager(this, config.sponsorSlots || []);
    this.rundownManager = new RundownAturanManager(this);
    this.bindLegacyGlobals();
  }
  init() {
    this.router.init();
    this.auth.renderSessionState();
    this.sponsorManager.resetFormToCreate();
    this.sponsorManager.fetchAndRender();
    this.rundownManager.fetchAndRender();
    this.crud.syncKatAndKelas();
  }
  bindLegacyGlobals() {
    window.showSthacPopup = (t, m, type, cb) => this.popup.show(t, m, type, cb);
    window.closeSthacPopup = (c) => this.popup.close(c);
    window.switchAuthMode = (m) => this.auth.switchMode(m);
    window.resetOtpView = () => this.auth.resetOtpView();
    window.resendCurrentOtp = () => this.auth.resendOtp();
    window.handleRequestOtp = (e, p) => this.auth.handleRequestOtp(e, p);
    window.handleVerifyOtp = (e) => this.auth.handleVerifyOtp(e);
    window.handleQuickLogin = (e) => this.auth.handleQuickLogin(e);
    window.logoutAdmin = () => this.auth.logout();
    window.closeAllAdminDropdowns = (ex) => this.router.closeAllDropdowns(ex);
    window.openAdminTab = (tab) => this.router.openTab(tab);
    window.apiPanitiaCrud = (ent, act, id, data) => this.crud.sendCrudRequest(ent, act, id, data);
    window.toggleRegistrationStatus = (st) => this.crud.sendCrudRequest('setelan', 'update', 1, { registrationOpen: st });
    window.submitEntityForm = (e, ent) => this.crud.submitForm(e, ent);
    window.resetEntityForm = (f, h, t, d) => this.crud.resetForm(f, h, t, d);
    window.deleteEntity = (ent, id, lbl) => this.crud.deleteEntity(ent, id, lbl);
    window.approveReg = (id) => this.crud.sendCrudRequest('pendaftar', 'approve', id);
    window.rejectReg = (id) => this.popup.show('Tolak Pendaftar?', 'Data pendaftar ini akan dihapus dari antrean.', 'confirm', () => this.crud.sendCrudRequest('pendaftar', 'reject', id));
    window.filterTableRows = (id, q) => this.crud.filterTableRows(id, q);
    window.filterPendaftarCards = (st, btn) => this.crud.filterPendaftarCards(st, btn);
    window.searchPendaftarCards = (v) => this.crud.searchPendaftarCards(v);
    window.filterBeritaCards = (v) => this.crud.filterBeritaCards(v);
    window.syncAdmKatAndKelas = () => this.crud.syncKatAndKelas();
    window.fillRiderEdit = (r) => this.crud.fillRiderEdit(r);
    window.fillPelatihEdit = (c) => this.crud.fillPelatihEdit(c);
    window.fillStableEdit = (s) => this.crud.fillStableEdit(s);
    window.fillKelasEdit = (k) => this.crud.fillKelasEdit(k);
    window.fillLintasanEdit = (l) => this.crud.fillLintasanEdit(l);
    window.fillPanitiaEdit = (u) => this.crud.fillPanitiaEdit(u);
    window.fillUnduhanEdit = (d) => this.crud.fillUnduhanEdit(d);
    window.fillBeritaEdit = (b) => this.crud.fillBeritaEdit(b);
    window.previewBeritaFile = (inp) => this.crud.previewBeritaFile(inp);
    window.updateBeritaPreviewBox = (s) => this.crud.updateBeritaPreviewBox(s);
    window.clearBeritaPhoto = () => this.crud.clearBeritaPhoto();
    window.syncExistingRunToForm = () => this.scoreCalculator.syncExistingRunToForm();
    window.stepRunNumber = (d) => this.scoreCalculator.stepRunNumber(d);
    window.recalcLiveScorePreview = () => this.scoreCalculator.recalcPreview();
    window.pilihKelasUntukInput = (kId, max) => this.scoreCalculator.selectKelasForInput(kId, max);
    window.isiFormEditSkor = (k, r, rn, t1, t2, t3, w) => this.scoreCalculator.fillEditScore(k, r, rn, t1, t2, t3, w);
    window.submitNilaiRunPanitia = (e) => this.scoreCalculator.submitScoreRun(e);
    window.hapusNilaiRunPanitia = (id) => this.scoreCalculator.deleteScoreRun(id);
    window.updateSponsorPreviewBox = (s) => this.sponsorManager.updatePreviewBox(s);
    window.previewSponsorFile = (inp) => this.sponsorManager.previewFile(inp);
    window.onSelectSponsorSlot = (no, sc) => this.sponsorManager.selectSlot(no, sc);
    window.submitSponsorForm = (e) => this.sponsorManager.submitForm(e);
    window.clearSponsorSlot = (no) => this.sponsorManager.clearSlot(no);
    window.resetSponsorForm = () => this.sponsorManager.resetFormToCreate();
    window.filterSponsorAdminCards = (q) => this.sponsorManager.filterCards(q);
  }
}

window.PanitiaDashboardApp = PanitiaDashboardApp;
window.cleanAllDummyScoresPanitia = function() {
  window.showSthacPopup(
    'Bersihkan Seluruh Skor Dummy / Reset Arena?',
    'Seluruh catatan nilai run yang tersangkut atau dummy di Papan Skor akan dikosongkan menjadi 0 Run.',
    'confirm',
    async function() {
      const res = await fetch('/api/panitia/clean-dummy-scores', { method: 'POST' });
      const out = await res.json();
      if (out && out.ok) {
        sessionStorage.setItem('sthac_active_adm_tab', 'penilaian');
        window.location.reload();
      }
    }
  );
};
/**
 * STHAC 2026 Instant Image Uploader & Universal Avatar Renderer
 */
(function() {
  function compressImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var maxDim = 640;
        var w = img.width;
        var h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        callback(canvas.toDataURL(outType, 0.88));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function findFormIdentity(form) {
    if (!form) return { kode: '', nama: '' };
    var kodeInp = form.querySelector('input[name="kodeRider"], input[name="kodePelatih"], input[name="kodeStable"], input[name="kode"], #inp-rider-kode');
    var namaInp = form.querySelector('input[name="namaLengkap"], input[name="namaPelatih"], input[name="namaStable"], input[name="nama"], #inp-rider-nama');
    return {
      kode: kodeInp ? kodeInp.value.trim() : '',
      nama: namaInp ? namaInp.value.trim() : ''
    };
  }

  function createUploadWidget(widgetId, labelText, urlFieldName) {
    var div = document.createElement('div');
    div.className = 'mb-3 sthac-upload-widget';
    div.id = widgetId;
    div.innerHTML =
      '<label class="small fw-bold mb-1 d-block">' + labelText + '</label>' +
      '<div class="row g-2">' +
        '<div class="col-7">' +
          '<input type="file" accept="image/*" class="form-control form-control-sm sthac-input sthac-file-trigger" />' +
          '<input type="hidden" name="fotoUploadedData" class="sthac-hidden-dataurl" />' +
        '</div>' +
        '<div class="col-5">' +
          '<input type="text" name="' + (urlFieldName || 'fotoUrl') + '" class="form-control form-control-sm sthac-input sthac-url-trigger" placeholder="Atau tempel URL foto..." />' +
        '</div>' +
      '</div>' +
      '<div class="mt-2 d-none sthac-preview-wrap">' +
        '<div class="d-inline-flex align-items-center gap-2 p-2 rounded-3 border" style="background: rgba(217,180,92,0.1);">' +
          '<img src="" class="sthac-img-preview rounded-circle object-fit-cover border" style="width: 46px; height: 46px;" />' +
          '<div class="lh-sm">' +
            '<span class="d-block small fw-bold text-success" style="font-size: 0.74rem;">✓ Foto Siap Disimpan</span>' +
            '<button type="button" class="btn btn-link btn-sm text-danger p-0 text-decoration-none sthac-clear-img" style="font-size: 0.72rem;">Hapus / Ganti</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    return div;
  }

  function setWidgetPreview(widget, srcUrl) {
    if (!widget) return;
    var wrap = widget.querySelector('.sthac-preview-wrap');
    var img = widget.querySelector('.sthac-img-preview');
    var hidden = widget.querySelector('.sthac-hidden-dataurl');
    var urlInp = widget.querySelector('.sthac-url-trigger');
    var fileInp = widget.querySelector('input[type="file"]');

    if (srcUrl) {
      if (img) img.src = srcUrl;
      if (wrap) wrap.classList.remove('d-none');
      if (hidden) hidden.value = srcUrl;
      if (urlInp && srcUrl.indexOf('data:image/') !== 0) {
        urlInp.value = srcUrl;
      }
    } else {
      if (img) img.src = '';
      if (wrap) wrap.classList.add('d-none');
      if (hidden) hidden.value = '';
      if (urlInp) urlInp.value = '';
      if (fileInp) fileInp.value = '';
    }
  }

  function injectAdminWidgetsSafely() {
    var buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
    buttons.forEach(function(btn) {
      var text = (btn.textContent || '').trim();
      var form = btn.closest('form');
      if (!form || !btn.parentElement) return;
      var btnRow = btn.parentElement;

      if (/Simpan Rider/i.test(text) && !form.querySelector('#adm-rider-photo-widget')) {
        if (!form.querySelector('#inp-rider-kelas')) {
          var kelasDiv = document.createElement('div');
          kelasDiv.className = 'mb-3';
          kelasDiv.innerHTML =
            '<label class="small fw-bold mb-1 d-block">KELAS PERTANDINGAN DIIKUTI (BISA PILIH &gt; 1 KELAS)</label>' +
            '<input type="hidden" name="kelasYangDiikuti" id="inp-rider-kelas" value="Beginner ( Walk ) · U14" />' +
            '<div class="d-flex flex-wrap gap-2">' +
              '<label class="sthac-check-pill py-1 px-2 flex-fill">' +
                '<input type="checkbox" class="chk-adm-kls" value="Beginner ( Walk ) · U14" checked onchange="syncAdmKatAndKelas()" />' +
                '<span>Beginner ( Walk ) · U14</span>' +
              '</label>' +
              '<label class="sthac-check-pill py-1 px-2 flex-fill">' +
                '<input type="checkbox" class="chk-adm-kls" value="Beginner ( Trot ) · Terbuka" onchange="syncAdmKatAndKelas()" />' +
                '<span>Beginner ( Trot ) · Terbuka</span>' +
              '</label>' +
            '</div>';
          btnRow.parentNode.insertBefore(kelasDiv, btnRow);
        }
        btnRow.parentNode.insertBefore(createUploadWidget('adm-rider-photo-widget', 'FOTO RIDER (UPLOAD FILE / URL)', 'fotoUrl'), btnRow);
      }

      if (/Simpan Pelatih/i.test(text) && !form.querySelector('#adm-coach-photo-widget')) {
        btnRow.parentNode.insertBefore(createUploadWidget('adm-coach-photo-widget', 'FOTO PELATIH (UPLOAD FILE / URL)', 'fotoUrl'), btnRow);
      }

      if (/Simpan Stable/i.test(text) && !form.querySelector('#adm-stable-photo-widget')) {
        btnRow.parentNode.insertBefore(createUploadWidget('adm-stable-photo-widget', 'LOGO / FOTO STABLE (UPLOAD FILE / URL)', 'logoUrl'), btnRow);
      }
    });
  }

  function bindUploadInputs() {
    document.querySelectorAll('input[type="file"][accept*="image"]').forEach(function(fileInp) {
      if (fileInp.dataset.boundInstantUpload) return;
      fileInp.dataset.boundInstantUpload = '1';

      var form = fileInp.closest('form');
      var widget = fileInp.closest('.sthac-upload-widget') || fileInp.parentElement;
      var hidden = (widget && widget.querySelector('.sthac-hidden-dataurl')) || (form && form.querySelector('.sthac-hidden-dataurl'));

      if (!hidden && form) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'fotoUploadedData';
        hidden.className = 'sthac-hidden-dataurl';
        form.appendChild(hidden);
      }

      fileInp.addEventListener('change', function() {
        var file = fileInp.files && fileInp.files[0];
        if (!file) return;
        compressImage(file, function(dataUrl) {
          setWidgetPreview(widget, dataUrl);
          var ident = findFormIdentity(form);

          // Langsung unggah ke server agar file fisik tersimpan di /public/uploads/ detik itu juga
          fetch('/api/sthac-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: dataUrl,
              kode: ident.kode,
              nama: ident.nama
            })
          })
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res && res.ok && res.url) {
              setWidgetPreview(widget, res.url);
              applyMediaMapToPage();
            }
          })
          .catch(function() {});
        });
      });
    });

    // Pastikan saat form disubmit (termasuk jika menggunakan AJAX), nama & kode dikaitkan dengan foto di server
    document.querySelectorAll('form').forEach(function(form) {
      if (form.dataset.boundPhotoSubmit) return;
      form.dataset.boundPhotoSubmit = '1';
      form.addEventListener('submit', function() {
        var urlInp = form.querySelector('.sthac-url-trigger, input[name="fotoUrl"], input[name="logoUrl"]');
        var hidden = form.querySelector('.sthac-hidden-dataurl');
        var photoVal = (urlInp && urlInp.value.trim()) || (hidden && hidden.value.trim()) || '';
        if (photoVal && photoVal.indexOf('/uploads/') === 0) {
          var ident = findFormIdentity(form);
          fetch('/api/sthac-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl: '', kode: ident.kode, nama: ident.nama, existingUrl: photoVal })
          }).catch(function(){});
        }
      });
    });

    document.querySelectorAll('.sthac-url-trigger').forEach(function(urlInp) {
      if (urlInp.dataset.boundUrl) return;
      urlInp.dataset.boundUrl = '1';
      var widget = urlInp.closest('.sthac-upload-widget');
      urlInp.addEventListener('input', function() {
        var val = urlInp.value.trim();
        if (val.indexOf('http') === 0 || val.indexOf('/uploads/') === 0) {
          setWidgetPreview(widget, val);
        }
      });
    });

    document.querySelectorAll('.sthac-clear-img').forEach(function(btn) {
      if (btn.dataset.boundClear) return;
      btn.dataset.boundClear = '1';
      btn.addEventListener('click', function() {
        setWidgetPreview(btn.closest('.sthac-upload-widget'), '');
      });
    });
  }

  // Fungsi untuk mengganti semua lingkaran inisial ("FI", dll.) dengan foto asli
  function applyMediaMapToPage() {
    fetch('/api/sthac-media-map')
      .then(function(r) { return r.json(); })
      .then(function(map) {
        if (!map) return;
        var byCode = map.byCode || {};
        var byName = map.byName || {};

        // 1. Ganti avatar di dalam baris tabel (Daftar Rider Resmi, Pelatih, Stable, Direktori)
        document.querySelectorAll('tr').forEach(function(tr) {
          var rowText = (tr.innerText || '');
          var codeMatch = rowText.match(/([RPS]-d{3})/i);
          var codeKey = codeMatch ? codeMatch[1].toUpperCase() : '';
          var photoUrl = (codeKey && byCode[codeKey]) || '';

          if (!photoUrl) {
            Object.keys(byName).forEach(function(nKey) {
              if (nKey && rowText.toLowerCase().indexOf(nKey) !== -1) {
                photoUrl = byName[nKey];
              }
            });
          }

          if (photoUrl) {
            var avatarEl = tr.querySelector('.saiga-avatar, .rounded-circle');
            if (avatarEl && !avatarEl.querySelector('img')) {
              avatarEl.style.overflow = 'hidden';
              avatarEl.style.padding = '0';
              avatarEl.innerHTML = '<img src="' + photoUrl + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />';
            }
          }
        });

        // 2. Ganti lingkaran avatar besar pada halaman Detail Profil Rider (/rider/R-010)
        var pageText = document.body.innerText || '';
        var profileCodeMatch = pageText.match(/(R-d{3})/i);
        var activeProfileUrl = '';
        if (profileCodeMatch && byCode[profileCodeMatch[1].toUpperCase()]) {
          activeProfileUrl = byCode[profileCodeMatch[1].toUpperCase()];
        } else {
          Object.keys(byName).forEach(function(nKey) {
            if (nKey && pageText.toLowerCase().indexOf(nKey) !== -1) {
              activeProfileUrl = byName[nKey];
            }
          });
        }

        if (activeProfileUrl) {
          // Cari elemen lingkaran besar yang menampilkan inisial 2 huruf (misal "FI")
          document.querySelectorAll('div, span').forEach(function(el) {
            if (el.children.length === 0) {
              var txt = (el.textContent || '').trim();
              if (/^[A-Z]{1,3}$/.test(txt)) {
                var style = window.getComputedStyle(el);
                var w = parseFloat(style.width);
                var h = parseFloat(style.height);
                if (w >= 65 && h >= 65 && Math.abs(w - h) <= 10 && style.borderRadius !== '0px') {
                  el.style.overflow = 'hidden';
                  el.style.padding = '0';
                  el.innerHTML = '<img src="' + activeProfileUrl + '" alt="Foto Profil Atlet" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />';
                }
              }
            }
          });
        }
      })
      .catch(function() {});
  }

  function hookAdminEditFunctions() {
    if (typeof window.editRiderForm === 'function' && !window.editRiderForm._photoHookedV2) {
      var origRider = window.editRiderForm;
      window.editRiderForm = function(r) {
        origRider(r);
        fetch('/api/sthac-media-map').then(function(res){ return res.json(); }).then(function(map) {
          var code = String((r && r.kodeRider) || '').trim().toUpperCase();
          var name = String((r && r.namaLengkap) || '').trim().toLowerCase();
          var url = (map.byCode && map.byCode[code]) || (map.byName && map.byName[name]) || (r && (r.fotoUrl || r.foto)) || '';
          setWidgetPreview(document.getElementById('adm-rider-photo-widget'), url);
        });
      };
      window.editRiderForm._photoHookedV2 = true;
    }
  }

  function init() {
    injectAdminWidgetsSafely();
    bindUploadInputs();
    hookAdminEditFunctions();
    applyMediaMapToPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function removeScoreboardTargetWaktuColumns() {
    document.querySelectorAll('table').forEach(function(table) {
      if (table.id === 'public-rundown-table') return;
      var headers = Array.from(table.querySelectorAll('thead th'));
      if (!headers.length) return;
      var headerTexts = headers.map(function(th) { return (th.textContent || '').trim().toUpperCase(); });
      if (headerTexts.indexOf('TARGET') === -1 || headerTexts.indexOf('WAKTU') === -1) return;

      var removeIndices = [];
      headers.forEach(function(th, idx) {
        var txt = (th.textContent || '').trim().toUpperCase();
        if (txt === 'TARGET' || txt === 'WAKTU') removeIndices.push(idx);
      });
      removeIndices.sort(function(a, b) { return b - a; });
      removeIndices.forEach(function(colIdx) { if (headers[colIdx]) headers[colIdx].remove(); });
      table.querySelectorAll('tbody tr').forEach(function(tr) {
        var cells = Array.from(tr.children);
        if (cells.length === headers.length) {
          removeIndices.forEach(function(colIdx) { if (cells[colIdx]) cells[colIdx].remove(); });
        }
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeScoreboardTargetWaktuColumns);
  } else {
    removeScoreboardTargetWaktuColumns();
  }

})();












// === START PUBLIC NEWS PHOTO INJECTOR ===
(function() {
  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function injectPublicNewsPhotos() {
    var pathName = (window.location.pathname || '').toLowerCase();
    var isNewsPage = pathName.indexOf('/berita') !== -1 || pathName.indexOf('/news') !== -1 || /WARTA\s+STHAC/i.test(document.body.innerText || '');
    if (!isNewsPage) return;

    fetch('/api/sthac-berita-photos')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.ok) return;
        var byTitle = data.byTitle || {};

        document.querySelectorAll('.sthac-card, .card').forEach(function(card) {
          if (card.closest('#admin-dashboard-panel')) return;
          if (card.querySelector('.sthac-public-news-img')) return;

          var heading = card.querySelector('h2, h3, h4, h5, h6');
          if (!heading) return;

          var titleText = (heading.textContent || '').trim().toLowerCase();
          if (!titleText) return;

          var photoUrl = byTitle[titleText] || '';
          if (!photoUrl || photoUrl.trim().length <= 4) return;

          var wrap = document.createElement('div');
          wrap.className = 'mb-3 rounded-3 overflow-hidden border sthac-news-photo-box';
          wrap.style.height = '215px';
          wrap.style.background = 'rgba(7,38,25,0.06)';
          wrap.innerHTML = '<img src="' + escHtml(photoUrl) + '" alt="' + escHtml(heading.textContent.trim()) + '" class="w-100 h-100 object-fit-cover d-block sthac-public-news-img" />';
          heading.parentNode.insertBefore(wrap, heading);
        });
      })
      .catch(function() {});
  }

  function syncPublicBerandaSponsors() {
    var gridWrap = document.getElementById("public-beranda-sponsor-grid");
    if (!gridWrap) return;

    fetch("/api/sthac-sponsors", { cache: "no-store" })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res || !res.ok || !Array.isArray(res.sponsorList)) return;
        var active = res.sponsorList.filter(function(s) {
          return s && s.fotoUrl && String(s.fotoUrl).trim().length > 2;
        });

        if (active.length === 0) {
          gridWrap.innerHTML = '<div class="text-center py-3 sthac-sponsor-banner-sub small">Slot kemitraan dan sponsor resmi STHAC 2026 terbuka bagi instansi &amp; brand pendukung.</div>';
          return;
        }

        var itemsHtml = active.map(function(sp) {
          var hasLink = sp.websiteUrl && sp.websiteUrl !== "#";
          return '<div class="sthac-sponsor-flex-item">' +
            '<a href="' + (hasLink ? escHtml(sp.websiteUrl) : "javascript:void(0)") + '" ' +
               (hasLink ? 'target="_blank" rel="noopener"' : "") +
               ' class="sthac-sponsor-slot-filled d-flex flex-column align-items-center justify-content-center text-decoration-none"' +
               ' title="' + escHtml(sp.namaSponsor + " (" + (sp.kategori || "Official Sponsor") + ")") + '">' +
              '<img src="' + escHtml(sp.fotoUrl) + '" alt="' + escHtml(sp.namaSponsor) + '" class="sthac-sponsor-slot-img" />' +
            '</a>' +
          '</div>';
        }).join("");

        gridWrap.innerHTML = '<div class="sthac-sponsor-dynamic-flex" data-count="' + active.length + '">' + itemsHtml + '</div>';
      })
      .catch(function() {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      injectPublicNewsPhotos();
      syncPublicBerandaSponsors();
    });
  } else {
    injectPublicNewsPhotos();
    syncPublicBerandaSponsors();
  }
})();

// === START JADWAL LINK REWRITER ===
(function() {
  function fixJadwalLinks() {
    document.querySelectorAll('a[href^="/jadwal"]').forEach(function(a) {
      var oldHref = a.getAttribute('href') || '/jadwal';
      a.setAttribute('href', oldHref.replace(/^\/jadwal/i, '/event'));
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixJadwalLinks);
  } else {
    fixJadwalLinks();
  }
})();

// === START SCOREBOARD POIN KLASMEN COLUMN INJECTOR ===
(function() {
  var PTS_MAP = [10, 8, 6, 5, 4, 3, 2, 1];

  function ensurePoinKlasmenColumn() {
    document.querySelectorAll('table').forEach(function(table) {
      // Abaikan tabel di dalam panel admin panitia
      if (table.closest('#admin-dashboard-panel')) return;

      var theadRow = table.querySelector('thead tr');
      if (!theadRow) return;

      var headers = Array.from(theadRow.querySelectorAll('th'));
      var headerTexts = headers.map(function(th) { return (th.textContent || '').trim().toUpperCase(); });

      // Hanya targetkan tabel Papan Skor Pertandingan yang memiliki POS dan TOTAL SKOR
      var totalSkorIdx = headerTexts.indexOf('TOTAL SKOR');
      if (headerTexts.indexOf('POS') === -1 || totalSkorIdx === -1) return;

      // Cek apakah kelas ini adalah Exhibition / Qabaq
      var card = table.closest('.sthac-card, .card, section, div');
      var cardHeading = card ? card.querySelector('h2, h3, h4, h5') : null;
      var isExhibition = cardHeading && /exhibition|qabaq/i.test(cardHeading.textContent || '');

      // Jika header "POIN KLASMEN" belum ada, tambahkan di samping kanan "TOTAL SKOR"
      var poinIdx = headerTexts.indexOf('POIN KLASMEN');
      if (poinIdx === -1) {
        var totalSkorTh = headers[totalSkorIdx];
        var poinTh = document.createElement('th');
        poinTh.className = totalSkorTh.className || 'text-end';
        poinTh.classList.add('text-end');
        poinTh.textContent = 'POIN KLASMEN';
        if (totalSkorTh.nextSibling) {
          theadRow.insertBefore(poinTh, totalSkorTh.nextSibling);
        } else {
          theadRow.appendChild(poinTh);
        }
      }

      // Isi nilai Poin Klasmen pada setiap baris peserta berdasarkan peringkatnya
      var rows = Array.from(table.querySelectorAll('tbody tr'));
      rows.forEach(function(tr, rowIdx) {
        var cells = Array.from(tr.querySelectorAll('td'));
        if (cells.length <= 1) {
          // Baris kosong ("Belum ada data") -> tambah colspan
          if (cells[0] && cells[0].hasAttribute('colspan') && !tr.dataset.colspanAdjusted) {
            tr.dataset.colspanAdjusted = '1';
            cells[0].setAttribute('colspan', String((parseInt(cells[0].getAttribute('colspan'), 10) || 4) + 1));
          }
          return;
        }

        // Baca nomor peringkat dari kolom POS (misal "#1", "#2", "1")
        var posText = (cells[0].textContent || '').replace(/[^0-9]/g, '');
        var rankNum = parseInt(posText, 10) || (rowIdx + 1);
        var totalCellText = (cells[totalSkorIdx] ? cells[totalSkorIdx].textContent : '') || '';
        var numericTotal = parseFloat(totalCellText.replace(/[^0-9.]/g, '')) || 0;
        var ptsVal = (!isExhibition && numericTotal > 0 && rankNum >= 1 && rankNum <= PTS_MAP.length) ? PTS_MAP[rankNum - 1] : 0;

        // Jika baris sudah punya badge .sthac-poin-klasmen-badge, cukup pastikan nilainya akurat
        var existingBadge = tr.querySelector('.sthac-poin-klasmen-badge');
        if (existingBadge) {
          existingBadge.textContent = ptsVal + ' Pts';
          return;
        }

        var poinTd = document.createElement('td');
        poinTd.className = 'text-end text-nowrap';
        poinTd.innerHTML = '<span class="sthac-poin-klasmen-badge">' + ptsVal + ' Pts</span>';
        tr.appendChild(poinTd);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePoinKlasmenColumn);
  } else {
    ensurePoinKlasmenColumn();
  }
})();

// === START KLASEMEN HEADER RENAME GUARD ===
(function() {
  function syncKlasemenTableHeaders() {
    document.querySelectorAll('table thead th').forEach(function(th) {
      var txt = (th.textContent || '').trim().toUpperCase();
      if (txt === 'TOTAL SKOR RUN' || txt === 'SKOR LINTASAN') {
        th.textContent = 'POIN KLASMEN';
      } else if (txt === 'POIN KEJUARAAN' || txt === 'TOTAL POIN') {
        // Pastikan hanya di tabel klasemen juara umum
        var tr = th.closest('tr');
        if (tr && /PERINGKAT/i.test(tr.textContent || '')) {
          th.textContent = 'TOTAL';
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncKlasemenTableHeaders);
  } else {
    syncKlasemenTableHeaders();
  }
})();


// === START LIVE AUTO-REFRESH & MANUAL REFRESH CONTROLLER ===
(function() {
  // HANYA aktifkan tombol Refresh & Auto-Refresh di Halaman Nilai / Papan Skor Pertandingan (/skor)
  var pathName = (window.location.pathname || '').toLowerCase();
  var isSkorPage = (pathName === '/skor' || pathName.indexOf('/skor/') === 0);
  if (!isSkorPage) {
    var oldBar = document.getElementById('sthac-live-refresh-bar');
    if (oldBar) oldBar.remove();
    return;
  }

  var _currentVersion = null;
  var _autoRefreshEnabled = localStorage.getItem('sthac_auto_refresh') !== '0';
  var _pollTimer = null;

  window.triggerSthacManualRefresh = function(btnEl) {
    if (btnEl) btnEl.disabled = true;
    window.location.reload();
  };

  window.toggleSthacAutoRefresh = function() {
    _autoRefreshEnabled = !_autoRefreshEnabled;
    localStorage.setItem('sthac_auto_refresh', _autoRefreshEnabled ? '1' : '0');
    updateSkorRefreshUI();
  };

  function updateSkorRefreshUI() {
    var toggleBtn = document.getElementById('btn-sthac-auto-refresh-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = _autoRefreshEnabled
        ? '<i class="bi bi-broadcast-pin text-success me-1"></i> Auto-Refresh: <strong>AKTIF</strong>'
        : '<i class="bi bi-pause-circle text-warning me-1"></i> Auto-Refresh: <strong>NONAKTIF</strong>';
      toggleBtn.style.borderColor = _autoRefreshEnabled ? 'rgba(16,185,129,0.5)' : 'rgba(217,180,92,0.4)';
    }
  }

  function mountSkorOnlyRefreshControls() {
    if (document.getElementById('sthac-live-refresh-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'sthac-live-refresh-bar';
    bar.style.cssText = 'position:fixed; bottom:18px; right:18px; z-index:9990; display:flex; align-items:center; gap:6px; background:rgba(6,32,21,0.92); backdrop-filter:blur(8px); padding:6px 10px; border-radius:50rem; border:1px solid rgba(217,180,92,0.45); box-shadow:0 10px 25px rgba(0,0,0,0.28); font-size:0.74rem; color:#FFFFFF;';
    bar.innerHTML =
      '<button type="button" id="btn-sthac-auto-refresh-toggle" onclick="window.toggleSthacAutoRefresh()" class="btn btn-sm rounded-pill px-2 py-1 text-white" style="font-size:0.72rem; background:rgba(255,255,255,0.06); border:1px solid rgba(16,185,129,0.5);"></button>' +
      '<button type="button" onclick="window.triggerSthacManualRefresh(this)" class="btn btn-sm btn-gold-pill px-3 py-1 fw-bold" style="font-size:0.72rem;">' +
        '<i class="bi bi-arrow-clockwise me-1"></i> Refresh Nilai' +
      '</button>';
    document.body.appendChild(bar);
    updateSkorRefreshUI();
  }

  function pollLiveState() {
    fetch('/api/sthac-live-state', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.ok) return;
        if (_currentVersion === null) {
          _currentVersion = data.version;
          return;
        }
        if (data.version !== _currentVersion) {
          _currentVersion = data.version;
          if (_autoRefreshEnabled) {
            window.location.reload();
          }
        }
      })
      .catch(function() {});
  }

  function initSkorLiveSync() {
    mountSkorOnlyRefreshControls();
    pollLiveState();
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(pollLiveState, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkorLiveSync);
  } else {
    initSkorLiveSync();
  }
})();
// === START POPUP STRAY UPLOAD CLEANER ===
(function() {
  function removeStrayUploadsFromPopups() {
    // 1. Cari semua elemen input file atau label 'FOTO PELATIH' / 'FOTO RIDER' yang berada di luar <form>
    document.querySelectorAll('input[type="file"], input[placeholder*="https://"]').forEach(function(inp) {
      var inForm = inp.closest('form');
      var inPopup = inp.closest('[id*="modal"], [id*="popup"], [id*="success"], [id*="berhasil"], .modal, .swal2-container');
      var parentCard = inp.closest('.sthac-card, .card, div[style*="fixed"], div[style*="z-index"]');
      var isSuccessBox = parentCard && /PENDAFTARAN\s+BERHASIL|Selesai\s*\/\s*Daftar\s*Lagi|KODE\s+RESMI/i.test(parentCard.textContent || '');

      if (!inForm || inPopup || isSuccessBox) {
        // Cari wrapper row/div dari input foto yang nyasar tersebut lalu hapus
        var rowWrap = inp.closest('.row, .mb-3, .sthac-upload-injected-wrap');
        if (rowWrap && (!rowWrap.closest('form') || isSuccessBox)) {
          rowWrap.remove();
        } else if (!inForm) {
          var parentDiv = inp.parentElement;
          if (parentDiv && parentDiv.parentElement && !parentDiv.parentElement.closest('form')) {
            parentDiv.parentElement.remove();
          } else if (parentDiv) {
            parentDiv.remove();
          }
        }
      }
    });

    // 2. Pastikan label 'FOTO PELATIH (UPLOAD FILE)' atau 'ATAU URL FOTO PELATIH' di dalam popup sukses ikut terhapus bersih
    document.querySelectorAll('label, div, span').forEach(function(el) {
      var txt = (el.textContent || '').trim().toUpperCase();
      if (txt === 'FOTO PELATIH (UPLOAD FILE)' || txt === 'ATAU URL FOTO PELATIH' || txt === 'FOTO RIDER (UPLOAD FILE)') {
        var inForm = el.closest('form');
        var box = el.closest('div[style*="fixed"], .modal, .sthac-card, .card') || el.parentElement;
        var isSuccessModal = box && /PENDAFTARAN\s+BERHASIL|Selesai\s*\/\s*Daftar\s*Lagi/i.test(box.textContent || '');
        if (!inForm || isSuccessModal) {
          var containerRow = el.closest('.row, .mb-3') || el.parentElement;
          if (containerRow && (!containerRow.closest('form') || isSuccessModal)) {
            containerRow.remove();
          }
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      removeStrayUploadsFromPopups();
      setTimeout(removeStrayUploadsFromPopups, 150);
      setTimeout(removeStrayUploadsFromPopups, 600);
    });
  } else {
    removeStrayUploadsFromPopups();
    setTimeout(removeStrayUploadsFromPopups, 150);
    setTimeout(removeStrayUploadsFromPopups, 600);
  }

  // Pantau jika popup sukses muncul secara dinamis setelah submit pendaftaran
  var obs = new MutationObserver(function() {
    removeStrayUploadsFromPopups();
  });
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }
})();

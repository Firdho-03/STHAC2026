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










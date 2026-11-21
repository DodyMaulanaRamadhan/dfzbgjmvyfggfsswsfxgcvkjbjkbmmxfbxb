/**
 * app.js — modul tunggal untuk seluruh halaman Tan's Rent Car.
 *
 * Menggantikan 6 salinan inline <script> yang sebelumnya harus di-hash
 * satu per satu di Content-Security-Policy. Dengan file eksternal,
 * `script-src 'self'` sudah cukup dan CSP tidak lagi rapuh.
 *
 * Semua fitur bersifat progressive enhancement: bila satu fitur gagal,
 * fitur lain tetap jalan dan konten tetap terlihat (tidak ada teks yang
 * tersembunyi permanen karena opacity:0).
 */
(function () {
  'use strict';

  /** Jalankan satu fitur tanpa mematikan fitur lainnya. */
  function guard(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error('[app.js:' + name + ']', err);
    }
  }

  /* ------------------------------------------------------------------ *
   * 1. Menu mobile
   * ------------------------------------------------------------------ */
  guard('menu', function () {
    var menuBtn = document.getElementById('mobileMenuBtn');
    var menu = document.getElementById('mobileMenu');
    if (!menuBtn || !menu) return;

    function setMenu(open) {
      menu.classList.toggle('active', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      var icon = menuBtn.querySelector('i');
      if (!icon) return;
      icon.classList.toggle('fa-bars', !open);
      icon.classList.toggle('fa-times', open);
    }

    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!menu.classList.contains('active'));
    });

    // Klik CTA di dalam menu mobile menutup menu sebelum berpindah anchor.
    var mobileCta = menu.querySelector('.mobile-cta');
    if (mobileCta) {
      mobileCta.addEventListener('click', function () {
        setMenu(false);
      });
    }

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('active')) return;
      if (menu.contains(e.target) || menuBtn.contains(e.target)) return;
      setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('active')) setMenu(false);
    });
  });

  /* ------------------------------------------------------------------ *
   * 2. Header saat scroll (rAF + passive, satu implementasi)
   * ------------------------------------------------------------------ */
  guard('header-scroll', function () {
    var header = document.querySelector('header');
    if (!header) return;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        // Kelas, bukan inline style: CSP style-src tanpa 'unsafe-inline'.
        header.classList.toggle('is-scrolled', window.scrollY > 50);
        ticking = false;
      });
    }, { passive: true });
  });

  /* ------------------------------------------------------------------ *
   * 3. Animasi reveal
   *
   * Elemen HANYA disembunyikan bila benar-benar berada di bawah viewport,
   * sehingga tidak ada kedipan dan tidak ada konten yang hilang ketika
   * JavaScript tidak berjalan.
   * ------------------------------------------------------------------ */
  guard('reveal', function () {
    var SELECTOR = [
      '.reveal',
      '.armada-card',
      '.paket-card',
      '.syarat-card',
      '.contact-info',
      '.contact-form-container',
      '#generalTerms'
    ].join(',');

    var targets = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    if (!targets.length) return;

    function show(el) {
      el.classList.remove('is-hidden');
      el.classList.add('is-visible');
    }

    if (!('IntersectionObserver' in window)) {
      targets.forEach(show);
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay'), 10) || 0;
        window.setTimeout(function () {
          show(el);
        }, delay);
        obs.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    targets.forEach(function (el, index) {
      var rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.9) {
        if (!el.hasAttribute('data-delay')) {
          el.setAttribute('data-delay', String((index % 4) * 100));
        }
        el.classList.add('is-hidden');
      }
      observer.observe(el);
    });
  });

  /* ------------------------------------------------------------------ *
   * 4. Karusel galeri (halaman beranda)
   * ------------------------------------------------------------------ */
  guard('carousel', function () {
    var track = document.getElementById('galleryTrack');
    var prev = document.getElementById('prevBtn');
    var next = document.getElementById('nextBtn');
    if (!track || !prev || !next) return;

    var wrapper = track.closest('.carousel-wrapper');
    var timer = null;

    function stepSize() {
      var first = track.querySelector('.gallery-item');
      if (!first) return track.clientWidth;
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return first.offsetWidth + gap;
    }

    function step(direction) {
      track.scrollBy({ left: direction * stepSize(), behavior: 'smooth' });
    }

    function atEnd() {
      return track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
    }

    function start() {
      if (timer) return;
      timer = window.setInterval(function () {
        if (atEnd()) track.scrollTo({ left: 0, behavior: 'smooth' });
        else step(1);
      }, 3000);
    }

    function stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    }

    next.addEventListener('click', function () { step(1); });
    prev.addEventListener('click', function () { step(-1); });

    if (wrapper) {
      wrapper.addEventListener('mouseenter', stop);
      wrapper.addEventListener('mouseleave', start);
      wrapper.addEventListener('focusin', stop);
      wrapper.addEventListener('focusout', start);
    }

    // Jangan jalan di tab background: hemat baterai dan CPU.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Putar otomatis hanya untuk halaman yang terlihat dan tanpa reduced-motion.
    if (!document.hidden && !reduceMotion) start();
  });

  /* ------------------------------------------------------------------ *
   * 5. Filter armada (halaman armada)
   * ------------------------------------------------------------------ */
  guard('fleet-filter', function () {
    var buttons = document.querySelectorAll('.filter-btn');
    if (!buttons.length) return;
    var cards = document.querySelectorAll('.armada-card');

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        Array.prototype.forEach.call(buttons, function (other) {
          other.classList.remove('active');
        });
        button.classList.add('active');

        var value = button.getAttribute('data-filter');
        Array.prototype.forEach.call(cards, function (card) {
          card.classList.remove('filter-anim');
          var show = value === 'all' || card.getAttribute('data-category') === value;
          card.classList.toggle('is-filtered-out', !show);
          if (show) {
            void card.offsetWidth; // paksa reflow agar animasi berjalan ulang
            card.classList.add('filter-anim');
          }
        });
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * 6. Akordion syarat & ketentuan (halaman persyaratan)
   * ------------------------------------------------------------------ */
  guard('accordion', function () {
    var items = document.querySelectorAll('.accordion-item');
    if (!items.length) return;

    Array.prototype.forEach.call(items, function (item) {
      var head = item.querySelector('.accordion-header');
      if (!head) return;
      head.addEventListener('click', function () {
        Array.prototype.forEach.call(items, function (other) {
          if (other !== item) other.classList.remove('active');
        });
        item.classList.toggle('active');
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * 7. Form booking (halaman kontak)
   *
   * Memperbaiki: tidak ada validasi panjang/format, tanggal boleh
   * terbalik, zona waktu salah (UTC vs WIB), dan window.open tanpa
   * noopener (reverse tabnabbing).
   * ------------------------------------------------------------------ */
  guard('booking', function () {
    var form = document.getElementById('bookingForm');
    if (!form) return;

    var ADMIN_PHONE = '6281375234626';
    var LIMITS = { nama: 60, kota: 40 };

    function field(id) {
      return document.getElementById(id);
    }

    /**
     * Buang karakter kontrol (termasuk newline) dan batasi panjang.
     * Mencegah pesan WhatsApp dipalsukan dengan baris/format tambahan.
     */
    function clean(value, max) {
      return String(value == null ? '' : value)
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
    }

    /** 0812xxxx | 62812xxxx | 812xxxx -> 62812xxxx, atau null bila tidak valid. */
    function normalizePhone(value) {
      var digits = String(value == null ? '' : value).replace(/\D/g, '');
      if (/^0\d{9,13}$/.test(digits)) return '62' + digits.slice(1);
      if (/^62\d{9,13}$/.test(digits)) return digits;
      if (/^8\d{8,12}$/.test(digits)) return '62' + digits;
      return null;
    }

    /** Tanggal hari ini menurut WIB (UTC+7), bukan UTC. */
    function todayWIB() {
      var now = new Date();
      return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }

    function showError(message) {
      var box = document.getElementById('formError');
      if (!box) {
        box = document.createElement('p');
        box.id = 'formError';
        box.setAttribute('role', 'alert');
        box.className = 'form-error';
        form.insertBefore(box, form.firstChild);
      }
      box.textContent = message; // textContent, bukan innerHTML
    }

    function clearError() {
      var box = document.getElementById('formError');
      if (box) box.textContent = '';
    }

    // --- Batas tanggal ---
    var startEl = field('tgl_mulai');
    var endEl = field('tgl_selesai');

    if (startEl && endEl) {
      startEl.min = todayWIB();
      endEl.min = todayWIB();

      var syncEnd = function () {
        if (startEl.value) {
          endEl.min = startEl.value;
          if (endEl.value && endEl.value < startEl.value) endEl.value = startEl.value;
        } else {
          endEl.min = todayWIB();
        }
      };

      // 'input' menangkap pengisian manual, bukan hanya saat blur.
      startEl.addEventListener('change', syncEnd);
      startEl.addEventListener('input', syncEnd);
      syncEnd();
    }

    // --- Kirim ke WhatsApp ---
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();

      var nama = clean(field('nama') && field('nama').value, LIMITS.nama);
      var kota = clean(field('kota') && field('kota').value, LIMITS.kota);
      var nowa = normalizePhone(field('nowa') && field('nowa').value);
      var mobil = field('mobil') ? field('mobil').value : '';
      var layanan = field('layanan') ? field('layanan').value : '';
      var mulai = startEl ? startEl.value : '';
      var selesai = endEl ? endEl.value : '';

      if (nama.length < 2) return showError('Nama minimal 2 karakter.');
      if (!nowa) return showError('Nomor WhatsApp tidak valid. Contoh: 08123456789.');
      if (!kota) return showError('Asal kota wajib diisi.');
      if (!mobil || !layanan) return showError('Pilih tipe mobil dan jenis layanan.');
      if (!mulai || !selesai) return showError('Tanggal mulai dan selesai wajib diisi.');
      if (selesai < mulai) return showError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      if (Date.parse(selesai) - Date.parse(mulai) > 365 * 864e5) {
        return showError('Durasi sewa maksimal 365 hari. Hubungi admin untuk kontrak lebih panjang.');
      }

      var pesan = [
        "Halo admin *TAN'S RENT CAR*, saya ingin mengecek ketersediaan:",
        '',
        'Nama Lengkap: ' + nama,
        'No. WhatsApp: ' + nowa,
        'Asal Kota: ' + kota,
        'Tipe Mobil: ' + mobil,
        'Jenis Layanan: ' + layanan,
        'Tanggal Mulai: ' + mulai,
        'Tanggal Selesai: ' + selesai,
        '',
        'Mohon informasi ketersediaan dan rincian harganya. Terima kasih!'
      ].join('\n');

      var url = 'https://wa.me/' + ADMIN_PHONE + '?text=' + encodeURIComponent(pesan);
      if (url.length > 3800) {
        return showError('Data terlalu panjang. Mohon ringkas kembali.');
      }

      // Anchor + rel="noopener noreferrer": menghormati rel DAN tidak
      // terkena popup blocker (window.open + noopener selalu mengembalikan null).
      var link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    });
  });
})();

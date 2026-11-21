/**
 * Inisialisasi Google Analytics (gtag).
 * Dipisah dari HTML agar CSP cukup memakai `script-src 'self'` dan tidak
 * perlu memelihara hash inline script di 6 halaman.
 */
window.dataLayer = window.dataLayer || [];

function gtag() {
  window.dataLayer.push(arguments);
}

gtag('js', new Date());
gtag('config', 'G-ZB8KFZRFWY');

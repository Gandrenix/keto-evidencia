/* Aplica el tema (claro/oscuro) antes del primer pintado para evitar el parpadeo. Archivo propio: la CSP no permite scripts en línea. */
;(function () {
  try {
    var t = localStorage.getItem('keto.theme')
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', t)
    var m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', t === 'dark' ? '#06101e' : '#eef3f5')
  } catch (e) {
    /* sin almacenamiento: se usa el tema claro por defecto */
  }
})()

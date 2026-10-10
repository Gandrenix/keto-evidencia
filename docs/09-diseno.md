# 09 · Diseño de la interfaz

Rediseño completo de la interfaz (2026-10-10). Superficie **«Operate»** (herramienta de trabajo): manda la claridad; el diseño
aporta tipografía, paleta, densidad y un gesto propio, no la estructura de la página.

## Skills usadas (carpeta `claude skills`) y qué se tomó de cada una

| Skill | Qué se aplicó |
|-------|---------------|
| `impeccable` (referencias `craft-floor`, `new-work`, `mode-operate`) | Modo *Operate*; lista de **prohibiciones** (sin etiquetas sobre los títulos, sin glifos Unicode como iconos, sin texto con degradado, sin bordes laterales de color en alertas, sin sombras de neón); verificación en una sola ronda por escritorio y móvil. *No se ejecutó su launcher: descarga un binario de internet y no se autorizó; se usaron sus referencias leídas directamente.* |
| `ui-ux-pro-max` | Generador de sistema de diseño (se verificó el ajuste: propuso un estilo «biofílico» verde y un patrón de narrativa por scroll que **no** encajan con una herramienta de trabajo; se descartó y se usó solo la regla de prioridades: accesibilidad, táctil, tipografía y color). |
| `make-interfaces-feel-better`, `emil-design-eng` | Radios concéntricos, `scale(0.96)` al pulsar, `ease-out` fuerte, números tabulares, `text-wrap: balance/pretty`, sin `transition: all`, animar solo `transform`/`opacity`, no animar acciones frecuentes. |
| `accessible-animation`, `60fps-animation` | `prefers-reduced-motion` por niveles (no un interruptor total), duración `0.01ms` en vez de `0s`, apertura de paneles con `grid 0fr → 1fr` (sin animar alto), brillo de carga con `transform`. |
| `mobile-principles` | Objetivos táctiles de 44 px, hover solo como mejora (`@media (hover: hover)`), acción principal en la mitad inferior (barra de selección fija abajo), `viewport-fit=cover` y márgenes de zona segura, campos de 16 px (sin zoom en iOS). |
| `design-audit` | Auditoría estática (`audit.py`): **1 crítico corregido** (`outline: none` en campos), duraciones consolidadas a 5 valores, sin desenfoque decorativo, citas en estilo Vancouver (sin hilera de puntos medios). Aceptados con motivo: intercambio de iconos Check/Plus (acción de bajo costo), temporizador de «copiado» y de seguridad del reveal (no son animación), brillo de carga infinito (indicador esencial, se apaga con reducir movimiento). |

## Dirección

- **Escena de uso:** estudiantes y profesionales en un aula con proyector y en el celular, a cualquier hora. Por eso hay **tema claro y oscuro**
  (sigue al sistema, con interruptor que se recuerda). El claro es el de lectura y proyector; el oscuro conserva la marca original.
- **Marca conservada:** azul marino, verde azulado y ámbar. En claro el verde se profundiza (`#0A7F70`, 4,9:1 sobre blanco); en oscuro se mantiene vivo.
- **Tipografía:** *Atkinson Hyperlegible Next* (cuerpo; diseñada para máxima legibilidad, su cero con barra distingue 0 de O en cifras clínicas),
  *Bricolage Grotesque* (títulos), *JetBrains Mono* (solo ecuaciones). Alojadas con la app (`@fontsource`), sin peticiones a terceros.
- **Gesto propio:** la **pirámide de evidencia**. Cada artículo lleva su nivel de diseño marcado en una pirámide de 5 niveles (cima = revisiones
  sistemáticas), más una leyenda «Cómo leer el nivel de evidencia». Es información, no decoración.
- **Estructura:** riel lateral de pasos con estado (hecho / actual / pendiente) en escritorio; barra superior con tira de pasos deslizable en móvil.
  El número de cada paso comunica secuencia real, no decoración.
- **Hoja de entrega:** la ficha se muestra como un papel blanco aun en tema oscuro, idéntico a lo que se imprime.

## Assets y licencias

| Asset | Fuente | Licencia |
|-------|--------|----------|
| Pictogramas de los casos (obesidad, diabetes, epilepsia, hígado) | **Health Icons** vía API de Iconify (`src/assets/health/`) | MIT |
| Iconos de interfaz | **Lucide** (`lucide-react`), un solo grosor de trazo | ISC |
| Logo, pirámide, ilustración de estado vacío | Dibujados para este proyecto (SVG) | propia |
| Fuentes | Fontsource (Atkinson Hyperlegible Next, Bricolage Grotesque, JetBrains Mono) | OFL |

No se usó Wikimedia Commons: no hizo falta; sus ilustraciones traen licencias con atribución heterogéneas.

## Movimiento (ligero, solo `transform` y `opacity`)

Entrada de secciones al hacer scroll (falla abierto: contenido visible por defecto + temporizador de seguridad), tarjetas de resultados con
escalonado corto, marca de selección que aparece con escala suave, panel del motivo que se abre con `grid`, brillo de carga, anillo de foco y
estados de color. Duraciones: 160 / 260 / 400 / 520 ms. Con «reducir movimiento» no se oculta nada y las transiciones se acortan.

## Verificación

Capturas con Edge sin interfaz por sección, en 1280×800 y 390×844 (táctil, ×2), claro y oscuro: sin desborde horizontal; PDF real de la ficha;
`reduce` emulado. Herramienta: `scripts/shots.ts` y `scripts/print-pdf.ts`.

# No More NA

Extensión de navegador (Chrome/Edge) que reemplaza automáticamente colores guinda/vino por verdes mexicanos en todos los sitios web.

## Mapeo de colores

| Original | Reemplazo | Descripción |
|----------|-----------|-------------|
| `#9B2247` | `#00873E` | Guinda claro → Verde brillante |
| `#611232` | `#006847` | Guinda → Verde bandera |
| `#4E0E28` | `#005c3a` | Guinda intermedio → Verde medio |
| `#3A0B1E` | `#004d34` | Guinda oscuro → Verde oscuro |
| `#3A0B1F` | `#004d34` | Guinda oscuro variante → Verde oscuro |

## Instalación

1. Clonar o descargar este repositorio
2. Abrir `chrome://extensions` (o `edge://extensions`)
3. Activar **Modo de desarrollador**
4. Clic en **Cargar extensión sin empaquetar**
5. Seleccionar la carpeta `no-more-na`

## Uso

- La extensión se activa automáticamente en todos los sitios web
- Usa el popup (clic en el icono) para activar/desactivar
- El badge del icono muestra **ON** (verde) o **OFF** (gris)

## Estructura

```
no-more-na/
├── manifest.json          # Manifest V3
├── background.js          # Service worker: toggle y badge
├── content.js             # Motor de reemplazo de colores (3 capas)
├── lib/
│   └── color-utils.js     # Parsing y matching de colores
├── popup/
│   ├── popup.html         # UI del toggle
│   ├── popup.css          # Estilos del popup
│   └── popup.js           # Lógica del popup
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── test.html              # Página de prueba
```

## Cómo funciona

El motor de reemplazo opera en 3 capas:

1. **Intercepción Shadow DOM** — Monkey-patch de `attachShadow` para interceptar shadow roots antes que cualquier script
2. **Escaneo de hojas de estilo** — Itera `document.styleSheets`, reemplaza valores en reglas CSS y maneja hojas cross-origin vía fetch
3. **Recorrido del DOM** — TreeWalker procesa estilos inline, atributos SVG (`fill`, `stroke`) y atributos HTML legacy (`bgcolor`, `color`)

Un `MutationObserver` mantiene los reemplazos en contenido dinámico.

## Formatos soportados

- Hex: `#611232`, `#3a0b1f`
- RGB: `rgb(97, 18, 50)`
- RGBA: `rgba(97, 18, 50, 0.5)`
- CSS moderno: `rgb(97 18 50 / 0.5)`
- Variables CSS: `--brand-color: #611232`

## Limitaciones

- Canvas: colores dibujados por JS no se reemplazan
- Imágenes raster (PNG/JPG): no se modifican
- SVG cargados via `<img src>`: opacos al DOM

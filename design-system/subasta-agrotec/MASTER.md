# Design System Master File — Subasta Agrotec

> Generado con UI/UX Pro Max (`search.py --design-system`, estilo *Minimalism & Swiss Style*)
> y **adaptado a la identidad de marca de Agrotec**. Ver "Adaptaciones" abajo.
> Al construir una página: si existe `design-system/subasta-agrotec/pages/[page].md`, sus reglas
> tienen prioridad; si no, seguir este Master.

**Project:** Subasta Agrotec · **Category:** Productivity Tool / Internal Enterprise Dashboard
**Dials:** Variance 3/10 (minimal) · Motion 3/10 (subtle) · Density 7/10 (standard)
**Style base:** Minimalism & Swiss Style — *"Best for enterprise apps, dashboards, SaaS, professional tools"*

---

## Adaptaciones vs. salida cruda de UI/UX Pro Max (con justificación)

| Recomendación de la skill | Decisión | Motivo |
|---|---|---|
| Primary teal `#0D9488` + accent naranja `#EA580C` | **Se conserva el verde de marca `agrotec` (#00753b/#005a2b)** | La paleta corporativa de Agrotec es identidad de marca (FASE 8/9: preservar). Se adopta la *estructura* Swiss (neutros + estados semánticos), no el color de ejemplo. |
| Body font *Plus Jakarta Sans* / *Lexend* | **Se conserva Inter** | Inter ya está cargada y es la sans legible de nivel enterprise que la propia skill endosa; cambiarla es churn de marca sin beneficio y suma una fuente. |
| Pattern "Product Demo + Features" (landing) | **Descartado** | Es un patrón de landing marketing; esta es una app interna autenticada, no una landing. |
| Motion vía GSAP/ScrollTrigger | **CSS transitions/keyframes existentes** | No se añade GSAP solo por estética (FASE 9). Se mantiene 150–250ms + `prefers-reduced-motion`. |
| Dark mode "supported" | **Light-only (por ahora)** | Herramienta interna; dark mode queda como pendiente para no expandir el alcance del overhaul. |

---

## Tokens (implementados con Tailwind — fuente única de verdad)

### Color — roles semánticos
| Rol | Token Tailwind | Uso |
|---|---|---|
| Marca / Primary | `agrotec-800` (hover `agrotec-900`, active `agrotec-950`) | Acciones primarias, activo de navegación, énfasis de marca |
| Primary sutil | `agrotec-50/100` + texto `agrotec-800` | Botón secundario, chips de marca, fondos suaves |
| Texto principal | `gray-900` | Titulares y cuerpo |
| Texto secundario | `gray-600` | Descripciones (contraste ≥ 4.5:1 sobre blanco) |
| Texto terciario/meta | `gray-500` mínimo | Labels, metadatos. **Nunca `gray-400` para texto legible** (< 4.5:1) |
| Superficie base | `gray-50` | Fondo de app |
| Card | `white` + borde `gray-200` | Contenedores |
| Éxito | `emerald-600` / fondo `emerald-50` borde `emerald-200` | Disponible, confirmaciones |
| Advertencia | `amber-600` / `amber-50` `amber-200` | Cerrado, admin, precaución |
| Peligro | `red-600`/`rose-600` / `red-50` | Destructivo, errores |
| Info | `blue-600` / `blue-50` | Neutro informativo |

### Radius — escala estandarizada (elimina el "zoo" de radios)
| Elemento | Radio | Clase |
|---|---|---|
| Controles (botón, input, badge cuadrado) | 8px | `rounded-lg` |
| Cards y contenedores | 16px | `rounded-2xl` |
| Modal | 16px | `rounded-2xl` |
| Pills / badges de estado / avatares | full | `rounded-full` |
| Hero (excepción intencional) | 24px | `rounded-3xl` |

### Sombras — escala reducida (Swiss: "sharp shadows if any")
| Nivel | Uso | Clase |
|---|---|---|
| Base card | reposo | `shadow-sm` |
| Hover / elevado | cards interactivas | `shadow-md` |
| Overlays | modal, dropdown, toast | `shadow-lg` |
| — | evitar `shadow-xl`/`shadow-2xl` salvo modal/hero | |

### Espaciado (density 7/10)
`4 · 8 · 16 · 24 · 32 · 48 · 64` (px). Padding de card estándar `p-5`/`p-6`; secciones `space-y-6/8`.

### Tipografía
- Familia: **Inter** (heading + body). Mono del sistema para IDs/montos (`font-mono`).
- Base 16px, line-height 1.5. **Mínimo de texto legible: 12px** (`text-xs`). Los micro-labels `text-[10px]` se elevan a `text-[11px]` y se reservan solo para etiquetas en mayúsculas.
- Jerarquía: `text-2xl/3xl` black (h1) · `text-lg/xl` bold (h2/h3) · `text-sm` cuerpo · `text-xs` meta.

---

## Reglas de componente

- **Button:** `cursor-pointer` siempre (los `<button>` no lo traen por defecto); estados hover/active/disabled; `focus-visible:ring-2 ring-offset-2`. Variantes: primary (verde), secondary, outline, danger, ghost, success.
- **Input:** label visible asociado (`htmlFor`), `aria-invalid` + `aria-describedby` al error/helper; estado error con borde + texto rojo; disabled atenuado.
- **Modal:** `role="dialog"` `aria-modal="true"` `aria-labelledby`/`aria-describedby`; **focus trap** y **restauración de foco** al cerrar; cerrar con Escape y click en backdrop; botón cerrar con `aria-label`.
- **Toast:** región `aria-live="polite"` (éxito/info) y `role="alert"` (error); botón cerrar con `aria-label`.
- **Spinner:** `role="status"` + texto `sr-only` cuando no hay label visible.
- **Cards clickeables:** `cursor-pointer`, `hover:shadow-md transition-shadow`, foco visible; no usar solo hover para transmitir estado.

---

## Motion
- Transiciones 150–250ms, `ease-out`. Micro-interacciones sutiles (hover elevación mínima, `active:scale-[0.99]`).
- **`prefers-reduced-motion: reduce`** → desactivar animaciones/transiciones y renderizar estado final.
- No animar `width`/`height`/`top/left` (usar `transform`/`opacity`).

## Anti-patterns (NO usar)
- ❌ Emojis como iconos → usar SVG (Lucide, ya instalado).
- ❌ Texto con contraste < 4.5:1 (gray-400 sobre blanco).
- ❌ Cambios de estado instantáneos (0ms) o sin foco visible.
- ❌ Zoo de radios/sombras/colores para el mismo problema.
- ❌ Exceso de gradientes/glassmorphism; hover que desplaza el layout.

## Pre-Delivery Checklist (UI/UX Pro Max)
- [ ] Sin emojis como iconos (SVG/Lucide)
- [ ] `cursor-pointer` en todo lo clickeable
- [ ] Hover con transición 150–300ms
- [ ] Contraste de texto ≥ 4.5:1
- [ ] Foco visible para navegación por teclado
- [ ] `prefers-reduced-motion` respetado
- [ ] Responsive: 375 · 430 · 768 · 1280 · 1440px
- [ ] Sin scroll horizontal en móvil ni contenido tapado por barras fijas

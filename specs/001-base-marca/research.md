# Research & Architecture Decisions: F01 — Base del Proyecto y Tokens de Identidad Visual Agrotec

## 1. Decisiones de Diseño y Marca

### Decisión 1: Servir la tipografía Gabarito como archivo propio WOFF2
- **Contexto:** La guía de marca exige Gabarito bajo licencia SIL OFL 1.1 servida localmente sin Light (utiliza Regular 400 y Bold 700).
- **Alternativas consideradas:**
  1. Enlace CDN a Google Fonts: Descartado por depender de conexión externa y violar la guía de marca.
  2. Fuente local WOFF2 con licencia SIL OFL: **Adoptada**. El archivo `public/fonts/gabarito-latin.woff2` (34 KB) cubre los pesos 400 a 900 con rendimiento instantáneo y soporte offline.

### Decisión 2: Tokens centralizados en archivo único de CSS
- **Contexto:** Se requiere que ningún componente defina colores o fuentes sueltas.
- **Alternativas consideradas:**
  1. Clases utilitarias dispersas de Tailwind: Propenso a drift visual y violación de la guía corporativa.
  2. Hoja maestra `marca-agrotec.css` consumida por CSS y mapeada a Tailwind: **Adoptada**. Garantiza una única fuente de verdad (`--marca-verde`, `--marca-rojo`, etc.) compatible tanto con CSS puro como con Tailwind.

### Decisión 3: Framework de pruebas liviano integrado con Vite (Vitest)
- **Contexto:** El proyecto utiliza Vite 6 y React 19. Se necesita un test runner rápido para Spec-Driven Development.
- **Alternativas consideradas:**
  1. Jest: Requiere configuración compleja con Babel/ESM en Vite.
  2. Vitest: **Adoptado**. Comparte la configuración y pipeline de Vite, soporta TypeScript nativo y ejecuta pruebas en milisegundos.

---

## 2. Validación de Accesibilidad (a11y)

- **Contraste de Botón Primario:** Texto `#FFFFFF` sobre fondo `#1C5A34` = Ratio 8.1:1 (Cumple ampliamente nivel AAA, mínimo 4.5:1).
- **Contraste de Botón Secundario:** Texto `#1C5A34` sobre fondo `#FFFFFF` = Ratio 8.1:1 (Cumple AAA).
- **Texto Principal:** `#262626` sobre `#F5F5F5` y `#FFFFFF` = Ratio 13.9:1 (Cumple AAA).
- **Texto Secundario:** `#6D6D6D` sobre `#FFFFFF` = Ratio 4.6:1 (Cumple AA).
- **Foco Visible:** `:focus-visible` con outline de 2 px en color de marca `#1C5A34` y offset de 2 px.

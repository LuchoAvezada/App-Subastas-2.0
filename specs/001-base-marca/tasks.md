# Implementation Tasks: F01 — Base del Proyecto y Tokens de Identidad Visual Agrotec

**Feature Branch**: `001-base-marca`  
**Specification**: [spec.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/specs/001-base-marca/spec.md)  
**Implementation Plan**: [plan.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/specs/001-base-marca/plan.md)  

---

## Phase 1: Setup & Assets Oficiales de Marca

- [x] **T001**: Importar logo corporativo oficial en `public/brand/logo-agrotec.svg` y favicon oficial en `public/favicon.svg`.
- [x] **T002**: Integrar la fuente oficial Gabarito en `public/fonts/gabarito-latin.woff2` acompañada de su licencia `public/fonts/OFL-gabarito.txt`.

---

## Phase 2: Foundational (Capa Central de Tokens)

- [x] **T003**: Consolidar la hoja maestra de estilos y tokens en `src/marca-agrotec.css` y `app/marca-agrotec.css`.
- [x] **T004**: Sincronizar `tailwind.config.js` y `src/index.css` para exponer los colores corporativos (`marca.verde`, `marca.rojo`, etc.) y la tipografía `Gabarito`.

---

## Phase 3: User Story 1 & 2 — Componentes UI de Marca

- [x] **T005** [US2]: Alinear `src/components/ui/Button.tsx` con las variantes obligatorias: `primary` verde `#1C5A34` con texto blanco, y `secondary` blanca con borde `#BEBEBE` y texto `#1C5A34`.
- [x] **T006** [US2]: Alinear `src/components/ui/Badge.tsx` con los tokens de color corporativos (`agrotec`, `danger`, `warning`, `neutral`).
- [x] **T007** [US2]: Implementar en `src/components/layout/Header.tsx` el fondo blanco y borde izquierdo verde de 4 px (`#1C5A34`).
- [x] **T008** [US1]: Actualizar `src/components/layout/Sidebar.tsx` con el logo vectorial oficial, navegación activa (`#E8F0EB`, `#1C5A34`, barra izquierda de 4 px) y widget de cuenta regresiva sobre tarjeta limpia blanca sin degradados oscuros.
- [x] **T009** [US1]: Actualizar `src/pages/LoginPage.tsx` para eliminar degradados oscuros de fondo, adoptando fondo neutro `#F5F5F5`, tarjeta blanca con borde `#E4E4E4`, logo oficial y titular en verde corporativo.

---

## Phase 4: User Story 3 — Pruebas, Lint y Compilación

- [x] **T010** [US3]: Configurar `vitest` y suite de pruebas en `package.json` (`"test": "vitest run"`).
- [x] **T011** [US3]: Crear y ejecutar pruebas unitarias en `tests/domain.test.ts`.
- [x] **T012** [US3]: Ejecutar y validar linter Oxlint con `npm.cmd run lint`.
- [x] **T013** [US3]: Validar integridad de tipos y compilación de producción con `npm.cmd run build`.

---

## Phase 5: Verificación en Pantalla y Cierre

- [x] **T014**: Validar visualmente en navegador integrado la pantalla de `/login` y navegación general (escritorio y vista móvil).
- [x] **T015**: Registrar cierre en `docs/sdd/backlog.md`, `docs/ejecucion-local.md` y memoria persistente.

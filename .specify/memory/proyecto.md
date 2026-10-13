# Memoria del Proyecto — App Subastas 2.0 (Agrotec S.A.)

## Contexto y Estado General
- **Proyecto:** App Subastas 2.0 (Agrotec S.A. - Grupo Agrihold)
- **Fase actual:** Puesta en marcha finalizada. Lista para iniciar **F01** con el flujo SDD.
- **Repositorio:** Git inicializado localmente. Spec Kit configurado con extensión `git` y gancho `before_specify` activo (`NNN-nombre-corto`).
- **Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 3.4 + Supabase + Vitest + Oxlint.

## Estado de Puesta en Marcha (Pasos 2.1 a 2.5)
- [x] **2.1 Spec Kit & Git:** Inicializado con gancho `before_specify` activo.
- [x] **2.2 Visión y Preguntas:** [vision.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/docs/sdd/vision.md) y [preguntas-abiertas.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/docs/sdd/preguntas-abiertas.md) (Q-01 a Q-06 resueltas).
- [x] **2.3 Constitución:** [constitution.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/.specify/memory/constitution.md) ratificada con principios P1 a P9 (incluyendo cantidad de ofertas visible por item).
- [x] **2.4 Base del Proyecto & Marca:** Tokens en `src/marca-agrotec.css`, fuente Gabarito WOFF2 con SIL OFL, logo corporativo, `docs/ejecucion-local.md`, Vitest instalado y pruebas pasando, Oxlint y TypeScript verificados sin errores.
- [x] **2.5 Backlog:** [backlog.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/docs/sdd/backlog.md) con features F01 a F08 ordenadas por riesgo y dependencia.

## Backlog de Features
- **F01 - Base del Proyecto y Tokens de Identidad Visual Agrotec:** Listo para spec.
- **F02 - Autenticación por Cédula y Seguridad de Acceso:** En espera (depende de F01).
- **F03 - Gestión de Activos y Carga de Fotos (Panel Admin):** En espera (depende de F01, F02).
- **F04 - Catálogo de Activos, Visibilidad de Ofertas y Pujas:** En espera (depende de F01, F02, F03).
- **F05 - Mis Ofertas y Cancelación de Oferta con Veto:** En espera (depende de F04).
- **F06 - Procesamiento de Ganadores, Tope por Categoría y Desempate:** En espera (depende de F04).
- **F07 - Publicación de Resultados y Reasignación por Desistimiento:** En espera (depende de F06).
- **F08 - Carga Masiva de Colaboradores y Configuración de Subasta:** En espera (depende de F02).

## Trucos Técnicos y Entorno Local
- **PowerShell en Windows:** Utilizar `npm.cmd` en lugar de `npm` para evitar restricciones de `ExecutionPolicy`.
- **Comandos habituales:**
  - `npm.cmd run dev`: Servidor Vite de desarrollo en `http://localhost:5173`.
  - `npm.cmd test`: Suite de pruebas unitarias con Vitest.
  - `npm.cmd run lint`: Linter Oxlint.
  - `npm.cmd run build`: Compilación y verificación de tipos TypeScript.
- **Zona Horaria y Fechas:**
  - `America/Asuncion` para visualización en pantallas y temporizadores (`date-fns-tz`).
  - UTC en persistencia y consultas con Supabase.
- **Moneda:** Formato en USD (ejemplo: `USD 150.00`).

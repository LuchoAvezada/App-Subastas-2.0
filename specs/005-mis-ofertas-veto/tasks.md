# Tasks: F05 — Mis Ofertas y Cancelación con Veto de Reincidencia

**Branch**: `005-mis-ofertas-veto` | **Fecha**: 2026-10-13 | **Estado**: Completada

---

## Fase 1: Pruebas Unitarias de Cancelación y Veto (TDD)
- [x] **T001**: Crear `tests/mis-ofertas.test.ts` con cobertura de:
  - Registro y verificación de vetos por activo y colaborador.
  - Bloqueo de cancelación cuando la subasta está expirada/cerrada.
  - Verificación de que una cancelación genera un veto irreversible para el activo pero no para otros.
  - Imposibilidad de ofertar en un activo vetado.

---

## Fase 2: Implementación de Lógica de Vetos y Cancelación
- [x] **T002**: Crear `src/lib/vetos.ts` con funciones puras para manipulación y persistencia de vetos.
- [x] **T003**: Extender `src/hooks/useOfertas.ts` con el método `cancelarOferta(idOferta, activo)`.

---

## Fase 3: Interfaz de Usuario en Mis Ofertas y Catálogo
- [x] **T004**: Actualizar `src/pages/MisOfertasPage.tsx`:
  - Agregar columna de acción con botón institucional "Cancelar Oferta".
  - Deshabilitar el botón si la subasta está cerrada (`countdown.isExpired`).
  - Implementar modal de confirmación con advertencia de veto permanente.
  - Agregar sección de visualización de ofertas canceladas / vetadas.
- [x] **T005**: Actualizar `src/components/activos/ActivoCard.tsx` y `src/components/ofertas/OfertaModal.tsx`:
  - Integrar detección de veto por activo.
  - Mostrar estado "Oferta cancelada (Veto)" y deshabilitar posturas en activos vetados.

---

## Fase 4: Calidad, Compilación y Verificación Visual
- [x] **T006**: Ejecutar `npm.cmd test` verificando que todas las pruebas pasen (40/40 tests).
- [x] **T007**: Ejecutar `npm.cmd run lint` y `npm.cmd run build` con 0 errores.
- [x] **T008**: Verificación con `browser_subagent` en `/mis-ofertas` y modal de cancelación.
- [x] **T009**: Actualizar `docs/sdd/backlog.md`, commitear, fusionar a `main` y sincronizar con GitHub.

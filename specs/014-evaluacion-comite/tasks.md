# Tasks: F14 — Empate Total: Evaluación del Comité

**Feature**: F14  
**Fecha**: 2026-11-02  
**Estado**: Desplegada (2026-11-02), falta la prueba manual  

---

## Fase 1: Pruebas
- [x] **T001**: `tests/adjudicacion.test.ts`: el empate total deja el activo en evaluación.
- [x] **T002**: `tests/explicacion-ofertas.test.ts`: empatados en evaluación, decisión del comité y criterio de registro anterior a F14.
- [x] **T003**: SQL en PGlite (00 de HEAD + 24, y 00 nuevo + 24): evaluación, tope sobre un empatado, empate perdido por tope, publicación bloqueada, resolución válida e inválida, desistimiento con empate, auditoría y permisos.

---

## Fase 2: SQL
- [x] **T004**: `sql/24_evaluacion_comite.sql` y réplica en `sql/00_instalacion_completa.sql`.

---

## Fase 3: Interfaz
- [x] **T005**: Resultados: fila resaltada, aviso para el admin, botón y modal "Resolver"; totales sin activos en evaluación.
- [x] **T006**: PDF con la sección de evaluación; Excel con los empatados como "Pendiente".
- [x] **T007**: Aviso al procesar ganadores cuando hay empates.

---

## Fase 4: Calidad y Despliegue
- [x] **T008**: `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build` sin errores (2026-11-02: 143 pruebas). PDF verificado en el navegador con datos de ejemplo; la pantalla de Resultados no se probó con sesión.
- [x] **T009**: Aplicar `sql/24` en el NUC y publicar el build (2026-11-02: `sql/24` registrada en `sub_migraciones`; frontend `a4e40b6` publicado).
- [ ] **T010**: Prueba manual de los criterios de aceptación de `spec.md` §4.

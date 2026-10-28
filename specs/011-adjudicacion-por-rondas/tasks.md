# Tasks: F11 — Adjudicación por Rondas

**Feature**: F11  
**Fecha**: 2026-10-26  
**Estado**: Desplegada (2026-10-26), falta la prueba manual  
**Redactado**: 2026-10-28, a partir de la implementación (commit `d9f0dcd`).  

---

## Fase 1: Pruebas
- [ ] **T001**: Prueba automatizada de `procesar_ganadores` en PostgreSQL (PGlite, como en F09) que cubra los criterios de aceptación de `spec.md` §4. No se hizo al implementar.

---

## Fase 2: SQL
- [x] **T002**: Crear `sql/19_adjudicacion_por_rondas.sql`:
  - `procesar_ganadores()` solo sobre activos Disponibles y sin borrar rondas anteriores;
  - precarga del tope por categoría con los ganadores existentes;
  - pausa de la publicación si hubo ganadores nuevos;
  - `procesar_ganadores(p_token)` rechaza antes del cierre.
- [x] **T003**: Replicar en `sql/00_instalacion_completa.sql`.

---

## Fase 3: Interfaz
- [x] **T004**: Actualizar los textos del modal de "Procesar Ganadores" en `PanelEvaluacion.tsx`.

---

## Fase 4: Calidad y Despliegue
- [x] **T005**: `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build` sin errores (comprobado otra vez el 2026-10-28: 133 pruebas).
- [x] **T006**: Aplicar `sql/19` en el NUC (registrada en `sub_migraciones` el 2026-10-26) y publicar el build.
- [ ] **T007**: Prueba manual de los criterios de aceptación de `spec.md` §4.

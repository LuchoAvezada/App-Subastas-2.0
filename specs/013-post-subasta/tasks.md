# Tasks: F13 — Post-subasta

**Feature**: F13  
**Fecha**: 2026-10-29  
**Estado**: Implementada, pendiente de despliegue  

---

## Fase 1: Pruebas
- [x] **T001**: `tests/explicacion-ofertas.test.ts`: ganador, pérdida por monto y por cada desempate, tope, bloqueado, desistimiento, desierto y pendiente.
- [x] **T002**: En `tests/adjudicacion.test.ts`, criterio "GANADO POR TOPE DE CATEGORIA" cuando el mejor postor ya ganó otro activo de la categoría.

---

## Fase 2: SQL
- [x] **T003**: Crear `sql/22_post_subasta.sql`: criterio de tope en `procesar_ganadores()` y `leer_datos('desistimientos')`. Probada en PGlite sobre el `00` anterior (como el NUC) y sobre el nuevo: sin la 22 el caso de tope sale "GANADO POR ANTIGUEDAD"; con la 22, "GANADO POR TOPE DE CATEGORIA".
- [x] **T004**: Replicar en `sql/00_instalacion_completa.sql`.

---

## Fase 3: Lógica e Interfaz
- [x] **T005**: `adjudicacion.ts`: criterio de tope; `explicacionOfertas.ts` nuevo.
- [x] **T006**: `reportesPostSubasta.ts`: PDF del comité y Excel de ofertas.
- [x] **T007**: Catálogo solo con Disponibles.
- [x] **T008**: Resultados: filtro por categoría, totales solo admin, botones nuevos; quitar los CSV.

---

## Fase 4: Calidad y Despliegue
- [x] **T009**: `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build` sin errores (2026-10-29: 139 pruebas). PDF y Excel generados en el navegador con datos de ejemplo; las pantallas no se probaron con sesión (el entorno de desarrollo apunta a Supabase en la nube).
- [ ] **T010**: Aplicar `sql/22` en el NUC (✅ 2026-11-01, junto con la 23 del veto P9) y publicar el build (pendiente).
- [ ] **T011**: Prueba manual de los criterios de aceptación de `spec.md` §4.

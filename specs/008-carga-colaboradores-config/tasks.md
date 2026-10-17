# Tasks: F08 — Carga Masiva de Colaboradores y Configuración de Subasta

**Feature**: F08  
**Fecha**: 2026-10-16  
**Estado**: Ready  

---

## Fase 1: Pruebas Unitarias (TDD)
- [ ] **T001**: Crear `tests/colaboradores.test.ts` con cobertura de:
  - Rechazo por fila: cédula vacía, inválida o repetida; nombre faltante o ilegible; fecha inexistente; cargo inexistente; habilitado o rol inválidos; rol Administrador.
  - Sin valores por defecto inventados para `fecha_ingreso` e `id_cargo`.
  - Conservación del rol y la habilitación de los existentes cuando el CSV no los trae; no se puede quitar el rol Administrador.
  - Clasificación en nuevos, a actualizar y sin cambios.
  - Normalización de fechas `DD/MM/AAAA` y `AAAA-MM-DD`.
  - Conversión de hora de Asunción a UTC independiente de la zona del equipo.
  - Filtros combinados, búsqueda sin acentos y orden por campo.

---

## Fase 2: Lógica Pura
- [ ] **T002**: Crear `src/lib/colaboradores.ts` (`normalizarEncabezado`, `normalizarFecha`, `validarNomina`, `filtrarColaboradores`, `ordenarColaboradores`).
- [ ] **T003**: Agregar `asuncionAUtcIso()` a `src/lib/utils.ts`.
- [ ] **T004**: Ejecutar `npm.cmd test` hasta que pasen todas las pruebas.

---

## Fase 3: SQL
- [ ] **T005**: Crear `sql/13_sincronizacion_config.sql` (publicación Realtime idempotente de `sub_app_config`).
- [ ] **T006**: Replicarlo en `sql/00_instalacion_completa.sql`.

---

## Fase 4: Interfaz
- [ ] **T007**: Crear `src/components/admin/ImportarColaboradoresCsv.tsx` (instrucciones, códigos de cargo, reporte previo, confirmación y resultado).
- [ ] **T008**: Actualizar `src/components/admin/ColaboradoresList.tsx` (resumen, filtros con conteos, búsqueda sin acentos, orden por encabezado, fecha `DD/MM/AAAA` con antigüedad).
- [ ] **T009**: Actualizar `src/components/admin/ConfigSubasta.tsx` (hora de Asunción → UTC y estado derivado del selector).

---

## Fase 5: Calidad y Verificación
- [ ] **T010**: `npm.cmd test`, `npm.cmd run lint` y `npm.cmd run build` sin errores.
- [ ] **T011**: Verificar en el navegador integrado `/admin/colaboradores` (filtros, orden, reporte del CSV sin confirmar la importación) y `/admin/config`, en escritorio y en móvil.
- [ ] **T012**: Actualizar `docs/sdd/backlog.md`, `docs/sdd/preguntas-abiertas.md` (Q-07) y `docs/ejecucion-local.md`.

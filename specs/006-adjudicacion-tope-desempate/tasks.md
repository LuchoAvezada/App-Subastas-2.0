# Tasks: F06 — Procesamiento de Ganadores, Tope por Categoría y Desempate

**Feature**: F06  
**Fecha**: 2026-10-14  
**Estado**: En Ejecución  

---

## Fase 1: Pruebas Unitarias de Adjudicación (TDD)
- [x] **T001**: Crear `tests/adjudicacion.test.ts` con casos de prueba para:
  - Adjudicación simple por mayor oferta.
  - Desempate por nivel de jerarquía (menor nivel gana ante empate de monto).
  - Desempate por fecha de ingreso / antigüedad (fecha más remota gana ante empate de monto y jerarquía).
  - Desempate por llegada de oferta ante igualdad absoluta.
  - Tope de equidad: 1 colaborador líder en 2 activos de la misma categoría; se le asigna el de mayor monto y el 2º pasa al siguiente postor.
  - Cascada múltiple de 3 activos con reasignación en cadena.
  - Mismo colaborador ganando activos en categorías distintas (Notebooks vs Celulares).
  - Exclusión de colaboradores inhabilitados o con rol no participante (Admin / Visitante).

---

## Fase 2: Implementación de Lógica Pura en TypeScript
- [x] **T002**: Crear `src/lib/adjudicacion.ts` con tipos y función pura `procesarAdjudicacion()`.
- [x] **T003**: Ejecutar `npm test` para asegurar que pasen todos los tests unitarios de T001 (48/48 tests pasando).

---

## Fase 3: Procedimiento Almacenado SQL para Supabase / PostgreSQL
- [x] **T004**: Crear `sql/11_adjudicacion_tope_desempate.sql` con la función `procesar_ganadores()` que aplique el tope por categoría y la reasignación en cascada en la base de datos.
- [x] **T005**: Actualizar `sql/00_instalacion_completa.sql` con la versión definitiva de `procesar_ganadores()`.

---

## Fase 4: Integración y Experiencia de Usuario
- [x] **T006**: Actualizar `src/components/ofertas/PanelEvaluacion.tsx` para reflejar el tope de 1 por categoría y cascada en el modal de ejecución.
- [x] **T007**: Verificar `src/pages/ResultadosPage.tsx` para correcta visualización de ganadores y criterios de desempate.

---

## Fase 5: Calidad y Verificación
- [x] **T008**: Ejecutar `npx oxlint` y `npm run build` con 0 errores.
- [x] **T009**: Verificar en navegador con `browser_subagent`.
- [x] **T010**: Actualizar `docs/sdd/backlog.md`.

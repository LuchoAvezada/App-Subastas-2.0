# Tasks: F07 — Publicación de Resultados y Reasignación por Desistimiento

**Feature**: F07  
**Fecha**: 2026-10-14  
**Estado**: Completada  

---

## Fase 1: Pruebas Unitarias de Reasignación y Gobernanza (TDD)
- [x] **T001**: Crear `tests/desistimiento.test.ts` con cobertura de:
  - Reasignación de activo al 2º postor cuando el 1º desiste.
  - Reasignación respetando el tope de 1 activo por categoría (si el 2º postor ya tiene otro equipo en esa categoría, salta al 3º postor).
  - Declaración de activo como 'Desierto' si no existen más postores elegibles tras un desistimiento.
  - Reglas de visibilidad de resultados (Usuarios y Visitantes bloqueados si `resultados_publicados === false`, Administradores siempre autorizados).
  - Generación de estructura y datos del reporte de ganadores.

---

## Fase 2: Implementación de Lógica Pura en TypeScript
- [x] **T002**: Crear `src/lib/desistimiento.ts` con funciones `calcularReasignacion()` y `generarReporteGanadores()`.
- [x] **T003**: Actualizar `src/types/domain.ts` con campos de `AppConfig` y `ResultadoDetalle`.
- [x] **T004**: Ejecutar `npm test` para asegurar que pasen todas las pruebas unitarias.

---

## Fase 3: Procedimientos Almacenados y Esquema SQL
- [x] **T005**: Crear `sql/12_publicacion_resultados_desistimiento.sql` con:
  - Alter tables en `sub_app_config` y `sub_resultados`.
  - Actualización de la vista `sub_v_resultados_detalle`.
  - Función RPC `reasignar_por_desistimiento()`.
  - Función RPC `publicar_resultados()`.
- [x] **T006**: Actualizar `sql/00_instalacion_completa.sql`.

---

## Fase 4: Integración en Interfaz de Usuario
- [x] **T007**: Actualizar `src/contexts/CountdownContext.tsx` para exponer `resultadosPublicados` y sincronización Realtime.
- [x] **T008**: Actualizar `src/pages/ResultadosPage.tsx`:
  - Ocultamiento de pestaña y redirección para usuarios no admin cuando no está publicado.
  - Vista administrativa con badge informativo, acción de registrar desistimiento y generación/descarga de reporte CSV de ganadores.
- [x] **T009**: Actualizar `src/components/admin/ConfigSubasta.tsx` con la tarjeta y modal de **Publicación Oficial de Resultados**.

---

## Fase 5: Calidad, Compilación y Verificación Visual
- [x] **T010**: Ejecutar `npm test` verificando que pasen todas las suites (TDD - 55 pruebas pasando).
- [x] **T011**: Ejecutar `npx oxlint` y `npm run build` con 0 errores.
- [x] **T012**: Verificación en navegador con `browser_subagent`.
- [x] **T013**: Actualizar `docs/sdd/backlog.md` marcando F07 como completada.

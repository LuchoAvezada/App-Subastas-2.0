# Tasks: F03 — Gestión de Activos y Carga de Fotos (Panel Admin)

**Branch**: `003-activos-fotos` | **Fecha**: 2026-10-13 | **Estado**: Completada

---

## Fase 1: Pruebas Unitarias de Activos e Inventario (TDD)

- [x] **T001**: Crear `tests/activos.test.ts` con cobertura de validaciones de precio base (>= 0 en USD), estados permitidos ('Disponible', 'Cerrado', 'Adjudicado'), mapeo de categorías y filtros de inventario.

---

## Fase 2: Optimización de Componentes y Miniaturas de Fotografía

- [x] **T002**: Enriquecer `src/pages/admin/AdminActivosPage.tsx`:
  - Agregar columna de miniatura de foto en la tabla con fallback visual accesible.
  - Asegurar consistencia con los tokens de diseño Agrotec (encabezados, bordes y botones).
- [x] **T003**: Optimizar `src/hooks/useActivos.ts` desestructurando `idCategoria` y `estado` para resolver advertencias del React Compiler / linter.
- [x] **T004**: Verificar `src/components/activos/ActivoForm.tsx` asegurando subida diferida al bucket `activos` y validación de tipos y tamaños de archivo.

---

## Fase 3: Calidad, Compilación y Verificación Visual

- [x] **T005**: Ejecutar `npm.cmd test` verificando que todas las pruebas pasen (25/25 tests aprobados).
- [x] **T006**: Ejecutar `npm.cmd run lint` (0 errores) y `npm.cmd run build` (código de salida 0).
- [x] **T007**: Verificar en el navegador integrado la vista `/admin/activos`, el modal de nuevo activo y el filtrado por categoría.
- [x] **T008**: Actualizar `docs/sdd/backlog.md` marcando F03 como completada, commitear cambios, fusionar en `main` y sincronizar con GitHub.

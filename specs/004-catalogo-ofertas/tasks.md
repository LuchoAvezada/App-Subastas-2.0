# Tasks: F04 — Catálogo de Activos, Visibilidad de Ofertas y Pujas

**Branch**: `004-catalogo-ofertas` | **Fecha**: 2026-10-13 | **Estado**: Completada

---

## Fase 1: Pruebas Unitarias de Pujas y Estado de Subasta (TDD)

- [x] **T001**: Crear `tests/ofertas.test.ts` con cobertura de:
  - Cálculo de monto líder y total de ofertas por activo.
  - Anonimato estricto (ningún dato de colaborador visible).
  - Validaciones de monto ofertado (>= precio base).
  - Estado de subasta activa vs expirada/cerrada manualmente.

---

## Fase 2: Implementación de Visibilidad de Ofertas en Catálogo

- [x] **T002**: Crear hook `src/hooks/useResumenOfertas.ts` para obtener mapa reactivo de estadísticas anónimas `{ [id_activo]: { montoLider, totalOfertas } }`.
- [x] **T003**: Actualizar `src/components/activos/ActivoCard.tsx` y `src/components/ofertas/OfertaModal.tsx`:
  - Mostrar precio base en USD.
  - Mostrar monto líder actual (o "Sin ofertas").
  - Mostrar cantidad de ofertas recibidas (ej. "3 ofertas").
  - Mantener restricción de rol (solo Rol 2 puede ofertar; Rol 1 y 3 bloqueados).

---

## Fase 3: Control Administrativo Manual de Apertura / Cierre de Ofertas

- [x] **T004**: Actualizar `src/components/admin/ConfigSubasta.tsx`:
  - Agregar botón de acción "Cerrar Recepción de Ofertas Ahora" con confirmación modal.
  - Agregar botón de acción "Abrir / Reanudar Recepción de Ofertas" con opciones de plazo (+24h, +48h, +7 días o fecha personalizada).
  - Reflejar inmediatamente el estado en el hook `useCountdown`.

---

## Fase 4: Barra Lateral Colapsable / Desplegable en Escritorio

- [x] **T005**: Actualizar `src/components/layout/Sidebar.tsx` y `src/components/layout/Layout.tsx`:
  - Agregar estado y botón de toggle para compactar (`w-20`) y expandir (`w-72`).
  - Persistir la preferencia en `localStorage` (`subasta_sidebar_collapsed`).
  - Ajustar visualización de iconos y etiquetas en modo colapsado.

---

## Fase 5: Calidad, Compilación y Verificación Visual

- [x] **T006**: Ejecutar `npm.cmd test` verificando que todas las pruebas pasen (33/33 tests).
- [x] **T007**: Ejecutar `npm.cmd run lint` y `npm.cmd run build` con 0 errores.
- [x] **T008**: Verificar en navegador integrado:
  - Tarjetas de catálogo mostrando precio base, monto líder y cantidad de ofertas.
  - Cierre y reapertura manual en `/admin/config`.
  - Colapso y despliegue de la barra lateral en escritorio.
- [x] **T009**: Actualizar `docs/sdd/backlog.md`, commitear, fusionar a `main` y sincronizar con GitHub.

# Implementation Plan: F04 — Catálogo de Activos, Visibilidad de Ofertas y Pujas

**Branch**: `004-catalogo-ofertas` | **Fecha**: 2026-10-13 | **Estado**: Ready

---

## 1. Resumen Ejecutivo
Implementar de punta a punta la visibilidad anónima de ofertas en el catálogo de activos (monto líder actual y total de ofertas por ítem), el modal y validación de puja por rol, el control administrativo para abrir y cerrar la recepción de ofertas de forma manual e inmediata desde `/admin/config`, y la barra lateral colapsable/desplegable para optimizar el espacio de trabajo en escritorio.

---

## 2. Arquitectura de Componentes

```mermaid
graph TD
    A[CatalogoPage.tsx & CatalogoGrid.tsx] --> B[ActivoCard.tsx]
    B --> C[useResumenOfertas Hook: sub_ofertas id_activo + max(monto)]
    B --> D[OfertaModal.tsx]
    D --> E[RPC registrar_oferta]
    F[ConfigSubasta.tsx] --> G[Botón Abrir / Cerrar Recepción Manual]
    G --> H[sub_app_config fecha_fin_subasta]
    I[Sidebar.tsx] --> J[Toggle Compactar / Desplegar Sidebar w-72 vs w-20]
```

---

## 3. Estrategia de Implementación

1. **Fase 1: Pruebas Unitarias (`tests/ofertas.test.ts`):**
   - Validar cálculo anónimo de monto líder y total de ofertas.
   - Validar validaciones de puja (monto >= precio base).
   - Validar estado de subasta cerrada vs abierta.
2. **Fase 2: Hook de Resumen de Ofertas & Actualización de `ActivoCard.tsx`:**
   - Crear `src/hooks/useResumenOfertas.ts` para obtener mapa de estadísticas anónimas `{ [id_activo]: { montoLider, totalOfertas } }`.
   - Mostrar en `ActivoCard.tsx` el precio base, monto líder actual y cantidad de ofertas enviadas.
3. **Fase 3: Cierre/Apertura Manual en `ConfigSubasta.tsx`:**
   - Agregar botones directos "Cerrar Recepción de Ofertas Ahora" y "Reanudar / Abrir Recepción de Ofertas".
4. **Fase 4: Barra Lateral Colapsable en `Sidebar.tsx` y `Layout.tsx`:**
   - Agregar toggle para colapsar (`w-20`) y expandir (`w-72`) con persistencia en `localStorage`.
5. **Fase 5: Verificación, Linting, Build y Cierre:**
   - Correr tests, linter, build y pruebas en navegador integrado.

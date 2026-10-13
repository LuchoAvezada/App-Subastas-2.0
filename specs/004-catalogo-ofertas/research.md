# Research & Decisiones Técnicas: F04 — Catálogo de Activos, Visibilidad de Ofertas y Pujas

**Feature Branch**: `004-catalogo-ofertas`  
**Fecha**: 2026-10-13  
**Estado**: Completado  

---

## 1. Visibilidad Anónima de Ofertas en Catálogo

- **Contexto:** Los colaboradores necesitan conocer la mayor oferta actual (`monto_lider`) y la concurrencia (`cantidad_ofertas`) sin vulnerar el secreto ni la identidad de los postores (Principio P9 y Q-01).
- **Decisión:** 
  - Consultar agregaciones públicas de `sub_ofertas` (`id_activo, monto`).
  - Calcular en cliente o vista ligera:
    - `monto_lider = Math.max(...montos, 0)`
    - `total_ofertas = conteo`
  - No exponer `id_colaborador` ni nombres en las tarjetas del catálogo público.

---

## 2. Apertura y Cierre Manual de Ofertas en Configuración (`/admin/config`)

- **Contexto:** El administrador necesita poder frenar o reanudar la recepción de ofertas inmediatamente desde el panel de control.
- **Decisión:**
  - **Cerrar Inmediatamente:** Al confirmar el cierre manual, se actualiza `fecha_fin_subasta` al momento actual (`new Date().toISOString()`), provocando que `countdown.isExpired` sea `true` y que la RPC `registrar_oferta` bloquee las ofertas de inmediato (`NOW() > v_fecha_fin`).
  - **Abrir / Reanudar:** Permite seleccionar una nueva fecha futura (o accesos rápidos de extensión como +24h, +48h, +7 días), actualizando `fecha_fin_subasta` en `sub_app_config` y reactivando la subasta para todos los usuarios.

---

## 3. Barra Lateral Colapsable / Desplegable en Escritorio

- **Contexto:** En monitores de escritorio, los usuarios requieren compactar el menú lateral para maximizar el área visible de tarjetas y tablas.
- **Decisión:**
  - Estado `collapsed: boolean` almacenado en `localStorage` con la clave `'subasta_sidebar_collapsed'`.
  - Ancho colapsado: `w-20` (80px), ancho expandido: `w-72` (288px).
  - En `Layout.tsx`, el padding del contenido principal transiciona suavemente entre `lg:pl-72` y `lg:pl-20`.
  - En `Sidebar.tsx`, botón de toggle en cabecera superior y renderizado centrado de iconos en modo compacto.

# Architecture & Implementation Plan: F07 — Publicación de Resultados y Reasignación por Desistimiento

**Feature**: F07  
**Fecha**: 2026-10-14  

---

## 1. Arquitectura de la Solución

### A. Modelo de Datos y Esquema
1. **Configuración (`sub_app_config`):**
   - `resultados_publicados BOOLEAN DEFAULT FALSE`
2. **Resultados (`sub_resultados`):**
   - `estado_adjudicacion VARCHAR(20) DEFAULT 'Adjudicado'` (`Adjudicado`, `Desistido`, `Reasignado`, `Desierto`)
   - `motivo_desistimiento TEXT`
   - `fecha_actualizacion TIMESTAMP DEFAULT NOW()`
3. **Vista (`sub_v_resultados_detalle`):**
   - Exponer `estado_adjudicacion`, `motivo_desistimiento` y `fecha_actualizacion`.

### B. Algoritmo de Reasignación Automática
- Dada una tupla `(id_activo, motivo)`:
  1. Identificar el colaborador que desiste.
  2. Obtener la categoría del activo.
  3. Obtener el conjunto de colaboradores que ya tienen un activo adjudicado en esa misma categoría (excluyendo el que desiste).
  4. De las ofertas restantes para ese activo, descartar:
     - El colaborador que desistió.
     - Cualquier colaborador que ya tenga una adjudicación en esa categoría (para no violar el tope de 1 por categoría).
     - Colaboradores no habilitados o no rol 2.
  5. Ordenar las ofertas restantes: Monto DESC $\to$ Jerarquía ASC $\to$ Antigüedad ASC $\to$ Fecha Oferta ASC.
  6. Si existe postor:
     - Actualizar registro en `sub_resultados` con nuevo `id_colaborador_ganador`, `monto_final`, `estado_adjudicacion = 'Reasignado'`, `criterio_desempate = 'REASIGNADO POR DESISTIMIENTO'`, `motivo_desistimiento = motivo`.
  7. Si no existe postor:
     - Marcar en `sub_resultados` con `estado_adjudicacion = 'Desierto'`, y en `sub_activos` estado `'Desierto'`.

---

## 2. Componentes a Crear / Modificar

1. **`sql/12_publicacion_resultados_desistimiento.sql`:**
   - Modificación de tablas, vistas y funciones RPC:
     - `publicar_resultados(p_token TEXT, p_publicar BOOLEAN)`
     - `reasignar_por_desistimiento(p_token TEXT, p_id_activo INTEGER, p_motivo TEXT)`
     - El admin se identifica con el token de sesión que emite `autenticar_usuario` (tabla `sub_sesiones`, validado por `validar_sesion_admin`).
     - Quien desiste queda en `sub_desistimientos` y no puede volver a ganar ese activo.
2. **`src/lib/desistimiento.ts`:**
   - Funciones puras para simulación, testing y generación de reportes:
     - `calcularReasignacion(idActivo, resultadosActuales, ofertas, colaboradores, cargos, activos, motivo)`
     - `generarReporteGanadores(resultados, colaboradores, cargos)`
3. **`tests/desistimiento.test.ts`:**
   - Suite de pruebas unitarias en Vitest.
4. **`src/contexts/CountdownContext.tsx`:**
   - Estado `resultadosPublicados: boolean` con sincronización Realtime.
5. **`src/pages/ResultadosPage.tsx`:**
   - Ocultamiento de la pestaña para no administradores cuando no está publicado (con redirección automática).
   - Acceso completo para administradores con badge y herramientas de desistimiento.
   - Generación y descarga de reporte de ganadores en CSV.
6. **`src/components/admin/ConfigSubasta.tsx`:**
   - Panel de control de publicación de resultados con modal de confirmación y cambio en tiempo real.

# Architecture & Implementation Plan: F11 — Adjudicación por Rondas

**Feature**: F11  
**Fecha**: 2026-10-26  
**Redactado**: 2026-10-28, a partir de la implementación (commit `d9f0dcd`). La feature se implementó con `spec.md` solamente; este plan documenta las decisiones tomadas.  

---

## 1. Decisiones de Arquitectura

### A. La ronda no se guarda
- No hay columna ni tabla de rondas: una ronda es cada ejecución de "Procesar Ganadores".
- El estado del activo alcanza para distinguirlas. Lo Adjudicado ya tiene ganador; lo Disponible entra en la ronda siguiente.
- `registrar_oferta` ya rechazaba los activos no Disponibles, así que reabrir la subasta con una nueva fecha de cierre no requiere cambios para ofertar.

### B. Se reemplaza la función interna de F06, sin una paralela
- `procesar_ganadores()` mantiene el algoritmo de F06 (tope por categoría, cascada y desempate) y la misma firma.
- Cambia solo el alcance:
  - borra únicamente los resultados de activos que siguen Disponibles (`DELETE ... WHERE id_activo IN (...)`, compatible con pg-safeupdate);
  - evalúa solo ofertas de activos Disponibles.

### C. Tope por categoría en toda la subasta
- Antes de evaluar, `temp_colaborador_categoria_bloqueado` se precarga con los ganadores que ya figuran en `sub_resultados`, incluidas las reasignaciones por desistimiento.
- Así la cascada de F06 los trata como ya bloqueados en esa categoría, sin lógica nueva.

### D. Publicación pausada tras una ronda con ganadores
- Si la ronda adjudica algo, `resultados_publicados` pasa a `false` en `sub_app_config`.
- El admin revisa y vuelve a publicar desde Configuración (F07).

### E. Solo después del cierre
- `procesar_ganadores(p_token)` valida al admin (F09) y rechaza si `fecha_fin_subasta` es nula o todavía no pasó.
- Va en la envoltura con token y no en la interna, que no se expone por la API.

---

## 2. Componentes a Crear / Modificar

1. **`sql/19_adjudicacion_por_rondas.sql` (nuevo, idempotente):** reemplaza `procesar_ganadores()` y `procesar_ganadores(p_token)`. Requiere `18_procesar_ganadores_where.sql`.
2. **`sql/00_instalacion_completa.sql`:** las mismas funciones.
3. **`src/components/ofertas/PanelEvaluacion.tsx`:** textos del modal de "Procesar Ganadores" (solo activos Disponibles, rondas anteriores conservadas, publicación pausada, cómo abrir una segunda ronda).

---

## 3. Despliegue

- La migración no cambia firmas: el frontend anterior sigue funcionando con ella.
- Pasos:
  1. Aplicar `sql/19_adjudicacion_por_rondas.sql`.
  2. Publicar el build con `scripts/deploy.ps1` (solo cambian textos).

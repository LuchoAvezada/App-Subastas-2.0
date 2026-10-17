# Architecture & Implementation Plan: F06 — Procesamiento de Ganadores, Tope por Categoría y Desempate

**Feature**: F06  
**Fecha**: 2026-10-14  

---

## 1. Arquitectura de la Solución

El cálculo de adjudicación con tope de 1 activo por categoría y efecto cascada requiere un algoritmo determinístico que resuelva colisiones sin ambigüedad.

### Modelo del Algoritmo (Resolución Iterativa / Cascada)

Para cada categoría $C \in \{1, 2, 3, 4\}$:
1. Obtener todas las ofertas válidas para los activos de esa categoría, filtrando solo colaboradores habilitados con `id_rol = 2` y activos en estado `'Disponible'`.
2. Para cada activo, ordenar a sus postores según el orden de prelación:
   $$\text{monto DESC} \to \text{nivel\_jerarquia ASC} \to \text{fecha\_ingreso ASC} \to \text{fecha\_hora ASC}$$
3. Mientras existan activos no adjudicados con postores elegibles:
   a. Identificar el postor líder de cada activo no adjudicado (el primer postor en su lista que aún no haya ganado un activo en esa categoría).
   b. Si ningún postor líder se repite en múltiples activos:
      - Cada postor líder gana su respectivo activo.
      - Termina la categoría.
   c. Si un colaborador es el postor líder en 2 o más activos:
      - Comparar las ofertas de ese colaborador en dichos activos.
      - Seleccionar el activo con **mayor monto** (y menor `id_activo` ante empate de monto).
      - Adjudicar ese activo a dicho colaborador y marcar al colaborador como "tope alcanzado en categoría $C$".
      - Para los demás activos donde lideraba, descalificar al colaborador y avanzar la lista de postores de esos activos al siguiente postor elegible.
   d. Repetir hasta que todos los activos tengan ganador único elegible o se queden sin postores.
4. Para cada activo adjudicado, determinar y clasificar el `criterio_desempate` comparando la oferta ganadora con la del segundo postor elegible (o único postor).

---

## 2. Componentes y Módulos a Modificar / Crear

1. **Lógica TypeScript Pura (`src/lib/adjudicacion.ts`):**
   - Tipos de entrada: ofertas, colaboradores, cargos, activos.
   - Función pura: `procesarAdjudicacion(ofertas, colaboradores, cargos, activos): ResultadoAdjudicacion[]`.
   - Utilizable en cliente y testeable unitariamente.

2. **Suite de Pruebas Unitarias (`tests/adjudicacion.test.ts`):**
   - Cobertura exhaustiva en Vitest.

3. **Función SQL en PostgreSQL (`sql/11_adjudicacion_tope_desempate.sql`):**
   - Implementación PL/pgSQL equivalente que actualiza `sub_resultados` y `sub_activos` con `SECURITY DEFINER`.

4. **Interfaz de Usuario:**
   - `src/components/ofertas/PanelEvaluacion.tsx`: Resumen de las reglas de tope de 1 por categoría y confirmación modal clara antes de procesar.
   - `src/pages/ResultadosPage.tsx`: Garantizar visualización limpia de los criterios de desempate y detalle de adjudicación.

5. **Documentación:**
   - Actualización de `docs/sdd/backlog.md` marcando F06 como `✅ Completada`.

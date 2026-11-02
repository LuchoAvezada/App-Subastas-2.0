# Architecture & Implementation Plan: F14 — Empate Total: Evaluación del Comité

**Feature**: F14  
**Fecha**: 2026-11-02  

---

## 1. Decisiones de Arquitectura

### A. Una sola regla de "quién puede ganar hoy"
- `candidatos_activo(id_activo)` (SQL, uso interno) devuelve el primer grupo de postores elegibles: habilitados, rol Usuario, sin desistimiento en el activo y sin otro activo ganado en la categoría. Una fila si hay un primero claro, varias si empatan, ninguna si no queda nadie.
- La usan `reasignar_por_desistimiento`, `resolver_evaluacion` y `leer_datos('evaluaciones')`, así el modal muestra exactamente lo que el servidor acepta.

### B. Detección en la cascada
- `procesar_ganadores()` arma el ranking de cada activo en `temp_ranking`; si el 1º y el 2º empatan en monto, jerarquía y antigüedad, el activo va a `temp_activos_evaluacion` y sale de la cascada sin bloquear a nadie.
- El último caso del criterio (empate total que no pasó a evaluación) ahora es "GANADO POR TOPE DE CATEGORIA": el otro postor ya tenía un activo de la categoría.

### C. Estado del activo
- Se reutiliza `Cerrado` para el activo en evaluación: no aparece en el catálogo, `registrar_oferta` lo rechaza y `procesar_ganadores` no lo vuelve a tomar. No hace falta un estado nuevo en `sub_activos`.
- `sub_resultados` sí suma `En evaluación` (sin ganador, como `Desierto`).

### D. Cliente
- `empateTotal()` en `adjudicacion.ts` y la explicación de ofertas aplican la misma regla para el Excel y el PDF.

---

## 2. Componentes a Crear / Modificar

1. **`sql/24_evaluacion_comite.sql` (nuevo, transaccional e idempotente)** y **`sql/00_instalacion_completa.sql`**.
2. **`src/lib/adjudicacion.ts`**, **`src/lib/explicacionOfertas.ts`**, **`src/lib/reportesPostSubasta.ts`**.
3. **`src/pages/ResultadosPage.tsx`** (resaltado, aviso, modal "Resolver") y **`src/components/ofertas/PanelEvaluacion.tsx`** (aviso al procesar).

---

## 3. Despliegue

1. Aplicar `sql/24_evaluacion_comite.sql` (el frontend nuevo llama a `resolver_evaluacion` y `leer_datos('evaluaciones')`).
2. Publicar el build con `scripts/deploy.ps1`.

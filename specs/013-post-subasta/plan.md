# Architecture & Implementation Plan: F13 — Post-subasta

**Feature**: F13  
**Fecha**: 2026-10-29  

---

## 1. Decisiones de Arquitectura

### A. Motivos calculados en el cliente, no guardados
- `src/lib/explicacionOfertas.ts` es una función pura: recibe ofertas, resultados, nómina y desistimientos, y devuelve cada oferta con su posición, resultado y comentario.
- Reutiliza `compararPostores` y `clasificarCriterio` de `adjudicacion.ts`, el mismo orden de prelación que `procesar_ganadores`.
- No hay tabla nueva: los datos ya existen. La única lectura nueva es `leer_datos('desistimientos')`, solo admin.

### B. Reportes generados en el navegador
- Excel con `exceljs` y PDF con `jspdf` + `jspdf-autotable`, cargados con `import()` solo al hacer clic: no pesan en la carga inicial.
- `src/lib/reportesPostSubasta.ts` arma los dos archivos; los datos de la descripción del activo salen de `sub_activos` (lectura pública del catálogo).

### C. Corrección del criterio
- `procesar_ganadores()` (`sql/22`): si la mejor oferta válida del activo no es la del ganador, el criterio es "GANADO POR TOPE DE CATEGORIA"; si no, se compara con el siguiente postor como antes.
- `clasificarCriterio` (TS) hace lo mismo y además ignora a los postores no elegibles, como el SQL.

### D. Catálogo y Resultados
- `CatalogoPage` pide solo activos `Disponible`; se quita el filtro por estado de `CatalogoGrid`.
- `ResultadosPage`: chips de categoría, totales solo para admin, botones de PDF y Excel en el banner de administración.

---

## 2. Componentes a Crear / Modificar

1. **`sql/22_post_subasta.sql` (nuevo, transaccional e idempotente):** `procesar_ganadores()` con el criterio corregido y `leer_datos` con `'desistimientos'`. Requiere `19_adjudicacion_por_rondas.sql`.
2. **`sql/00_instalacion_completa.sql`:** los mismos cambios.
3. **`src/lib/adjudicacion.ts`:** criterio de tope y postores elegibles.
4. **`src/lib/explicacionOfertas.ts` (nuevo)** y **`src/lib/reportesPostSubasta.ts` (nuevo)**.
5. **`src/pages/ResultadosPage.tsx`**, **`src/pages/CatalogoPage.tsx`**, **`src/components/activos/CatalogoGrid.tsx`**.
6. **`src/lib/desistimiento.ts`:** se borra `generarReporteGanadores` (lo reemplaza el PDF).

---

## 3. Despliegue

- Primero la migración: el frontend nuevo llama a `leer_datos('desistimientos')`. Con la base vieja el Excel falla con "Consulta desconocida".
- Pasos:
  1. Aplicar `sql/22_post_subasta.sql`.
  2. Publicar el build con `scripts/deploy.ps1`.

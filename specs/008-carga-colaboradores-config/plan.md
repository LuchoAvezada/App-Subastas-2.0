# Architecture & Implementation Plan: F08 — Carga Masiva de Colaboradores y Configuración de Subasta

**Feature**: F08  
**Fecha**: 2026-10-16  

---

## 1. Decisiones de Arquitectura

### A. Validación de la importación en el cliente (no se agrega RPC)
- `sub_colaboradores` sigue aceptando escrituras directas: el formulario individual y el interruptor de habilitación escriben ahí. Una RPC solo para importar no cerraría nada.
- La lógica va en funciones puras (`src/lib/colaboradores.ts`), cubiertas por pruebas.
- Pasar la importación a una RPC con token de administrador tiene sentido recién cuando se cierre la escritura directa (bloqueante de seguridad transversal).

### B. Escritura en una sola operación con filas completas
- Al abrir el modal se leen frescos `sub_colaboradores` (cédula, nombre, ingreso, habilitado, cargo, rol) y `sub_cargos`. No se reutiliza la lista en pantalla, que podría estar vacía o desactualizada: tratar a un existente como nuevo le quitaría el rol de administrador.
- Cada fila a escribir lleva las seis columnas resueltas (las de habilitado y rol se conservan del existente si el CSV no las trae).
  - Motivo: con filas incompletas, el upsert masivo de supabase-js (`defaultToNull`) pondría `NULL` en las columnas faltantes.
- Se escribe con `upsert(..., { onConflict: 'ci_documento' })`. Las filas sin cambios no se envían.

### C. Fechas
- **Fecha de ingreso:** es un `DATE` sin hora. Se valida y normaliza a `AAAA-MM-DD` con aritmética UTC, sin pasar por zona horaria. Se muestra partiendo el texto, para que la conversión de zona no la corra un día.
- **Fecha de cierre:** `asuncionAUtcIso()` en `src/lib/utils.ts` usa `fromZonedTime` de `date-fns-tz` (ya instalado) con la constante `TIMEZONE` existente (P2). Para mostrarla se reutiliza `formatFechaAsuncion(fecha, "yyyy-MM-dd'T'HH:mm")`.
- El valor del selector pasa a ser estado derivado: lo editado o, si no hay edición, la fecha vigente. Así se elimina el `useEffect` que copiaba el estado (advertencia de lint `set-state-in-effect`).

### D. Realtime
- `sql/13_sincronizacion_config.sql` agrega `sub_app_config` a la publicación `supabase_realtime` solo si todavía no está (`pg_publication_tables`). Se puede ejecutar más de una vez.
- Se replica en `sql/00_instalacion_completa.sql`.

---

## 2. Componentes a Crear / Modificar

1. **`src/lib/colaboradores.ts` (nuevo):**
   - `normalizarEncabezado()`: minúsculas, sin BOM ni espacios, alias de la cédula.
   - `normalizarFecha()`: `DD/MM/AAAA` o `AAAA-MM-DD` → `AAAA-MM-DD` o `null`.
   - `validarNomina()`: clasifica en nuevos, a actualizar, sin cambios y errores por fila.
   - `filtrarColaboradores()`: búsqueda sin acentos más filtros por campo.
   - `ordenarColaboradores()`: orden por campo con desempate por nombre.
2. **`src/lib/utils.ts`:** `asuncionAUtcIso()`.
3. **`src/components/admin/ImportarColaboradoresCsv.tsx` (nuevo):** modal con instrucciones, códigos de cargo, reporte previo, confirmación y resultado.
4. **`src/components/admin/ColaboradoresList.tsx`:** resumen, filtros con conteos, orden por encabezado y el nuevo modal de importación.
5. **`src/components/admin/ConfigSubasta.tsx`:** conversión horaria y estado derivado del selector.
6. **`sql/13_sincronizacion_config.sql` (nuevo)** y **`sql/00_instalacion_completa.sql`:** publicación Realtime.
7. **`tests/colaboradores.test.ts` (nuevo):** validación, fechas, conversión horaria, filtros y orden.

---

## 3. Riesgos y Límites Conocidos

- **Validación en el cliente:** quien tenga la anon key puede escribir `sub_colaboradores` sin pasar por ella. Se resuelve con el bloqueante de seguridad (RLS), no en F08.
- **Cargos por id:** el CSV identifica el cargo por `id_cargo`, y el modal muestra la tabla de códigos. Aceptar el nombre del cargo queda para cuando RRHH lo pida.

# Feature Specification: F08 — Carga Masiva de Colaboradores y Configuración de Subasta

**Feature ID**: F08  
**Fecha**: 2026-10-16  
**Estado**: Ready  

---

## 1. Resumen Ejecutivo y Motivación

F08 ya tenía una primera versión heredada de la puesta en marcha (`5081af9`): botón "Importar CSV", selector de fecha de cierre y temporizador con Realtime (`CountdownContext`, F07). La validación del 2026-10-16 encontró que no cumple los criterios del backlog:

1. **Importación CSV sin validación:** los campos faltantes se rellenan en silencio (`fecha_ingreso = 2024-01-01`, `id_cargo = 7`), aunque ambos alimentan el desempate por jerarquía y antigüedad (P9). Una cédula vacía se guarda como el texto `"undefined"`. Una sola fila mala hace fallar todo el archivo con el error crudo de la base. Al re-importar se sobrescriben en silencio el rol y la habilitación de los existentes: un administrador pasa a Usuario y un colaborador deshabilitado vuelve a quedar habilitado. Además, una columna `id_rol = 1` convierte a cualquiera en administrador.
2. **Zona horaria:** el selector de fecha de cierre interpreta la hora en la zona del navegador, no en `America/Asuncion` (P4).
3. **Sincronización:** `CountdownContext` escucha Realtime en `sub_app_config`, pero ningún script SQL agrega esa tabla a la publicación `supabase_realtime`. Si no se activó a mano en el panel de Supabase, los clientes se enteran recién con el sondeo de 30 s.

Además, el responsable del proyecto pidió el 2026-10-16 **filtrar, ordenar y resumir la vista de colaboradores** para tener mejor visión de la nómina cargada en la app.

---

## 2. Requerimientos Funcionales

### RF-01: Importación CSV con validación por fila
- **Columnas obligatorias:** `ci_documento` (alias `ci` o `documento`), `nombre`, `fecha_ingreso`, `id_cargo`.
- **Columnas opcionales:** `habilitado`, `id_rol`.
- Los encabezados no distinguen mayúsculas y el separador (coma o punto y coma) se detecta solo.
- Si falta una columna obligatoria, el archivo se rechaza completo con el nombre de la columna faltante.
- **Reglas por fila:**
  - `ci_documento`: se quitan puntos y espacios. Debe tener solo números, con un sufijo opcional `-número` (formato ya existente en la nómina), un máximo de 20 caracteres y no repetirse en el archivo.
  - `nombre`: obligatorio, máximo 100 caracteres, sin caracteres ilegibles (pasa cuando el archivo no está en UTF-8).
  - `fecha_ingreso`: `DD/MM/AAAA` (convención es-PY) o `AAAA-MM-DD`, y debe ser una fecha de calendario real. **No hay valor por defecto.**
  - `id_cargo`: debe existir en `sub_cargos`. **No hay valor por defecto.**
  - `habilitado`: `SI` o `NO`. Si se omite, los nuevos quedan en `SI` y los existentes **conservan** su valor.
  - `id_rol`: `2` (Usuario) o `3` (Visitante). Si se omite, los nuevos quedan como Usuario y los existentes **conservan** su rol. El CSV no puede asignar el rol Administrador ni quitárselo a quien lo tiene: eso solo se hace desde el formulario individual.

### RF-02: Reporte antes y después de importar
- Al elegir el archivo **no se escribe nada**. Se muestra un reporte con:
  - colaboradores nuevos;
  - existentes que cambian;
  - existentes sin cambios;
  - filas con error (número de fila de la planilla, cédula y motivo).
- El administrador confirma **"Importar N registros"**. Solo se escriben las filas válidas que agregan o cambian algo, en una única operación por `ci_documento`.
- Al terminar se informa cuántos registros se insertaron y cuántos se actualizaron, y que las filas con error no se importaron.

### RF-03: Fecha y hora de cierre en `America/Asuncion`
- El valor del selector se interpreta como hora oficial de Asunción, sin importar la zona horaria del equipo del administrador. Se guarda en UTC (P4).
- El selector muestra la fecha de cierre vigente convertida a hora de Asunción.

### RF-04: Sincronización del temporizador de cierre
- Se mantiene `CountdownContext` (Realtime más sondeo de respaldo de 30 s).
- `sql/13_sincronizacion_config.sql` agrega `sub_app_config` a la publicación `supabase_realtime` de forma idempotente, para que cualquier cambio de la fecha de cierre llegue al instante a todos los clientes.

### RF-05: Vista de colaboradores con resumen, filtros y orden
- **Resumen:**
  - total de colaboradores;
  - habilitados;
  - con cuenta registrada;
  - habilitados pendientes de registro (todavía no crearon su contraseña).
- **Filtros combinables:** estado (habilitado o inactivo), cuenta (registrada o pendiente), rol y cargo.
  - Cada opción muestra su cantidad.
  - Hay una acción "Limpiar filtros" y la leyenda "Mostrando X de Y".
- **Búsqueda** por nombre, cédula, cargo o rol, sin distinguir acentos ni mayúsculas.
- **Orden** ascendente o descendente al hacer clic en el encabezado de cada columna: cédula, nombre, cargo (por nivel jerárquico), ingreso, cuenta, rol y habilitado. El encabezado activo expone `aria-sort`.
- La fecha de ingreso se muestra en `DD/MM/AAAA`, con la antigüedad en años.

---

## 3. Fuera de Alcance

- **Bajas por ausencia en el CSV:** queda pendiente como **Q-07** en `docs/sdd/preguntas-abiertas.md`.
- **Cerrar la escritura directa a `sub_colaboradores` con RLS o RPC:** es parte del bloqueante de seguridad transversal. El formulario individual y el interruptor de habilitación también escriben directo.
- **Corrección del desfase de reloj de cada cliente:** el cierre real lo valida el servidor (`registrar_oferta` compara contra `NOW()`).

---

## 4. Criterios de Aceptación (Definition of Done)

- [ ] El CSV con columnas faltantes se rechaza indicando cuáles faltan.
- [ ] Cada fila inválida aparece en el reporte con su número de fila y su motivo, y no se importa.
- [ ] No se inventan `fecha_ingreso` ni `id_cargo`.
- [ ] Re-importar no cambia el rol ni la habilitación de los existentes si el CSV no los trae, y nunca asigna ni quita el rol Administrador.
- [ ] El reporte distingue nuevos, a actualizar, sin cambios y errores. Tras importar se informa lo insertado y lo actualizado.
- [ ] La fecha de cierre elegida se guarda como la hora de Asunción convertida a UTC, aunque el navegador esté en otra zona.
- [ ] `sub_app_config` queda en la publicación Realtime mediante un script idempotente.
- [ ] La vista de colaboradores tiene resumen, filtros combinables con conteos, búsqueda sin acentos y orden por columna.
- [ ] Pruebas unitarias de validación, conversión horaria, filtrado y orden pasando. Lint y build sin errores.
- [ ] Verificación en el navegador integrado en escritorio y en móvil.

# Feature Specification: F03 — Gestión de Activos y Carga de Fotos (Panel Admin)

**Feature Branch**: `003-activos-fotos`  
**Created**: 2026-10-13  
**Status**: In Progress  
**Input**: Gestión de Activos y Carga de Fotos en Panel Admin (F03 del Backlog)

---

## 1. User Scenarios & Testing

### User Story 1 - Catálogo y Búsqueda de Activos en Inventario Admin (Prioridad: P1)
Como administrador de la subasta en Agrotec S.A., quiero ver la lista completa de equipos tecnológicos registrados, con buscador instantáneo (marca, modelo, número de serie o código FAM) y filtro por categoría, observando de forma clara la miniatura de la fotografía, precio base en USD y estado de cada equipo, para controlar y auditar el inventario disponible para los colaboradores.

- **Por qué esta prioridad:** El inventario es la fuente de datos que alimenta las subastas y permite supervisar el estado de cada equipo.
- **Prueba independiente:** Acceder como administrador a `/admin/activos`, comprobar la renderización de la tabla con miniaturas, buscar por texto y filtrar por categoría, verificando que los resultados se actualizan de forma inmediata.
- **Escenarios de Aceptación:**
  1. **Given** un administrador en `/admin/activos`, **When** escribe "Dell" o un número de serie en el buscador, **Then** la tabla filtra instantáneamente mostrando solo los registros coincidentes.
  2. **Given** la tabla de inventario, **When** se visualiza cada fila, **Then** muestra la miniatura de la imagen (o placeholder tenue si no posee foto), ID, categoría, marca, modelo, número de serie, precio base en USD y badge de estado.
  3. **Given** un filtro de categoría (Tablets, Celulares, Notebooks, Otros), **When** el administrador selecciona una categoría, **Then** la lista muestra únicamente los activos pertenecientes a ella.

---

### User Story 2 - Alta y Edición de Activos con Validaciones (Prioridad: P1)
Como administrador, quiero registrar nuevos activos o modificar los existentes mediante un formulario modal, definiendo categoría, marca, modelo, número de serie, código FAM, precio base en USD, estado y observaciones, para mantener actualizado el inventario.

- **Por qué esta prioridad:** Permite poner activos a disposición de la subasta con datos íntegros y fiables.
- **Prueba independiente:** Abrir el modal de creación, intentar guardar con precio negativo o campos vacíos para comprobar validaciones; luego ingresar datos válidos y verificar la inserción o actualización en `sub_activos`.
- **Escenarios de Aceptación:**
  1. **Given** un precio base menor a 0 o no numérico, **When** se intenta guardar el activo, **Then** el formulario rechaza el envío y muestra un mensaje de validación claro.
  2. **Given** campos obligatorios completos (categoría, marca, modelo, precio base >= 0), **When** se guarda el formulario, **Then** el activo se persiste en la base de datos y se actualiza la tabla con notificación de éxito.
  3. **Given** un activo existente, **When** el administrador presiona el botón de edición, **Then** el formulario se precarga con todos sus datos y permite modificar cualquier campo.

---

### User Story 3 - Carga y Almacenamiento de Fotografía en Supabase Storage (Prioridad: P1)
Como administrador, quiero subir una fotografía del equipo directamente desde mi equipo o celular (JPEG, PNG, WebP), visualizando una vista previa inmediata y asegurando que se comprima y suba al bucket público `activos` de Supabase Storage solo al confirmar el guardado, para no generar archivos huérfanos.

- **Por qué esta prioridad:** Cumple con la decisión Q-04 ratificada en el proyecto; los colaboradores necesitan ver fotos reales del estado del equipo para ofertar con confianza.
- **Prueba independiente:** Seleccionar un archivo de imagen en el formulario, comprobar la vista previa local inmediata, guardar el activo y verificar que la URL pública queda asignada en `foto_url`.
- **Escenarios de Aceptación:**
  1. **Given** un archivo que no sea imagen (ej. PDF o texto), **When** se intenta seleccionar, **Then** se rechaza con mensaje indicando formatos válidos (JPEG, PNG, WebP).
  2. **Given** una imagen seleccionada, **When** se visualiza en el modal, **Then** se renderiza la vista previa y se habilitan las opciones "Cambiar imagen" y "Quitar imagen".
  3. **Given** una imagen lista y datos válidos, **When** se guarda el activo, **Then** se comprime de forma eficiente a WebP, se sube al bucket `activos` en Supabase Storage y se guarda la URL resultante en `sub_activos.foto_url`.

---

### User Story 4 - Eliminación Controlada de Activos (Prioridad: P2)
Como administrador, quiero poder eliminar un activo que haya sido cargado por error, previa confirmación de seguridad, para mantener el inventario limpio de registros duplicados o incorrectos.

- **Por qué esta prioridad:** Permite subsanar errores de carga sin requerir acceso directo a la consola de base de datos.
- **Prueba independiente:** Presionar el botón de eliminar sobre un activo y verificar la confirmación y la remoción del registro.
- **Escenarios de Aceptación:**
  1. **Given** un activo en la tabla, **When** se pulsa el botón de eliminar, **Then** el sistema solicita confirmación explícita antes de proceder.
  2. **Given** la confirmación aceptada, **When** se ejecuta la baja, **Then** el registro se elimina y la tabla se actualiza automáticamente.

---

## 2. Requisitos Funcionales

- **RF-001:** Restricción exclusiva de acceso a `/admin/activos` para usuarios con rol Administrador (`es_admin = true`).
- **RF-002:** Consulta ordenada de activos desde la tabla `sub_activos` en Supabase.
- **RF-003:** Búsqueda en memoria / filtrado reactivo por marca, modelo, número de serie y FAM.
- **RF-004:** Filtro por categorías institucionales: Tablets (1), Celulares (2), Notebooks (3), Otros (4).
- **RF-005:** Validación de precio base en USD (moneda obligatoria según Constitución P1), exigiendo valores numéricos $\ge 0$.
- **RF-006:** Estados permitidos de activo: `'Disponible'`, `'Cerrado'`, `'Adjudicado'`.
- **RF-007:** Subida de imágenes al bucket `activos` de Supabase Storage con compresión WebP previa en el cliente para ahorro de ancho de banda.
- **RF-008:** Miniatura visible en la tabla administrativa con fallback accesible si el activo no cuenta con foto.
- **RF-009:** Gestión completa de ciclo de vida (alta, edición, eliminación y refresco manual).
- **RF-010:** Interfaz 100% alineada a tokens corporativos Agrotec (botones primarios `#1C5A34`, bordes `#E4E4E4`, tipografía Gabarito).

---

## 3. Criterios de Éxito

- **SC-001:** 100% de operaciones CRUD de activos funcionando contra Supabase con feedback visual (toasts).
- **SC-002:** Miniaturas y carga de fotos operativas con compresión optimizada en cliente.
- **SC-003:** Cobertura de pruebas automatizadas en Vitest para validaciones de activos y precios base en USD.
- **SC-004:** Cero errores de TypeScript (`tsc -b`), linter (`oxlint`) y build de producción.

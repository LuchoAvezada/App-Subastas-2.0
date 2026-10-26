# Backlog de Producto SDD — App Subastas 2.0 (Agrotec S.A.)

El siguiente backlog desglosa las features del proyecto ordenadas por dependencia técnica y nivel de riesgo. Cada feature sigue el flujo estricto de Spec-Driven Development:
`spec.md` → `plan.md` → `tasks.md` → Pruebas → Código → Verificación Visual → Documentación.

---

## Tabla Resumen de Features

| ID | Feature | Depende de | Q-xx Bloqueantes | Riesgo | Valor | Esfuerzo | Estado |
|---|---|---|---|---|---|---|---|
| **F01** | Base del Proyecto y Tokens de Identidad Visual Agrotec | — | Ninguna | Bajo | Alto | Bajo | `✅ Completada` |
| **F02** | Autenticación por Cédula y Seguridad de Acceso | F01 | Ninguna | Medio | Crítico | Medio | `✅ Completada` |
| **F03** | Gestión de Activos y Carga de Fotos (Panel Admin) | F01, F02 | Ninguna | Medio | Alto | Medio | `✅ Completada` |
| **F04** | Catálogo de Activos, Visibilidad de Ofertas y Pujas | F01, F02, F03 | Ninguna | Alto | Crítico | Medio | `✅ Completada` |
| **F05** | Mis Ofertas y Cancelación de Oferta con Veto | F04 | Ninguna | Medio | Alto | Bajo | `✅ Completada` |
| **F06** | Procesamiento de Ganadores, Tope por Categoría y Desempate | F04 | Ninguna | Alto | Crítico | Alto | `✅ Completada` |
| **F07** | Publicación de Resultados y Reasignación por Desistimiento | F06 | Ninguna | Medio | Alto | Medio | `✅ Completada` |
| **F08** | Carga Masiva de Colaboradores y Configuración de Subasta | F02 | Ninguna | Bajo | Alto | Medio | `✅ Completada` |
| **F09** | Cierre de la API Pública para Publicar en Internet | F02, F07 | Ninguna | Alto | Crítico | Medio | `✅ Completada` |
| **F10** | Lecturas con Sesión y Publicación por Túnel | F09 | Ninguna | Alto | Crítico | Medio | `✅ Completada` |
| **F11** | Adjudicación por Rondas (segunda ronda con activos sin ofertas) | F06, F07 | Ninguna | Medio | Alto | Bajo | `🔧 Implementada, pendiente de despliegue` |

---

## Detalle de Features

### F01: Base del Proyecto y Tokens de Identidad Visual Agrotec (✅ Completada)
- **Objetivo:** Consolidar la arquitectura base con tokens de marca en `src/marca-agrotec.css`, tipografía Gabarito local con licencia SIL OFL, logo corporativo y herramientas de pruebas (`vitest`) y linting (`oxlint`) operativas.
- **Q-xx asociadas:** Q-06 (`✅ Resuelta`).
- **Riesgo:** Bajo. | **Valor:** Alto. | **Esfuerzo:** Bajo.
- **Criterios de Aceptación Iniciales:**
  - Tipografía Gabarito servida en WOFF2 localmente sin dependencias externas de Google Fonts.
  - Paleta corporativa (Verde `#1C5A34`, Rojo `#8A2733`, superficie `#F5F5F5`, bordes `#E4E4E4`) aplicada a componentes base (`Button`, `Badge`, `Sidebar`, `Header`).
  - Pruebas automatizadas ejecutándose mediante `npm.cmd test`.
  - Linter ejecutándose sin errores mediante `npm.cmd run lint`.
  - Documentación de puesta en marcha en `docs/ejecucion-local.md`.

---

### F02: Autenticación por Cédula y Seguridad de Acceso (✅ Completada)
- **Objetivo:** Implementar el acceso seguro para colaboradores y administradores mediante número de Cédula paraguaya (`ci_documento`) y contraseña con hash `pgcrypto`, registro inicial de contraseña para colaboradores pre-cargados, bloqueo ante intentos fallidos y auditoría.
- **Q-xx asociadas:** Ninguna (Principio P3 ratificado).
- **Riesgo:** Medio. | **Valor:** Crítico. | **Esfuerzo:** Medio.
- **Criterios de Aceptación Iniciales:**
  - Solo colaboradores registrados y habilitados (`habilitado = 'SI'`) pueden registrarse o iniciar sesión.
  - Bloqueo de cuenta tras 5 intentos fallidos consecutivos con registro en `sub_intentos_login`.
  - Persistencia segura de sesión en el cliente y cierre de sesión explícito.
  - Detección precisa de roles: Rol 1 (Admin, sin permiso de oferta), Rol 2 (Usuario participante), Rol 3 (Visitante).

---

### F03: Gestión de Activos y Carga de Fotos (Panel Admin) (✅ Completada)
- **Objetivo:** Permitir al administrador gestionar el catálogo de activos en subasta (crear, editar, clasificar por categorías, precio base en USD, número de serie, marca, modelo, observaciones) y subir imágenes directamente a Supabase Storage (bucket `activos-subasta`).
- **Q-xx asociadas:** Q-04 (`✅ Resuelta`).
- **Riesgo:** Medio. | **Valor:** Alto. | **Esfuerzo:** Medio.
- **Criterios de Aceptación Iniciales:**
  - Formulario de alta/edición de activo exclusivo para rol Administrador.
  - Subida directa de imágenes (JPEG, PNG, WEBP) a Supabase Storage con generación de URL pública en `foto_url`.
  - Validación de precio base mayor o igual a 0 en USD.
  - Estados de activo consistentes (`Disponible`, `Cerrado`, `Adjudicado`).

---

### F04: Catálogo de Activos, Visibilidad de Ofertas y Pujas (✅ Completada)
- **Objetivo:** Permitir a los colaboradores consultar los activos clasificados por categoría, ver el tiempo restante de la subasta, el precio base, la cantidad actual de ofertas enviadas y el monto líder actual en tiempo real (anónimos sin nombres de postores), y enviar una oferta válida.
- **Q-xx asociadas:** Q-01 (`✅ Resuelta`).
- **Riesgo:** Alto. | **Valor:** Crítico. | **Esfuerzo:** Medio.
- **Criterios de Aceptación Iniciales:**
  - Cada tarjeta de activo muestra en tiempo real: precio base, monto líder actual (`MAX(monto)`) y cantidad total de ofertas enviadas (`COUNT(id_oferta)`).
  - La identidad de los colaboradores postores se mantiene estrictamente anónima y protegida (Constitución P9).
  - Solo el rol Usuario puede ofertar (`puedeOfertar == true`). Los administradores quedan bloqueados.
  - Validación estricta de que el monto ofertado sea mayor o igual al precio base en USD.
  - Bloqueo automático de nuevas ofertas una vez alcanzada la fecha de fin de subasta.
  - El administrador cuenta con un botón en Configuración para cerrar/abrir manualmente la recepción de ofertas inmediatamente, además del temporizador programado.
  - Opción ergonómica de compactar (`w-20`) y expandir (`w-72`) la barra lateral en escritorio con persistencia en `localStorage`.

---

### F05: Mis Ofertas y Cancelación de Oferta con Veto (✅ Completada)
- **Objetivo:** Permitir a los colaboradores consultar en "Mis Ofertas" el detalle de sus postulaciones vigentes y posibilitar la cancelación de una oferta antes del cierre, con veto permanente de re-oferta en ese activo.
- **Q-xx asociadas:** Q-02 (`✅ Resuelta`).
- **Riesgo:** Medio. | **Valor:** Alto. | **Esfuerzo:** Bajo.
- **Criterios de Aceptación Iniciales:**
  - Visualización exclusiva de las ofertas pertenecientes al colaborador autenticado en `/mis-ofertas`.
  - Acción de "Cancelar Oferta" con confirmación modal y advertencia clara sobre la irrevocabilidad y veto permanente (Constitución P9).
  - Al cancelar, la oferta se retira del cómputo activo y el sistema veta permanentemente al colaborador para volver a ofertar por ese activo.
  - Bloqueo de cancelación cuando la subasta ha finalizado o cerrado.
  - Historial de ofertas canceladas y vetos activos accesible en la interfaz.

---

### F06: Procesamiento de Ganadores, Tope por Categoría y Desempate (✅ Completada)
- **Objetivo:** Implementar el algoritmo de adjudicación automática ejecutado por el administrador al finalizar la subasta, aplicando el tope de máximo 1 activo adjudicado por categoría por colaborador y los criterios de desempate ordenados (1º monto, 2º jerarquía de cargo, 3º antigüedad).
- **Q-xx asociadas:** Q-03 (`✅ Resuelta`).
- **Riesgo:** Alto. | **Valor:** Crítico. | **Esfuerzo:** Alto.
- **Criterios de Aceptación Iniciales:**
  - Máximo 1 activo adjudicado por categoría por colaborador (máximo 1 notebook, 1 celular, 1 tablet, 1 en otros).
  - Si un colaborador lidera en dos o más activos de la misma categoría, se le adjudica el de mayor monto y los demás pasan al siguiente postor elegible.
  - Desempate determinístico: ante igualdad de oferta, desempata menor `nivel_jerarquia`; ante igual jerarquía, menor `fecha_ingreso` (mayor antigüedad).
  - Registro auditable del criterio de desempate en `sub_resultados`.

---

### F07: Publicación de Resultados y Reasignación por Desistimiento (✅ Completada)
- **Objetivo:** Exponer la pantalla oficial de resultados para colaboradores y visitantes únicamente cuando el administrador active la publicación oficial en Configuración ("Publicar Resultados"). Mientras no esté publicada, la pestaña se mantiene oculta para colaboradores y visitantes. Incluye vista previa y auditoría permanente para administradores, generación y descarga de reporte de ganadores en CSV para su distribución manual, y flujo de desistimiento con reasignación automática en cascada respetando el tope de 1 bien por categoría o declarando desierto el bien.
- **Q-xx asociadas:** Q-05 (`✅ Resuelta`).
- **Riesgo:** Medio. | **Valor:** Alto. | **Esfuerzo:** Medio.
- **Criterios de Aceptación Cumplidos:**
  - Pestaña `/resultados` completamente oculta para colaboradores y visitantes mientras `sub_app_config.resultados_publicados === false`, con redirección automática si intentan acceder directamente por URL.
  - Control en `/admin/config` con botón modal "Publicar Resultados al Personal" y "Pausar Publicación", sincronizado vía Supabase Realtime.
  - Administradores cuentan con acceso permanente a `/resultados` con banner informativo y selector de estado.
  - Generación y descarga de reporte oficial de ganadores en CSV con columnas de auditoría completas para remisión externa manual.
  - Acción de "Registrar Desistimiento" por bien adjudicado con captura de motivo y reasignación automática al 2º postor en orden de mérito respetando el tope por categoría de F06, o asignación como `Desierto` si no existen más postores elegibles.
  - Trazabilidad y auditoría completa de los cambios en `sub_auditoria_cambios`.

---

### F08: Carga Masiva de Colaboradores y Configuración de Subasta (✅ Completada)
- **Objetivo:** Permitir al administrador importar la nómina de colaboradores desde archivos CSV con validación de formato, y definir la fecha/hora de cierre de la subasta configurada en zona horaria `America/Asuncion`. Incluye además una vista de colaboradores con resumen, filtros y orden (pedido del 2026-10-16).
- **Q-xx asociadas:** Q-07 (`pendiente`, fuera de alcance: bajas de colaboradores ausentes en el CSV).
- **Riesgo:** Bajo. | **Valor:** Alto. | **Esfuerzo:** Medio.
- **Especificación:** `specs/008-carga-colaboradores-config/`.
- **Criterios de Aceptación Cumplidos:**
  - **Revisión del CSV antes de escribir:**
    - El reporte separa nuevos, con cambios, sin cambios y filas con error (número de fila de la planilla, cédula y motivo).
    - Se importan solo las filas válidas, al confirmar, en un único upsert.
  - **Validaciones del CSV:**
    - Las columnas obligatorias se validan antes de leer las filas.
    - No se inventan `fecha_ingreso` ni `id_cargo`, que definen el desempate (P9).
    - Re-importar conserva el rol y la habilitación de los existentes cuando el CSV no los trae.
    - El rol Administrador nunca se asigna ni se quita por CSV.
  - **Fecha de cierre:** el selector interpreta la hora como oficial de Asunción, sin importar la zona del equipo, y la guarda en UTC.
  - **Sincronización:** el temporizador se sincroniza en todos los clientes vía Realtime (`sql/13_sincronizacion_config.sql`) con sondeo de respaldo de 30 s.
  - **Vista de colaboradores:**
    - Resumen: total, habilitados, con cuenta y habilitados sin registrarse.
    - Filtros combinables por estado, cuenta, rol y cargo, con conteos.
    - Búsqueda sin acentos.
    - Orden por columna con `aria-sort`.
    - Antigüedad en años.

---

### F09: Cierre de la API Pública para Publicar en Internet (🔧 Implementada, pendiente de despliegue)
- **Objetivo:** Que la anon key (pública, va en el JS) no permita escrituras directas ni leer datos sensibles, para publicar la app con Cloudflare Tunnel y la autenticación propia por cédula.
- **Riesgo:** Alto. | **Valor:** Crítico. | **Esfuerzo:** Medio.
- **Especificación:** `specs/009-hardening-api/`.
- **Criterios de Aceptación Cumplidos:**
  - Ninguna tabla acepta escrituras directas, y `sub_usuarios` no se lee por la API.
  - Toda escritura pasa por RPC con el token de sesión: las de administración lo validan como admin, y las ofertas toman al colaborador del token.
  - Solo un administrador puede adjudicar (`procesar_ganadores`).
  - Las fotos solo se suben a rutas autorizadas por el servidor.
- **Pendientes:** lectura de la nómina y de las ofertas con la anon key (resuelto en F10), registro de cuenta sin segundo factor y veto P9 solo en el cliente (ver `spec.md` §3).

---

### F10: Lecturas con Sesión y Publicación por Túnel (✅ Completada)
- **Objetivo:** Publicar la app en internet con Tailscale Funnel (gratis, sin TI) sin exponer la nómina, las ofertas con postor ni los resultados antes de tiempo.
- **Riesgo:** Alto. | **Valor:** Crítico. | **Esfuerzo:** Medio.
- **Especificación:** `specs/010-lecturas-con-sesion/`.
- **Criterios de Aceptación:**
  - La anon key solo lee el catálogo; el resto se lee con `leer_datos(p_token, ...)`.
  - El mismo build funciona por la IP de la LAN y por el túnel, con fotos de ruta relativa.
  - Nginx limita el login y el registro por IP.
- **Pendientes:** registro de cuenta sin segundo factor y veto P9 solo en el cliente.

---

### F11: Adjudicación por Rondas (🔧 Implementada, pendiente de despliegue)
- **Objetivo:** Ampliar la subasta con una segunda ronda para los activos que no recibieron ofertas, sin perder los resultados de la primera.
- **Especificación:** `specs/011-adjudicacion-por-rondas/`.
- **Criterios de Aceptación:**
  - "Procesar Ganadores" solo adjudica los activos Disponibles y nunca borra resultados anteriores.
  - El tope de 1 activo por categoría vale para toda la subasta.
  - Procesar con ganadores nuevos pausa la publicación; solo se procesa después del cierre.

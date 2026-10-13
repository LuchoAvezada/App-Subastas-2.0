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
| **F04** | Catálogo de Activos, Visibilidad de Ofertas y Pujas | F01, F02, F03 | Ninguna | Alto | Crítico | Medio | `Listo para spec` |
| **F05** | Mis Ofertas y Cancelación de Oferta con Veto | F04 | Ninguna | Medio | Alto | Bajo | `En espera` |
| **F06** | Procesamiento de Ganadores, Tope por Categoría y Desempate | F04 | Ninguna | Alto | Crítico | Alto | `En espera` |
| **F07** | Publicación de Resultados y Reasignación por Desistimiento | F06 | Ninguna | Medio | Alto | Medio | `En espera` |
| **F08** | Carga Masiva de Colaboradores y Configuración de Subasta | F02 | Ninguna | Bajo | Alto | Medio | `En espera` |

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

### F05: Mis Ofertas y Cancelación de Oferta con Veto
- **Objetivo:** Permitir a los colaboradores consultar en "Mis Ofertas" el detalle de sus postulaciones vigentes y posibilitar la cancelación de una oferta antes del cierre, con veto permanente de re-oferta en ese activo.
- **Q-xx asociadas:** Q-02 (`✅ Resuelta`).
- **Riesgo:** Medio. | **Valor:** Alto. | **Esfuerzo:** Bajo.
- **Criterios de Aceptación Iniciales:**
  - Visualización exclusiva de las ofertas pertenecientes al colaborador autenticado.
  - Acción de "Cancelar Oferta" con confirmación y advertencia clara sobre la irrevocabilidad de la cancelación.
  - Al cancelar, la oferta se retira del cómputo activo y el sistema veta permanentemente al colaborador para volver a ofertar por ese activo.

---

### F06: Procesamiento de Ganadores, Tope por Categoría y Desempate
- **Objetivo:** Implementar el algoritmo de adjudicación automática ejecutado por el administrador al finalizar la subasta, aplicando el tope de máximo 1 activo adjudicado por categoría por colaborador y los criterios de desempate ordenados (1º monto, 2º jerarquía de cargo, 3º antigüedad).
- **Q-xx asociadas:** Q-03 (`✅ Resuelta`).
- **Riesgo:** Alto. | **Valor:** Crítico. | **Esfuerzo:** Alto.
- **Criterios de Aceptación Iniciales:**
  - Máximo 1 activo adjudicado por categoría por colaborador (máximo 1 notebook, 1 celular, 1 tablet, 1 en otros).
  - Si un colaborador lidera en dos o más activos de la misma categoría, se le adjudica el de mayor monto y los demás pasan al siguiente postor elegible.
  - Desempate determinístico: ante igualdad de oferta, desempata menor `nivel_jerarquia`; ante igual jerarquía, menor `fecha_ingreso` (mayor antigüedad).
  - Registro auditable del criterio de desempate en `sub_resultados`.

---

### F07: Publicación de Resultados y Reasignación por Desistimiento
- **Objetivo:** Exponer la pantalla oficial de resultados para colaboradores tras el cierre de la subasta, y habilitar en el panel de administración el flujo de desistimiento con reasignación automática al siguiente postor del ranking.
- **Q-xx asociadas:** Q-05 (`✅ Resuelta`).
- **Riesgo:** Medio. | **Valor:** Alto. | **Esfuerzo:** Medio.
- **Criterios de Aceptación Iniciales:**
  - Vista pública de resultados accesible únicamente tras la finalización y procesamiento de la subasta.
  - Acción de "Marcar Desistido" en el panel de administrador por activo adjudicado.
  - Reasignación automática instantánea que promueve al siguiente postor del ranking respetando las reglas de equidad de F06.
  - Trazabilidad y registro de cambios en el estado de la adjudicación.

---

### F08: Carga Masiva de Colaboradores y Configuración de Subasta
- **Objetivo:** Permitir al administrador importar la nómina de colaboradores desde archivos CSV con validación de formato, y definir la fecha/hora de cierre de la subasta configurada en zona horaria `America/Asuncion`.
- **Q-xx asociadas:** Ninguna.
- **Riesgo:** Bajo. | **Valor:** Alto. | **Esfuerzo:** Medio.
- **Criterios de Aceptación Iniciales:**
  - Carga masiva de colaboradores con reporte de registros insertados y errores de formato.
  - Selector de fecha y hora límite de subasta en zona horaria `America/Asuncion`.
  - Sincronización del temporizador de cierre en todos los clientes.

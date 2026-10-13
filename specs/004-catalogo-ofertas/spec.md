# Feature Specification: F04 — Catálogo de Activos, Visibilidad de Ofertas y Pujas

**Feature Branch**: `004-catalogo-ofertas`  
**Created**: 2026-10-13  
**Status**: In Progress  
**Input**: Catálogo de Activos, Visibilidad de Ofertas y Pujas (F04 del Backlog)

---

## 1. User Scenarios & Testing

### User Story 1 - Consulta de Activos con Monto Líder y Conteo de Ofertas (Prioridad: P1)
Como colaborador participante de Agrotec, quiero navegar por las categorías de activos (Tablets, Celulares, Notebooks, Otros) y ver en cada tarjeta el precio base en USD, el monto líder actual (`MAX(monto)`) y la cantidad total de ofertas recibidas (`COUNT(id_oferta)`), sin ver los nombres ni identificadores de otros postores, para tomar decisiones informadas con total equidad y confidencialidad.

- **Por qué esta prioridad:** Cumple con la Constitución P9 y la resolución de la pregunta Q-01; es el corazón de la experiencia de subasta.
- **Prueba independiente:** Acceder al catálogo y comprobar que las tarjetas muestran el precio base, la mayor oferta actual (o "Sin ofertas") y el número de ofertas enviadas.
- **Escenarios de Aceptación:**
  1. **Given** un activo sin ofertas previas, **When** se visualiza su tarjeta, **Then** muestra precio base en USD, monto líder como "Sin ofertas" y conteo de "0 ofertas".
  2. **Given** un activo con 3 ofertas registradas ($100, $150, $180), **When** cualquier colaborador consulta el catálogo, **Then** visualiza "Monto líder: $180.00" y "3 ofertas", sin revelar la identidad de los postores.

---

### User Story 2 - Emisión de Ofertas Válidas (Prioridad: P1)
Como colaborador participante (Rol 2), quiero ingresar mi oferta en USD por un activo disponible a través del modal de puja, validando que sea igual o superior al precio base y que no haya ofertado previamente en ese activo, para registrar mi postulación en el sistema.

- **Por qué esta prioridad:** Permite a los colaboradores participar en la adjudicación de los equipos tecnológicos.
- **Prueba independiente:** Abrir el modal de oferta, intentar ingresar montos menores al precio base para verificar el rechazo, e ingresar un monto válido confirmando la inserción en `sub_ofertas`.
- **Escenarios de Aceptación:**
  1. **Given** un monto inferior al precio base, **When** se intenta enviar la oferta, **Then** el sistema bloquea el envío e informa que debe ser igual o superior al precio base en USD.
  2. **Given** un usuario con rol Administrador o Visitante, **When** visualiza el catálogo, **Then** el botón indica "Solo para participantes" y queda inhabilitado.
  3. **Given** un colaborador que ya ofertó en ese activo, **When** abre el modal, **Then** se le notifica que ya cuenta con una oferta enviada.

---

### User Story 3 - Cierre y Bloqueo de Ofertas por Temporizador (Prioridad: P1)
Como colaborador o administrador, quiero que una vez cumplida la fecha y hora de cierre (`fecha_fin_subasta`), el sistema bloquee automáticamente el envío de nuevas ofertas y refleje el estado de subasta cerrada en todas las vistas.

- **Por qué esta prioridad:** Garantiza el cumplimiento estricto de los plazos temporales de la subasta.
- **Prueba independiente:** Simular la llegada al tiempo límite y comprobar que las tarjetas cambian a "Subasta Finalizada" y el formulario rechaza nuevos envíos.
- **Escenarios de Aceptación:**
  1. **Given** una subasta cuya fecha de fin ya expiró, **When** un colaborador intenta ofertar, **Then** la RPC `registrar_oferta` y el cliente rechazan la acción con "La subasta ya ha finalizado".

---

### User Story 4 - Control Manual de Apertura y Cierre de Ofertas (Panel Admin) (Prioridad: P1)
Como administrador de la subasta, quiero disponer en `/admin/config` de una acción directa para **cerrar o reabrir la recepción de ofertas** de forma inmediata, además del temporizador programado, para pausar o finalizar la subasta ante cualquier eventualidad institucional.

- **Por qué esta prioridad:** Requisito operacional indispensable solicitado por el administrador para tener control manual inmediato del proceso.
- **Prueba independiente:** Acceder como admin a `/admin/config`, presionar "Cerrar Recepción de Ofertas Ahora" y comprobar que la recepción se bloquea inmediatamente; luego presionar "Abrir / Reanudar Recepción" y verificar que se restablece la recepción.
- **Escenarios de Aceptación:**
  1. **Given** la subasta activa, **When** el administrador confirma el cierre manual, **Then** la vigencia se actualiza inmediatamente al instante actual, deteniendo nuevas ofertas en tiempo real.
  2. **Given** la subasta cerrada, **When** el administrador selecciona reanudar la recepción, **Then** se reactiva con una nueva fecha/plazo futuro y los colaboradores pueden volver a postular.

---

### User Story 5 - Barra Lateral Desplegable / Compactable en Escritorio (Prioridad: P2)
Como usuario en resolución de escritorio, quiero poder colapsar o expandir la barra lateral mediante un botón intuitivo, recordando mi preferencia en el navegador, para aprovechar al máximo el espacio en pantalla al navegar catálogos o paneles densos.

- **Por qué esta prioridad:** Optimiza la ergonomía y comodidad de lectura en pantallas grandes.
- **Prueba independiente:** Presionar el botón de colapsar barra lateral, comprobar que la barra se reduce a modo compacto de iconos (80 px), el contenido principal se expande fluidamente, y al recargar la página la preferencia persiste.
- **Escenarios de Aceptación:**
  1. **Given** la barra lateral expandida, **When** el usuario presiona el botón de compactar, **Then** la barra se reduce mostrando iconos centrados y la preferencia se guarda en `localStorage`.
  2. **Given** la barra lateral compactada, **When** el usuario presiona desplegar, **Then** se expande nuevamente al ancho completo de 288 px.

---

## 2. Requisitos Funcionales

- **RF-001:** Vista de catálogo clasificada por categorías: Tablets (1), Celulares (2), Notebooks (3), Otros (4).
- **RF-002:** Consulta reactiva y cálculo de estadísticas anónimas por activo:
  - `monto_lider`: Valor máximo ofertado en `sub_ofertas` para ese `id_activo`.
  - `cantidad_ofertas`: Total de ofertas registradas para ese `id_activo`.
- **RF-003:** Anonimato absoluto de postores en el catálogo (solo montos y recuentos, cero datos personales).
- **RF-004:** Invocación de RPC segura `registrar_oferta(p_id_activo, p_ci_documento, p_monto)` en Supabase.
- **RF-005:** Restricción de rol: únicamente Rol 2 (Usuario) puede ofertar. Admins y Visitantes bloqueados.
- **RF-006:** Bloqueo automático ante expiración de `fecha_fin_subasta`.
- **RF-007:** Control manual para administradores en `/admin/config` para cerrar o abrir la recepción de ofertas.
- **RF-008:** Barra lateral de navegación con soporte de colapso/despliegue en escritorio (`w-72` $\leftrightarrow$ `w-20`) con persistencia local.

---

## 3. Criterios de Éxito

- **SC-001:** Las tarjetas de activos exhiben precio base, monto líder y cantidad de ofertas sin filtrar identidades.
- **SC-002:** La recepción de ofertas puede cerrarse y reabrirse manualmente desde `/admin/config`.
- **SC-003:** La barra lateral colapsa y se expande fluidamente guardando la preferencia del usuario.
- **SC-004:** Cobertura de pruebas unitarias al 100% en Vitest para lógica de ofertas y estado de subasta.
- **SC-005:** Cero errores en linter (`oxlint`) y compilación TypeScript (`tsc -b`).

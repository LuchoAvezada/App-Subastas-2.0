# Feature Specification: F05 — Mis Ofertas y Cancelación con Veto de Reincidencia

**Feature ID**: F05  
**Branch**: `005-mis-ofertas-veto`  
**Fecha**: 2026-10-13  
**Estado**: In Progress  

---

## 1. Resumen Ejecutivo y Motivación

En cumplimiento estricto del **Principio Constitucional P9 (Equidad y Criterios Objetivos)**, los colaboradores de Agrotec S.A. deben poder supervisar en todo momento el detalle de sus posturas vigentes en la vista *"Mis Ofertas"*, así como disponer de la facultad de desistir de una oferta antes de que finalice la subasta.

Sin embargo, para evitar manipulaciones de mercado, especulación o posturas frívolas que perjudiquen a otros participantes, el desestimiento está regulado por una regla innegociable:
> **Regla de Veto de Reincidencia (Constitución P9):** *Ofertas cancelables con veto de reincidencia en ese activo. Una vez que un colaborador cancela su oferta por un activo específico, dicho activo queda vetado permanentemente para él, impidiendo cualquier nueva postura en ese bien.*

---

## 2. Requerimientos Funcionales

1. **Consulta Exclusiva de Postulaciones Propias:**
   - La pantalla `/mis-ofertas` debe exhibir únicamente las ofertas realizadas por el colaborador autenticado.
   - Cada fila de la tabla debe detallar: Identificador del activo, Marca, Modelo, Categoría, Serial/FAM, Precio base (USD), Monto ofertado (USD), Fecha y hora formateada en huso horario de Asunción, y Estado operativo.

2. **Acción de Cancelación de Oferta:**
   - Mientras la subasta se encuentre en curso (`isAuctionClosed == false`), cada postura activa debe mostrar un botón institucional de acción *"Cancelar Oferta"*.
   - Si la subasta ha finalizado o ha sido cerrada manualmente por un administrador, el botón de cancelación debe deshabilitarse indicando *"Subasta Finalizada"*.

3. **Confirmación con Advertencia Explícita de Veto:**
   - Al pulsar *"Cancelar Oferta"*, el sistema no ejecutará la acción de forma silenciosa. Debe abrir un modal institucional Agrotec que informe con total claridad:
     - El activo y el monto que está a punto de declinar.
     - Que al confirmar la cancelación, la oferta se retirará del cómputo general.
     - **Advertencia obligatoria:** Que quedará vetado de por vida para volver a ofertar por ese activo.

4. **Retiro del Cómputo General y Conteo en Tiempo Real:**
   - Al cancelarse la oferta, esta se elimina del cómputo activo de la subasta, actualizando inmediatamente:
     - El monto líder de la subasta (si era la postura líder).
     - El contador de ofertas enviadas en el catálogo público.
     - El resumen general del panel de evaluación administrativa.

5. **Bloqueo Infranqueable de Reincidencia (Veto P9):**
   - El sistema debe persistir el registro del veto para la tupla `(id_activo, id_colaborador)`.
   - Si el colaborador vetado ingresa a la categoría del activo en el catálogo:
     - La tarjeta del activo debe mostrar el estado *"Veto Activo (Oferta cancelada)"* y deshabilitar el botón de ofertar.
     - El modal de ofertas debe impedir cualquier ingreso informando el motivo del veto.
     - La lógica de negocio `useOfertas` debe rechazar cualquier intento de envío.

6. **Trazabilidad de Ofertas Canceladas:**
   - La pantalla `/mis-ofertas` debe proveer una sección o pestaña que liste las ofertas previamente canceladas por el usuario, con fecha de cancelación y confirmación de veto activo.

---

## 3. Criterios de Aceptación (DoD)

- [ ] Las ofertas canceladas se eliminan de `sub_v_ofertas_recibidas` y del catálogo en tiempo real.
- [ ] El colaborador no puede volver a postular por el mismo activo bajo ninguna circunstancia.
- [ ] Si la subasta expiró o está cerrada, la cancelación se encuentra inhabilitada.
- [ ] El modal de confirmación advierte de manera clara e inequívoca el veto permanente.
- [ ] 100% de pruebas unitarias aprobadas en Vitest.

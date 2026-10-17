# Feature Specification: F07 — Publicación de Resultados y Reasignación por Desistimiento

**Feature ID**: F07  
**Fecha**: 2026-10-14  
**Estado**: Completed  

---

## 1. Resumen Ejecutivo y Motivación

La culminación de la subasta requiere una fase de **control administrativo de resultados** antes de que estos se hagan visibles para todos los colaboradores de la empresa:

1. **Control de Publicación de Resultados Oficiales:**
   - Una vez finalizada la subasta y procesada la adjudicación con las reglas de equidad de F06, los resultados **NO son visibles ni accesibles** para los colaboradores participantes ni para visitantes.
   - La pestaña **Resultados Finales** permanece completamente oculta en la navegación para usuarios no administradores mientras la publicación no esté activa.
   - La aplicación permite a los administradores generar y descargar un **Reporte de Ganadores (CSV)** para su posterior análisis o remisión manual por correo externo.
   - Solo cuando el administrador activa la opción **"Publicar Resultados Oficiales"** en Configuración, la pestaña y la pantalla de resultados quedan accesibles para colaboradores y visitantes. Los administradores siempre tienen visibilidad completa como vista previa técnica.

2. **Gestión de Desistimientos y Reasignación Automática (Decisión Q-05):**
   - Si un colaborador adjudicado desiste de la adquisición de un equipo o no confirma los trámites administrativos, el administrador puede registrar el desistimiento del activo.
   - El sistema reasigna de forma inmediata y automática el activo al **siguiente postor con mejor derecho**, respetando de forma estricta las reglas de equidad (Tope de máximo 1 activo por categoría por colaborador de F06).
   - Si no existen más postores elegibles, el activo pasa al estado `'Desierto'`.

---

## 2. Requerimientos Funcionales

### RF-01: Control de Publicación Institucional
- La configuración del sistema en `sub_app_config` incorpora el indicador `resultados_publicados` (booleano, por defecto `false`).
- En la interfaz de Configuración (`/admin/config`), el administrador dispone de un panel de control con el botón **"Publicar Resultados Oficiales"** y **"Pausar Publicación"**.
- El cambio de estado se propaga a todas las sesiones y clientes conectados mediante Supabase Realtime y almacenamiento local reactivo.

### RF-02: Ocultamiento y Acceso Condicional a `/resultados`
- **Para Usuarios (Rol 2) y Visitantes (Rol 3):**
  - Si `resultados_publicados === false`: La pestaña de navegación **Resultados Finales** no se muestra. Si un usuario intenta acceder directamente por la ruta `/resultados`, el sistema lo redirige de inmediato a `/catalogo`.
  - Si `resultados_publicados === true`: La pestaña aparece en la navegación y tienen acceso público a la consulta de adjudicaciones.
- **Para Administradores (Rol 1):**
  - **Visibilidad permanente:** Los administradores siempre pueden ver la lista completa de resultados, métricas y exportación CSV, con una insignia que les indica claramente el estado de publicación (`"Vista Previa Administrativa"` vs `"Publicado Oficialmente"`).

### RF-03: Generación y Descarga de Reporte de Ganadores
- En la pantalla administrativa de resultados, se habilita la función **"Generar Reporte de Ganadores (CSV)"**:
  - **Exportación especializada en CSV:** Incluye Activo, Categoría, Serial/FAM, Precio Base, Monto Ganador, C.I., Colaborador Ganador, Cargo, Nivel Jerárquico, Antigüedad, Criterio de adjudicación y Estado.
  - El administrador puede descargar este archivo para su distribución manual externa por correo electrónico.

### RF-04: Registro de Desistimiento y Reasignación Automática (Q-05)
- Para cada activo adjudicado, el administrador cuenta con la acción **"Registrar Desistimiento"**.
- Un modal solicita confirmación e ingreso obligatorio del motivo (ej. *"Desistimiento voluntario del colaborador"*, *"Falta de pago o plazo de descuento de nómina vencido"*, *"Decisión administrativa o descalificación"*).
- Al confirmar:
  1. El ganador actual es marcado como `Desistido`.
  2. El algoritmo de reasignación evalúa las ofertas restantes para ese activo específico.
  3. Filtra únicamente postores elegibles que **no hayan alcanzado ya el tope de esa categoría** en otro activo adjudicado.
  4. Ordena por mérito: Monto DESC $\to$ Jerarquía ASC $\to$ Antigüedad ASC $\to$ Fecha Oferta ASC.
  5. Si existe postor elegible: se le asigna el activo con su monto ofertado y el criterio `REASIGNADO POR DESISTIMIENTO (2º POSTOR)`.
  6. Si no hay postores elegibles: el activo pasa a `Desierto` (`sub_activos.estado = 'Desierto'`).
  7. Se registra el cambio en `sub_auditoria_cambios`.

---

## 3. Criterios de Aceptación (Definition of Done)

- [ ] Control `resultados_publicados` en `sub_app_config` y sincronizado en tiempo real vía `CountdownContext`.
- [ ] Vista `/resultados` bloqueada con mensaje informativo para usuarios comunes si los resultados no están publicados.
- [ ] Administradores acceden siempre a `/resultados` con badge de vista previa o publicado.
- [ ] Botón en Configuración para publicar/despublicar resultados con confirmación.
- [ ] Exportación y plantilla de remisión de reporte a la mesa evaluadora.
- [ ] Función de reasignación automática por desistimiento implementada en TypeScript puro y en SQL con tests unitarios al 100%.
- [ ] Pruebas unitarias de reasignación con desempate y respeto al tope por categoría pasando.
- [ ] Build y lint limpios con 0 errores.

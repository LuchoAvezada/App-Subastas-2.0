# Registro de Preguntas Abiertas y Decisiones Tomadas (SDD)

Este documento registra las decisiones de negocio y alcance aprobadas por el responsable del proyecto. Cada elemento cuenta con un identificador único **Q-xx**, su justificación de impacto, feature asociada, la decisión oficial acordada y su estado.

**Estados:**
- `✅ Resuelta`: Decisión tomada e incorporada a las especificaciones y constitución.
- `◐ En revisión`: Propuesta presentada, en proceso de validación.
- `pendiente`: Pendiente de respuesta o decisión.

---

## Índice de Decisiones

| ID | Pregunta / Decisión | Feature | Decisión Adoptada | Estado |
|---|---|---|---|---|
| **Q-01** | Visibilidad de ofertas durante la subasta | F04 (Ofertas) | Monto líder y cantidad actual de ofertas recibidas visibles sin revelar identidad del postor | `✅ Resuelta` |
| **Q-02** | Modificación o cancelación de ofertas previas | F04 / F05 (Ofertas) | Cancelación permitida, pero veta volver a ofertar por ese activo | `✅ Resuelta` |
| **Q-03** | Límite máximo de activos adjudicables | F06 (Adjudicación) | Tope de máximo 1 activo por categoría por colaborador | `✅ Resuelta` |
| **Q-04** | Almacenamiento y carga de fotos de activos | F03 (Activos) | Supabase Storage (Bucket `activos-subasta`) | `✅ Resuelta` |
| **Q-05** | Protocolo ante desistimiento de un ganador | F07 (Resultados) | Reasignación automática en el sistema al siguiente postor | `✅ Resuelta` |
| **Q-06** | Recursos de marca (Gabarito y logo Agrotec) | F01 (Marca y Base) | Descarga oficial de Gabarito (SIL OFL) y logo en `public/brand/` | `✅ Resuelta` |
| **Q-07** | ¿La importación CSV debe dar de baja a quienes no figuran en el archivo? | F08 (Colaboradores) | — (hoy no se dan de baja) | `pendiente` |
| **Q-08** | ¿Cómo se publica la app en internet? | F10 (Publicación) | Tailscale Funnel, con acceso libre y lecturas protegidas por la sesión | `✅ Resuelta` |
| **Q-09** | ¿Qué pasa con los activos que quedan sin ofertas al cierre? | F11 (Adjudicación) | Segunda ronda solo con los Disponibles, sin borrar la primera y con el tope por categoría de toda la subasta | `✅ Resuelta` |
| **Q-10** | ¿Cómo se recupera una contraseña y cómo se bloquea un acceso? | F12 (Colaboradores) | Solo un administrador: restablecer borra la cuenta para registrarse de nuevo; bloquear es inhabilitar | `✅ Resuelta` |
| **Q-11** | ¿Hace falta un segundo factor para registrar la cuenta? | F02 / F10 / F12 (Acceso) | — (hoy basta conocer la cédula) | `pendiente` |

---

## Detalle de Decisiones Aprobadas

### Q-01: Visibilidad de ofertas durante el período activo de la subasta
- **Contexto:** Definir qué información de las ofertas en curso pueden consultar los colaboradores antes del cierre (`fecha_fin_subasta`).
- **Decisión adoptada:** **Monto líder y cantidad de ofertas enviadas visibles sin nombres**.
  - En la ficha de cada activo se muestra en tiempo real:
    1. El monto más alto ofertado hasta el momento (junto al precio base).
    2. La cantidad total de ofertas enviadas por ese item (ej. "4 ofertas").
  - En todo momento se mantiene **estrictamente oculta y protegida la identidad de los colaboradores** que ofertaron.
- **Impacto técnico:**
  - Se requiere una vista o consulta que retorne `MAX(monto)` y `COUNT(id_oferta)` agrupados por activo accesible para todos los colaboradores autenticados, manteniendo protegida la identidad de los postores.
- **Para qué feature:** F04 (Módulo de Ofertas y Catálogo).
- **Estado:** `✅ Resuelta`

---

### Q-02: Modificación o cancelación de ofertas antes de la fecha límite
- **Contexto:** Regla sobre si un colaborador puede retractarse o alterar su oferta antes de la fecha de cierre.
- **Decisión adoptada:** **Cancelación permitida con veto de re-oferta en ese activo**.
  - Un colaborador puede cancelar su oferta registrada por un activo mientras la subasta siga abierta.
  - Al cancelar, su oferta se retira del cálculo activo, pero el sistema **bloquea permanentemente que ese colaborador vuelva a enviar una nueva oferta por ese mismo activo**.
- **Impacto técnico:**
  - Estado de oferta o tabla de histórico: registrar ofertas con estado (`Activa`, `Cancelada`) o flag de intento utilizado para impedir reincidencia en la tupla `(id_colaborador, id_activo)`.
- **Para qué feature:** F04 (Módulo de Ofertas) / F05 (Mis Ofertas).
- **Estado:** `✅ Resuelta`

---

### Q-03: Límite de adjudicación de activos por colaborador
- **Contexto:** Garantizar distribución equitativa de los equipos dados de baja en la empresa.
- **Decisión adoptada:** **Tope de máximo 1 activo por categoría por colaborador**.
  - Un colaborador puede postular a varios activos, pero como máximo se le adjudicará 1 equipo por cada categoría (máximo 1 notebook, 1 celular, 1 tablet, 1 en otros).
  - Si un colaborador queda en 1º puesto en dos o más activos de la misma categoría, se le adjudica aquel activo donde su oferta represente mayor valor/prioridad, y en los restantes el equipo se adjudica al siguiente postor del ranking.
- **Impacto técnico:**
  - El algoritmo de adjudicación (`procesar_ganadores`) debe incluir la regla de partición por `(id_colaborador, id_categoria)` promoviendo al segundo lugar cuando ya exista adjudicación en esa categoría.
- **Para qué feature:** F06 (Procesamiento de Ganadores y Desempate).
- **Estado:** `✅ Resuelta`

---

### Q-04: Almacenamiento y carga de fotografías de activos
- **Contexto:** Dónde y cómo se guardan las imágenes subidas por el administrador.
- **Decisión adoptada:** **Supabase Storage (Bucket dedicado `activos-subasta`)**.
  - Subida directa de imágenes (JPEG, PNG, WEBP) desde el formulario administrativo de creación/edición de activos.
  - Almacenamiento en bucket público para lectura de colaboradores y políticas RLS de subida exclusivas para administradores.
- **Impacto técnico:** Creación del bucket en Supabase, hook de carga y validación de tipos/tamaños de archivo.
- **Para qué feature:** F03 (Gestión de Activos - Admin).
- **Estado:** `✅ Resuelta`

---

### Q-05: Protocolo ante desistimiento o falta de pago del ganador
- **Contexto:** Manejo cuando un adjudicado no concreta la compra del equipo.
- **Decisión adoptada:** **Flujo de reasignación automática en la aplicación**.
  - En la vista administrativa de resultados, el administrador cuenta con la acción de marcar una adjudicación como "Desistida".
  - El sistema recalcula la adjudicación de ese activo promoviendo automáticamente al siguiente postor elegible en el ranking (respetando el tope de 1 por categoría).
- **Impacto técnico:**
  - Nuevo estado en `sub_resultados` o tracking de reasignaciones (`Adjudicado`, `Desistido`, `Reasignado`).
- **Para qué feature:** F07 (Resultados y Gestión de Adjudicaciones).
- **Estado:** `✅ Resuelta`

---

### Q-06: Recursos de marca corporativa (fuente Gabarito y logo oficial)
- **Contexto:** Aplicación estricta de la guía visual oficial de Agrotec.
- **Decisión adoptada:** **Descarga de Gabarito oficial (SIL OFL) e integración de logo Agrotec**.
  - Descargar la fuente Gabarito en formato WOFF2 (pesos 400 y 700) en `public/fonts/` junto a `OFL-gabarito.txt`.
  - Integrar el logo corporativo en `public/brand/logo-agrotec.svg` y adaptar favicon con las hojas del logo.
- **Impacto técnico:** F01 (Base del Proyecto y Marca Agrotec).
- **Estado:** `✅ Resuelta`

---

### Q-07: Bajas de colaboradores ausentes en la nómina importada
- **Contexto:** La importación CSV de F08 agrega y actualiza colaboradores, pero no hace nada con los que están en la app y no figuran en el archivo (por ejemplo, quienes dejaron la empresa). Hoy siguen habilitados hasta que el administrador los deshabilite a mano.
- **Opciones:**
  1. **(Recomendada)** Dejarlo como está y mostrar en el reporte cuántos colaboradores habilitados no figuran en el archivo, para que el administrador decida.
  2. Deshabilitarlos automáticamente (`habilitado = 'NO'`) al confirmar la importación.
  3. Preguntar en cada importación si se deshabilitan.
- **Impacto técnico:**
  - Opción 1: un conteo más en el reporte.
  - Opciones 2 y 3: una segunda escritura y cuidar no deshabilitar administradores.
- **Para qué feature:** F08 (Carga Masiva de Colaboradores).
- **Estado:** `pendiente`

---

### Q-08: Publicación de la app en internet
- **Contexto:** Hay colaboradores que no van a la oficina, así que la app tiene que poder usarse fuera de la LAN. Abrir puertos o depender de TI no era viable en los plazos.
- **Decisión adoptada:** **Tailscale Funnel** (`https://sp009.taildad9ad.ts.net`), gratis y con HTTPS incluido. El acceso es libre: no hace falta VPN ni cuenta de Tailscale.
- **Impacto técnico:**
  - La anon key solo lee el catálogo; la nómina, las ofertas con postor y los resultados se leen con el token de sesión (`leer_datos`).
  - El mismo build sirve por la LAN y por el túnel (URL de la API desde el navegador, fotos con ruta relativa).
  - Nginx limita los intentos de login y registro por IP.
- **Para qué feature:** F10 (Lecturas con Sesión y Publicación por Túnel).
- **Estado:** `✅ Resuelta` (2026-10-26)

---

### Q-09: Activos sin ofertas al cierre de la subasta
- **Contexto:** Antes de F11, procesar ganadores por segunda vez borraba los resultados de la primera.
- **Decisión adoptada:** **Segunda ronda solo con los activos Disponibles**.
  - El admin define una nueva fecha de cierre y la subasta se reabre.
  - "Procesar Ganadores" no borra rondas anteriores y solo corre después del cierre.
  - El tope de 1 activo por categoría vale para toda la subasta, incluidas las reasignaciones.
  - Si una ronda adjudica algo, la publicación se pausa hasta que el admin revise.
- **Impacto técnico:** reemplazo de `procesar_ganadores` (`sql/19_adjudicacion_por_rondas.sql`), sin columna de ronda.
- **Para qué feature:** F11 (Adjudicación por Rondas).
- **Estado:** `✅ Resuelta` (2026-10-26)

---

### Q-10: Recuperación de contraseña y bloqueo de acceso
- **Contexto:** No había forma de recuperar una contraseña, y el bloqueo era un clic sin confirmación sobre el estado del colaborador.
- **Decisión adoptada:** **Ambas acciones solo las hace un administrador, desde Colaboradores**.
  - Restablecer borra la cuenta; el colaborador vuelve a registrarse con una contraseña nueva. No hay recuperación por el propio usuario ni correos.
  - Bloquear es inhabilitar (`habilitado = NO`), con confirmación. Con la contraseña correcta, el bloqueado ve un mensaje propio.
  - Un admin no puede aplicarlas sobre su propia cuenta, y todo queda auditado.
- **Impacto técnico:** `restablecer_cuenta`, cambios en `habilitar_colaborador` y `autenticar_usuario` (`sql/20` y `sql/21`).
- **Para qué feature:** F12 (Restablecer Contraseña y Bloquear Acceso).
- **Estado:** `✅ Resuelta` (2026-10-27)

---

### Q-11: Segundo factor en el registro de cuenta
- **Contexto:** `registrar_nuevo_usuario` deja crear la contraseña a quien conozca la cédula de un colaborador habilitado que todavía no se registró, o que un admin acaba de restablecer. Con la app en internet (Q-08), el riesgo es mayor. Quedó fuera del alcance de F09, F10 y F12.
- **Opciones:** a definir (por ejemplo, un código de activación entregado por RRHH o por el administrador).
- **Para qué feature:** F02 (Autenticación) / nueva feature.
- **Estado:** `pendiente`

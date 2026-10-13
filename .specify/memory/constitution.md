# Constitución del Proyecto — App Subastas 2.0 (Agrotec S.A.)

## Principios Fundamentales (P1…P9)

### P1: Alcance Acotado e Incremental (Spec-Driven)
- **Reglas:**
  - Ningún código o funcionalidad ingresa al proyecto si no está explícitamente documentado en [vision.md](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/docs/sdd/vision.md) o respaldado por una especificación formal aprobada en `specs/NNN-nombre-corto/`.
  - Queda prohibido el desarrollo de código especulativo, funcionalidades no solicitadas o cambios espontáneos sin spec previa.
- **Motivo:** Evitar la dispersión del alcance (*scope creep*), garantizar previsibilidad y mantener el foco en las prioridades de Agrotec.

---

### P2: Configuración Centralizada, no Código Disperso
- **Reglas:**
  - El nombre del producto, la marca, los catálogos fijos (categorías, roles, estados), parámetros de negocio (moneda por defecto, zona horaria, topes de adjudicación) y tokens visuales se declaran exactamente una sola vez en archivos de configuración o constantes centralizadas.
  - Ningún componente de interfaz de usuario ni función de lógica de negocio debe quemar (*hardcodear*) estos valores directamente en línea.
- **Motivo:** Facilitar el mantenimiento, garantizar consistencia global y permitir cambios operativos ágiles sin refactorizaciones masivas.

---

### P3: Identidad Corporativa y Acceso Exclusivo por Cédula
- **Reglas:**
  - El acceso a la plataforma se realiza exclusivamente mediante el número de Cédula de Identidad paraguaya (`ci_documento`) y contraseña personal con hash seguro (`pgcrypto`).
  - No existe auto-registro libre para usuarios externos; todos los participantes deben haber sido previamente cadastrados y habilitados por el Administrador en la tabla de colaboradores.
  - El sistema aplica bloqueo preventivo ante intentos fallidos de inicio de sesión y registra auditoría de accesos.
  - **Restricción de rol:** Los administradores tienen prohibido participar y enviar ofertas en la subasta para garantizar total imparcialidad.
- **Motivo:** Asegurar que la subasta sea estrictamente interna para el personal activo de Agrotec S.A. y erradicar cualquier conflicto de interés.

---

### P4: Español de Paraguay y Localización Unificada
- **Reglas:**
  - La interfaz de usuario, mensajes de validación o error, notificaciones y textos almacenados en base de datos deben redactarse exclusivamente en español de Paraguay (`es-PY`), sin motor ni conmutador multilenguaje.
  - Formato de fechas y números acorde a la convención paraguaya (`es-PY`).
  - Zona horaria oficial para visualización de pantallas, temporizadores y cálculos de negocio: `America/Asuncion` (`GMT-4` / `GMT-3` según horario de verano paraguayo).
  - Todas las marcas temporales se persisten en base de datos en UTC (formato ISO 8601).
- **Motivo:** Garantizar identidad, cercanía y consistencia cultural para el personal de Agrotec en Paraguay, evitando discrepancias en el horario de cierre de ofertas.

---

### P5: Moneda Unificada en Dólares Estadounidenses (USD)
- **Reglas:**
  - Todos los precios base, montos ofertados, ofertas líderes y adjudicaciones se calculan y presentan en USD por defecto (ejemplo visual: `USD 150.00`).
  - No se implementa conmutador de monedas ni conversión automática en la aplicación en esta versión.
- **Motivo:** Cumplir con el estándar financiero corporativo de valuación de activos tecnológicos del Grupo Agrihold.

---

### P6: Protección de Datos y Privacidad Mínima
- **Reglas:**
  - La plataforma almacena únicamente los datos personales estrictamente indispensables para la operativa de la subasta (nombre completo, número de cédula, cargo y fecha de ingreso).
  - Queda terminantemente prohibido registrar, publicar o commitear datos personales reales en el repositorio Git, fixtures de prueba, mocks, semillas (*seeds*) o scripts de migración.
- **Motivo:** Proteger la privacidad de los colaboradores y cumplir con las mejores prácticas corporativas de seguridad de la información.

---

### P7: Identidad Visual Estricta de Agrotec
- **Reglas:**
  - Los tokens de diseño visual se centralizan en una única capa fuente de verdad (`src/marca-agrotec.css`). Ningún componente define colores, fuentes o radios sueltos.
  - Colores corporativos: Verde oscuro `#1C5A34` (primarios, menú activo, titulares, iconos) y Rojo `#8A2733` (etiquetas superiores *eyebrows*, insignias, alertas y acentos).
  - Fondos limpios: blanco `#FFFFFF` o gris superficie `#F5F5F5`. Tarjetas blancas con borde `#E4E4E4`, sin sombras pesadas ni degradados oscuros.
  - Tipografía oficial: Gabarito (pesos 400 Regular y 700 Bold, licencia SIL OFL 1.1) servida como archivo local `woff2` en `public/fonts/`, con respaldo `"Segoe UI", Arial, sans-serif`.
  - Escala espacial: múltiplos de 4 en tamaños de fuente, espaciados, márgenes y radios.
  - Accesibilidad: contraste visual mínimo AA y estado de foco visible en controles interactivos.
- **Motivo:** Garantizar máxima coherencia con el manual de marca oficial de Agrotec y una experiencia estética premium y profesional.

---

### P8: Trazabilidad y Ciclo Estricto SDD (Spec-Driven Development)
- **Reglas:**
  - Todo cambio funcional o técnico se origina en una especificación en `specs/` dentro de su propia rama numerada secuencialmente (`NNN-nombre-corto`).
  - Secuencia mandatoria de artefactos: `spec.md` → `plan.md` → `tasks.md` antes de implementar código productivo.
  - Compromiso de commits en dos fases: primero los artefactos SDD de definición; posteriormente las pruebas y la implementación.
  - Verificación final de cada feature: pruebas unitarias/integración, comprobación de lint y tipos TypeScript, revisión en vivo en pantalla mediante navegador integrado (comprobando diseño y vista responsive), y actualización de `preguntas-abiertas.md`, `backlog.md` y `docs/ejecucion-local.md`.
- **Motivo:** Preservar la integridad técnica del proyecto, evitar regresiones y asegurar que la documentación permanezca sincronizada con el código real.

---

### P9: Criterios Objetivos de Adjudicación y Equidad
- **Reglas:**
  - **Información visible en catálogo:** En cada activo se exhibe en tiempo real el precio base, el monto líder actual y la **cantidad total de ofertas enviadas por item**, manteniendo **estrictamente anónima la identidad de los colaboradores postores**.
  - **Cancelación y veto:** El colaborador puede cancelar una oferta vigente antes de la fecha fin; la cancelación retira su puja, pero **veta definitivamente que vuelva a ofertar por ese mismo activo**.
  - **Tope de equidad:** Máximo 1 activo adjudicado por categoría por colaborador (máximo 1 notebook, 1 celular, 1 tablet, 1 en otros).
  - **Desempate determinístico auditado:**
    1. Mayor monto ofertado.
    2. Menor nivel de jerarquía (nivel 1 = mayor jerarquía).
    3. Mayor antigüedad en Agrotec (menor fecha de ingreso).
  - **Reasignación automática:** Ante desistimiento de un adjudicatario, el administrador acciona la opción en el sistema y la plataforma promueve automáticamente al siguiente postor elegible del ranking respetando las reglas de equidad.
- **Motivo:** Garantizar absoluta justicia, transparencia y confianza entre todos los colaboradores participantes de la empresa.

---

## Gobernanza y Enmiendas

1. La presente Constitución es la norma rectora suprema del proyecto App Subastas 2.0 y prevalece sobre cualquier código existente o propuesta no especificada.
2. Cualquier modificación o agregado a estos principios requiere una propuesta explícita, aprobación del responsable del proyecto y actualización documentada en este archivo.

**Versión:** 1.0.0  
**Ratificada:** 2026-10-13  
**Última Modificación:** 2026-10-13  

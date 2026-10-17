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

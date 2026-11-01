# Feature Specification: F13 — Post-subasta: Reportes para el Comité y Vista de Resultados

**Feature ID**: F13  
**Fecha**: 2026-10-29  
**Estado**: Implementada, pendiente de despliegue (`sql/22`)  

---

## 1. Motivación

- El reporte de ganadores era un CSV con datos que el comité no usa (cédula, monto, fecha de cierre, nivel jerárquico como número).
- No había forma de explicar por qué perdió cada oferta.
- El catálogo seguía mostrando los activos ya adjudicados, lo que confunde en una segunda ronda.
- En Resultados, cualquier colaborador veía el monto total adjudicado.
- El criterio guardado podía ser incorrecto: si el mejor postor de un activo ya había ganado otro de la misma categoría, el criterio del ganador se calculaba contra ese postor (más alto) y salía "GANADO POR JERARQUIA" u otro desempate que no ocurrió.

## 2. Reglas (decididas por el usuario el 2026-10-29)

### RF-01: PDF de ganadores para el comité (solo admin)
- Una fila por activo con ganador (Adjudicado o Reasignado), agrupada por categoría.
- Del activo: ID en la app, nombre (marca y modelo), descripción (campo `observacion`) y FAM si tiene.
- Del ganador: nombre, cargo y por qué ganó, en lenguaje claro.
- No incluye monto, cédula ni datos de otros postores. Los activos desiertos no aparecen.

### RF-02: Excel de ofertas recibidas (solo admin)
- Hoja "Ofertas": cada oferta, agrupada por activo y ordenada por la prelación de adjudicación, con su resultado (Ganó / Perdió / Pendiente) y un comentario automático del motivo.
- Hoja "Resumen": una fila por activo con su estado, la cantidad de ofertas y el ganador.
- Motivos posibles de una oferta perdedora: menor monto, empate resuelto por jerarquía, antigüedad u orden de registro, tope de un activo por categoría, colaborador bloqueado o sin rol Usuario, desistimiento, activo desierto.
- Los motivos se calculan con la nómina actual: si alguien fue bloqueado después de procesar, figura como "no participó". Aceptado.

### RF-03: Catálogo solo con activos Disponibles
- Las pestañas de categorías muestran únicamente los activos `Disponible`. Desaparece el filtro por estado.

### RF-04: Vista Resultados
- Filtro por categoría. La tabla, los totales y los dos reportes respetan el filtro.
- "Total activos adjudicados" y "Monto total adjudicado" solo los ve un administrador. El monto de cada fila sigue visible para todos.
- Los CSV anteriores ("Exportar CSV" y "Reporte de Ganadores (CSV)") se reemplazan por el PDF y el Excel.

### RF-05: Criterio "GANADO POR TOPE DE CATEGORIA"
- Si la mejor oferta válida de un activo es de alguien que ya ganó otro activo de esa categoría, el ganador queda con el criterio "GANADO POR TOPE DE CATEGORIA".
- El PDF recalcula el criterio de los activos Adjudicados con esta regla, así que también corrige los resultados guardados antes de `sql/22`.

## 3. Fuera de Alcance

- Recalcular el criterio guardado en `sub_resultados` de rondas ya procesadas (la tabla de Resultados lo muestra tal cual se guardó).
- Guardar una foto de la evaluación de cada ronda.
- Ocultar el monto por fila a los colaboradores.

## 4. Criterios de Aceptación

- [ ] Un colaborador no ve activos Adjudicados ni Desiertos en las pestañas de categorías.
- [ ] Un colaborador en Resultados no ve las tarjetas de totales; un admin sí, y cambian con el filtro.
- [ ] El filtro por categoría reduce la tabla y los dos reportes.
- [ ] El PDF muestra solo ID, nombre, descripción, FAM, ganador, cargo y motivo.
- [ ] El Excel tiene una fila por oferta con resultado y comentario, y la hoja de resumen.
- [ ] Con un postor superior bloqueado por tope, el criterio sale "GANADO POR TOPE DE CATEGORIA" (en `procesar_ganadores` y en el PDF).

# Feature Specification: F06 — Procesamiento de Ganadores, Tope por Categoría y Desempate

**Feature ID**: F06  
**Fecha**: 2026-10-14  
**Estado**: In Progress  

---

## 1. Resumen Ejecutivo y Motivación

En cumplimiento del **Principio Constitucional P9 (Equidad y Criterios Objetivos)** y de la decisión corporativa ratificada en **Q-03**, la subasta de activos dados de baja en Agrotec S.A. no busca concentrar bienes en unos pocos colaboradores con alta capacidad adquisitiva, sino garantizar una **distribución justa, transparente y equitativa** entre toda la nómina de la empresa.

Para ello, la adjudicación oficial tras el cierre de la subasta debe estar gobernada por un algoritmo automático que aplique de manera innegociable dos pilares:
1. **Tope de Equidad por Categoría (Q-03):** Ningún colaborador podrá adjudicarse más de un (1) activo de la misma categoría (máximo 1 Notebook, 1 Celular, 1 Tablet y 1 en Otros Equipos).
2. **Criterios Determinísticos de Desempate:** Orden estricto de prelación ante ofertas del mismo valor económico (1º Monto, 2º Nivel de Jerarquía Institucional, 3º Antigüedad de ingreso).

---

## 2. Requerimientos Funcionales

### RF-01: Elegibilidad de Participantes y Activos
- Solo se consideran ofertas de colaboradores habilitados (`habilitado = 'SI'`) con rol Usuario (`id_rol = 2`).
- Las posturas de administradores (`id_rol = 1`) o visitantes (`id_rol = 3`), si existiesen, quedan excluidas del cómputo.
- Solo participan activos que estaban en estado `'Disponible'` y que cuentan con al menos una oferta válida.

### RF-02: Orden de Mérito por Activo (Prelación)
Para cada activo individual, las ofertas se ordenan en base a los siguientes criterios jerárquicos:
1. `monto DESC`: Mayor oferta económica en USD.
2. `nivel_jerarquia ASC`: Menor número de jerarquía (mayor rango institucional, ej. 1=Director, 2=Gerente).
3. `fecha_ingreso ASC`: Mayor antigüedad en la empresa (fecha de contratación más remota).
4. `fecha_hora ASC` (o `id_oferta ASC`): Orden cronológico de llegada de la oferta.

### RF-03: Tope de Equidad por Categoría (Tope = 1)
- Un colaborador puede haber ofertado libremente por múltiples activos de una misma categoría.
- Al procesar la adjudicación:
  - Si un colaborador se encuentra en el primer lugar de dos o más activos de la **misma categoría**, el sistema le adjudica aquel activo donde su postura represente **mayor monto**.
  - Si las posturas líderes de dicho colaborador en esa categoría tuvieran el mismo monto, se le adjudica el activo con menor identificador numérico (`id_activo`).
  - Una vez adjudicado ese activo, el colaborador alcanza su **tope de categoría** y queda descalificado para adjudicarse cualquier otro activo de esa misma categoría.

### RF-04: Reasignación en Cascada (Efecto Dominó)
- En los activos secundarios donde el colaborador líder fue descalificado por tope de categoría, el activo no queda vacante: la adjudicación pasa automáticamente al **siguiente postor elegible** de ese activo.
- Si este nuevo postulante seleccionado ya hubiera alcanzado el tope de esa categoría en otro activo, se continúa avanzando hacia el siguiente postor elegible, de forma iterativa/recursiva, hasta que todos los activos con ofertas queden asignados a colaboradores elegibles o se agote la lista de postores de ese bien.

### RF-05: Clasificación del Criterio de Desempate
Para cada activo adjudicado, el sistema debe registrar en `sub_resultados.criterio_desempate` una de las siguientes etiquetas auditables:
- `'GANADO POR OFERTA MAS ALTA'`: Si el ganador ofertó un monto estrictamente mayor que el segundo postor elegible (o fue el único postor).
- `'GANADO POR JERARQUIA'`: Si empató en monto con el segundo postor elegible, pero su cargo tiene mayor rango jerárquico.
- `'GANADO POR ANTIGUEDAD'`: Si empató en monto y jerarquía con el segundo, pero tiene mayor antigüedad de ingreso en Agrotec.
- `'GANADO POR REGISTRO DE OFERTA'`: Si empató en todos los atributos anteriores y desempató por orden temporal de registro.

### RF-06: Transacción Atómica y Persistencia
- La función de adjudicación debe ejecutarse dentro de una transacción atómica.
- Limpia los resultados previos de la tabla `sub_resultados`.
- Inserta los ganadores finales en `sub_resultados`.
- Actualiza el estado de los activos adjudicados a `'Adjudicado'` en `sub_activos`.
- Retorna un objeto JSON con el total de activos adjudicados y confirmación de éxito.

---

## 3. Criterios de Aceptación (Definition of Done)

- [ ] Lógica de adjudicación pura implementada y validada con pruebas unitarias en Vitest al 100%.
- [ ] Pruebas unitarias cubriendo:
  - Adjudicación directa por mayor monto.
  - Desempate por jerarquía entre dos colaboradores.
  - Desempate por antigüedad entre colaboradores de igual cargo.
  - Colisión de tope: colaborador líder en 2 activos de la misma categoría; se queda con el de mayor monto y el otro pasa al 2º lugar.
  - Cascada múltiple de 3 o más activos con postores cruzados.
  - Colaborador que gana 2 activos en categorías diferentes (permitido).
- [ ] Script SQL `sql/11_adjudicacion_tope_desempate.sql` con la función `procesar_ganadores()` actualizada para Supabase/Postgres.
- [ ] Integración con el panel de administración (`PanelEvaluacion.tsx`) y pantalla de resultados (`ResultadosPage.tsx`).
- [ ] Suite completa de tests pasando y `oxlint` sin errores.

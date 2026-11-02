# Feature Specification: F14 — Empate Total: Evaluación del Comité

**Feature ID**: F14  
**Fecha**: 2026-11-02  
**Estado**: Desplegada (`sql/24` aplicada en el NUC el 2026-11-02, build `a4e40b6`), falta la prueba manual  

---

## 1. Motivación

- La constitución define tres criterios de prelación: monto, jerarquía y antigüedad. El código agregaba un cuarto, la fecha de registro de la oferta, y adjudicaba solo con él ("GANADO POR REGISTRO DE OFERTA").
- Decidir un activo por quién envió la oferta unos minutos antes no es un criterio que el comité considere justo.

## 2. Reglas (decididas por el usuario el 2026-11-02)

### RF-01: Empate total = sin ganador
- Si los dos primeros postores que pueden ganar un activo empatan en monto, jerarquía y antigüedad, el activo **no se adjudica**.
- Queda con estado `En evaluación` y criterio `REQUIERE EVALUACION`. El activo pasa a `Cerrado`: no recibe ofertas ni se vuelve a procesar en otra ronda.
- Los empatados no quedan bloqueados en la categoría: pueden ganar otro activo en el mismo proceso. Si eso pasa, al resolver ya no figuran como candidatos (el tope se respeta).
- La misma regla vale al reasignar por desistimiento.

### RF-02: No se publica con activos en evaluación
- `publicar_resultados` rechaza la publicación mientras quede algún activo en evaluación.
- Procesar una ronda o un desistimiento que deja un activo en evaluación pausa la publicación.

### RF-03: El admin registra la decisión del comité
- En Resultados, la fila se resalta en ámbar ("REQUIERE EVALUACIÓN") y tiene el botón "Resolver".
- El modal lista a los postores empatados que hoy pueden ganarlo (sin otro activo de la categoría ni desistimiento en ese activo). El admin elige uno y confirma.
- El activo queda `Adjudicado` con criterio `ADJUDICADO POR DECISION DEL COMITE`, y el cambio queda en `sub_auditoria_cambios`.

### RF-04: Reportes
- PDF del comité: sección "Requieren evaluación del comité" con el activo y los postores empatados (nombre y cargo).
- Excel: las ofertas empatadas figuran como "Pendiente"; la hoja Resumen explica el empate.

## 3. Fuera de Alcance

- Declarar desierto un activo en evaluación desde el modal. Si ningún empatado puede ganarlo, el admin lo vuelve a `Disponible` en Activos y procesa una nueva ronda.
- Recalcular resultados anteriores guardados con "GANADO POR REGISTRO DE OFERTA": se muestran tal cual.
- La copia en TypeScript de la reasignación (`calcularReasignacion`, solo usada en pruebas) no aplica la regla.

## 4. Criterios de Aceptación

- [ ] Dos postores con el mismo monto, cargo de igual jerarquía y misma fecha de ingreso: el activo queda "En evaluación", sin ganador.
- [ ] Con un activo en evaluación, publicar resultados muestra el error y no publica.
- [ ] "Resolver" adjudica al elegido con "ADJUDICADO POR DECISIÓN DEL COMITÉ"; después se puede publicar.
- [ ] Un desistimiento cuyos siguientes postores empatan deja el activo en evaluación.
- [ ] El PDF muestra la sección de evaluación con los empatados.

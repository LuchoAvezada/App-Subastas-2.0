# Feature Specification: F11 — Adjudicación por Rondas

**Feature ID**: F11  
**Fecha**: 2026-10-26  
**Estado**: Implementada (pendiente de aplicar `sql/19_adjudicacion_por_rondas.sql` en el NUC)  

---

## 1. Motivación

Si al cierre quedan activos sin ofertas, la subasta se puede ampliar con una segunda ronda solo para ellos.

Antes de F11, "Procesar Ganadores":
- borraba todos los resultados;
- solo evaluaba activos Disponibles.

Así, procesar una segunda vez dejaba los activos de la ronda 1 en Adjudicado pero sin ganador registrado. Además se podía procesar con la subasta abierta.

## 2. Reglas (decididas por el usuario el 2026-10-26)

### RF-01: Segunda ronda
- **Reapertura:** el admin define una nueva fecha de cierre y la subasta se reabre.
- **Activos ofertables:** solo los Disponibles, es decir, los que no tuvieron ganador. `registrar_oferta` ya rechaza los demás.
- **Sin estado nuevo:** las rondas no tienen una columna propia. Una ronda es cada ejecución de "Procesar Ganadores".

### RF-02: Procesar no borra rondas anteriores
- Se adjudica solo lo que sigue Disponible.
- Los resultados existentes no se tocan. Solo se descarta un resultado viejo de un activo que todavía esté Disponible.

### RF-03: Tope por categoría en toda la subasta
- Quien ganó un activo de una categoría, en cualquier ronda, no puede ganar otro de esa categoría.
- Las reasignaciones por desistimiento también cuentan como ganadores.

### RF-04: Revisión antes de publicar
- Si una ronda adjudica algo, `resultados_publicados` pasa a `false`.
- El admin revisa y vuelve a publicar desde Configuración. Mientras tanto, los colaboradores tampoco ven la ronda anterior.

### RF-05: Solo después del cierre
- `procesar_ganadores(p_token)` rechaza la operación si no hay fecha de cierre o si todavía no pasó.

## 3. Fuera de Alcance

- **Activos "Desierto" por desistimiento:** no vuelven a la segunda ronda. Para incluirlos, el admin debe cambiarlos a Disponible.
- **Ofertas viejas:** las de rondas anteriores sobre activos que siguen Disponibles (por ejemplo, de colaboradores luego deshabilitados) siguen siendo válidas si cumplen las reglas.

## 4. Criterios de Aceptación

- [ ] Con la subasta abierta, "Procesar Ganadores" responde "La subasta sigue abierta…".
- [ ] Después del cierre, procesar dos veces seguidas no cambia los resultados de la primera (la segunda adjudica 0).
- [ ] Con una nueva fecha de cierre, solo se puede ofertar por los activos Disponibles.
- [ ] En la ronda 2, el ganador de una notebook de la ronda 1 no gana otra notebook; gana el siguiente postor.
- [ ] Al procesar una ronda con ganadores, la publicación queda pausada.

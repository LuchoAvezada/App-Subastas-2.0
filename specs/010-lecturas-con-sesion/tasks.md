# Tasks: F10 — Lecturas con Sesión y Publicación por Túnel

**Feature**: F10  
**Fecha**: 2026-10-26  
**Estado**: Desplegada (2026-10-26), falta la prueba manual  
**Redactado**: 2026-10-28, a partir de la implementación (commit `e9629f6`).  

---

## Fase 1: Pruebas
- [x] **T001**: Ampliar `tests/sin-escrituras-directas.test.ts`: falla si `src/` usa `.from()` sobre una tabla que la anon key ya no lee.
- [x] **T002**: Adaptar `tests/ofertas.test.ts` al resumen por activo de `sub_v_resumen_ofertas` (conteo, monto líder, sin datos del postor).

---

## Fase 2: SQL
- [x] **T003**: Crear `sql/16_lecturas_con_sesion.sql`:
  - `sub_v_resumen_ofertas`;
  - `leer_datos(p_token, p_consulta)` con `mis_ofertas`, `resultados`, `ofertas`, `colaboradores` y `nomina`;
  - `REVOKE SELECT` general, `GRANT SELECT` al catálogo y `ALTER DEFAULT PRIVILEGES`;
  - fotos con la IP del servidor a ruta relativa.
- [x] **T004**: Replicar en `sql/00_instalacion_completa.sql`.

---

## Fase 3: Interfaz
- [x] **T005**: URL de la API por `window.location.origin` en producción y mensaje ante 429 en login y registro.
- [x] **T006**: Pasar a `leer_datos` las lecturas de `useOfertas`, `ResultadosPage`, `PanelEvaluacion`, `ColaboradoresList` e `ImportarColaboradoresCsv`; `useResumenOfertas` lee la vista.
- [x] **T007**: Guardar las fotos con ruta relativa en `ActivoForm`. `AdminActivosPage` cuenta las ofertas de un activo con `sub_v_resumen_ofertas` antes de eliminarlo.

---

## Fase 4: Infraestructura
- [x] **T008**: Crear `scripts/nginx-limite-login.conf` (límite por IP y `real_ip` desde 127.0.0.1).
- [x] **T009**: `scripts/deploy.ps1`: `.env.production.local` solo necesita la anon key.

---

## Fase 5: Calidad y Despliegue
- [x] **T010**: `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build` sin errores.
- [x] **T011**: Aplicar `sql/16` en el NUC (registrada en `sub_migraciones` el 2026-10-26), instalar la conf de Nginx en `/etc/nginx/conf.d/subastas-limite-login.conf` y publicar el build.
- [x] **T012**: Comprobar en el access log de Nginx que las visitas por el túnel muestran la IP pública real.
- [ ] **T013**: Prueba manual desde un celular con datos móviles: login, catálogo con fotos, ofertar y Mis Ofertas.
- [ ] **T014**: Con la anon key, `GET /rest/v1/sub_colaboradores` responde 401.

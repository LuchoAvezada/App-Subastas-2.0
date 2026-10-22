# Tasks: F09 — Cierre de la API Pública

**Feature**: F09  
**Fecha**: 2026-10-22  
**Estado**: Implementada, pendiente de despliegue  

---

## Fase 1: Pruebas
- [x] **T001**: Crear `tests/sin-escrituras-directas.test.ts`. Recorre `src/` y falla ante `.from(...).insert/update/upsert/delete`, y se comprobó que detecta las 11 escrituras del código anterior.
- [x] **T002**: Probar la migración en PostgreSQL (PGlite) con roles `anon`/`authenticated` y esquema `storage` simulados. Se probaron instalación nueva (`00` + `14` dos veces) y actualización (`01`…`13` + `14` dos veces):
  - escrituras directas y lectura de `sub_usuarios` rechazadas con `42501`;
  - lecturas de la app permitidas;
  - cada RPC con token válido, inválido y de no-admin;
  - oferta ajena, importación con rol Administrador, subida a ruta no autorizada.

---

## Fase 2: SQL
- [x] **T003**: Crear `sql/14_hardening_api.sql`:
  - `validar_sesion`, `respuesta_sesion_invalida`;
  - `registrar_oferta` y `cancelar_oferta` por token;
  - `procesar_ganadores(p_token)`;
  - RPC de colaboradores, configuración y activos;
  - `autorizar_subida_foto` y `subida_autorizada`;
  - `REVOKE` y políticas de Storage.
- [x] **T004**: Replicar en `sql/00_instalacion_completa.sql`.

---

## Fase 3: Interfaz
- [x] **T005**: Crear `src/hooks/useRpcSesion.ts` y agregar `codigo` a `RpcResponse`.
- [x] **T006**: Reemplazar las escrituras directas:
  - `ColaboradorForm`, `ColaboradoresList`, `ImportarColaboradoresCsv` y `ConfigSubasta`;
  - `ActivoForm` (más la subida de fotos), `AdminActivosPage`;
  - `useOfertas` y `PanelEvaluacion`.

---

## Fase 4: Calidad y Despliegue
- [x] **T007**: `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build` sin errores.
- [x] **T008**: Aplicar la migración en el NUC, publicar el build y comprobar con `curl` usando la anon key real (2026-10-22: verificación toda `false`; escrituras y `sub_usuarios` → 401; token falso → `SESION_INVALIDA`; Storage sin ruta autorizada → 403).
- [ ] **T009**: Prueba manual de punta a punta como admin y como usuario:
  - alta y edición de colaborador, importación CSV y fecha de cierre;
  - activo con foto;
  - ofertar, cancelar y adjudicar.

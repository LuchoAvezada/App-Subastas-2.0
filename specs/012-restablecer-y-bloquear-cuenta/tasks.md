# Tasks: F12 — Restablecer Contraseña y Bloquear Acceso

**Feature**: F12  
**Fecha**: 2026-10-27  
**Estado**: Desplegada (2026-10-27), falta la prueba manual  
**Redactado**: 2026-10-28, a partir de la implementación (commits `270489b` y `b4f0bf9`).  

---

## Fase 1: Pruebas
- [ ] **T001**: Prueba automatizada de `restablecer_cuenta`, `habilitar_colaborador` y `autenticar_usuario` en PostgreSQL (PGlite, como en F09): propia cuenta rechazada, auditoría registrada, mensaje de bloqueo solo con la contraseña correcta. No se hizo al implementar.

---

## Fase 2: SQL
- [x] **T002**: Crear `sql/20_restablecer_y_bloquear_cuenta.sql`: vista con `id_cargo`, `habilitar_colaborador` con auditoría y sin bloqueo propio, `restablecer_cuenta`.
- [x] **T003**: Crear `sql/21_login_cuenta_bloqueada.sql`: mensaje propio para la cuenta bloqueada.
- [x] **T004**: Replicar ambas en `sql/00_instalacion_completa.sql`.

---

## Fase 3: Interfaz
- [x] **T005**: En `ColaboradoresList.tsx`, botones "Bloquear / Desbloquear acceso" (candado) y "Restablecer contraseña" (llave) con confirmación, ocultos en la fila del propio admin; el estado pasa a etiqueta.

---

## Fase 4: Calidad y Despliegue
- [x] **T006**: `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build` sin errores (comprobado otra vez el 2026-10-28: 133 pruebas).
- [x] **T007**: Aplicar `sql/20` y `sql/21` en el NUC (registradas en `sub_migraciones` el 2026-10-27) y publicar el build `270489b`.
- [ ] **T008**: Prueba manual de los criterios de aceptación de `spec.md` §4.

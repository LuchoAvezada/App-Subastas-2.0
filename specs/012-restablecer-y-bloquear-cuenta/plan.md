# Architecture & Implementation Plan: F12 — Restablecer Contraseña y Bloquear Acceso

**Feature**: F12  
**Fecha**: 2026-10-27  
**Redactado**: 2026-10-28, a partir de la implementación (commits `270489b` y `b4f0bf9`). La feature se implementó con `spec.md` solamente; este plan documenta las decisiones tomadas.  

---

## 1. Decisiones de Arquitectura

### A. Restablecer = borrar la cuenta
- `restablecer_cuenta(p_token, p_id_colaborador)` borra la fila de `sub_usuarios` (y con ella sus sesiones) y los intentos fallidos de login.
- El colaborador vuelve a "Pendiente" y se registra con el flujo de F02, que ya existía. No hace falta contraseña temporal ni correo.
- Ofertas, resultados, rol y habilitación cuelgan de `id_colaborador`, no de la cuenta, así que no se tocan.

### B. Bloquear = `habilitado = NO`
- Se reutiliza `habilitar_colaborador` (F09). Con `habilitado = NO`, el login, el registro, las sesiones abiertas y la adjudicación ya excluían al colaborador.
- No hay estado nuevo: solo se agrega la regla de no bloquearse a sí mismo y la auditoría.

### C. Mensaje de cuenta bloqueada sin revelar cédulas
- `autenticar_usuario` (`sql/21`) responde "Su cuenta se encuentra bloqueada..." solo si la contraseña es correcta.
- Con una contraseña incorrecta sigue respondiendo "Credenciales inválidas.".
- Ese caso no suma intento fallido: al desbloquearlo, el colaborador no queda trabado 15 minutos.

### D. Reglas en el servidor, no solo en la pantalla
- La app oculta candado y llave en la fila del propio admin, y las funciones rechazan la operación igual.
- Cada bloqueo, desbloqueo y restablecimiento queda en `sub_auditoria_cambios` con la cédula del admin del token.

### E. Corrección de la vista de colaboradores
- `sub_v_datos_colaborador` vuelve a traer `id_cargo` en `00_instalacion_completa.sql`, como ya hacía la migración 09.

---

## 2. Componentes a Crear / Modificar

1. **`sql/20_restablecer_y_bloquear_cuenta.sql` (nuevo, transaccional e idempotente):** vista con `id_cargo`, `habilitar_colaborador` con auditoría y regla propia, `restablecer_cuenta`. Requiere `16_lecturas_con_sesion.sql`.
2. **`sql/21_login_cuenta_bloqueada.sql` (nuevo):** reemplaza `autenticar_usuario`. Requiere `17_login_rapido.sql`.
3. **`sql/00_instalacion_completa.sql`:** los mismos cambios.
4. **`src/components/admin/ColaboradoresList.tsx`:** botones de candado y llave con modal de confirmación; el estado pasa a ser una etiqueta.

---

## 3. Despliegue

- Primero la migración: el frontend nuevo llama a `restablecer_cuenta`, que solo existe tras `sql/20`.
- Pasos:
  1. Aplicar `sql/20_restablecer_y_bloquear_cuenta.sql`.
  2. Publicar el build con `scripts/deploy.ps1`.
  3. Aplicar `sql/21_login_cuenta_bloqueada.sql` (no depende del frontend).

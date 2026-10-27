# Feature Specification: F12 — Restablecer Contraseña y Bloquear Acceso

**Feature ID**: F12  
**Fecha**: 2026-10-27  
**Estado**: Implementada (pendiente de aplicar `sql/21_login_cuenta_bloqueada.sql` en el NUC)  

---

## 1. Motivación

- La app no tiene recuperación de contraseña. Hasta ahora, para que alguien volviera a registrarse había que borrar su cuenta por consola en el NUC.
- El bloqueo de acceso existía como un clic sobre el estado "HABILITADO / INACTIVO", sin confirmación y sin que se notara que era un botón.
- Al editar un colaborador, el formulario pedía elegir el cargo otra vez: la vista `sub_v_datos_colaborador` de `00_instalacion_completa.sql` no traía `id_cargo` (la migración 09 lo había agregado, pero la instalación completa no).

## 2. Reglas (decididas por el usuario el 2026-10-27)

### RF-01: Restablecer contraseña solo por un administrador
- El colaborador **no** puede pedirlo desde la app: debe contactar a un administrador.
- En Colaboradores, quien tiene cuenta "Registrado" muestra el botón "Restablecer contraseña" (llave).
- Tras confirmar, `restablecer_cuenta(p_token, p_id_colaborador)` borra su cuenta y sus sesiones, y sus intentos fallidos de login.
- El colaborador, su rol, su habilitación, sus ofertas y resultados no cambian: dependen de `id_colaborador`, no de la cuenta.
- Pasa a "Pendiente" y vuelve a registrarse en "Activar / Registrar mi cuenta".

### RF-02: Bloquear acceso = inhabilitar
- El botón "Bloquear acceso" (candado) pone `habilitado = NO`, con confirmación. "Desbloquear" lo revierte.
- Bloqueado: no inicia sesión ni se registra, sus sesiones abiertas dejan de valer y sus ofertas no cuentan en la adjudicación.
- Al intentar entrar con la contraseña correcta ve "Su cuenta se encuentra bloqueada, contacte a su administrador." (`sql/21_login_cuenta_bloqueada.sql`). Con una contraseña incorrecta sigue viendo "Credenciales inválidas.", para no revelar qué cédulas están bloqueadas.
- El estado en la tabla pasa a ser una etiqueta (HABILITADO / BLOQUEADO), no un botón.

### RF-03: Sobre la propia cuenta
- Un administrador no puede bloquearse ni restablecer su propia cuenta. La app no muestra esos botones en su fila y el servidor lo rechaza.

### RF-04: Auditoría
- Bloqueos, desbloqueos y restablecimientos quedan en `sub_auditoria_cambios` con la cédula del administrador.

## 3. Fuera de Alcance

- Recuperación de contraseña por el propio usuario, contraseñas temporales o envío de correos.
- Segundo factor en el registro: entre el restablecimiento y el nuevo registro, quien conozca la CI podría registrarse antes. El modal lo advierte.
- El formulario de edición todavía permite que un admin se ponga a sí mismo "No habilitado" o cambie su rol (comportamiento previo a F12).

## 4. Criterios de Aceptación

- [ ] Editar un colaborador muestra su cargo ya seleccionado.
- [ ] El botón de llave solo aparece en colaboradores "Registrado"; tras confirmar, pasa a "Pendiente" y puede registrarse con una contraseña nueva.
- [ ] Bloquear a un colaborador con sesión abierta: en su próxima acción la app lo saca; al volver a entrar ve el mensaje de cuenta bloqueada.
- [ ] En la fila del propio admin no aparecen candado ni llave; llamar a las funciones con su propio id responde con error.
- [ ] Cada acción deja una fila en `sub_auditoria_cambios`.

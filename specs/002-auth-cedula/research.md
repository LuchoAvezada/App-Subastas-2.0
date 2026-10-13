# Research & Decisiones Técnicas: F02 — Autenticación por Cédula y Seguridad de Acceso

**Feature Branch**: `002-auth-cedula`  
**Fecha**: 2026-10-13  
**Estado**: Completado  

---

## 1. Identificador de Acceso: Cédula de Identidad (`ci_documento`)

- **Contexto:** En Agrotec S.A. cada colaborador está pre-cargado desde Recursos Humanos con su número de documento de identidad paraguayo.
- **Decisión:** El único identificador aceptado para login y registro es `ci_documento`. Se normaliza mediante `trim()` para evitar problemas con espacios accidentales al copiar/pegar.
- **Alternativas descartadas:**
  - *Correo corporativo:* Descartado para alinearse al estándar interno y evitar dependencias de cuentas de correo en colaboradores operativos o de campo.

---

## 2. RPCs Seguros en Supabase con `pgcrypto`

- **Contexto:** Las contraseñas nunca deben almacenarse en texto plano ni hashearse en el cliente con algoritmos débiles.
- **Decisión:** Delegar la autenticación y registro en funciones PL/pgSQL ejecutadas con `SECURITY DEFINER`:
  - `autenticar_usuario(p_ci_documento, p_password, p_ip)`: Compara el hash con `crypt(p_password, u.password_hash)`.
  - `registrar_nuevo_usuario(p_ci_documento, p_password)`: Genera el hash con `crypt(p_password, gen_salt('bf', 10))`.
- **Beneficio:** Blindaje contra manipulaciones en el frontend; las credenciales se validan directamente en el motor PostgreSQL.

---

## 3. Prevención de Ataques de Fuerza Bruta (Rate Limiting en BD)

- **Contexto:** Se requiere prevenir ataques de adivinación de contraseñas.
- **Decisión:** La tabla `sub_intentos_login` audita cada intento ('S' o 'N') con timestamp. Si existen $\ge 5$ intentos fallidos ('N') en los últimos 15 minutos, la función `autenticar_usuario` bloquea el acceso inmediatamente retornando:
  `"Demasiados intentos fallidos. Su cuenta está bloqueada temporalmente por 15 minutos."`
- **Manejo en Frontend:** El cliente detecta este mensaje y lo muestra claramente en el banner de error.

---

## 4. Separación de Roles (RBAC) y Regla de Equidad P9

- **Contexto:** La Constitución (P9) exige que los administradores no puedan competir con los colaboradores en las subastas.
- **Decisión:**
  - `Rol 1` = Administrador (`es_admin = true`): Administra el sistema (`/admin/*`), pero `puedeOfertar(usuario)` es estrictamente `false`.
  - `Rol 2` = Usuario (`es_admin = false`): Colaborador habilitado para pujar (`puedeOfertar(usuario)` es `true`). No puede acceder a `/admin/*`.
  - `Rol 3` = Visitante (`es_admin = false`, `puedeOfertar(usuario) = false`).
- **Manejo de Rutas:**
  - `ProtectedRoute`: Redirige a `/login` si `usuario == null`, recordando la ruta en `state.from`.
  - `AdminRoute`: Redirige a `/` si `!usuario?.es_admin`.

---

## 5. Validación de Complejidad de Contraseña

- **Contexto:** La seguridad de la cuenta depende de contraseñas que no sean triviales.
- **Decisión:** Doble capa de validación (cliente en `src/lib/utils.ts` y servidor en `03_functions.sql`):
  1. Mínimo 8 caracteres.
  2. Al menos una letra mayúscula (`/[A-Z]/`).
  3. Al menos una letra minúscula (`/[a-z]/`).
  4. Al menos un dígito numérico (`/[0-9]/`).
  5. La contraseña no puede ser idéntica al número de cédula (`password !== ci_documento`).

---

## 6. Persistencia de Sesión y Cierre Seguro

- **Contexto:** La sesión debe persistir al recargar la página pero ser fácilmente invalidada al cerrar sesión.
- **Decisión:** Se almacena el objeto `Usuario` en `localStorage` bajo la clave `subasta_user`. En `logout()`, se remueve inmediatamente y se reinicia el estado en memoria. En caso de JSON corrupto, se captura la excepción y se purga el almacenamiento.

# Feature Specification: F02 — Autenticación por Cédula y Seguridad de Acceso

**Feature Branch**: `002-auth-cedula`  
**Created**: 2026-10-13  
**Status**: In Progress  
**Input**: Autenticación por Cédula y Seguridad de Acceso (F02 del Backlog)

---

## 1. User Scenarios & Testing

### User Story 1 - Inicio de Sesión por Cédula de Identidad (Prioridad: P1)
Como colaborador pre-cargado de Agrotec S.A., quiero iniciar sesión ingresando únicamente mi número de Cédula de Identidad (`ci_documento`) y mi contraseña establecida, para acceder al portal de subastas de forma rápida, segura y verificada.

- **Por qué esta prioridad:** La autenticación por cédula es la puerta de entrada indispensable a toda la operativa de la plataforma (Constitución P3).
- **Prueba independiente:** Ingresar credenciales válidas en `/login` y verificar que el usuario queda autenticado, se almacena su sesión con nombre y rol, y es redirigido a la página de inicio o a la ruta previa solicitada.
- **Escenarios de Aceptación:**
  1. **Given** un colaborador con usuario activo y habilitado (`habilitado = 'SI'`), **When** ingresa su CI y contraseña correcta, **Then** inicia sesión exitosamente y es redirigido a su destino.
  2. **Given** un usuario que ingresa una contraseña errónea, **When** presiona "Iniciar Sesión", **Then** el sistema muestra "Credenciales inválidas" sin revelar si falló el usuario o la contraseña.
  3. **Given** un usuario que comete 5 intentos fallidos consecutivos en menos de 15 minutos, **When** intenta un sexto acceso, **Then** el sistema bloquea temporalmente el acceso e informa el bloqueo por 15 minutos.

---

### User Story 2 - Activación y Registro Inicial de Colaboradores (Prioridad: P1)
Como colaborador de Agrotec que nunca ha ingresado al portal, quiero registrar mi contraseña ingresando mi Cédula de Identidad paraguaya, para que el sistema valide que estoy en la nómina de colaboradores habilitados y me permita crear mi acceso con una contraseña robusta.

- **Por qué esta prioridad:** Ningún colaborador nuevo puede participar sin haber activado su cuenta primero.
- **Prueba independiente:** Ingresar a `/registro`, colocar una CI válida pre-cargada con `habilitado = 'SI'`, definir una contraseña que cumpla las reglas de seguridad, y verificar la creación exitosa y redirección al login.
- **Escenarios de Aceptación:**
  1. **Given** una CI que no existe en `sub_colaboradores`, **When** intenta registrarse, **Then** el sistema muestra "El documento ingresado no se encuentra registrado como colaborador."
  2. **Given** un colaborador con `habilitado != 'SI'`, **When** intenta registrarse, **Then** el sistema muestra "Usted no se encuentra habilitado para participar de la subasta. Contacte al administrador."
  3. **Given** un colaborador que ya creó su usuario anteriormente, **When** intenta registrarse de nuevo, **Then** el sistema indica que ya existe un usuario y le solicita iniciar sesión.
  4. **Given** una contraseña que no cumple los requisitos (mínimo 8 caracteres, mayúscula, minúscula, número o igual a la CI), **When** se envía el formulario, **Then** la validación en el cliente y servidor rechaza la contraseña con un mensaje descriptivo.
  5. **Given** datos válidos y contraseñas coincidentes, **When** se confirma el registro, **Then** se activa la cuenta y se muestra confirmación visual antes de redirigir a `/login`.

---

### User Story 3 - Control de Roles y Protección de Rutas (Prioridad: P1)
Como sistema de seguridad y equidad, quiero proteger todas las rutas privadas mediante guardias de navegación (`ProtectedRoute` y `AdminRoute`) y reconocer de forma determinística los tres roles (Rol 1 = Admin, Rol 2 = Usuario, Rol 3 = Visitante), para que los no autenticados vayan a `/login`, los usuarios sin privilegios no puedan entrar a `/admin/*`, y los administradores no puedan pujar en subastas (Constitución P9).

- **Por qué esta prioridad:** Previene accesos no autorizados y garantiza las reglas innegociables de equidad y separación de funciones.
- **Prueba independiente:** Intentar navegar a rutas protegidas (`/`, `/catalogo/tablets`, `/mis-ofertas`, `/admin/ofertas`) sin estar autenticado o con distintos roles, verificando las redirecciones y los permisos en la UI.
- **Escenarios de Aceptación:**
  1. **Given** un visitante anónimo, **When** navega a cualquier ruta privada, **Then** es redirigido a `/login` guardando la ruta intentada en `location.state.from`.
  2. **Given** un colaborador con rol Usuario (Rol 2), **When** intenta acceder a `/admin/activos` o cualquier subruta `/admin/*`, **Then** es redirigido a `/` sin acceso al panel administrativo.
  3. **Given** un usuario autenticado como Administrador (Rol 1), **When** accede a `/admin/*`, **Then** puede gestionar la administración, pero la función `puedeOfertar(usuario)` evalúa estrictamente `false`.

---

### User Story 4 - Cierre de Sesión Seguro (Prioridad: P2)
Como usuario que comparte equipo o termina su sesión, quiero cerrar mi sesión explícitamente desde la barra de usuario, para limpiar mis credenciales del navegador y evitar accesos no autorizados.

- **Por qué esta prioridad:** Higiene básica de seguridad en terminales compartidas dentro de la empresa.
- **Prueba independiente:** Presionar "Cerrar sesión" y comprobar que `localStorage` se limpia y el usuario es devuelto a `/login`.
- **Escenarios de Aceptación:**
  1. **Given** un usuario autenticado, **When** hace clic en "Cerrar sesión", **Then** el estado de autenticación se restablece a `null`, se elimina el token/almacenamiento local y se redirige a `/login`.

---

### User Story 5 - Identidad Visual Oficial en Registro y Login (Prioridad: P2)
Como colaborador que ingresa al portal, quiero que tanto la pantalla de Inicio de Sesión como la de Registro mantengan la estética corporativa de Agrotec (logo oficial `/brand/logo-agrotec.svg`, fondo limpio `#F5F5F5`, tipografía Gabarito, colores institucionales `#1C5A34` y `#8A2733`), eliminando degradados oscuros o isotipos genéricos no oficiales.

- **Por qué esta prioridad:** Cumple con la directiva de marca unificada (Constitución P7).
- **Prueba independiente:** Comparar visualmente `/login` y `/registro` y verificar que ambas comparten el mismo lenguaje visual limpio y corporativo de Agrotec.
- **Escenarios de Aceptación:**
  1. **Given** la página `/registro`, **When** se renderiza, **Then** exhibe el logo oficial de Agrotec, fondo claro institucional y tarjetas con bordes definidos.

---

## 2. Requisitos Funcionales

- **RF-001:** Acceso exclusivo por Cédula paraguaya (`ci_documento`), normalizando espacios en blanco antes de invocar la autenticación.
- **RF-002:** Integración con RPC `autenticar_usuario(p_ci_documento, p_password, p_ip)` en Supabase / PostgreSQL.
- **RF-003:** Integración con RPC `registrar_nuevo_usuario(p_ci_documento, p_password)` en Supabase / PostgreSQL.
- **RF-004:** Validación de contraseña tanto en cliente como en backend:
  - Mínimo 8 caracteres.
  - Al menos 1 letra mayúscula.
  - Al menos 1 letra minúscula.
  - Al menos 1 dígito numérico.
  - Distinta del número de cédula.
- **RF-005:** Manejo explícito del mensaje de bloqueo por fuerza bruta tras 5 intentos fallidos consecutivos en ventana de 15 minutos.
- **RF-006:** Persistencia de sesión en almacenamiento local del cliente (`subasta_user`) con carga asíncrona segura y recuperación de errores de parseo.
- **RF-007:** Regla RBAC institucional:
  - Rol 1: Administrador (`es_admin = true`, acceso a `/admin/*`, `puedeOfertar = false`).
  - Rol 2: Usuario (`es_admin = false`, sin acceso a `/admin/*`, `puedeOfertar = true`).
  - Rol 3: Visitante (`es_admin = false`, sin acceso a `/admin/*`, `puedeOfertar = false`).
- **RF-008:** Redirección post-login preservando la ruta previa solicitada (`location.state.from`).
- **RF-009:** Redirección a `/login` al intentar ingresar sin sesión a cualquier ruta de la aplicación.
- **RF-010:** Pantallas de Login y Registro 100% alineadas a los tokens de identidad visual oficial de Agrotec.

---

## 3. Criterios de Éxito

- **SC-001:** 100% de los flujos de autenticación (login, registro, logout, protección de rutas y admin) cubiertos por pruebas automatizadas en Vitest.
- **SC-002:** 0 accesos a rutas privadas sin sesión activa.
- **SC-003:** 0 accesos de colaboradores estándar al panel `/admin/*`.
- **SC-004:** Cero advertencias ni errores en `npm.cmd run lint` y `npm.cmd run build`.
- **SC-005:** Experiencia visual coherente y accesible en dispositivos móviles y de escritorio.

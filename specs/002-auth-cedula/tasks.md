# Tasks: F02 — Autenticación por Cédula y Seguridad de Acceso

**Branch**: `002-auth-cedula` | **Fecha**: 2026-10-13 | **Estado**: Ready

---

## Fase 1: Pruebas Unitarias de Autenticación y Dominio (TDD)

- [ ] **T001**: Crear archivo de pruebas `tests/auth.test.ts` con cobertura de validaciones de contraseña (`validatePassword`), desinfección de documento CI (`ci.trim()`) y permisos de puja por rol (`puedeOfertar(usuario)`).
- [ ] **T002**: Agregar pruebas de control de acceso por rol (`Rol 1 = Admin`, `Rol 2 = Usuario`, `Rol 3 = Visitante`) y manejo de almacenamiento local en `tests/auth.test.ts`.

---

## Fase 2: Implementación y Refuerzo de Seguridad

- [ ] **T003**: Robustecer `src/contexts/AuthContext.tsx`:
  - Asegurar desinfección de entrada con `ci.trim()`.
  - Manejar el retorno estructurado de RPC Supabase para capturar mensajes de bloqueo preventivo ("Demasiados intentos fallidos. Su cuenta está bloqueada temporalmente por 15 minutos.").
  - Mejorar la tolerancia a fallos en el parsing de `localStorage` (`subasta_user`).
- [ ] **T004**: Verificar y ajustar protección de rutas en `src/components/layout/ProtectedRoute.tsx` y `src/components/layout/AdminRoute.tsx` para garantizar redirección correcta conservando `state.from`.

---

## Fase 3: Identidad Visual Oficial en Registro y Login

- [ ] **T005**: Rediseñar `src/pages/RegistroPage.tsx`:
  - Reemplazar contenedor de degradado oscuro y cuadro de texto genérico por el fondo claro oficial `#F5F5F5` y el logo vectorial `/brand/logo-agrotec.svg`.
  - Aplicar tipografía Gabarito, tarjeta blanca con borde `#E4E4E4` y paleta corporativa `#1C5A34` / `#8A2733`.
  - Asegurar feedback accesible de error, éxito y redirección fluida a `/login`.
- [ ] **T006**: Revisar y pulir `src/pages/LoginPage.tsx` para mantener consistencia 1:1 de marca y asegurar que la contraseña y CI se validen apropiadamente antes del envío.

---

## Fase 4: Calidad, Linting, Compilación y Verificación Visual

- [ ] **T007**: Ejecutar suite de pruebas con `npm.cmd test` y verificar 100% de tests aprobados.
- [ ] **T008**: Ejecutar linter con `npm.cmd run lint` y build con `npm.cmd run build`.
- [ ] **T009**: Verificar en navegador integrado las vistas `/login` y `/registro` tanto en resolución de escritorio como en móvil.
- [ ] **T010**: Actualizar `docs/sdd/backlog.md` marcando F02 como completada, consolidar commits y preparar merge a `main`.

# Quickstart: F02 — Autenticación por Cédula y Seguridad de Acceso

**Feature Branch**: `002-auth-cedula`  
**Fecha**: 2026-10-13  

---

## 1. Verificación Rápida en Entorno Local

1. Asegúrate de tener el servidor dev activo en `http://localhost:5174/` (o ejecútalo con `npm.cmd run dev`).
2. Ingresa a `http://localhost:5174/login`.
3. Prueba el botón rápido **Usuario Demo** o **Admin Demo** (habilitado únicamente en desarrollo) para verificar la carga inmediata de sesión y roles.
4. Para probar el formulario de activación, navega a `http://localhost:5174/registro`.
5. Ejecuta las pruebas automatizadas de autenticación:
   ```powershell
   npm.cmd test
   ```
6. Verifica que no haya errores de linter ni compilación:
   ```powershell
   npm.cmd run lint
   npm.cmd run build
   ```

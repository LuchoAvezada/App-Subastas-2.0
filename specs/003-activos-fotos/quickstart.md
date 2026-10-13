# Quickstart: F03 — Gestión de Activos y Carga de Fotos (Panel Admin)

**Feature Branch**: `003-activos-fotos`  
**Fecha**: 2026-10-13  

---

## 1. Verificación Rápida

1. Iniciar sesión con un usuario Administrador (en desarrollo local usar el botón "Admin Demo" en `/login`).
2. Navegar a `/admin/activos`.
3. Comprobar la tabla con miniaturas de fotos, precios en USD y estados.
4. Presionar "Nuevo Activo" y registrar un equipo completando marca, modelo, precio base y subiendo una imagen.
5. Editar un activo existente y verificar que los datos se precargan correctamente.
6. Ejecutar pruebas automatizadas:
   ```powershell
   npm.cmd test
   ```
7. Verificar linter y compilación:
   ```powershell
   npm.cmd run lint
   npm.cmd run build
   ```

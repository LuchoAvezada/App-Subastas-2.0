# Quickstart: F04 — Catálogo de Activos, Visibilidad de Ofertas y Pujas

**Feature Branch**: `004-catalogo-ofertas`  
**Fecha**: 2026-10-13  

---

## 1. Verificación Rápida

1. Iniciar sesión como **Usuario Demo** (María Elena González).
2. Navegar a `/catalogo/notebooks`.
3. Comprobar que cada tarjeta muestra:
   - Precio Base en USD.
   - Monto Líder actual (o "Sin ofertas").
   - Cantidad total de ofertas enviadas.
4. Presionar "Realizar Oferta", ingresar un monto superior al precio base y confirmar.
5. Iniciar sesión como **Admin Demo** (Juan Carlos Pérez).
6. Ir a `/catalogo/notebooks` y verificar que el botón muestra "Solo para participantes" deshabilitado.
7. Ir a `/admin/config` y probar el botón de cierre manual de recepción de ofertas.
8. En escritorio, presionar el botón de colapsar la barra lateral y verificar la transición fluida.
9. Ejecutar pruebas automatizadas:
   ```powershell
   npm.cmd test
   ```

# Architecture & Implementation Plan: F10 — Lecturas con Sesión y Publicación por Túnel

**Feature**: F10  
**Fecha**: 2026-10-26  
**Redactado**: 2026-10-28, a partir de la implementación (commit `e9629f6`). La feature se implementó con `spec.md` solamente; este plan documenta las decisiones tomadas.  

---

## 1. Decisiones de Arquitectura

### A. Tailscale Funnel para publicar en internet
- Gratis, sin abrir puertos en el router ni depender de TI, con HTTPS incluido.
- Funnel entrega el tráfico a Nginx en el puerto 80 del NUC, igual que una visita por la LAN.

### B. La anon key solo lee el catálogo
- Se sigue la línea de F09: privilegios de tabla en lugar de RLS, porque todas las peticiones llegan como `anon`.
- `REVOKE SELECT` en todo el esquema `public` y `GRANT SELECT` solo a `sub_activos`, `sub_app_config`, `sub_cargos` y `sub_v_resumen_ofertas`.
- `ALTER DEFAULT PRIVILEGES` evita que una tabla futura nazca legible.

### C. Resumen anónimo calculado en el servidor
- `sub_v_resumen_ofertas` devuelve una fila por activo con `total_ofertas` y `monto_lider`, sin postor (P9).
- Antes el cliente recibía todas las ofertas y calculaba el máximo. La vista pesa poco aunque todos consulten cada 6 s y no se trunca con muchas ofertas.

### D. Una sola RPC de lectura con token
- `leer_datos(p_token, p_consulta)` valida la sesión con `validar_sesion` (F09) y devuelve `{ success, filas }`.
- Cada consulta tiene su regla de acceso (ver `spec.md` RF-02). Una sola función evita multiplicar firmas y permisos.

### E. URL de la API desde el navegador
- En producción `src/lib/supabase.ts` usa `window.location.origin`: Nginx sirve la página y proxya la API en el mismo origen.
- El mismo build funciona por `http://20.20.20.77` y por `https://sp009.taildad9ad.ts.net`.
- Las fotos se guardan con ruta relativa; la migración convierte las guardadas con la IP.

### F. Límite de intentos en Nginx
- `limit_req` sobre `autenticar_usuario` y `registrar_nuevo_usuario`: 20 por minuto por IP, ráfaga de 40, respuesta 429.
- `real_ip_header X-Forwarded-For` solo desde 127.0.0.1, para ver la IP real de las visitas por el túnel.

---

## 2. Componentes a Crear / Modificar

1. **`sql/16_lecturas_con_sesion.sql` (nuevo, transaccional e idempotente):** vista de resumen, `leer_datos`, permisos y conversión de rutas de fotos. Termina con una consulta de verificación.
2. **`sql/00_instalacion_completa.sql`:** el mismo bloque F10.
3. **Frontend:**
   - `src/lib/supabase.ts` (URL por origen) y `src/contexts/AuthContext.tsx` (mensaje ante 429);
   - `useResumenOfertas.ts` (lee la vista), `useOfertas.ts` (`mis_ofertas`);
   - `ResultadosPage.tsx`, `PanelEvaluacion.tsx`, `ColaboradoresList.tsx`, `ImportarColaboradoresCsv.tsx` (`leer_datos`);
   - `ActivoForm.tsx` (ruta relativa de fotos) y `AdminActivosPage.tsx` (cuenta las ofertas de un activo con la vista de resumen antes de eliminarlo).
4. **`scripts/nginx-limite-login.conf` (nuevo)** y `scripts/deploy.ps1` (`.env.production.local` solo necesita la anon key).
5. **Pruebas:** `tests/sin-escrituras-directas.test.ts` también falla si `src/` lee con `.from()` una tabla no legible; `tests/ofertas.test.ts` pasa al formato de la vista.

---

## 3. Despliegue

- Frontend y migración van **juntos**: el frontend anterior deja de ver ofertas, colaboradores y resultados.
- Pasos:
  1. Aplicar `sql/16_lecturas_con_sesion.sql` y revisar la verificación final.
  2. Copiar `scripts/nginx-limite-login.conf` a `/etc/nginx/conf.d/` y recargar Nginx.
  3. Publicar el build con `scripts/deploy.ps1`.
  4. Activar el túnel: `sudo tailscale funnel --bg 80`.

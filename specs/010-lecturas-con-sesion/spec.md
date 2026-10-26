# Feature Specification: F10 — Lecturas con Sesión y Publicación por Túnel

**Feature ID**: F10  
**Fecha**: 2026-10-26  
**Estado**: Implementada (pendiente de aplicar `sql/16_lecturas_con_sesion.sql` y la config de Nginx en el NUC)  

---

## 1. Resumen y Motivación

La app se publica en internet con **Tailscale Funnel** (`https://sp009.taildad9ad.ts.net`): gratis, sin abrir puertos ni intervención de TI, con HTTPS incluido. El acceso es libre porque hay colaboradores que no van a la oficina.

F09 cerró las escrituras, pero con la anon key todavía se podía leer:
- la nómina (`sub_colaboradores`: cédula, nombre, ingreso);
- todas las ofertas con nombre y cédula del postor (`sub_v_ofertas_recibidas`), lo que rompe P9;
- los resultados antes de publicarse (`sub_v_resultados_detalle`).

Además, el build tenía fija la URL `http://20.20.20.77` y las fotos se guardaban con esa IP, así que desde internet no cargaban.

---

## 2. Requerimientos Funcionales

### RF-01: La anon key solo lee el catálogo
- `anon` y `authenticated` leen únicamente `sub_activos`, `sub_app_config` (también por Realtime), `sub_cargos` y `sub_v_resumen_ofertas`.
- `sub_v_resumen_ofertas` tiene una fila por activo, con la cantidad de ofertas y el monto líder y sin postor (F04, P9).
- Las tablas que se creen en el futuro no nacen legibles.

### RF-02: Lecturas con token
`leer_datos(p_token, p_consulta)` valida la sesión y devuelve `{ success, filas }`:

| Consulta | Quién | Reemplaza a |
|---|---|---|
| `mis_ofertas` | cualquier sesión, solo las propias | `useOfertas` |
| `resultados` | admin siempre; el resto si están publicados | `ResultadosPage` |
| `ofertas` | admin | `PanelEvaluacion` |
| `colaboradores` | admin | `ColaboradoresList` |
| `nomina` | admin | `ImportarColaboradoresCsv`, reporte de ganadores |

### RF-03: Misma app por la LAN y por el túnel
- En producción el cliente usa `window.location.origin` como URL de la API: Nginx sirve la página y la API en el mismo origen.
- Las fotos se guardan con ruta relativa (`/storage/v1/object/public/...`). La migración convierte las que tenían `http://20.20.20.77`.

### RF-04: Límite de intentos por IP
- Nginx limita `autenticar_usuario` y `registrar_nuevo_usuario` a 20 por minuto por IP, con ráfaga de 40, y responde 429 (`scripts/nginx-limite-login.conf`).
- La IP real de las visitas por el túnel sale de `X-Forwarded-For`, que solo se acepta desde 127.0.0.1.
- La app muestra un mensaje claro ante el 429.

---

## 3. Fuera de Alcance (pendientes)

- **Registro de cuenta:** quien conozca la cédula de un colaborador habilitado que todavía no se registró puede crearle la contraseña. Cerrar la lectura de la nómina lo dificulta, pero no lo impide; requiere un segundo factor.
- **Veto P9** solo en el navegador (sin cambios desde F09).
- **Desarrollo local:** las fotos con ruta relativa no cargan en `npm run dev` salvo que `.env` apunte al mismo servidor; se resuelve con un proxy de Vite si hace falta.

---

## 4. Criterios de Aceptación

- [x] `src/` solo usa `.from()` sobre tablas legibles. Lo verifica `tests/sin-escrituras-directas.test.ts`.
- [x] El build no contiene la IP del servidor.
- [x] `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] En el NUC, la verificación final de `sql/16` da `false` en las cinco primeras columnas y `true` en la última.
- [ ] Con la anon key, `GET /rest/v1/sub_colaboradores` responde 401.
- [ ] Desde el celular con datos móviles: login, catálogo con fotos, ofertar, Mis Ofertas.
- [ ] El access log de Nginx muestra IPs públicas (no 127.0.0.1) en las visitas por el túnel.

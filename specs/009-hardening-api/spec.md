# Feature Specification: F09 — Cierre de la API Pública para Publicar en Internet

**Feature ID**: F09  
**Fecha**: 2026-10-22  
**Estado**: Desplegada (`sql/14` aplicada en el NUC el 2026-10-22), falta la prueba manual T009  

---

## 1. Resumen Ejecutivo y Motivación

La app se va a publicar en internet con Cloudflare Tunnel, **sin** Cloudflare Access: los 240 colaboradores entran con la autenticación propia por cédula (P3), que emite un token de sesión de 12 h (`autenticar_usuario`, F07).

La anon key de Supabase viaja en el JS, así que cualquiera que abra la página la tiene. Al 2026-10-22, con esa key se podía:

1. **Escribir tablas directo:**
   - `sub_colaboradores`, incluido cambiar `id_rol` a `1` (hacerse administrador);
   - `sub_activos`, `sub_ofertas` y la fecha de cierre en `sub_app_config`.
2. **Leer datos sensibles:**
   - `sub_usuarios` con `password_hash`;
   - `sub_intentos_login`, con cédulas e IP.
3. **Actuar en nombre de otro por RPC:**
   - `registrar_oferta` y `cancelar_oferta` recibían la cédula del cliente, así que se podía ofertar o anular ofertas de cualquier colaborador;
   - `procesar_ganadores()` era ejecutable por cualquiera y borra y recalcula `sub_resultados`.
4. **Subir archivos** al bucket `activos` sin restricción, y pisar fotos existentes.

Mientras esto siga abierto, la app no se puede publicar.

---

## 2. Requerimientos Funcionales

### RF-01: Sin escrituras directas
- `anon` y `authenticated` no tienen `INSERT`, `UPDATE`, `DELETE` ni `TRUNCATE` sobre ninguna tabla o vista de `public`.
- Las tablas que se creen en el futuro tampoco nacen escribibles.
- Se elimina el `GRANT UPDATE (fecha_fin_subasta)` de F07.

### RF-02: Sin lectura de datos sensibles
- `sub_usuarios`, `sub_intentos_login` y `sub_subidas_autorizadas` no se leen por la API.
- Ninguna vista expuesta devuelve `password_hash`. `sub_v_datos_colaborador` sigue funcionando porque la vista corre con los permisos de su dueño.
- Se mantienen las lecturas que usa la app:
  - `sub_activos`, `sub_colaboradores`, `sub_cargos`, `sub_app_config` (también por Realtime) y `sub_ofertas`;
  - las vistas `sub_v_*`.

### RF-03: Escrituras de administración por RPC con token
- Cada función recibe `p_token` y lo valida con `validar_sesion_admin(p_token)`, el patrón de `publicar_resultados`.
- Las funciones son `SECURITY DEFINER` con `SET search_path = public, extensions, pg_temp`:

| Función | Reemplaza a |
|---|---|
| `guardar_colaborador` (alta o edición, incluido `id_rol`) | `ColaboradorForm.tsx` insert/update |
| `habilitar_colaborador` | `ColaboradoresList.tsx` update |
| `importar_colaboradores` (JSON de filas, una sola sentencia) | `ImportarColaboradoresCsv.tsx` upsert |
| `actualizar_fecha_cierre` | `ConfigSubasta.tsx` (3 updates) |
| `guardar_activo` (alta o edición) | `ActivoForm.tsx` insert/update |
| `eliminar_activo` | `AdminActivosPage.tsx` delete |
| `autorizar_subida_foto` | ruta de la foto elegida en el cliente |
| `procesar_ganadores(p_token)` | `procesar_ganadores()` sin control |

- `importar_colaboradores` mantiene en el servidor la regla de F08: el CSV no asigna el rol Administrador ni se lo quita a quien lo tiene.

### RF-04: Ofertas identificadas por el token
- `registrar_oferta(p_token, p_id_activo, p_monto)` y `cancelar_oferta(p_token, p_id_oferta)` toman al colaborador de la sesión, no de una cédula enviada por el cliente.
- `cancelar_oferta` solo anula ofertas del dueño del token, antes del cierre.
- Se borran las firmas anteriores, que recibían la cédula.
- `registrar_oferta` mantiene las reglas de 08: solo el rol Usuario (`id_rol = 2`) oferta.

### RF-05: Subida de fotos validada
- El admin pide una ruta con `autorizar_subida_foto(p_token, 'jpg' | 'webp')`. La ruta es un UUID que vence a los 10 minutos.
- La política de `INSERT` del bucket `activos` solo acepta rutas autorizadas.
- No hay política de `UPDATE` ni `DELETE`: una foto subida no se puede pisar ni borrar por la API.

### RF-06: Sesión vencida
- Si una RPC responde `codigo = 'SESION_INVALIDA'`, la app cierra la sesión local para que el usuario vuelva a entrar.
- Esto también cubre las sesiones guardadas antes de F07, que no tienen token.

---

## 3. Fuera de Alcance (quedan como pendientes)

- **Lectura con la anon key:**
  - cualquiera puede leer la nómina (`sub_colaboradores`: cédula, nombre, ingreso) y todas las ofertas con nombre y cédula (`sub_v_ofertas_recibidas`);
  - cerrarlo requiere que las lecturas también pasen por el token (P6).
- **Registro de cuenta:**
  - `registrar_nuevo_usuario` deja crear la contraseña a quien conozca la cédula de un colaborador habilitado que todavía no se registró;
  - en internet, esto exige un segundo factor (por ejemplo, un código entregado por RRHH).
- **Veto P9:** el veto tras cancelar una oferta sigue guardado solo en el navegador (`localStorage`). El servidor no impide volver a ofertar.
- **Fotos huérfanas:** si se cancela el formulario después de subir la foto, el archivo queda en el bucket.

---

## 4. Criterios de Aceptación (Definition of Done)

- [x] Con la anon key, `INSERT`, `UPDATE` y `DELETE` directos a `sub_colaboradores`, `sub_activos`, `sub_ofertas` y `sub_app_config` fallan con `42501` (HTTP 401 en PostgREST).
- [x] Con la anon key, `SELECT` a `sub_usuarios` falla con `42501`.
- [x] Cada RPC de administración rechaza un token inválido o de un no-administrador con `SESION_INVALIDA`.
- [x] Un colaborador no puede anular la oferta de otro, y el administrador no puede ofertar.
- [x] La importación CSV no asigna el rol Administrador, el admin conserva su rol y un error no guarda ninguna fila.
- [x] Storage rechaza subir a una ruta no autorizada.
- [x] `src/` no contiene `.from(...).insert/update/upsert/delete`. Lo verifica `tests/sin-escrituras-directas.test.ts`.
- [x] `npm run lint`, `npm run test` y `npm run build` pasan.
- [x] Migración aplicada en el NUC y `curl` de comprobación con la anon key real (2026-10-22).

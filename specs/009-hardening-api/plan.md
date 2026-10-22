# Architecture & Implementation Plan: F09 — Cierre de la API Pública

**Feature**: F09  
**Fecha**: 2026-10-22  

---

## 1. Decisiones de Arquitectura

### A. Privilegios de tabla en lugar de políticas RLS
- La app no usa Supabase Auth: todas las peticiones llegan como `anon`, así que RLS no tiene un usuario con el que distinguir.
- Lo efectivo es quitar el privilegio de escritura y que toda escritura pase por funciones `SECURITY DEFINER`. Esas funciones corren como dueño de las tablas y validan el token por dentro.
- Se aplica a **todas** las tablas (`REVOKE ... ON ALL TABLES IN SCHEMA public`) y no solo a las cuatro del pedido:
  - el frontend no escribe ninguna otra;
  - así no queda abierta, por ejemplo, `sub_intentos_login`.
- `ALTER DEFAULT PRIVILEGES` evita que una tabla futura nazca escribible.

### B. Token de sesión de F07 para todo
- `validar_sesion_admin(p_token)` sirve para las funciones de administración.
- Para las ofertas se agrega `validar_sesion(p_token)`, que devuelve el `id_colaborador` de cualquier sesión válida.
- Las dos son de uso interno: `REVOKE EXECUTE` a `anon`.
- `respuesta_sesion_invalida()` arma el JSON con `codigo = 'SESION_INVALIDA'`, que el frontend ya maneja desde F07.

### C. Una RPC por acción, con parámetros explícitos
- `guardar_colaborador` y `guardar_activo` hacen alta si el id es `NULL` y edición si no, igual que los formularios.
- `importar_colaboradores` recibe las filas ya validadas en el cliente (F08) como `JSONB` y las escribe en un único `INSERT ... ON CONFLICT`: si una falla, no se guarda ninguna.
  - El servidor repite la regla del rol Administrador, porque la validación del cliente se puede saltear.
- `procesar_ganadores(p_token)` envuelve a `procesar_ganadores()`, y a esta última se le quita `EXECUTE` para `anon`. Así no se duplica la lógica de F06.

### D. Fotos: rutas autorizadas por el servidor
Storage no conoce nuestro token y no puede validarlo. Se descartaron tres alternativas:

| Alternativa | Por qué no |
|---|---|
| Header propio | Storage no lo pasa a la política. |
| Token en la ruta | El bucket es público: el token quedaría expuesto en la URL de la foto. |
| URL firmada | Requiere la service key en un servidor intermedio, que hoy no existe. |

Se eligió autorizar la ruta en dos pasos:
1. `autorizar_subida_foto(p_token, ext)` (solo admin) registra en `sub_subidas_autorizadas` una ruta `fotos/activo_<uuid>.<ext>` que vence en 10 minutos.
2. La política `activos_subida` acepta el `INSERT` solo si `public.subida_autorizada(name)` es verdadero. Esa función es `SECURITY DEFINER` y es lo único que `anon` puede consultar de la tabla.

Además:
- Se elimina la política de `UPDATE`, y el cliente sube sin `upsert`. Una ruta ya usada no se puede volver a escribir.
- **Límite conocido:** durante los 10 minutos, quien intercepte la ruta podría subir otro archivo en su lugar, antes que el admin. Requiere ver el tráfico HTTPS del admin, así que se acepta.

### E. Frontend: un solo hook
- `src/hooks/useRpcSesion.ts` agrega `p_token` desde `AuthContext`, devuelve `{ success, error, codigo, ... }` y llama a `logout()` ante `SESION_INVALIDA`.
- Cada punto de escritura pasa a una llamada a este hook.
- `useOfertas.cancelarOferta` pierde el respaldo de `DELETE` directo, que ya no puede funcionar. Además, si la anulación falla, ya no registra el veto.

---

## 2. Componentes a Crear / Modificar

1. **`sql/14_hardening_api.sql` (nuevo, idempotente):**
   - funciones, tabla `sub_subidas_autorizadas`, permisos y políticas de Storage;
   - al final, una consulta de verificación que debe dar todo `false`.
2. **`sql/00_instalacion_completa.sql`:**
   - el mismo bloque F09;
   - se reemplaza el `registrar_oferta` viejo, que además no tenía la regla de rol de 08.
3. **`src/hooks/useRpcSesion.ts` (nuevo)** y `RpcResponse.codigo` en `src/types/domain.ts`.
4. **Componentes que pasan a usar el hook:**
   - `ColaboradorForm.tsx`, `ColaboradoresList.tsx`, `ImportarColaboradoresCsv.tsx` y `ConfigSubasta.tsx`;
   - `ActivoForm.tsx`, `AdminActivosPage.tsx` y `PanelEvaluacion.tsx`;
   - `useOfertas.ts`.
5. **`tests/sin-escrituras-directas.test.ts` (nuevo):** falla si vuelve a aparecer una escritura directa en `src/`.

---

## 3. Despliegue

- Frontend y migración van **juntos**:
  - el frontend nuevo llama funciones que solo existen tras la migración;
  - el frontend viejo usa firmas que la migración borra.
- Pasos:
  1. Aplicar `sql/14_hardening_api.sql`.
  2. Publicar el build en el mismo corte.
  3. Pedir a todos que vuelvan a iniciar sesión. El hook lo fuerza solo ante `SESION_INVALIDA`.

-- ═══════════════════════════════════════════════════════════════════
-- F09 — Cierre de la API pública (anon key) para publicar en internet
--
-- La anon key viaja en el JS, así que cualquiera puede usarla. Desde acá:
--   * Ninguna tabla acepta INSERT/UPDATE/DELETE directo de anon/authenticated.
--   * sub_usuarios (password_hash) e sub_intentos_login no se leen por la API.
--   * Toda escritura pasa por funciones SECURITY DEFINER que reciben el token
--     de sesión emitido por autenticar_usuario (patrón de F07):
--       - las de administración exigen validar_sesion_admin(p_token);
--       - las de ofertas identifican al colaborador por el token, no por una
--         cédula que manda el cliente (antes se podía ofertar o anular en nombre de otro).
--   * La foto de un activo solo se sube a una ruta que entregó una RPC de admin.
--
-- Idempotente: se puede ejecutar más de una vez.
-- Requiere 12_publicacion_resultados_desistimiento.sql (sub_sesiones, validar_sesion_admin).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. SESIÓN DE CUALQUIER COLABORADOR
-- ─────────────────────────────────────────────────────────

-- 1.1 Devuelve el id_colaborador dueño del token, o NULL si no es válido o venció.
--     Uso interno: no se expone por la API.
CREATE OR REPLACE FUNCTION validar_sesion(p_token TEXT) RETURNS INTEGER
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_temp
AS $$
    SELECT c.id_colaborador
    FROM sub_sesiones s
    JOIN sub_usuarios u ON u.id_usuario = s.id_usuario
    JOIN sub_colaboradores c ON c.id_colaborador = u.id_colaborador
    WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND s.expira > NOW()
      AND u.situacion = 'A'
      AND c.habilitado = 'SI';
$$;

-- 1.2 Respuesta única para token inválido: el frontend cierra la sesión al ver el código
CREATE OR REPLACE FUNCTION respuesta_sesion_invalida() RETURNS JSON
LANGUAGE sql IMMUTABLE
AS $$
    SELECT json_build_object('success', false, 'codigo', 'SESION_INVALIDA',
        'error', 'Sesión inválida o vencida. Inicie sesión nuevamente.');
$$;

REVOKE EXECUTE ON FUNCTION validar_sesion(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION respuesta_sesion_invalida() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 2. OFERTAS: el colaborador sale del token
--    Las firmas cambian: se borran las anteriores (con cédula) para que no
--    quede una versión que permita actuar en nombre de otro.
-- ─────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS registrar_oferta(INTEGER, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS cancelar_oferta(INTEGER, TEXT);

-- 2.1 Registrar oferta (reglas de 08: solo el rol Usuario oferta)
CREATE OR REPLACE FUNCTION registrar_oferta(
    p_token TEXT,
    p_id_activo INTEGER,
    p_monto NUMERIC
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id_colaborador INTEGER := validar_sesion(p_token);
    v_id_rol         INTEGER;
    v_precio_base    NUMERIC;
    v_estado_activo  VARCHAR(20);
    v_fecha_fin      TIMESTAMP;
BEGIN
    IF v_id_colaborador IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;

    IF v_fecha_fin IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La subasta aún no ha sido habilitada.');
    END IF;

    IF NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false, 'error', 'La subasta ya ha finalizado.');
    END IF;

    SELECT id_rol INTO v_id_rol FROM sub_colaboradores WHERE id_colaborador = v_id_colaborador;

    IF COALESCE(v_id_rol, 0) <> 2 THEN
        RETURN json_build_object('success', false,
            'error', 'Su perfil no está habilitado para realizar ofertas. La subasta está reservada a los colaboradores participantes.');
    END IF;

    SELECT precio_base, estado INTO v_precio_base, v_estado_activo
    FROM sub_activos WHERE id_activo = p_id_activo;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Activo no encontrado.');
    END IF;

    IF v_estado_activo <> 'Disponible' THEN
        RETURN json_build_object('success', false, 'error', 'Este activo no está disponible para ofertas.');
    END IF;

    IF p_monto IS NULL OR p_monto < v_precio_base THEN
        RETURN json_build_object('success', false,
            'error', 'El monto ofertado debe ser mayor o igual al precio base (USD ' || v_precio_base || ').');
    END IF;

    INSERT INTO sub_ofertas (id_activo, id_colaborador, monto)
    VALUES (p_id_activo, v_id_colaborador, p_monto);

    RETURN json_build_object('success', true, 'message', 'Oferta registrada exitosamente.');
EXCEPTION
    -- UNIQUE (id_activo, id_colaborador): también cubre dos envíos simultáneos
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Ya realizaste una oferta por este activo.');
END;
$$;

-- 2.2 Anular una oferta propia antes del cierre (P9; el veto sigue en el cliente)
CREATE OR REPLACE FUNCTION cancelar_oferta(
    p_token TEXT,
    p_id_oferta INTEGER
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id_colaborador INTEGER := validar_sesion(p_token);
    v_fecha_fin      TIMESTAMP;
    v_oferta         sub_ofertas%ROWTYPE;
BEGIN
    IF v_id_colaborador IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;

    IF v_fecha_fin IS NOT NULL AND NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false,
            'error', 'La subasta ya ha finalizado. No es posible anular ofertas.');
    END IF;

    SELECT * INTO v_oferta FROM sub_ofertas WHERE id_oferta = p_id_oferta;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'La oferta no existe o ya fue anulada previamente.');
    END IF;

    IF v_oferta.id_colaborador <> v_id_colaborador THEN
        RETURN json_build_object('success', false, 'error', 'No tiene permisos para anular esta oferta.');
    END IF;

    DELETE FROM sub_ofertas WHERE id_oferta = p_id_oferta;

    INSERT INTO sub_auditoria_cambios (tabla_afectada, id_registro, accion, campo, valor_anterior, usuario)
    SELECT 'sub_ofertas', p_id_oferta, 'DELETE', 'monto', v_oferta.monto::TEXT, ci_documento
    FROM sub_colaboradores WHERE id_colaborador = v_id_colaborador;

    RETURN json_build_object(
        'success', true,
        'message', 'Oferta anulada exitosamente.',
        'id_activo', v_oferta.id_activo,
        'monto_anulado', v_oferta.monto
    );
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 3. ADJUDICACIÓN: procesar_ganadores() borra y recalcula sub_resultados,
--    así que solo un administrador puede dispararla.
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION procesar_ganadores(p_token TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;
    RETURN procesar_ganadores();
END;
$$;

REVOKE EXECUTE ON FUNCTION procesar_ganadores() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 4. COLABORADORES (panel admin)
-- ─────────────────────────────────────────────────────────

-- 4.1 Alta (p_id_colaborador NULL) o edición individual. Es el único camino para asignar el rol Administrador.
CREATE OR REPLACE FUNCTION guardar_colaborador(
    p_token TEXT,
    p_id_colaborador INTEGER,
    p_ci_documento TEXT,
    p_nombre TEXT,
    p_fecha_ingreso DATE,
    p_habilitado TEXT,
    p_id_cargo INTEGER,
    p_id_rol INTEGER
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_id_colaborador IS NULL THEN
        INSERT INTO sub_colaboradores (ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol)
        VALUES (BTRIM(p_ci_documento), BTRIM(p_nombre), p_fecha_ingreso, p_habilitado, p_id_cargo, p_id_rol);
    ELSE
        UPDATE sub_colaboradores
        SET ci_documento = BTRIM(p_ci_documento),
            nombre = BTRIM(p_nombre),
            fecha_ingreso = p_fecha_ingreso,
            habilitado = p_habilitado,
            id_cargo = p_id_cargo,
            id_rol = p_id_rol
        WHERE id_colaborador = p_id_colaborador;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'El colaborador no existe.');
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Ya existe un colaborador con esa cédula.');
    WHEN check_violation OR foreign_key_violation OR not_null_violation OR string_data_right_truncation THEN
        RETURN json_build_object('success', false, 'error', 'Datos inválidos: ' || SQLERRM);
END;
$$;

-- 4.2 Habilitar / deshabilitar desde la lista
CREATE OR REPLACE FUNCTION habilitar_colaborador(
    p_token TEXT,
    p_id_colaborador INTEGER,
    p_habilitado TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_habilitado IS NULL OR p_habilitado NOT IN ('SI', 'NO') THEN
        RETURN json_build_object('success', false, 'error', 'El estado debe ser SI o NO.');
    END IF;

    UPDATE sub_colaboradores SET habilitado = p_habilitado WHERE id_colaborador = p_id_colaborador;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'El colaborador no existe.');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- 4.3 Importación CSV (F08): todas las filas en una sola sentencia; si una falla, no se guarda ninguna.
--     p_filas: [{ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol}, ...]
CREATE OR REPLACE FUNCTION importar_colaboradores(p_token TEXT, p_filas JSONB) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_filas IS NULL OR jsonb_typeof(p_filas) <> 'array' THEN
        RETURN json_build_object('success', false, 'error', 'No se recibieron filas para importar.');
    END IF;

    -- RF-01 de F08: el CSV no asigna el rol Administrador (solo lo conserva quien ya lo tiene)
    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_filas) AS f(ci_documento TEXT, id_rol INTEGER)
        WHERE f.id_rol = 1
          AND NOT EXISTS (
              SELECT 1 FROM sub_colaboradores c
              WHERE c.ci_documento = f.ci_documento AND c.id_rol = 1
          )
    ) THEN
        RETURN json_build_object('success', false,
            'error', 'El CSV no puede asignar el rol Administrador: hágalo desde el formulario individual.');
    END IF;

    INSERT INTO sub_colaboradores (ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol)
    SELECT f.ci_documento, f.nombre, f.fecha_ingreso, f.habilitado, f.id_cargo, f.id_rol
    FROM jsonb_to_recordset(p_filas) AS f(
        ci_documento VARCHAR(20),
        nombre VARCHAR(100),
        fecha_ingreso DATE,
        habilitado VARCHAR(2),
        id_cargo INTEGER,
        id_rol INTEGER
    )
    ON CONFLICT (ci_documento) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        fecha_ingreso = EXCLUDED.fecha_ingreso,
        habilitado = EXCLUDED.habilitado,
        id_cargo = EXCLUDED.id_cargo,
        -- ...ni se lo quita a quien lo tiene
        id_rol = CASE WHEN sub_colaboradores.id_rol = 1 THEN 1 ELSE EXCLUDED.id_rol END;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN json_build_object('success', true, 'total', v_total);
EXCEPTION
    -- Datos inválidos o cédula repetida en el archivo: se informa el error y no se guarda nada
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 5. CONFIGURACIÓN: fecha de cierre
--    TIMESTAMP como la columna: el ISO con 'Z' que manda el cliente se guarda igual que antes.
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION actualizar_fecha_cierre(p_token TEXT, p_fecha_fin TIMESTAMP) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    UPDATE sub_app_config SET fecha_fin_subasta = p_fecha_fin WHERE id = 1;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'error', 'No existe la fila de configuración (sub_app_config.id = 1).');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 6. ACTIVOS (panel admin)
-- ─────────────────────────────────────────────────────────

-- 6.1 Alta (p_id_activo NULL) o edición
CREATE OR REPLACE FUNCTION guardar_activo(
    p_token TEXT,
    p_id_activo INTEGER,
    p_id_categoria INTEGER,
    p_marca TEXT,
    p_modelo TEXT,
    p_serialnumber TEXT,
    p_fam TEXT,
    p_observacion TEXT,
    p_precio_base NUMERIC,
    p_estado TEXT,
    p_foto_url TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_id_activo IS NULL THEN
        INSERT INTO sub_activos (id_categoria, marca, modelo, serialnumber, fam, observacion, precio_base, estado, foto_url)
        VALUES (p_id_categoria, p_marca, p_modelo, p_serialnumber, p_fam, p_observacion, p_precio_base, p_estado, p_foto_url);
    ELSE
        UPDATE sub_activos
        SET id_categoria = p_id_categoria,
            marca = p_marca,
            modelo = p_modelo,
            serialnumber = p_serialnumber,
            fam = p_fam,
            observacion = p_observacion,
            precio_base = p_precio_base,
            estado = p_estado,
            foto_url = p_foto_url
        WHERE id_activo = p_id_activo;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'El activo no existe.');
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN check_violation OR foreign_key_violation OR not_null_violation OR string_data_right_truncation THEN
        RETURN json_build_object('success', false, 'error', 'Datos inválidos: ' || SQLERRM);
END;
$$;

-- 6.2 Baja: falla si el activo ya tiene ofertas o resultado (FK)
CREATE OR REPLACE FUNCTION eliminar_activo(p_token TEXT, p_id_activo INTEGER) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    DELETE FROM sub_activos WHERE id_activo = p_id_activo;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'El activo no existe.');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN json_build_object('success', false,
            'error', 'El activo tiene ofertas o una adjudicación registradas. Cambie su estado a Cerrado en lugar de eliminarlo.');
END;
$$;

-- 6.3 Fotos. Storage no conoce nuestro token, así que la subida se autoriza en dos pasos:
--     el admin pide una ruta (RPC con token) y Storage solo acepta un INSERT en una
--     ruta entregada hace menos de 10 minutos. La ruta es un UUID: no se adivina,
--     y como no hay política de UPDATE, una foto subida no se puede pisar.
CREATE TABLE IF NOT EXISTS sub_subidas_autorizadas (
    ruta    TEXT PRIMARY KEY,
    expira  TIMESTAMPTZ NOT NULL
);

CREATE OR REPLACE FUNCTION autorizar_subida_foto(p_token TEXT, p_extension TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_ruta TEXT;
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_extension IS NULL OR p_extension NOT IN ('jpg', 'webp') THEN
        RETURN json_build_object('success', false, 'error', 'Formato de imagen no permitido (solo JPG o WebP).');
    END IF;

    DELETE FROM sub_subidas_autorizadas WHERE expira < NOW();

    v_ruta := 'fotos/activo_' || gen_random_uuid() || '.' || p_extension;
    INSERT INTO sub_subidas_autorizadas (ruta, expira) VALUES (v_ruta, NOW() + INTERVAL '10 minutes');

    RETURN json_build_object('success', true, 'ruta', v_ruta);
END;
$$;

-- La usa la política de Storage, que corre con el rol del que sube (anon)
CREATE OR REPLACE FUNCTION subida_autorizada(p_ruta TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM sub_subidas_autorizadas WHERE ruta = p_ruta AND expira > NOW());
$$;

-- ─────────────────────────────────────────────────────────
-- 7. PERMISOS
-- ─────────────────────────────────────────────────────────

-- 7.1 Ninguna tabla ni vista acepta escrituras directas por la API (incluye las de F07)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (fecha_fin_subasta) ON sub_app_config FROM anon, authenticated;  -- GRANT de F07
-- Tablas que se creen en el futuro tampoco nacen escribibles
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;

-- 7.2 Ni siquiera lectura: hashes de contraseña, intentos de login (cédula + IP) y rutas de subida.
--     sub_v_datos_colaborador sigue funcionando: la vista corre con los permisos de su dueño
--     y no expone password_hash.
REVOKE ALL ON sub_usuarios, sub_intentos_login, sub_subidas_autorizadas FROM PUBLIC, anon, authenticated;

-- 7.3 sub_ofertas: la política de borrado de 10_cancelar_oferta.sql ya no aplica
DROP POLICY IF EXISTS "ofertas_eliminacion" ON sub_ofertas;

-- 7.4 Funciones expuestas a la API (cada una valida el token por dentro)
GRANT EXECUTE ON FUNCTION registrar_oferta(TEXT, INTEGER, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancelar_oferta(TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION procesar_ganadores(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION guardar_colaborador(TEXT, INTEGER, TEXT, TEXT, DATE, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION habilitar_colaborador(TEXT, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION importar_colaboradores(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION actualizar_fecha_cierre(TEXT, TIMESTAMP) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION guardar_activo(TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION eliminar_activo(TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION autorizar_subida_foto(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION subida_autorizada(TEXT) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 8. STORAGE — bucket activos
--    Lectura pública igual que antes. Subida solo a una ruta autorizada.
--    Sin UPDATE ni DELETE: nadie pisa ni borra fotos desde la API.
-- ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "activos_subida" ON storage.objects;
CREATE POLICY "activos_subida"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'activos' AND public.subida_autorizada(name));

DROP POLICY IF EXISTS "activos_update" ON storage.objects;

-- PostgREST: refrescar el caché de funciones (las firmas cambiaron)
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────
-- 9. VERIFICACIÓN: todas las columnas deben dar false
-- ─────────────────────────────────────────────────────────

SELECT
    has_table_privilege('anon', 'sub_usuarios', 'SELECT')                       AS anon_lee_usuarios,
    has_table_privilege('anon', 'sub_colaboradores', 'INSERT,UPDATE,DELETE')    AS anon_escribe_colaboradores,
    has_table_privilege('anon', 'sub_activos', 'INSERT,UPDATE,DELETE')          AS anon_escribe_activos,
    has_table_privilege('anon', 'sub_ofertas', 'INSERT,UPDATE,DELETE')          AS anon_escribe_ofertas,
    has_column_privilege('anon', 'sub_app_config', 'fecha_fin_subasta', 'UPDATE') AS anon_escribe_config,
    has_function_privilege('anon', 'procesar_ganadores()', 'EXECUTE')           AS anon_adjudica_sin_token;

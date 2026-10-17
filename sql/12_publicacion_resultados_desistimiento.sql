-- ═══════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Feature F07
-- Publicación de Resultados y Reasignación por Desistimiento
-- Ejecutar en el SQL Editor de Supabase, después de 11_adjudicacion_tope_desempate.sql.
-- Se puede volver a ejecutar: todo es idempotente y corre en una sola transacción.
--
-- Seguridad: la app no usa Supabase Auth, así que la base no sabe quién llama.
-- Este script hace que autenticar_usuario emita un token de sesión (12 h) y que
-- publicar_resultados / reasignar_por_desistimiento lo exijan y verifiquen que
-- pertenece a un administrador (id_rol = 1). Quien ya tenía la sesión abierta
-- debe volver a iniciar sesión para obtener su token.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. ESQUEMA
-- ─────────────────────────────────────────────────────────

-- 1.1 Interruptor global de publicación
ALTER TABLE sub_app_config ADD COLUMN IF NOT EXISTS resultados_publicados BOOLEAN DEFAULT FALSE;

-- 1.2 Estado de cada adjudicación
ALTER TABLE sub_resultados ADD COLUMN IF NOT EXISTS estado_adjudicacion VARCHAR(20) DEFAULT 'Adjudicado';
ALTER TABLE sub_resultados ADD COLUMN IF NOT EXISTS motivo_desistimiento TEXT;
ALTER TABLE sub_resultados ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP DEFAULT NOW();

UPDATE sub_resultados SET estado_adjudicacion = 'Adjudicado' WHERE estado_adjudicacion IS NULL;
ALTER TABLE sub_resultados ALTER COLUMN estado_adjudicacion SET NOT NULL;

-- Un activo desierto no tiene ganador (01_schema.sql creó esta columna NOT NULL)
ALTER TABLE sub_resultados ALTER COLUMN id_colaborador_ganador DROP NOT NULL;

-- 'Desierto' si y solo si no hay ganador: la base rechaza un "Reasignado" sin colaborador.
-- Si este paso falla, hay filas inconsistentes en sub_resultados: corregirlas antes de reintentar.
ALTER TABLE sub_resultados DROP CONSTRAINT IF EXISTS chk_resultados_estado;
ALTER TABLE sub_resultados ADD CONSTRAINT chk_resultados_estado CHECK (
    estado_adjudicacion IN ('Adjudicado', 'Reasignado', 'Desierto')
    AND (estado_adjudicacion = 'Desierto') = (id_colaborador_ganador IS NULL)
);

-- Una sola adjudicación por activo (reemplaza al índice simple de 01_schema.sql)
DROP INDEX IF EXISTS idx_resultados_activo;
CREATE UNIQUE INDEX IF NOT EXISTS ux_resultados_activo ON sub_resultados(id_activo);

-- 1.3 sub_activos acepta 'Desierto' (el CHECK original solo tenía Disponible/Cerrado/Adjudicado).
--     El CHECK original no tiene nombre fijo: se busca por definición.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'sub_activos'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%estado%'
    LOOP
        EXECUTE format('ALTER TABLE sub_activos DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE sub_activos ADD CONSTRAINT sub_activos_estado_check
    CHECK (estado IN ('Disponible', 'Cerrado', 'Adjudicado', 'Desierto'));

-- 1.4 Historial de desistimientos: un colaborador que desistió de un activo
--     no puede volver a ganarlo en reasignaciones posteriores.
CREATE TABLE IF NOT EXISTS sub_desistimientos (
    id_activo       INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador  INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto           NUMERIC(10, 2) NOT NULL,
    motivo          TEXT NOT NULL,
    usuario         VARCHAR(50) NOT NULL,
    fecha           TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id_activo, id_colaborador)
);

-- 1.5 Sesiones. Solo se guarda el hash SHA-256 del token: leer la tabla no da tokens usables.
CREATE TABLE IF NOT EXISTS sub_sesiones (
    token_hash  TEXT PRIMARY KEY,
    id_usuario  INTEGER NOT NULL REFERENCES sub_usuarios(id_usuario) ON DELETE CASCADE,
    expira      TIMESTAMPTZ NOT NULL
);

-- ─────────────────────────────────────────────────────────
-- 2. PERMISOS
--    Las escrituras sensibles solo pasan por funciones SECURITY DEFINER,
--    que corren como dueño de las tablas.
-- ─────────────────────────────────────────────────────────

-- Sesiones y desistimientos: inaccesibles desde la API
REVOKE ALL ON sub_sesiones, sub_desistimientos FROM PUBLIC, anon, authenticated;
ALTER TABLE sub_sesiones ENABLE ROW LEVEL SECURITY;  -- sin políticas: segunda barrera

-- Resultados y auditoría: lectura igual que antes, sin escritura directa
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON sub_resultados FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON sub_auditoria_cambios FROM PUBLIC, anon, authenticated;

-- Configuración: la app sigue cambiando la fecha de cierre directo (ConfigSubasta.tsx),
-- pero resultados_publicados solo cambia vía publicar_resultados()
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON sub_app_config FROM PUBLIC, anon, authenticated;
GRANT UPDATE (fecha_fin_subasta) ON sub_app_config TO anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 3. SESIONES
-- ─────────────────────────────────────────────────────────

-- 3.1 Devuelve la CI del administrador dueño del token, o NULL si el token no es
--     válido, venció o el usuario dejó de ser admin. Uso interno: no se expone por la API.
CREATE OR REPLACE FUNCTION validar_sesion_admin(p_token TEXT) RETURNS VARCHAR
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_temp
AS $$
    SELECT c.ci_documento
    FROM sub_sesiones s
    JOIN sub_usuarios u ON u.id_usuario = s.id_usuario
    JOIN sub_colaboradores c ON c.id_colaborador = u.id_colaborador
    WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND s.expira > NOW()
      AND u.situacion = 'A'
      AND c.habilitado = 'SI'
      AND c.id_rol = 1;
$$;

REVOKE EXECUTE ON FUNCTION validar_sesion_admin(TEXT) FROM PUBLIC, anon, authenticated;

-- 3.2 Login: misma lógica que 03_functions.sql, más la emisión del token de sesión
CREATE OR REPLACE FUNCTION autenticar_usuario(
    p_ci_documento TEXT,
    p_password TEXT,
    p_ip TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_intentos_fallidos INTEGER;
    v_id_usuario INTEGER;
    v_token TEXT;
BEGIN
    SELECT COUNT(*) INTO v_intentos_fallidos
    FROM sub_intentos_login
    WHERE usuario = p_ci_documento
      AND exitoso = 'N'
      AND fecha_intento > NOW() - INTERVAL '15 minutes';

    IF v_intentos_fallidos >= 5 THEN
        INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
        VALUES (p_ci_documento, 'N', p_ip);
        RETURN json_build_object('success', false,
            'error', 'Demasiados intentos fallidos. Su cuenta está bloqueada temporalmente por 15 minutos.');
    END IF;

    SELECT u.id_usuario INTO v_id_usuario
    FROM sub_usuarios u
    JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
    WHERE c.ci_documento = p_ci_documento
      AND u.password_hash = crypt(p_password, u.password_hash)
      AND c.habilitado = 'SI'
      AND u.situacion = 'A'
    LIMIT 1;

    INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
    VALUES (p_ci_documento, CASE WHEN v_id_usuario IS NULL THEN 'N' ELSE 'S' END, p_ip);

    IF v_id_usuario IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Credenciales inválidas.');
    END IF;

    DELETE FROM sub_sesiones WHERE expira < NOW();

    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO sub_sesiones (token_hash, id_usuario, expira)
    VALUES (encode(digest(v_token, 'sha256'), 'hex'), v_id_usuario, NOW() + INTERVAL '12 hours');

    RETURN (
        SELECT json_build_object(
            'success', true,
            'data', json_build_object(
                'id_usuario', u.id_usuario,
                'id_colaborador', c.id_colaborador,
                'ci_documento', c.ci_documento,
                'nombre', c.nombre,
                'id_rol', c.id_rol,
                'es_admin', COALESCE(c.id_rol = 1, false),
                'token', v_token
            )
        )
        FROM sub_usuarios u
        JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
        WHERE u.id_usuario = v_id_usuario
    );
END;
$$;

-- 3.3 Logout: invalida el token en el servidor
CREATE OR REPLACE FUNCTION cerrar_sesion(p_token TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    DELETE FROM sub_sesiones WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

-- ─────────────────────────────────────────────────────────
-- 4. FUNCIONES F07
--    Las firmas cambian (ahora reciben el token): se borran las anteriores para
--    que no quede una versión sin control de acceso.
-- ─────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS publicar_resultados(BOOLEAN);
DROP FUNCTION IF EXISTS reasignar_por_desistimiento(INTEGER, TEXT, TEXT);

-- 4.1 Publicar / despublicar resultados oficiales
CREATE OR REPLACE FUNCTION publicar_resultados(p_token TEXT, p_publicar BOOLEAN) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN json_build_object('success', false, 'codigo', 'SESION_INVALIDA',
            'error', 'Sesión de administrador inválida o vencida. Inicie sesión nuevamente.');
    END IF;

    IF p_publicar IS NULL THEN
        RETURN json_build_object('success', false,
            'error', 'Debe indicar si los resultados se publican o se ocultan.');
    END IF;

    UPDATE sub_app_config
    SET resultados_publicados = p_publicar
    WHERE id = 1;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'error', 'No existe la fila de configuración (sub_app_config.id = 1).');
    END IF;

    RETURN json_build_object(
        'success', true,
        'resultados_publicados', p_publicar,
        'message', CASE WHEN p_publicar
                        THEN 'Resultados publicados oficialmente para todos los colaboradores.'
                        ELSE 'Publicación de resultados pausada. Solo visible para administradores.'
                   END
    );
END;
$$;

-- 4.2 Registrar desistimiento y reasignar al siguiente postor con mejor derecho
CREATE OR REPLACE FUNCTION reasignar_por_desistimiento(
    p_token TEXT,
    p_id_activo INTEGER,
    p_motivo TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_ci_admin       VARCHAR(20);
    v_motivo         TEXT := NULLIF(BTRIM(p_motivo), '');
    v_resultado      sub_resultados%ROWTYPE;
    v_id_categoria   INTEGER;
    v_nuevo_id       INTEGER;
    v_nuevo_monto    NUMERIC(10, 2);
    v_nuevo_nombre   TEXT;
    v_hay_candidato  BOOLEAN;
    v_orden_postor   INTEGER;
BEGIN
    v_ci_admin := validar_sesion_admin(p_token);
    IF v_ci_admin IS NULL THEN
        RETURN json_build_object('success', false, 'codigo', 'SESION_INVALIDA',
            'error', 'Sesión de administrador inválida o vencida. Inicie sesión nuevamente.');
    END IF;

    IF v_motivo IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'El motivo del desistimiento es obligatorio.');
    END IF;

    -- Un desistimiento a la vez: dos reasignaciones simultáneas podrían darle a la misma
    -- persona dos activos de la misma categoría.
    -- ponytail: lock global; alcanza porque los desistimientos son manuales y escasos.
    -- Si algún día fueran masivos, bloquear por categoría.
    PERFORM pg_advisory_xact_lock(hashtext('reasignar_por_desistimiento'));

    SELECT * INTO v_resultado
    FROM sub_resultados
    WHERE id_activo = p_id_activo
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No existe una adjudicación para este activo.');
    END IF;

    IF v_resultado.id_colaborador_ganador IS NULL THEN
        RETURN json_build_object('success', false,
            'error', 'El activo ya está Desierto: no hay ganador que pueda desistir.');
    END IF;

    SELECT id_categoria INTO v_id_categoria
    FROM sub_activos
    WHERE id_activo = p_id_activo;

    -- 1. El ganador actual queda como Desistido de este activo
    INSERT INTO sub_desistimientos (id_activo, id_colaborador, monto, motivo, usuario)
    VALUES (p_id_activo, v_resultado.id_colaborador_ganador, v_resultado.monto_final, v_motivo, v_ci_admin)
    ON CONFLICT (id_activo, id_colaborador) DO NOTHING;

    -- 2. Siguiente postor elegible, con el mismo orden de mérito que procesar_ganadores()
    SELECT o.id_colaborador, o.monto, c.nombre
    INTO v_nuevo_id, v_nuevo_monto, v_nuevo_nombre
    FROM sub_ofertas o
    JOIN sub_colaboradores c ON c.id_colaborador = o.id_colaborador
    JOIN sub_cargos ca ON ca.id_cargo = c.id_cargo
    WHERE o.id_activo = p_id_activo
      AND c.habilitado = 'SI'
      AND c.id_rol = 2
      -- nadie que ya haya desistido de este activo (incluye al ganador actual)
      AND NOT EXISTS (
          SELECT 1
          FROM sub_desistimientos d
          WHERE d.id_activo = p_id_activo
            AND d.id_colaborador = o.id_colaborador
      )
      -- tope F06: nadie que ya tenga otro activo de esta categoría
      AND NOT EXISTS (
          SELECT 1
          FROM sub_resultados r2
          JOIN sub_activos a2 ON a2.id_activo = r2.id_activo
          WHERE a2.id_categoria = v_id_categoria
            AND r2.id_activo <> p_id_activo
            AND r2.id_colaborador_ganador = o.id_colaborador
      )
    ORDER BY
        o.monto DESC,
        ca.nivel_jerarquia ASC,
        c.fecha_ingreso ASC,
        o.fecha_hora ASC,
        o.id_oferta ASC
    LIMIT 1;

    v_hay_candidato := FOUND;  -- leer FOUND aquí: la próxima sentencia lo sobrescribe

    -- Orden de adjudicación del nuevo ganador: 1 desistimiento → 2º postor, 2 → 3º, ...
    SELECT COUNT(*) + 1 INTO v_orden_postor
    FROM sub_desistimientos
    WHERE id_activo = p_id_activo;

    -- 3. Reasignar o declarar desierto
    IF v_hay_candidato THEN
        UPDATE sub_resultados
        SET id_colaborador_ganador = v_nuevo_id,
            monto_final            = v_nuevo_monto,
            estado_adjudicacion    = 'Reasignado',
            criterio_desempate     = format('REASIGNADO POR DESISTIMIENTO (%sº POSTOR)', v_orden_postor),
            motivo_desistimiento   = v_motivo,
            fecha_actualizacion    = NOW()
        WHERE id_resultado = v_resultado.id_resultado;
    ELSE
        UPDATE sub_resultados
        SET id_colaborador_ganador = NULL,
            monto_final            = 0,
            estado_adjudicacion    = 'Desierto',
            criterio_desempate     = 'DESIERTO TRAS DESISTIMIENTO',
            motivo_desistimiento   = v_motivo,
            fecha_actualizacion    = NOW()
        WHERE id_resultado = v_resultado.id_resultado;

        UPDATE sub_activos
        SET estado = 'Desierto'
        WHERE id_activo = p_id_activo;
    END IF;

    -- 4. Auditoría con el resultado real y el admin verificado por token
    INSERT INTO sub_auditoria_cambios (
        tabla_afectada, id_registro, accion, campo, valor_anterior, valor_nuevo, usuario
    ) VALUES (
        'sub_resultados',
        v_resultado.id_resultado,
        'UPDATE',
        'id_colaborador_ganador',
        format('Colaborador %s (USD %s) desistió. Motivo: %s',
               v_resultado.id_colaborador_ganador, v_resultado.monto_final, v_motivo),
        CASE WHEN v_hay_candidato
             THEN format('Reasignado a colaborador %s (USD %s)', v_nuevo_id, v_nuevo_monto)
             ELSE 'Desierto: sin postores elegibles'
        END,
        v_ci_admin
    );

    IF v_hay_candidato THEN
        RETURN json_build_object(
            'success', true,
            'estado_adjudicacion', 'Reasignado',
            'id_colaborador_ganador', v_nuevo_id,
            'colaborador_ganador', v_nuevo_nombre,
            'monto_final', v_nuevo_monto,
            'message', format('Activo reasignado a %s (%sº postor).', v_nuevo_nombre, v_orden_postor)
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'estado_adjudicacion', 'Desierto',
        'id_colaborador_ganador', NULL,
        'monto_final', 0,
        'message', 'No quedan postores elegibles. El activo fue declarado Desierto.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION autenticar_usuario(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cerrar_sesion(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION publicar_resultados(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reasignar_por_desistimiento(TEXT, INTEGER, TEXT) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 5. VISTA DE RESULTADOS
--    DROP + CREATE: CREATE OR REPLACE no permite cambiar el orden de columnas
--    respecto de la versión de 02_views.sql.
-- ─────────────────────────────────────────────────────────

DROP VIEW IF EXISTS sub_v_resultados_detalle;

CREATE VIEW sub_v_resultados_detalle AS
SELECT
    r.id_resultado,
    r.id_activo,
    a.marca,
    a.modelo,
    a.serialnumber,
    a.fam,
    cat.tipo AS categoria,
    a.precio_base,
    r.id_colaborador_ganador,
    COALESCE(c.nombre, 'Sin Adjudicar (Desierto)') AS colaborador_ganador,
    COALESCE(c.ci_documento, '-') AS ci_documento,
    r.monto_final,
    r.criterio_desempate,
    r.estado_adjudicacion,
    r.motivo_desistimiento,
    -- fecha_cierre es TIMESTAMP sin zona: guarda NOW() en la zona horaria del servidor.
    -- Se interpreta en esa zona y recién después se pasa a hora de Asunción.
    TO_CHAR(
        (r.fecha_cierre AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'America/Asuncion',
        'DD/MM/YYYY HH24:MI:SS'
    ) AS fecha_cierre_display,
    r.fecha_cierre,
    r.fecha_actualizacion
FROM sub_resultados r
JOIN sub_activos a ON r.id_activo = a.id_activo
JOIN sub_categorias cat ON a.id_categoria = cat.id_categoria
LEFT JOIN sub_colaboradores c ON r.id_colaborador_ganador = c.id_colaborador;

GRANT SELECT ON sub_v_resultados_detalle TO anon, authenticated;

-- PostgREST: recargar el catálogo para que vea las firmas nuevas
NOTIFY pgrst, 'reload schema';

COMMIT;

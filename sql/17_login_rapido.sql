-- ═══════════════════════════════════════════════════════════════════
-- 17 — Login rápido: autenticar_usuario calcula un solo bcrypt
--
-- Con crypt() en el WHERE, Postgres lo evaluaba en cada fila de sub_usuarios.
-- Con varias cuentas registradas el login superaba el statement_timeout del rol
-- anon (PostgREST respondía 500, código 57014) y nadie podía entrar.
-- Ahora se busca la cuenta por cédula y se compara un solo hash. Sin cuenta se
-- calcula igual un bcrypt, para que el tiempo no revele qué cédulas están registradas.
--
-- Solo reemplaza la función (misma firma y permisos). Idempotente.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;
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
    v_hash TEXT;
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

    -- Primero se busca la cuenta por cédula y recién después se calcula un solo bcrypt.
    -- Con crypt() en el WHERE, Postgres lo evaluaba en cada fila de sub_usuarios y el
    -- login superaba el statement_timeout de anon apenas se registraron varias cuentas.
    SELECT u.id_usuario, u.password_hash INTO v_id_usuario, v_hash
    FROM sub_usuarios u
    JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
    WHERE c.ci_documento = p_ci_documento
      AND c.habilitado = 'SI'
      AND u.situacion = 'A'
    LIMIT 1;

    -- Sin cuenta se calcula igual un bcrypt (con sal nueva): el tiempo de respuesta
    -- no revela qué cédulas tienen cuenta.
    IF v_hash IS DISTINCT FROM crypt(p_password, COALESCE(v_hash, gen_salt('bf', 10))) THEN
        v_id_usuario := NULL;
    END IF;

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

INSERT INTO sub_migraciones (archivo) VALUES ('17_login_rapido.sql')
ON CONFLICT (archivo) DO NOTHING;

COMMIT;
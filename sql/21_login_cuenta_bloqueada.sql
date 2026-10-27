-- ═══════════════════════════════════════════════════════════════════
-- 21 — Login: mensaje propio para la cuenta bloqueada (F12)
--
-- Con habilitado = NO, autenticar_usuario respondía "Credenciales inválidas.",
-- como si la contraseña estuviera mal. Ahora, si la contraseña es correcta y el
-- colaborador está bloqueado, responde "Su cuenta se encuentra bloqueada...".
-- Solo se informa con la contraseña correcta: con una incorrecta la respuesta
-- sigue siendo la genérica, así nadie averigua qué cédulas están bloqueadas.
-- Ese caso no suma intento fallido: no es alguien probando contraseñas, y al
-- desbloquearlo no queda trabado 15 minutos.
--
-- Solo reemplaza la función (misma firma y permisos). Idempotente.
-- Requiere 17_login_rapido.sql.
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
    v_habilitado TEXT;
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
    -- habilitado se lee aparte: el bloqueo se informa solo si la contraseña es correcta
    SELECT u.id_usuario, u.password_hash, c.habilitado INTO v_id_usuario, v_hash, v_habilitado
    FROM sub_usuarios u
    JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
    WHERE c.ci_documento = p_ci_documento
      AND u.situacion = 'A'
    LIMIT 1;

    -- Sin cuenta se calcula igual un bcrypt (con sal nueva): el tiempo de respuesta
    -- no revela qué cédulas tienen cuenta.
    IF v_hash IS DISTINCT FROM crypt(p_password, COALESCE(v_hash, gen_salt('bf', 10))) THEN
        v_id_usuario := NULL;
    END IF;

    IF v_id_usuario IS NOT NULL AND v_habilitado IS DISTINCT FROM 'SI' THEN
        RETURN json_build_object('success', false,
            'error', 'Su cuenta se encuentra bloqueada, contacte a su administrador.');
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

INSERT INTO sub_migraciones (archivo) VALUES ('21_login_cuenta_bloqueada.sql')
ON CONFLICT (archivo) DO NOTHING;

COMMIT;
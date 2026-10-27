-- ═══════════════════════════════════════════════════════════════════
-- F12 — Restablecer contraseña y bloquear acceso desde Colaboradores
--
-- * restablecer_cuenta: borra la cuenta del colaborador (y con ella sus sesiones)
--   para que vuelva a registrarse con una contraseña nueva. El colaborador, su rol,
--   sus ofertas y resultados no se tocan: cuelgan de id_colaborador, no de la cuenta.
-- * habilitar_colaborador: igual que antes, pero un admin no puede bloquearse a sí
--   mismo. Bloquear (habilitado = NO) corta el login y las sesiones abiertas, y sus
--   ofertas quedan fuera de la adjudicación.
-- * Ambas acciones quedan en sub_auditoria_cambios con la cédula del admin.
-- * sub_v_datos_colaborador vuelve a traer id_cargo (09 lo agregó, pero
--   00_instalacion_completa no lo tenía): sin él, editar pedía elegir el cargo de nuevo.
--
-- Transaccional e idempotente. Requiere 16_lecturas_con_sesion.sql.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE VIEW sub_v_datos_colaborador AS
SELECT
    u.id_usuario,
    c.id_colaborador,
    c.ci_documento,
    c.nombre,
    c.fecha_ingreso,
    c.habilitado,
    ca.descripcion AS cargo,
    ca.nivel_jerarquia,
    r.descripcion AS rol,
    c.id_rol,
    CASE WHEN u.id_usuario IS NOT NULL THEN 'REGISTRADO' ELSE 'PENDIENTE' END AS usuario_registrado,
    c.id_cargo
FROM sub_colaboradores c
JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo
LEFT JOIN sub_roles r ON c.id_rol = r.id_rol
LEFT JOIN sub_usuarios u ON c.id_colaborador = u.id_colaborador;

-- Recrear la vista no cambia sus permisos (F10: solo se lee vía leer_datos)
REVOKE SELECT ON sub_v_datos_colaborador FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION habilitar_colaborador(
    p_token TEXT,
    p_id_colaborador INTEGER,
    p_habilitado TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_admin VARCHAR;
    v_ci VARCHAR;
    v_anterior VARCHAR;
BEGIN
    v_admin := validar_sesion_admin(p_token);
    IF v_admin IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_habilitado IS NULL OR p_habilitado NOT IN ('SI', 'NO') THEN
        RETURN json_build_object('success', false, 'error', 'El estado debe ser SI o NO.');
    END IF;

    SELECT ci_documento, habilitado INTO v_ci, v_anterior
    FROM sub_colaboradores WHERE id_colaborador = p_id_colaborador;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'El colaborador no existe.');
    END IF;

    IF v_ci = v_admin AND p_habilitado = 'NO' THEN
        RETURN json_build_object('success', false, 'error', 'No puede bloquear su propio acceso.');
    END IF;

    UPDATE sub_colaboradores SET habilitado = p_habilitado WHERE id_colaborador = p_id_colaborador;

    INSERT INTO sub_auditoria_cambios (tabla_afectada, id_registro, accion, campo, valor_anterior, valor_nuevo, usuario)
    VALUES ('sub_colaboradores', p_id_colaborador, 'UPDATE', 'habilitado', v_anterior, p_habilitado, v_admin);

    RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION restablecer_cuenta(p_token TEXT, p_id_colaborador INTEGER) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_admin VARCHAR;
    v_ci VARCHAR;
    v_borradas INTEGER;
BEGIN
    v_admin := validar_sesion_admin(p_token);
    IF v_admin IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    SELECT ci_documento INTO v_ci FROM sub_colaboradores WHERE id_colaborador = p_id_colaborador;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'El colaborador no existe.');
    END IF;

    IF v_ci = v_admin THEN
        RETURN json_build_object('success', false, 'error', 'No puede restablecer su propia cuenta.');
    END IF;

    -- Las sesiones se borran en cascada
    DELETE FROM sub_usuarios WHERE id_colaborador = p_id_colaborador;
    GET DIAGNOSTICS v_borradas = ROW_COUNT;
    IF v_borradas = 0 THEN
        RETURN json_build_object('success', false, 'error', 'El colaborador no tiene cuenta registrada.');
    END IF;

    -- Sin esto, los fallos previos podrían bloquear el primer login con la contraseña nueva
    DELETE FROM sub_intentos_login WHERE usuario = v_ci AND exitoso = 'N';

    -- id_registro es el colaborador: es lo que sigue existiendo después del borrado
    INSERT INTO sub_auditoria_cambios (tabla_afectada, id_registro, accion, campo, valor_anterior, usuario)
    VALUES ('sub_usuarios', p_id_colaborador, 'DELETE', 'cuenta', v_ci, v_admin);

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION restablecer_cuenta(TEXT, INTEGER) TO anon, authenticated;

INSERT INTO sub_migraciones (archivo) VALUES ('20_restablecer_y_bloquear_cuenta.sql')
ON CONFLICT (archivo) DO NOTHING;

COMMIT;

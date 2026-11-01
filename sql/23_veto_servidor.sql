-- ═══════════════════════════════════════════════════════════════════
-- 23 — Veto P9 en el servidor
--
-- Hasta acá el veto (quien anula su oferta no vuelve a ofertar en ese activo)
-- vivía solo en el localStorage del navegador: desde otro navegador, en
-- incógnito o llamando la RPC directo se podía volver a ofertar.
--   * sub_vetos: un registro por (activo, colaborador), inaccesible desde la API.
--   * cancelar_oferta(): además de borrar la oferta, registra el veto.
--   * registrar_oferta(): rechaza la oferta si hay veto.
--   * leer_datos(p_token, 'mis_vetos'): los vetos propios, para la UI.
--
-- Las anulaciones hechas antes de este script no quedaron registradas en el
-- servidor (la auditoría guarda el id de la oferta, no el del activo): esos
-- vetos siguen solo en el navegador de quien anuló.
--
-- Reemplaza registrar_oferta(), cancelar_oferta() y leer_datos(); mismas firmas.
-- Transaccional e idempotente. Requiere 22_post_subasta.sql.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS sub_vetos (
    id_activo       INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador  INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto           NUMERIC(10, 2) NOT NULL,
    fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_activo, id_colaborador)
);

REVOKE ALL ON sub_vetos FROM PUBLIC, anon, authenticated;

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

    IF EXISTS (SELECT 1 FROM sub_vetos WHERE id_activo = p_id_activo AND id_colaborador = v_id_colaborador) THEN
        RETURN json_build_object('success', false,
            'error', 'Posees un veto permanente de reincidencia en este activo debido a una cancelación previa.');
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

    -- Veto P9: no vuelve a ofertar en este activo
    INSERT INTO sub_vetos (id_activo, id_colaborador, monto)
    VALUES (v_oferta.id_activo, v_id_colaborador, v_oferta.monto)
    ON CONFLICT (id_activo, id_colaborador) DO NOTHING;

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

-- 'mis_vetos' → cualquier sesión, solo los propios
CREATE OR REPLACE FUNCTION leer_datos(p_token TEXT, p_consulta TEXT) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id_colaborador INTEGER := validar_sesion(p_token);
    v_es_admin       BOOLEAN := validar_sesion_admin(p_token) IS NOT NULL;
    v_filas          JSON;
BEGIN
    IF v_id_colaborador IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_consulta = 'mis_ofertas' THEN
        SELECT json_agg(o ORDER BY o.fecha_hora DESC) INTO v_filas
        FROM sub_v_ofertas_recibidas o
        WHERE o.id_colaborador = v_id_colaborador;

    ELSIF p_consulta = 'mis_vetos' THEN
        SELECT json_agg(v ORDER BY v.fecha_cancelacion DESC) INTO v_filas
        FROM (SELECT ve.id_activo, ve.id_colaborador, a.marca, a.modelo, cat.tipo AS categoria,
                     ve.monto AS monto_cancelado, ve.fecha AS fecha_cancelacion
              FROM sub_vetos ve
              JOIN sub_activos a ON a.id_activo = ve.id_activo
              JOIN sub_categorias cat ON cat.id_categoria = a.id_categoria
              WHERE ve.id_colaborador = v_id_colaborador) v;

    ELSIF p_consulta = 'resultados' THEN
        IF NOT v_es_admin
           AND NOT COALESCE((SELECT resultados_publicados FROM sub_app_config WHERE id = 1), false) THEN
            RETURN json_build_object('success', false, 'error', 'Los resultados todavía no fueron publicados.');
        END IF;
        SELECT json_agg(r ORDER BY r.id_resultado) INTO v_filas
        FROM sub_v_resultados_detalle r;

    -- De acá en adelante, solo administración
    ELSIF NOT v_es_admin THEN
        RETURN respuesta_sesion_invalida();

    ELSIF p_consulta = 'ofertas' THEN
        SELECT json_agg(o ORDER BY o.id_activo, o.monto DESC, o.nivel_jerarquia, o.fecha_hora) INTO v_filas
        FROM sub_v_ofertas_recibidas o;

    ELSIF p_consulta = 'colaboradores' THEN
        SELECT json_agg(c ORDER BY c.id_colaborador) INTO v_filas
        FROM sub_v_datos_colaborador c;

    ELSIF p_consulta = 'nomina' THEN
        SELECT json_agg(n) INTO v_filas
        FROM (SELECT id_colaborador, ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol
              FROM sub_colaboradores) n;

    ELSIF p_consulta = 'desistimientos' THEN
        SELECT json_agg(d ORDER BY d.id_activo, d.fecha) INTO v_filas
        FROM (SELECT id_activo, id_colaborador, motivo, fecha
              FROM sub_desistimientos) d;

    ELSE
        RETURN json_build_object('success', false, 'error', 'Consulta desconocida.');
    END IF;

    RETURN json_build_object('success', true, 'filas', COALESCE(v_filas, '[]'::json));
END;
$$;

INSERT INTO sub_migraciones (archivo) VALUES ('23_veto_servidor.sql')
ON CONFLICT (archivo) DO NOTHING;

-- PostgREST: refrescar el caché (funciones modificadas)
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- REGLA DE NEGOCIO: solo el rol USUARIO (id_rol = 2) puede ofertar.
-- ADMINISTRADOR (1) y VISITANTE (3) quedan excluidos.
--
-- Se aplica en DOS puntos:
--   1) registrar_oferta   -> impide crear la oferta
--   2) procesar_ganadores -> impide que una oferta inválida preexistente gane
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION registrar_oferta(
    p_id_activo INTEGER,
    p_ci_documento TEXT,
    p_monto NUMERIC
) RETURNS JSON AS $$
DECLARE
    v_id_colaborador INTEGER;
    v_id_rol         INTEGER;
    v_precio_base    NUMERIC;
    v_estado_activo  VARCHAR(20);
    v_fecha_fin      TIMESTAMP;
    v_count_oferta   INTEGER;
BEGIN
    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;

    IF v_fecha_fin IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La subasta aún no ha sido habilitada.');
    END IF;

    IF NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false, 'error', 'La subasta ya ha finalizado.');
    END IF;

    SELECT id_colaborador, id_rol INTO v_id_colaborador, v_id_rol
    FROM sub_colaboradores
    WHERE ci_documento = p_ci_documento AND habilitado = 'SI';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Colaborador no encontrado o no habilitado.');
    END IF;

    -- ▼ NUEVO: solo el rol USUARIO participa de la subasta
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

    IF p_monto < v_precio_base THEN
        RETURN json_build_object('success', false,
            'error', 'El monto ofertado debe ser mayor o igual al precio base (USD ' || v_precio_base || ').');
    END IF;

    SELECT COUNT(*) INTO v_count_oferta
    FROM sub_ofertas
    WHERE id_activo = p_id_activo AND id_colaborador = v_id_colaborador;

    IF v_count_oferta > 0 THEN
        RETURN json_build_object('success', false, 'error', 'Ya realizaste una oferta por este activo.');
    END IF;

    INSERT INTO sub_ofertas (id_activo, id_colaborador, monto)
    VALUES (p_id_activo, v_id_colaborador, p_monto);

    RETURN json_build_object('success', true, 'message', 'Oferta registrada exitosamente.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION procesar_ganadores() RETURNS JSON AS $$
BEGIN
    DELETE FROM sub_resultados;

    WITH datos_base AS (
        SELECT
            o.id_activo, o.id_colaborador, o.monto, o.fecha_hora AS fecha_oferta,
            c.nombre, c.fecha_ingreso, ca.nivel_jerarquia, a.id_categoria
        FROM sub_ofertas o
        JOIN sub_colaboradores c ON o.id_colaborador = c.id_colaborador
        JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo
        JOIN sub_activos a ON o.id_activo = a.id_activo
        WHERE a.estado = 'Disponible'
          AND c.habilitado = 'SI'
          AND c.id_rol = 2          -- ▼ NUEVO: admins y visitantes no pueden ganar
    ),
    pre_ranking AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY id_activo
                ORDER BY monto DESC, nivel_jerarquia ASC, fecha_ingreso ASC
            ) AS ranking_activo
        FROM datos_base
    ),
    ganadores_finales AS (
        SELECT
            id_activo, id_colaborador, monto AS monto_final,
            CASE
                WHEN (SELECT COUNT(*) FROM pre_ranking p2
                      WHERE p2.id_activo = pre_ranking.id_activo
                        AND p2.monto = pre_ranking.monto) = 1
                    THEN 'GANADO POR OFERTA MAS ALTA'
                WHEN (SELECT COUNT(*) FROM pre_ranking p2
                      WHERE p2.id_activo = pre_ranking.id_activo
                        AND p2.monto = pre_ranking.monto
                        AND p2.nivel_jerarquia = pre_ranking.nivel_jerarquia) = 1
                    THEN 'GANADO POR JERARQUIA'
                ELSE 'GANADO POR ANTIGUEDAD'
            END AS criterio_desempate
        FROM pre_ranking
        WHERE ranking_activo = 1
    )
    INSERT INTO sub_resultados (id_activo, id_colaborador_ganador, monto_final, criterio_desempate)
    SELECT id_activo, id_colaborador, monto_final, criterio_desempate
    FROM ganadores_finales;

    UPDATE sub_activos SET estado = 'Adjudicado'
    WHERE id_activo IN (SELECT id_activo FROM sub_resultados);

    RETURN json_build_object(
        'success', true,
        'message', 'Ganadores procesados exitosamente.',
        'total_adjudicados', (SELECT COUNT(*) FROM sub_resultados)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Control: cuántos colaboradores pueden realmente ofertar
SELECT r.descripcion AS rol, COUNT(*) AS personas,
       CASE WHEN c.id_rol = 2 THEN 'PUEDE OFERTAR' ELSE 'BLOQUEADO' END AS estado
FROM sub_colaboradores c JOIN sub_roles r ON c.id_rol = r.id_rol
GROUP BY r.descripcion, c.id_rol ORDER BY c.id_rol;

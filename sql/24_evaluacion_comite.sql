-- ═══════════════════════════════════════════════════════════════════
-- 24 — Empate total: evaluación del comité (F14)
--
-- Si los dos primeros postores de un activo empatan en monto, jerarquía y
-- antigüedad, ya no gana quien registró primero la oferta:
--   * procesar_ganadores(): el activo queda sin ganador, con estado 'En evaluación'
--     y criterio 'REQUIERE EVALUACION'; el activo pasa a Cerrado. Los empatados no
--     quedan bloqueados en la categoría.
--   * reasignar_por_desistimiento(): misma regla para los siguientes postores.
--   * resolver_evaluacion(p_token, p_id_activo, p_id_colaborador): el admin registra a
--     quién adjudicó el comité (criterio 'ADJUDICADO POR DECISION DEL COMITE'), auditado.
--   * publicar_resultados(): rechaza publicar mientras haya activos en evaluación.
--   * leer_datos(p_token, 'evaluaciones'): los empatados de cada activo, solo admin.
--   * candidatos_activo(id_activo): regla común de quién puede ganar hoy (uso interno).
--
-- Reemplaza procesar_ganadores(), reasignar_por_desistimiento(), publicar_resultados()
-- y leer_datos(); mismas firmas. Transaccional e idempotente. Requiere 23_veto_servidor.sql.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE sub_resultados DROP CONSTRAINT IF EXISTS chk_resultados_estado;
ALTER TABLE sub_resultados ADD CONSTRAINT chk_resultados_estado CHECK (
    estado_adjudicacion IN ('Adjudicado', 'Reasignado', 'Desierto', 'En evaluación')
    AND (estado_adjudicacion IN ('Desierto', 'En evaluación')) = (id_colaborador_ganador IS NULL)
);

-- Primer grupo de postores que hoy pueden ganar el activo: habilitados, rol Usuario,
-- sin desistimiento en este activo y sin otro activo ganado en la categoría (tope).
-- Una fila si hay un primero claro; varias si empatan en monto, jerarquía y antigüedad
-- (las ordena por fecha de oferta); ninguna si no queda nadie. Uso interno.
CREATE OR REPLACE FUNCTION candidatos_activo(p_id_activo INTEGER)
RETURNS TABLE (id_colaborador INTEGER, nombre TEXT, cargo TEXT, monto NUMERIC)
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_temp
AS $$
    WITH elegibles AS (
        SELECT o.id_colaborador AS id_col, c.nombre::text AS nom, ca.descripcion::text AS car,
               o.monto AS mon, ca.nivel_jerarquia AS niv, c.fecha_ingreso AS ing,
               o.fecha_hora AS fh, o.id_oferta AS ido
        FROM sub_ofertas o
        JOIN sub_activos a ON a.id_activo = o.id_activo
        JOIN sub_colaboradores c ON c.id_colaborador = o.id_colaborador
        JOIN sub_cargos ca ON ca.id_cargo = c.id_cargo
        WHERE o.id_activo = p_id_activo
          AND c.habilitado = 'SI'
          AND c.id_rol = 2
          AND NOT EXISTS (
              SELECT 1 FROM sub_desistimientos d
              WHERE d.id_activo = p_id_activo AND d.id_colaborador = o.id_colaborador
          )
          AND NOT EXISTS (
              SELECT 1
              FROM sub_resultados r2
              JOIN sub_activos a2 ON a2.id_activo = r2.id_activo
              WHERE a2.id_categoria = a.id_categoria
                AND r2.id_activo <> p_id_activo
                AND r2.id_colaborador_ganador = o.id_colaborador
          )
    ),
    primero AS (
        SELECT mon, niv, ing FROM elegibles
        ORDER BY mon DESC, niv ASC, ing ASC
        LIMIT 1
    )
    SELECT e.id_col, e.nom, e.car, e.mon
    FROM elegibles e
    JOIN primero p ON e.mon = p.mon AND e.niv = p.niv AND e.ing = p.ing
    ORDER BY e.fh, e.ido;
$$;

CREATE OR REPLACE FUNCTION procesar_ganadores() RETURNS JSON AS $$
DECLARE
    v_cat RECORD;
    v_cambios BOOLEAN;
    v_conflicto RECORD;
    v_mejor_activo INTEGER;
    v_total_adjudicados INTEGER;
    v_total_evaluacion INTEGER;
    v_ganador RECORD;
    v_segundo RECORD;
    v_primero INTEGER;
    v_criterio VARCHAR(100);
BEGIN
    -- Por rondas (F11): solo se adjudica lo que sigue Disponible. Los resultados de rondas
    -- anteriores no se tocan; solo se descarta alguno que haya quedado de un activo
    -- todavía Disponible. (pg-safeupdate exige WHERE en todo DELETE de la API.)
    DELETE FROM sub_resultados
    WHERE id_activo IN (SELECT id_activo FROM sub_activos WHERE estado = 'Disponible');

    CREATE TEMP TABLE temp_ofertas_eval_orig ON COMMIT DROP AS
    SELECT
        o.id_oferta, o.id_activo, o.id_colaborador, o.monto, o.fecha_hora,
        a.id_categoria, ca.nivel_jerarquia, c.fecha_ingreso
    FROM sub_ofertas o
    JOIN sub_activos a ON o.id_activo = a.id_activo
    JOIN sub_colaboradores c ON o.id_colaborador = c.id_colaborador
    JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo
    WHERE a.estado = 'Disponible'
      AND c.habilitado = 'SI'
      AND c.id_rol = 2;

    CREATE TEMP TABLE temp_ofertas_eval ON COMMIT DROP AS
    SELECT * FROM temp_ofertas_eval_orig;

    CREATE TEMP TABLE temp_ganadores_asignados (
        id_activo INTEGER PRIMARY KEY,
        id_categoria INTEGER,
        id_colaborador INTEGER,
        monto NUMERIC,
        id_oferta INTEGER
    ) ON COMMIT DROP;

    CREATE TEMP TABLE temp_colaborador_categoria_bloqueado (
        id_colaborador INTEGER,
        id_categoria INTEGER,
        PRIMARY KEY (id_colaborador, id_categoria)
    ) ON COMMIT DROP;

    -- Empate total (monto, jerarquía y antigüedad) entre los dos primeros postores:
    -- el activo no se adjudica y queda En evaluación para que decida el comité (F14).
    -- Los empatados no quedan bloqueados en la categoría.
    CREATE TEMP TABLE temp_activos_evaluacion (
        id_activo INTEGER PRIMARY KEY,
        monto NUMERIC
    ) ON COMMIT DROP;

    -- El tope de 1 por categoría vale para toda la subasta: quien ya ganó en una
    -- ronda anterior no puede ganar otro activo de esa categoría.
    INSERT INTO temp_colaborador_categoria_bloqueado (id_colaborador, id_categoria)
    SELECT DISTINCT r.id_colaborador_ganador, a.id_categoria
    FROM sub_resultados r
    JOIN sub_activos a ON a.id_activo = r.id_activo
    WHERE r.id_colaborador_ganador IS NOT NULL;

    FOR v_cat IN
        SELECT DISTINCT id_categoria
        FROM temp_ofertas_eval
        ORDER BY id_categoria
    LOOP
        v_cambios := true;
        WHILE v_cambios LOOP
            v_cambios := false;

            DROP TABLE IF EXISTS temp_ranking;
            CREATE TEMP TABLE temp_ranking ON COMMIT DROP AS
            SELECT
                t.id_activo, t.id_colaborador, t.monto, t.id_oferta,
                t.nivel_jerarquia, t.fecha_ingreso,
                ROW_NUMBER() OVER (
                    PARTITION BY t.id_activo
                    ORDER BY
                        t.monto DESC,
                        t.nivel_jerarquia ASC,
                        t.fecha_ingreso ASC,
                        t.fecha_hora ASC,
                        t.id_oferta ASC
                ) AS rn
            FROM temp_ofertas_eval t
            WHERE t.id_categoria = v_cat.id_categoria
              AND t.id_activo NOT IN (SELECT id_activo FROM temp_ganadores_asignados)
              AND t.id_activo NOT IN (SELECT id_activo FROM temp_activos_evaluacion)
              AND t.id_colaborador NOT IN (
                  SELECT id_colaborador
                  FROM temp_colaborador_categoria_bloqueado
                  WHERE id_categoria = v_cat.id_categoria
              );

            INSERT INTO temp_activos_evaluacion (id_activo, monto)
            SELECT p.id_activo, p.monto
            FROM temp_ranking p
            JOIN temp_ranking s ON s.id_activo = p.id_activo AND s.rn = 2
            WHERE p.rn = 1
              AND s.monto = p.monto
              AND s.nivel_jerarquia = p.nivel_jerarquia
              AND s.fecha_ingreso = p.fecha_ingreso;

            DROP TABLE IF EXISTS temp_lideres_tentativos;
            CREATE TEMP TABLE temp_lideres_tentativos ON COMMIT DROP AS
            SELECT id_activo, id_colaborador, monto, id_oferta
            FROM temp_ranking
            WHERE rn = 1
              AND id_activo NOT IN (SELECT id_activo FROM temp_activos_evaluacion);

            IF NOT EXISTS (SELECT 1 FROM temp_lideres_tentativos) THEN
                EXIT;
            END IF;

            SELECT id_colaborador INTO v_conflicto
            FROM temp_lideres_tentativos
            GROUP BY id_colaborador
            HAVING COUNT(*) > 1
            LIMIT 1;

            IF FOUND THEN
                SELECT id_activo INTO v_mejor_activo
                FROM temp_lideres_tentativos
                WHERE id_colaborador = v_conflicto.id_colaborador
                ORDER BY monto DESC, id_activo ASC
                LIMIT 1;

                INSERT INTO temp_ganadores_asignados (id_activo, id_categoria, id_colaborador, monto, id_oferta)
                SELECT id_activo, v_cat.id_categoria, id_colaborador, monto, id_oferta
                FROM temp_lideres_tentativos
                WHERE id_activo = v_mejor_activo;

                INSERT INTO temp_colaborador_categoria_bloqueado (id_colaborador, id_categoria)
                VALUES (v_conflicto.id_colaborador, v_cat.id_categoria);

                DELETE FROM temp_ofertas_eval
                WHERE id_categoria = v_cat.id_categoria
                  AND id_colaborador = v_conflicto.id_colaborador
                  AND id_activo <> v_mejor_activo;

                v_cambios := true;
            ELSE
                INSERT INTO temp_ganadores_asignados (id_activo, id_categoria, id_colaborador, monto, id_oferta)
                SELECT id_activo, v_cat.id_categoria, id_colaborador, monto, id_oferta
                FROM temp_lideres_tentativos;

                INSERT INTO temp_colaborador_categoria_bloqueado (id_colaborador, id_categoria)
                SELECT id_colaborador, v_cat.id_categoria
                FROM temp_lideres_tentativos;

                v_cambios := false;
            END IF;
        END LOOP;
    END LOOP;

    FOR v_ganador IN
        SELECT
            g.id_activo, g.id_colaborador, g.monto,
            orig.nivel_jerarquia, orig.fecha_ingreso, orig.fecha_hora
        FROM temp_ganadores_asignados g
        JOIN temp_ofertas_eval_orig orig ON g.id_oferta = orig.id_oferta
        ORDER BY g.id_activo
    LOOP
        -- Colaborador con la mejor oferta válida del activo. Si no es el ganador, es
        -- porque ya tenía otro activo de esta categoría: ganó por el tope (F13).
        SELECT id_colaborador INTO v_primero
        FROM temp_ofertas_eval_orig
        WHERE id_activo = v_ganador.id_activo
        ORDER BY
            monto DESC,
            nivel_jerarquia ASC,
            fecha_ingreso ASC,
            fecha_hora ASC,
            id_oferta ASC
        LIMIT 1;

        SELECT monto, nivel_jerarquia, fecha_ingreso, fecha_hora
        INTO v_segundo
        FROM temp_ofertas_eval_orig
        WHERE id_activo = v_ganador.id_activo
          AND id_colaborador <> v_ganador.id_colaborador
        ORDER BY
            monto DESC,
            nivel_jerarquia ASC,
            fecha_ingreso ASC,
            fecha_hora ASC,
            id_oferta ASC
        LIMIT 1;

        IF NOT FOUND THEN
            v_criterio := 'GANADO POR OFERTA MAS ALTA';
        ELSIF v_primero <> v_ganador.id_colaborador THEN
            v_criterio := 'GANADO POR TOPE DE CATEGORIA';
        ELSIF v_ganador.monto > v_segundo.monto THEN
            v_criterio := 'GANADO POR OFERTA MAS ALTA';
        ELSIF v_ganador.nivel_jerarquia < v_segundo.nivel_jerarquia THEN
            v_criterio := 'GANADO POR JERARQUIA';
        ELSIF v_ganador.fecha_ingreso < v_segundo.fecha_ingreso THEN
            v_criterio := 'GANADO POR ANTIGUEDAD';
        ELSE
            -- Empate total que no pasó a evaluación: el otro postor ya tenía un
            -- activo de esta categoría (F14)
            v_criterio := 'GANADO POR TOPE DE CATEGORIA';
        END IF;

        INSERT INTO sub_resultados (id_activo, id_colaborador_ganador, monto_final, criterio_desempate)
        VALUES (v_ganador.id_activo, v_ganador.id_colaborador, v_ganador.monto, v_criterio);
    END LOOP;

    -- Empates totales: sin ganador hasta que decida el comité (F14). El activo pasa a
    -- Cerrado para que no reciba ofertas ni se vuelva a procesar en otra ronda.
    INSERT INTO sub_resultados (id_activo, id_colaborador_ganador, monto_final, criterio_desempate, estado_adjudicacion)
    SELECT id_activo, NULL, monto, 'REQUIERE EVALUACION', 'En evaluación'
    FROM temp_activos_evaluacion;

    UPDATE sub_activos
    SET estado = 'Cerrado'
    WHERE id_activo IN (SELECT id_activo FROM temp_activos_evaluacion);

    UPDATE sub_activos
    SET estado = 'Adjudicado'
    WHERE id_activo IN (SELECT id_activo FROM temp_ganadores_asignados);

    -- Adjudicados y en evaluación en esta ronda
    SELECT COUNT(*) INTO v_total_adjudicados FROM temp_ganadores_asignados;
    SELECT COUNT(*) INTO v_total_evaluacion FROM temp_activos_evaluacion;

    -- Ganadores nuevos: la publicación se pausa hasta que el admin los revise y vuelva a publicar
    IF v_total_adjudicados + v_total_evaluacion > 0 THEN
        UPDATE sub_app_config SET resultados_publicados = false WHERE id = 1;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Adjudicación procesada exitosamente con tope por categoría y desempates.',
        'total_adjudicados', v_total_adjudicados,
        'total_en_evaluacion', v_total_evaluacion
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- La interna sigue sin exponerse por la API: solo la llama procesar_ganadores(p_token)
REVOKE EXECUTE ON FUNCTION procesar_ganadores() FROM PUBLIC, anon, authenticated;

-- REASIGNAR POR DESISTIMIENTO (F07). Con empate total entre los siguientes postores,
-- el activo pasa a En evaluación (F14).
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
    v_candidatos     INTEGER;
    v_nuevo_id       INTEGER;
    v_nuevo_monto    NUMERIC(10, 2);
    v_nuevo_nombre   TEXT;
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
            'error', 'El activo no tiene ganador que pueda desistir (está Desierto o en evaluación del comité).');
    END IF;

    -- 1. El ganador actual queda como Desistido de este activo
    INSERT INTO sub_desistimientos (id_activo, id_colaborador, monto, motivo, usuario)
    VALUES (p_id_activo, v_resultado.id_colaborador_ganador, v_resultado.monto_final, v_motivo, v_ci_admin)
    ON CONFLICT (id_activo, id_colaborador) DO NOTHING;

    -- 2. Siguientes postores elegibles, con el mismo orden de mérito que procesar_ganadores()
    --    (sin quienes desistieron de este activo ni quienes ya tienen otro de la categoría)
    SELECT COUNT(*) INTO v_candidatos FROM candidatos_activo(p_id_activo);

    SELECT id_colaborador, monto, nombre
    INTO v_nuevo_id, v_nuevo_monto, v_nuevo_nombre
    FROM candidatos_activo(p_id_activo)
    LIMIT 1;

    -- Orden de adjudicación del nuevo ganador: 1 desistimiento → 2º postor, 2 → 3º, ...
    SELECT COUNT(*) + 1 INTO v_orden_postor
    FROM sub_desistimientos
    WHERE id_activo = p_id_activo;

    -- 3. Reasignar, pasar a evaluación del comité o declarar desierto
    IF v_candidatos = 1 THEN
        UPDATE sub_resultados
        SET id_colaborador_ganador = v_nuevo_id,
            monto_final            = v_nuevo_monto,
            estado_adjudicacion    = 'Reasignado',
            criterio_desempate     = format('REASIGNADO POR DESISTIMIENTO (%sº POSTOR)', v_orden_postor),
            motivo_desistimiento   = v_motivo,
            fecha_actualizacion    = NOW()
        WHERE id_resultado = v_resultado.id_resultado;
    ELSIF v_candidatos > 1 THEN
        UPDATE sub_resultados
        SET id_colaborador_ganador = NULL,
            monto_final            = v_nuevo_monto,
            estado_adjudicacion    = 'En evaluación',
            criterio_desempate     = 'REQUIERE EVALUACION',
            motivo_desistimiento   = v_motivo,
            fecha_actualizacion    = NOW()
        WHERE id_resultado = v_resultado.id_resultado;

        UPDATE sub_activos
        SET estado = 'Cerrado'
        WHERE id_activo = p_id_activo;

        -- No se publica con activos en evaluación
        UPDATE sub_app_config SET resultados_publicados = false WHERE id = 1;
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
        CASE WHEN v_candidatos = 1
             THEN format('Reasignado a colaborador %s (USD %s)', v_nuevo_id, v_nuevo_monto)
             WHEN v_candidatos > 1
             THEN format('En evaluación: empate total entre %s postores', v_candidatos)
             ELSE 'Desierto: sin postores elegibles'
        END,
        v_ci_admin
    );

    IF v_candidatos = 1 THEN
        RETURN json_build_object(
            'success', true,
            'estado_adjudicacion', 'Reasignado',
            'id_colaborador_ganador', v_nuevo_id,
            'colaborador_ganador', v_nuevo_nombre,
            'monto_final', v_nuevo_monto,
            'message', format('Activo reasignado a %s (%sº postor).', v_nuevo_nombre, v_orden_postor)
        );
    END IF;

    IF v_candidatos > 1 THEN
        RETURN json_build_object(
            'success', true,
            'estado_adjudicacion', 'En evaluación',
            'id_colaborador_ganador', NULL,
            'monto_final', v_nuevo_monto,
            'message', 'Los siguientes postores empatan en monto, jerarquía y antigüedad: el activo queda en evaluación del comité y la publicación se pausa.'
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

-- RESOLVER UN EMPATE TOTAL (F14): el admin registra a quién adjudicó el comité
CREATE OR REPLACE FUNCTION resolver_evaluacion(
    p_token TEXT,
    p_id_activo INTEGER,
    p_id_colaborador INTEGER
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_ci_admin   VARCHAR(20) := validar_sesion_admin(p_token);
    v_resultado  sub_resultados%ROWTYPE;
    v_monto      NUMERIC(10, 2);
    v_nombre     TEXT;
BEGIN
    IF v_ci_admin IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    -- Mismo lock que los desistimientos: los dos asignan ganadores fuera de procesar_ganadores()
    PERFORM pg_advisory_xact_lock(hashtext('reasignar_por_desistimiento'));

    SELECT * INTO v_resultado
    FROM sub_resultados
    WHERE id_activo = p_id_activo
    FOR UPDATE;

    IF NOT FOUND OR v_resultado.estado_adjudicacion <> 'En evaluación' THEN
        RETURN json_build_object('success', false, 'error', 'Este activo no está en evaluación del comité.');
    END IF;

    -- Solo uno de los empatados que hoy puede ganarlo (tope y desistimientos al día)
    SELECT monto, nombre INTO v_monto, v_nombre
    FROM candidatos_activo(p_id_activo)
    WHERE id_colaborador = p_id_colaborador;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'error', 'El colaborador no está entre los postores empatados de este activo.');
    END IF;

    UPDATE sub_resultados
    SET id_colaborador_ganador = p_id_colaborador,
        monto_final            = v_monto,
        estado_adjudicacion    = 'Adjudicado',
        criterio_desempate     = 'ADJUDICADO POR DECISION DEL COMITE',
        fecha_actualizacion    = NOW()
    WHERE id_resultado = v_resultado.id_resultado;

    UPDATE sub_activos
    SET estado = 'Adjudicado'
    WHERE id_activo = p_id_activo;

    INSERT INTO sub_auditoria_cambios (
        tabla_afectada, id_registro, accion, campo, valor_anterior, valor_nuevo, usuario
    ) VALUES (
        'sub_resultados',
        v_resultado.id_resultado,
        'UPDATE',
        'id_colaborador_ganador',
        'En evaluación (empate total)',
        format('Adjudicado por decisión del comité a colaborador %s (USD %s)', p_id_colaborador, v_monto),
        v_ci_admin
    );

    RETURN json_build_object('success', true,
        'message', format('Activo adjudicado a %s por decisión del comité.', v_nombre));
END;
$$;

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

    -- Los empates totales los decide el comité antes de publicar (F14)
    IF p_publicar AND EXISTS (SELECT 1 FROM sub_resultados WHERE estado_adjudicacion = 'En evaluación') THEN
        RETURN json_build_object('success', false,
            'error', 'Hay activos que requieren evaluación del comité. Resuélvalos en Resultados antes de publicar.');
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

    ELSIF p_consulta = 'evaluaciones' THEN
        -- Postores empatados de cada activo en evaluación del comité (F14)
        SELECT json_agg(e ORDER BY e.id_activo, e.orden) INTO v_filas
        FROM (SELECT r.id_activo, c.id_colaborador, c.nombre, c.cargo, c.monto, c.orden
              FROM sub_resultados r
              CROSS JOIN LATERAL candidatos_activo(r.id_activo)
                  WITH ORDINALITY AS c(id_colaborador, nombre, cargo, monto, orden)
              WHERE r.estado_adjudicacion = 'En evaluación') e;

    ELSE
        RETURN json_build_object('success', false, 'error', 'Consulta desconocida.');
    END IF;

    RETURN json_build_object('success', true, 'filas', COALESCE(v_filas, '[]'::json));
END;
$$;

REVOKE EXECUTE ON FUNCTION candidatos_activo(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION resolver_evaluacion(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolver_evaluacion(TEXT, INTEGER, INTEGER) TO anon, authenticated;

INSERT INTO sub_migraciones (archivo) VALUES ('24_evaluacion_comite.sql')
ON CONFLICT (archivo) DO NOTHING;

-- PostgREST: refrescar el caché (función nueva)
NOTIFY pgrst, 'reload schema';

COMMIT;

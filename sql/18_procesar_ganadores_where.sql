-- ═══════════════════════════════════════════════════════════════════
-- 18 — procesar_ganadores: DELETE con WHERE
--
-- Supabase carga pg-safeupdate en las sesiones de la API: rechaza DELETE y
-- UPDATE sin WHERE aunque corran dentro de una función SECURITY DEFINER.
-- "Procesar Ganadores" fallaba con "DELETE requires a WHERE clause" en
-- DELETE FROM sub_resultados. Se agrega WHERE true (mismo efecto: borra todo).
--
-- Reemplaza la función interna vigente (F06: tope por categoría, cascada y
-- desempate). La llama procesar_ganadores(p_token), que valida al admin.
-- NO usar la versión de 03_functions.sql: no tiene el tope por categoría.
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;
CREATE OR REPLACE FUNCTION procesar_ganadores() RETURNS JSON AS $$
DECLARE
    v_cat RECORD;
    v_cambios BOOLEAN;
    v_conflicto RECORD;
    v_mejor_activo INTEGER;
    v_total_adjudicados INTEGER;
    v_ganador RECORD;
    v_segundo RECORD;
    v_criterio VARCHAR(100);
BEGIN
    DELETE FROM sub_resultados WHERE true;

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

    FOR v_cat IN 
        SELECT DISTINCT id_categoria 
        FROM temp_ofertas_eval 
        ORDER BY id_categoria 
    LOOP
        v_cambios := true;
        WHILE v_cambios LOOP
            v_cambios := false;

            DROP TABLE IF EXISTS temp_lideres_tentativos;
            CREATE TEMP TABLE temp_lideres_tentativos ON COMMIT DROP AS
            WITH ranking_candidatos AS (
                SELECT 
                    t.id_activo, t.id_colaborador, t.monto, t.id_oferta,
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
                  AND t.id_colaborador NOT IN (
                      SELECT id_colaborador 
                      FROM temp_colaborador_categoria_bloqueado 
                      WHERE id_categoria = v_cat.id_categoria
                  )
            )
            SELECT id_activo, id_colaborador, monto, id_oferta
            FROM ranking_candidatos
            WHERE rn = 1;

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
        ELSIF v_ganador.monto > v_segundo.monto THEN
            v_criterio := 'GANADO POR OFERTA MAS ALTA';
        ELSIF v_ganador.nivel_jerarquia < v_segundo.nivel_jerarquia THEN
            v_criterio := 'GANADO POR JERARQUIA';
        ELSIF v_ganador.fecha_ingreso < v_segundo.fecha_ingreso THEN
            v_criterio := 'GANADO POR ANTIGUEDAD';
        ELSE
            v_criterio := 'GANADO POR REGISTRO DE OFERTA';
        END IF;

        INSERT INTO sub_resultados (id_activo, id_colaborador_ganador, monto_final, criterio_desempate)
        VALUES (v_ganador.id_activo, v_ganador.id_colaborador, v_ganador.monto, v_criterio);
    END LOOP;

    UPDATE sub_activos
    SET estado = 'Adjudicado'
    WHERE id_activo IN (SELECT id_activo FROM sub_resultados);

    SELECT COUNT(*) INTO v_total_adjudicados FROM sub_resultados;

    RETURN json_build_object(
        'success', true,
        'message', 'Adjudicación procesada exitosamente con tope por categoría y desempates.',
        'total_adjudicados', v_total_adjudicados
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sigue sin exponerse por la API: solo se llama desde procesar_ganadores(p_token)
REVOKE EXECUTE ON FUNCTION procesar_ganadores() FROM PUBLIC, anon, authenticated;

INSERT INTO sub_migraciones (archivo) VALUES ('18_procesar_ganadores_where.sql')
ON CONFLICT (archivo) DO NOTHING;

COMMIT;
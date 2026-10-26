-- ═══════════════════════════════════════════════════════════════════
-- F10 — Lecturas con sesión, para publicar en internet sin exponer datos
--
-- Con F09 la anon key ya no escribe, pero seguía leyendo la nómina (cédula,
-- nombre, ingreso), todas las ofertas con nombre y cédula, y los resultados
-- antes de publicarse. Desde acá:
--   * anon/authenticated solo leen el catálogo: sub_activos, sub_app_config
--     (también por Realtime), sub_cargos y sub_v_resumen_ofertas
--     (cantidad y monto líder por activo, sin postor: P9).
--   * Lo demás se lee con leer_datos(p_token, p_consulta), que valida el token:
--       'mis_ofertas'                        → cualquier sesión, solo las propias
--       'resultados'                         → admin siempre; el resto si están publicados
--       'ofertas', 'colaboradores', 'nomina' → solo admin
--   * Las tablas nuevas tampoco nacen legibles: hay que darles GRANT SELECT a propósito.
--   * Las fotos guardadas con la IP del servidor pasan a ruta relativa, que sirve
--     igual en la LAN y en internet.
--
-- Va junto con el frontend que usa leer_datos: el anterior deja de ver ofertas,
-- colaboradores y resultados.
-- Transaccional: si algo falla no queda nada aplicado. Idempotente.
-- Requiere 14_hardening_api.sql (validar_sesion).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Monto líder y cantidad de ofertas por activo, sin postor (F04). Una fila por
--    activo: no se trunca con muchas ofertas y pesa poco aunque todos consulten cada 6 s.
CREATE OR REPLACE VIEW sub_v_resumen_ofertas AS
SELECT id_activo, COUNT(*)::int AS total_ofertas, MAX(monto) AS monto_lider
FROM sub_ofertas
GROUP BY id_activo;

-- 2. Lecturas que exigen sesión
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

    ELSE
        RETURN json_build_object('success', false, 'error', 'Consulta desconocida.');
    END IF;

    RETURN json_build_object('success', true, 'filas', COALESCE(v_filas, '[]'::json));
END;
$$;

GRANT EXECUTE ON FUNCTION leer_datos(TEXT, TEXT) TO anon, authenticated;

-- 3. Lectura por la API: solo el catálogo
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON sub_activos, sub_app_config, sub_cargos, sub_v_resumen_ofertas TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon, authenticated;

-- 4. Fotos: de http://20.20.20.77/storage/... a /storage/...
UPDATE sub_activos
SET foto_url = substring(foto_url FROM '^https?://20\.20\.20\.77(/storage/.*)$')
WHERE foto_url ~ '^https?://20\.20\.20\.77/storage/';

INSERT INTO sub_migraciones (archivo) VALUES ('16_lecturas_con_sesion.sql')
ON CONFLICT (archivo) DO NOTHING;

-- PostgREST: refrescar el caché (vista y función nuevas)
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────
-- VERIFICACIÓN: las cinco primeras columnas deben dar false y la última true
-- ─────────────────────────────────────────────────────────

SELECT
    has_table_privilege('anon', 'sub_colaboradores', 'SELECT')        AS anon_lee_nomina,
    has_table_privilege('anon', 'sub_ofertas', 'SELECT')              AS anon_lee_ofertas,
    has_table_privilege('anon', 'sub_v_ofertas_recibidas', 'SELECT')  AS anon_lee_postores,
    has_table_privilege('anon', 'sub_v_datos_colaborador', 'SELECT')  AS anon_lee_colaboradores,
    has_table_privilege('anon', 'sub_v_resultados_detalle', 'SELECT') AS anon_lee_resultados,
    has_table_privilege('anon', 'sub_v_resumen_ofertas', 'SELECT')   AS anon_lee_catalogo;

-- Huella del esquema: una fila por función, tabla, vista y política, con un hash
-- de su definición y los permisos de anon. Sirve para comparar una base real
-- (NUC) contra una instalación limpia del repo: si las filas coinciden, el
-- esquema es el mismo. No lee datos.
--
-- Uso en el NUC:
--   docker exec -i supabase-db psql -U postgres -d postgres -At -F ' | ' < huella_esquema.sql

SELECT * FROM (
    SELECT 'funcion' AS tipo,
           p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS nombre,
           left(md5(p.prosrc), 10)
             || ' definer=' || p.prosecdef
             || ' anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')
             || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), '-') AS detalle
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'

    UNION ALL
    SELECT CASE c.relkind WHEN 'v' THEN 'vista' ELSE 'tabla' END,
           c.relname,
           'cols=' || left(md5(coalesce((
               SELECT string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull, ',' ORDER BY a.attnum)
               FROM pg_attribute a
               WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped), '')), 10)
             || CASE c.relkind WHEN 'v' THEN ' def=' || left(md5(pg_get_viewdef(c.oid)), 10) ELSE '' END
             || ' rls=' || c.relrowsecurity
             || ' anon_lee=' || has_table_privilege('anon', c.oid, 'SELECT')
             || ' anon_escribe=' || has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v')

    UNION ALL
    SELECT 'politica',
           schemaname || '.' || tablename || '.' || policyname,
           cmd || ' ' || left(md5(coalesce(qual, '') || '|' || coalesce(with_check, '')), 10)
    FROM pg_policies
    WHERE schemaname = 'public' OR (schemaname = 'storage' AND policyname LIKE 'activos%')
) h
ORDER BY tipo, nombre;

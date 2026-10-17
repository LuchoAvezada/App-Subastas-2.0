-- ═══════════════════════════════════════════════════════════════════
-- F08 — Sincronización del temporizador de cierre en todos los clientes
-- CountdownContext escucha los cambios de sub_app_config por Supabase
-- Realtime; solo llegan si la tabla está en la publicación supabase_realtime.
-- Idempotente: se puede ejecutar más de una vez.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'sub_app_config'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sub_app_config;
    END IF;
END $$;

SELECT tablename AS tabla_en_realtime
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'sub_app_config';

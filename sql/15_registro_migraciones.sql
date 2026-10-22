-- ═══════════════════════════════════════════════════════════════════
-- Registro de migraciones aplicadas
-- Cada script nuevo de sql/ termina insertando su nombre acá, para saber
-- qué tiene aplicado cada base (NUC, pruebas) sin depender de la memoria.
-- Idempotente: se puede ejecutar más de una vez.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_migraciones (
    archivo   TEXT PRIMARY KEY,
    aplicada  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON sub_migraciones FROM PUBLIC, anon, authenticated;

-- Línea de base: 14 (F09) se registra solo si sus funciones ya existen
INSERT INTO sub_migraciones (archivo)
SELECT '14_hardening_api.sql'
WHERE to_regprocedure('guardar_activo(text, integer, integer, text, text, text, text, text, numeric, text, text)') IS NOT NULL
ON CONFLICT (archivo) DO NOTHING;

INSERT INTO sub_migraciones (archivo) VALUES ('15_registro_migraciones.sql')
ON CONFLICT (archivo) DO NOTHING;

SELECT archivo, aplicada FROM sub_migraciones ORDER BY archivo;

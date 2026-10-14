-- ═══════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Cancelación de Ofertas con Veto (P9)
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. FUNCIÓN RPC: cancelar_oferta
-- ─────────────────────────────────────────────────────────
-- Permite al colaborador anular voluntariamente una oferta propia antes del cierre.
-- Ejecuta con SECURITY DEFINER para asegurar la eliminación física
-- superando las restricciones de RLS de la tabla sub_ofertas.

CREATE OR REPLACE FUNCTION cancelar_oferta(
    p_id_oferta INTEGER,
    p_ci_documento TEXT
) RETURNS JSON AS $$
DECLARE
    v_id_colaborador INTEGER;
    v_fecha_fin      TIMESTAMP;
    v_oferta_owner   INTEGER;
    v_id_activo      INTEGER;
    v_monto          NUMERIC;
BEGIN
    -- 1. Validar que la subasta continúe abierta
    SELECT fecha_fin_subasta INTO v_fecha_fin
    FROM sub_app_config
    WHERE id = 1;

    IF v_fecha_fin IS NOT NULL AND NOW() > v_fecha_fin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La subasta ya ha finalizado. No es posible anular ofertas.'
        );
    END IF;

    -- 2. Validar que el colaborador exista y esté habilitado
    SELECT id_colaborador INTO v_id_colaborador
    FROM sub_colaboradores
    WHERE ci_documento = p_ci_documento;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Colaborador no encontrado con el documento proporcionado.'
        );
    END IF;

    -- 3. Validar existencia y titularidad de la oferta
    SELECT id_colaborador, id_activo, monto
    INTO v_oferta_owner, v_id_activo, v_monto
    FROM sub_ofertas
    WHERE id_oferta = p_id_oferta;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La oferta no existe o ya fue anulada previamente.'
        );
    END IF;

    IF v_oferta_owner <> v_id_colaborador THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No tiene permisos para anular esta oferta.'
        );
    END IF;

    -- 4. Eliminar físicamente la oferta
    DELETE FROM sub_ofertas
    WHERE id_oferta = p_id_oferta;

    -- 5. Registrar en la auditoría de cambios
    INSERT INTO sub_auditoria_cambios (
        tabla_afectada,
        id_registro,
        accion,
        campo,
        valor_anterior,
        usuario
    ) VALUES (
        'sub_ofertas',
        p_id_oferta,
        'DELETE',
        'monto',
        v_monto::TEXT,
        p_ci_documento
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Oferta anulada exitosamente.',
        'id_activo', v_id_activo,
        'monto_anulado', v_monto
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permisos de ejecución para roles de Supabase
GRANT EXECUTE ON FUNCTION cancelar_oferta(INTEGER, TEXT) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────
-- 2. POLÍTICAS RLS EN sub_ofertas (por si se interactúa vía API REST)
-- ─────────────────────────────────────────────────────────
ALTER TABLE sub_ofertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ofertas_lectura" ON sub_ofertas;
CREATE POLICY "ofertas_lectura" ON sub_ofertas
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "ofertas_eliminacion" ON sub_ofertas;
CREATE POLICY "ofertas_eliminacion" ON sub_ofertas
    FOR DELETE TO anon, authenticated
    USING (true);

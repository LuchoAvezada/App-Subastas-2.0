-- ═══════════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Funciones RPC
-- Ejecutar después de 02_views.sql
-- Requiere extensión pgcrypto (habilitada en 01_schema.sql)
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- REGISTRAR NUEVO USUARIO
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_nuevo_usuario(
    p_ci_documento TEXT,
    p_password TEXT
) RETURNS JSON AS $$
DECLARE
    v_id_colaborador INTEGER;
    v_habilitado VARCHAR(2);
    v_count_usuario INTEGER;
BEGIN
    -- 1. Verificar que el colaborador exista
    SELECT id_colaborador, habilitado
    INTO v_id_colaborador, v_habilitado
    FROM sub_colaboradores
    WHERE ci_documento = p_ci_documento;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El documento ingresado no se encuentra registrado como colaborador.'
        );
    END IF;
    
    -- 2. Validar que esté habilitado
    IF UPPER(TRIM(v_habilitado)) != 'SI' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usted no se encuentra habilitado para participar de la subasta. Contacte al administrador.'
        );
    END IF;
    
    -- 3. Verificar que no exista ya el usuario
    SELECT COUNT(*) INTO v_count_usuario
    FROM sub_usuarios
    WHERE usuario = p_ci_documento;
    
    IF v_count_usuario > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ya existe un usuario registrado con este documento. Por favor, inicie sesión.'
        );
    END IF;
    
    -- 4. Validar password no igual al documento
    IF p_password = p_ci_documento THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña no puede ser igual al documento de identidad.'
        );
    END IF;
    
    -- 5. Validar longitud mínima
    IF LENGTH(p_password) < 8 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña debe tener al menos 8 caracteres.'
        );
    END IF;
    
    -- 6. Validar complejidad (al menos 1 mayúscula, 1 minúscula, 1 número)
    IF p_password !~ '[A-Z]' OR p_password !~ '[a-z]' OR p_password !~ '[0-9]' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.'
        );
    END IF;
    
    -- 7. Insertar usuario con password hasheado
    INSERT INTO sub_usuarios (usuario, password_hash, id_colaborador, situacion)
    VALUES (
        p_ci_documento,
        crypt(p_password, gen_salt('bf', 10)),
        v_id_colaborador,
        'A'
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario registrado exitosamente.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────
-- AUTENTICAR USUARIO CON BLOQUEO POR INTENTOS FALLIDOS
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION autenticar_usuario(
    p_ci_documento TEXT,
    p_password TEXT,
    p_ip TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_intentos_fallidos INTEGER;
    v_valido BOOLEAN;
    v_datos JSON;
BEGIN
    -- 1. Verificar bloqueo por intentos fallidos (últimos 15 minutos)
    SELECT COUNT(*) INTO v_intentos_fallidos
    FROM sub_intentos_login
    WHERE usuario = p_ci_documento
      AND exitoso = 'N'
      AND fecha_intento > NOW() - INTERVAL '15 minutes';
    
    IF v_intentos_fallidos >= 5 THEN
        INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
        VALUES (p_ci_documento, 'N', p_ip);
        
        RETURN json_build_object(
            'success', false,
            'error', 'Demasiados intentos fallidos. Su cuenta está bloqueada temporalmente por 15 minutos.'
        );
    END IF;
    
    -- 2. Validar credenciales
    SELECT EXISTS (
        SELECT 1 FROM sub_usuarios u
        JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
        WHERE c.ci_documento = p_ci_documento
          AND u.password_hash = crypt(p_password, u.password_hash)
          AND c.habilitado = 'SI'
          AND u.situacion = 'A'
    ) INTO v_valido;
    
    -- 3. Registrar intento
    INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
    VALUES (p_ci_documento, CASE WHEN v_valido THEN 'S' ELSE 'N' END, p_ip);
    
    IF NOT v_valido THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credenciales inválidas.'
        );
    END IF;
    
    -- 4. Retornar datos del usuario
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'id_usuario', u.id_usuario,
            'id_colaborador', c.id_colaborador,
            'ci_documento', c.ci_documento,
            'nombre', c.nombre,
            'id_rol', c.id_rol,
            'es_admin', COALESCE(c.id_rol = 1, false)
        )
    )
    INTO v_datos
    FROM sub_usuarios u
    JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
    WHERE c.ci_documento = p_ci_documento;
    
    RETURN v_datos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────
-- REGISTRAR OFERTA CON VALIDACIONES
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_oferta(
    p_id_activo INTEGER,
    p_ci_documento TEXT,
    p_monto NUMERIC
) RETURNS JSON AS $$
DECLARE
    v_id_colaborador INTEGER;
    v_precio_base NUMERIC;
    v_estado_activo VARCHAR(20);
    v_fecha_fin TIMESTAMP;
    v_count_oferta INTEGER;
BEGIN
    -- 1. Verificar que la subasta esté activa
    SELECT fecha_fin_subasta INTO v_fecha_fin
    FROM sub_app_config WHERE id = 1;
    
    IF v_fecha_fin IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La subasta aún no ha sido habilitada.');
    END IF;
    
    IF NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false, 'error', 'La subasta ya ha finalizado.');
    END IF;
    
    -- 2. Obtener id_colaborador
    SELECT id_colaborador INTO v_id_colaborador
    FROM sub_colaboradores
    WHERE ci_documento = p_ci_documento AND habilitado = 'SI';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Colaborador no encontrado o no habilitado.');
    END IF;
    
    -- 3. Obtener datos del activo
    SELECT precio_base, estado
    INTO v_precio_base, v_estado_activo
    FROM sub_activos
    WHERE id_activo = p_id_activo;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Activo no encontrado.');
    END IF;
    
    IF v_estado_activo != 'Disponible' THEN
        RETURN json_build_object('success', false, 'error', 'Este activo no está disponible para ofertas.');
    END IF;
    
    -- 4. Validar monto
    IF p_monto < v_precio_base THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'El monto ofertado debe ser mayor o igual al precio base (USD ' || v_precio_base || ').'
        );
    END IF;
    
    -- 5. Verificar oferta previa (solo una por activo)
    SELECT COUNT(*) INTO v_count_oferta
    FROM sub_ofertas
    WHERE id_activo = p_id_activo AND id_colaborador = v_id_colaborador;
    
    IF v_count_oferta > 0 THEN
        RETURN json_build_object('success', false, 'error', 'Ya realizaste una oferta por este activo.');
    END IF;
    
    -- 6. Insertar oferta
    INSERT INTO sub_ofertas (id_activo, id_colaborador, monto)
    VALUES (p_id_activo, v_id_colaborador, p_monto);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Oferta registrada exitosamente.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────
-- PROCESAR GANADORES (Versión simplificada)
-- Ver nota en la spec sobre CTEs adicionales del APEX original
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION procesar_ganadores() RETURNS JSON AS $$
BEGIN
    -- Limpiar resultados anteriores
    DELETE FROM sub_resultados;
    
    -- Ejecutar algoritmo con CTEs
    WITH datos_base AS (
        SELECT 
            o.id_activo,
            o.id_colaborador,
            o.monto,
            o.fecha_hora AS fecha_oferta,
            c.nombre,
            c.fecha_ingreso,
            ca.nivel_jerarquia,
            a.id_categoria
        FROM sub_ofertas o
        JOIN sub_colaboradores c ON o.id_colaborador = c.id_colaborador
        JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo
        JOIN sub_activos a ON o.id_activo = a.id_activo
        WHERE a.estado = 'Disponible'
          AND c.habilitado = 'SI'
    ),
    pre_ranking AS (
        SELECT 
            *,
            ROW_NUMBER() OVER (
                PARTITION BY id_activo 
                ORDER BY monto DESC, nivel_jerarquia ASC, fecha_ingreso ASC
            ) AS ranking_activo
        FROM datos_base
    ),
    ganadores_finales AS (
        SELECT 
            id_activo,
            id_colaborador,
            monto AS monto_final,
            CASE 
                WHEN (
                    SELECT COUNT(*) FROM pre_ranking p2 
                    WHERE p2.id_activo = pre_ranking.id_activo 
                      AND p2.monto = pre_ranking.monto
                ) = 1 THEN 'GANADO POR OFERTA MAS ALTA'
                WHEN (
                    SELECT COUNT(*) FROM pre_ranking p2 
                    WHERE p2.id_activo = pre_ranking.id_activo 
                      AND p2.monto = pre_ranking.monto 
                      AND p2.nivel_jerarquia = pre_ranking.nivel_jerarquia
                ) = 1 THEN 'GANADO POR JERARQUIA'
                ELSE 'GANADO POR ANTIGUEDAD'
            END AS criterio_desempate
        FROM pre_ranking
        WHERE ranking_activo = 1
    )
    INSERT INTO sub_resultados (id_activo, id_colaborador_ganador, monto_final, criterio_desempate)
    SELECT id_activo, id_colaborador, monto_final, criterio_desempate
    FROM ganadores_finales;
    
    -- Actualizar estado de activos adjudicados
    UPDATE sub_activos 
    SET estado = 'Adjudicado'
    WHERE id_activo IN (SELECT id_activo FROM sub_resultados);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Ganadores procesados exitosamente.',
        'total_adjudicados', (SELECT COUNT(*) FROM sub_resultados)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

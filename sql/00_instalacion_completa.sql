-- ═══════════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Instalación completa (proyecto nuevo)
-- Ejecutar TODO este script en el SQL Editor de Supabase.
-- Incluye: extensiones, tablas, índices, datos maestros requeridos,
--          vistas, funciones RPC y bucket de Storage.
-- NO incluye datos de ejemplo (colaboradores / activos): cargar la data real.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════
-- 1. TABLAS MAESTRAS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_categorias (
    id_categoria    SERIAL PRIMARY KEY,
    tipo            VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sub_cargos (
    id_cargo         SERIAL PRIMARY KEY,
    descripcion      VARCHAR(100) NOT NULL,
    nivel_jerarquia  INTEGER NOT NULL
);
-- nivel_jerarquia: número menor = mayor jerarquía (1 = Gerente General)

CREATE TABLE IF NOT EXISTS sub_roles (
    id_rol       SERIAL PRIMARY KEY,
    descripcion  VARCHAR(255) NOT NULL,
    inactivo     SMALLINT NOT NULL DEFAULT 0 CHECK (inactivo IN (0, 1)),
    observacion  VARCHAR(300)
);
-- Rol 1 = Admin, Rol 2 = Usuario

-- ═══════════════════════════════════════════════════════════
-- 2. COLABORADORES Y USUARIOS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_colaboradores (
    id_colaborador   SERIAL PRIMARY KEY,
    ci_documento     VARCHAR(20) UNIQUE NOT NULL,
    nombre           VARCHAR(100) NOT NULL,
    fecha_ingreso    DATE NOT NULL,
    habilitado       VARCHAR(2) NOT NULL DEFAULT 'SI' CHECK (habilitado IN ('SI', 'NO')),
    id_cargo         INTEGER NOT NULL REFERENCES sub_cargos(id_cargo),
    id_rol           INTEGER REFERENCES sub_roles(id_rol)
);

CREATE INDEX IF NOT EXISTS idx_colab_ci ON sub_colaboradores(ci_documento);
CREATE INDEX IF NOT EXISTS idx_colab_habilitado ON sub_colaboradores(habilitado);

CREATE TABLE IF NOT EXISTS sub_usuarios (
    id_usuario       SERIAL PRIMARY KEY,
    usuario          VARCHAR(50) NOT NULL,
    password_hash    VARCHAR(250) NOT NULL,
    id_colaborador   INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    fecha_creacion   TIMESTAMP DEFAULT NOW(),
    situacion        VARCHAR(1) DEFAULT 'A' CHECK (situacion IN ('A', 'I'))
);

CREATE INDEX IF NOT EXISTS idx_usr_login ON sub_usuarios(usuario);

-- ═══════════════════════════════════════════════════════════
-- 3. ACTIVOS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_activos (
    id_activo        SERIAL PRIMARY KEY,
    id_categoria     INTEGER NOT NULL REFERENCES sub_categorias(id_categoria),
    marca            VARCHAR(50),
    modelo           VARCHAR(50),
    serialnumber     VARCHAR(50),
    observacion      VARCHAR(200),
    precio_base      NUMERIC(10, 2) NOT NULL CHECK (precio_base >= 0),
    estado           VARCHAR(20) NOT NULL DEFAULT 'Disponible'
                     CHECK (estado IN ('Disponible', 'Cerrado', 'Adjudicado')),
    foto_url         VARCHAR(500),
    fam              VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_activos_categoria ON sub_activos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON sub_activos(estado);

-- ═══════════════════════════════════════════════════════════
-- 4. OFERTAS Y RESULTADOS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_ofertas (
    id_oferta        SERIAL PRIMARY KEY,
    id_activo        INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador   INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto            NUMERIC(10, 2) NOT NULL CHECK (monto >= 0),
    fecha_hora       TIMESTAMP DEFAULT NOW(),

    UNIQUE (id_activo, id_colaborador)
);

CREATE INDEX IF NOT EXISTS idx_ofertas_activo ON sub_ofertas(id_activo);
CREATE INDEX IF NOT EXISTS idx_ofertas_colaborador ON sub_ofertas(id_colaborador);

CREATE TABLE IF NOT EXISTS sub_resultados (
    id_resultado              SERIAL PRIMARY KEY,
    id_activo                 INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador_ganador    INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto_final               NUMERIC(10, 2) NOT NULL,
    fecha_cierre              TIMESTAMP DEFAULT NOW(),
    criterio_desempate        VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resultados_activo ON sub_resultados(id_activo);

-- ═══════════════════════════════════════════════════════════
-- 5. CONFIGURACIÓN
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_app_config (
    id                    INTEGER PRIMARY KEY DEFAULT 1,
    fecha_fin_subasta     TIMESTAMP,

    CHECK (id = 1)
);

-- Fila única de config (fecha_fin_subasta queda NULL; el admin la define en la app)
INSERT INTO sub_app_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 6. AUDITORÍA Y SEGURIDAD
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_intentos_login (
    id_intento       SERIAL PRIMARY KEY,
    usuario          VARCHAR(50),
    fecha_intento    TIMESTAMP DEFAULT NOW(),
    exitoso          VARCHAR(1) NOT NULL CHECK (exitoso IN ('S', 'N')),
    ip_origen        VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_intentos_usr_fecha ON sub_intentos_login(usuario, fecha_intento);

CREATE TABLE IF NOT EXISTS sub_auditoria_cambios (
    id_auditoria     SERIAL PRIMARY KEY,
    tabla_afectada   VARCHAR(50) NOT NULL,
    id_registro      INTEGER,
    accion           VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    campo            VARCHAR(50),
    valor_anterior   TEXT,
    valor_nuevo      TEXT,
    usuario          VARCHAR(50),
    fecha            TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 7. DATOS MAESTROS REQUERIDOS POR LA APP
--    (la UI depende de estos ids; NO son datos de ejemplo)
-- ═══════════════════════════════════════════════════════════

-- Categorías: la app referencia los ids 1..4 (CATEGORIA_MAP en el frontend)
INSERT INTO sub_categorias (id_categoria, tipo) VALUES
(1, 'Tablets'),
(2, 'Celulares'),
(3, 'Notebooks'),
(4, 'Otros')
ON CONFLICT (id_categoria) DO NOTHING;
SELECT setval('sub_categorias_id_categoria_seq', GREATEST((SELECT MAX(id_categoria) FROM sub_categorias), 1));

-- Cargos y niveles de jerarquía (usados por el algoritmo de desempate)
INSERT INTO sub_cargos (id_cargo, descripcion, nivel_jerarquia) VALUES
(1, 'Gerente General', 1),
(2, 'Director', 2),
(3, 'Gerente de Área', 3),
(4, 'Jefe de Departamento', 4),
(5, 'Coordinador', 5),
(6, 'Analista Senior', 6),
(7, 'Analista', 7),
(8, 'Asistente', 8),
(9, 'Auxiliar', 9),
(10, 'Operario', 10)
ON CONFLICT (id_cargo) DO NOTHING;
SELECT setval('sub_cargos_id_cargo_seq', GREATEST((SELECT MAX(id_cargo) FROM sub_cargos), 1));

-- Roles: la app trata id_rol = 1 como administrador
INSERT INTO sub_roles (id_rol, descripcion, inactivo, observacion) VALUES
(1, 'Administrador', 0, 'Acceso total al sistema'),
(2, 'Usuario', 0, 'Colaborador participante de la subasta')
ON CONFLICT (id_rol) DO NOTHING;
SELECT setval('sub_roles_id_rol_seq', GREATEST((SELECT MAX(id_rol) FROM sub_roles), 1));

-- ═══════════════════════════════════════════════════════════
-- 8. VISTAS
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW sub_v_datos_colaborador AS
SELECT
    u.id_usuario,
    c.id_colaborador,
    c.ci_documento,
    c.nombre,
    c.fecha_ingreso,
    c.habilitado,
    ca.descripcion AS cargo,
    ca.nivel_jerarquia,
    r.descripcion AS rol,
    c.id_rol,
    CASE
        WHEN u.id_usuario IS NOT NULL THEN 'REGISTRADO'
        ELSE 'PENDIENTE'
    END AS usuario_registrado
FROM sub_colaboradores c
JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo
LEFT JOIN sub_roles r ON c.id_rol = r.id_rol
LEFT JOIN sub_usuarios u ON c.id_colaborador = u.id_colaborador;

CREATE OR REPLACE VIEW sub_v_ofertas_recibidas AS
SELECT
    o.id_oferta,
    o.id_activo,
    a.marca,
    a.modelo,
    a.serialnumber,
    a.fam,
    cat.tipo AS categoria,
    a.precio_base,
    o.id_colaborador,
    c.nombre AS nombre_colaborador,
    c.ci_documento,
    ca.descripcion AS cargo,
    ca.nivel_jerarquia,
    o.monto,
    TO_CHAR(o.fecha_hora AT TIME ZONE 'America/Asuncion', 'DD/MM/YYYY HH24:MI:SS') AS fecha_hora_display,
    o.fecha_hora
FROM sub_ofertas o
JOIN sub_activos a ON o.id_activo = a.id_activo
JOIN sub_categorias cat ON a.id_categoria = cat.id_categoria
JOIN sub_colaboradores c ON o.id_colaborador = c.id_colaborador
JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo;

CREATE OR REPLACE VIEW sub_v_resultados_detalle AS
SELECT
    r.id_resultado,
    r.id_activo,
    a.marca,
    a.modelo,
    a.serialnumber,
    a.fam,
    cat.tipo AS categoria,
    a.precio_base,
    r.id_colaborador_ganador,
    c.nombre AS colaborador_ganador,
    c.ci_documento,
    r.monto_final,
    r.criterio_desempate,
    TO_CHAR(r.fecha_cierre AT TIME ZONE 'America/Asuncion', 'DD/MM/YYYY HH24:MI:SS') AS fecha_cierre_display,
    r.fecha_cierre
FROM sub_resultados r
JOIN sub_activos a ON r.id_activo = a.id_activo
JOIN sub_categorias cat ON a.id_categoria = cat.id_categoria
JOIN sub_colaboradores c ON r.id_colaborador_ganador = c.id_colaborador;

-- ═══════════════════════════════════════════════════════════
-- 9. FUNCIONES RPC
-- ═══════════════════════════════════════════════════════════

-- REGISTRAR NUEVO USUARIO
CREATE OR REPLACE FUNCTION registrar_nuevo_usuario(
    p_ci_documento TEXT,
    p_password TEXT
) RETURNS JSON AS $$
DECLARE
    v_id_colaborador INTEGER;
    v_habilitado VARCHAR(2);
    v_count_usuario INTEGER;
BEGIN
    SELECT id_colaborador, habilitado
    INTO v_id_colaborador, v_habilitado
    FROM sub_colaboradores
    WHERE ci_documento = p_ci_documento;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'error', 'El documento ingresado no se encuentra registrado como colaborador.');
    END IF;

    IF UPPER(TRIM(v_habilitado)) != 'SI' THEN
        RETURN json_build_object('success', false,
            'error', 'Usted no se encuentra habilitado para participar de la subasta. Contacte al administrador.');
    END IF;

    SELECT COUNT(*) INTO v_count_usuario
    FROM sub_usuarios
    WHERE usuario = p_ci_documento;

    IF v_count_usuario > 0 THEN
        RETURN json_build_object('success', false,
            'error', 'Ya existe un usuario registrado con este documento. Por favor, inicie sesión.');
    END IF;

    IF p_password = p_ci_documento THEN
        RETURN json_build_object('success', false,
            'error', 'La contraseña no puede ser igual al documento de identidad.');
    END IF;

    IF LENGTH(p_password) < 8 THEN
        RETURN json_build_object('success', false,
            'error', 'La contraseña debe tener al menos 8 caracteres.');
    END IF;

    IF p_password !~ '[A-Z]' OR p_password !~ '[a-z]' OR p_password !~ '[0-9]' THEN
        RETURN json_build_object('success', false,
            'error', 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.');
    END IF;

    INSERT INTO sub_usuarios (usuario, password_hash, id_colaborador, situacion)
    VALUES (p_ci_documento, crypt(p_password, gen_salt('bf', 10)), v_id_colaborador, 'A');

    RETURN json_build_object('success', true, 'message', 'Usuario registrado exitosamente.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AUTENTICAR USUARIO CON BLOQUEO POR INTENTOS FALLIDOS
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
    SELECT COUNT(*) INTO v_intentos_fallidos
    FROM sub_intentos_login
    WHERE usuario = p_ci_documento
      AND exitoso = 'N'
      AND fecha_intento > NOW() - INTERVAL '15 minutes';

    IF v_intentos_fallidos >= 5 THEN
        INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
        VALUES (p_ci_documento, 'N', p_ip);
        RETURN json_build_object('success', false,
            'error', 'Demasiados intentos fallidos. Su cuenta está bloqueada temporalmente por 15 minutos.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM sub_usuarios u
        JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
        WHERE c.ci_documento = p_ci_documento
          AND u.password_hash = crypt(p_password, u.password_hash)
          AND c.habilitado = 'SI'
          AND u.situacion = 'A'
    ) INTO v_valido;

    INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
    VALUES (p_ci_documento, CASE WHEN v_valido THEN 'S' ELSE 'N' END, p_ip);

    IF NOT v_valido THEN
        RETURN json_build_object('success', false, 'error', 'Credenciales inválidas.');
    END IF;

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

-- REGISTRAR OFERTA CON VALIDACIONES
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
    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;

    IF v_fecha_fin IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La subasta aún no ha sido habilitada.');
    END IF;

    IF NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false, 'error', 'La subasta ya ha finalizado.');
    END IF;

    SELECT id_colaborador INTO v_id_colaborador
    FROM sub_colaboradores
    WHERE ci_documento = p_ci_documento AND habilitado = 'SI';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Colaborador no encontrado o no habilitado.');
    END IF;

    SELECT precio_base, estado INTO v_precio_base, v_estado_activo
    FROM sub_activos WHERE id_activo = p_id_activo;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Activo no encontrado.');
    END IF;

    IF v_estado_activo != 'Disponible' THEN
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

-- PROCESAR GANADORES (monto > jerarquía > antigüedad)
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
        WHERE a.estado = 'Disponible' AND c.habilitado = 'SI'
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

-- ═══════════════════════════════════════════════════════════
-- 10. STORAGE — bucket público para fotos de activos
--     (storage.objects tiene RLS activo; sin políticas la subida falla)
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('activos', 'activos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "activos_lectura_publica" ON storage.objects;
CREATE POLICY "activos_lectura_publica"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'activos');

DROP POLICY IF EXISTS "activos_subida" ON storage.objects;
CREATE POLICY "activos_subida"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'activos');

DROP POLICY IF EXISTS "activos_update" ON storage.objects;
CREATE POLICY "activos_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'activos');

-- ═══════════════════════════════════════════════════════════
-- FIN. Próximos pasos (fuera de este script):
--  1) Cargar colaboradores reales (o importar CSV desde el panel admin).
--  2) Marcar al administrador:  UPDATE sub_colaboradores SET id_rol = 1
--       WHERE ci_documento = 'CI_DEL_ADMIN';
--     y que esa persona se registre desde la app.
--  3) Cargar los activos reales (o desde el panel admin).
--  4) Definir la fecha de cierre desde Admin → Configuración.
-- ═══════════════════════════════════════════════════════════

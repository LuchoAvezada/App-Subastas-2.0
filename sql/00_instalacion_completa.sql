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
                     CHECK (estado IN ('Disponible', 'Cerrado', 'Adjudicado', 'Desierto')),
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
    id_colaborador_ganador    INTEGER REFERENCES sub_colaboradores(id_colaborador),
    monto_final               NUMERIC(10, 2) NOT NULL,
    fecha_cierre              TIMESTAMP DEFAULT NOW(),
    criterio_desempate        VARCHAR(100) NOT NULL,
    estado_adjudicacion       VARCHAR(20) NOT NULL DEFAULT 'Adjudicado',
    motivo_desistimiento      TEXT,
    fecha_actualizacion       TIMESTAMP DEFAULT NOW(),

    -- 'Desierto' si y solo si no hay ganador
    CONSTRAINT chk_resultados_estado CHECK (
        estado_adjudicacion IN ('Adjudicado', 'Reasignado', 'Desierto')
        AND (estado_adjudicacion = 'Desierto') = (id_colaborador_ganador IS NULL)
    )
);

-- Una sola adjudicación por activo
CREATE UNIQUE INDEX IF NOT EXISTS ux_resultados_activo ON sub_resultados(id_activo);

-- Historial de desistimientos: quien desistió de un activo no puede volver a ganarlo (F07)
CREATE TABLE IF NOT EXISTS sub_desistimientos (
    id_activo       INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador  INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto           NUMERIC(10, 2) NOT NULL,
    motivo          TEXT NOT NULL,
    usuario         VARCHAR(50) NOT NULL,
    fecha           TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id_activo, id_colaborador)
);

-- ═══════════════════════════════════════════════════════════
-- 5. CONFIGURACIÓN
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_app_config (
    id                    INTEGER PRIMARY KEY DEFAULT 1,
    fecha_fin_subasta     TIMESTAMP,
    resultados_publicados BOOLEAN DEFAULT FALSE,

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

-- Sesiones de login. Solo se guarda el hash SHA-256 del token: leer la tabla no da tokens usables.
CREATE TABLE IF NOT EXISTS sub_sesiones (
    token_hash  TEXT PRIMARY KEY,
    id_usuario  INTEGER NOT NULL REFERENCES sub_usuarios(id_usuario) ON DELETE CASCADE,
    expira      TIMESTAMPTZ NOT NULL
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
(2, 'Usuario', 0, 'Colaborador participante de la subasta'),
(3, 'Visitante', 0, 'Solo consulta: no puede ofertar')
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
    COALESCE(c.nombre, 'Sin Adjudicar (Desierto)') AS colaborador_ganador,
    COALESCE(c.ci_documento, '-') AS ci_documento,
    r.monto_final,
    r.criterio_desempate,
    r.estado_adjudicacion,
    r.motivo_desistimiento,
    -- fecha_cierre es TIMESTAMP sin zona: guarda NOW() en la zona horaria del servidor.
    -- Se interpreta en esa zona y recién después se pasa a hora de Asunción.
    TO_CHAR(
        (r.fecha_cierre AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'America/Asuncion',
        'DD/MM/YYYY HH24:MI:SS'
    ) AS fecha_cierre_display,
    r.fecha_cierre,
    r.fecha_actualizacion
FROM sub_resultados r
JOIN sub_activos a ON r.id_activo = a.id_activo
JOIN sub_categorias cat ON a.id_categoria = cat.id_categoria
LEFT JOIN sub_colaboradores c ON r.id_colaborador_ganador = c.id_colaborador;

-- F10: monto líder y cantidad de ofertas por activo, sin postor (P9).
-- Es la única vista legible con la anon key; las demás se leen con leer_datos().
CREATE OR REPLACE VIEW sub_v_resumen_ofertas AS
SELECT id_activo, COUNT(*)::int AS total_ofertas, MAX(monto) AS monto_lider
FROM sub_ofertas
GROUP BY id_activo;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp;  -- crypt/gen_salt viven en "extensions"

-- VALIDAR SESIÓN DE ADMINISTRADOR (uso interno, no expuesta por la API)
-- Devuelve la CI del admin dueño del token, o NULL si el token no es válido,
-- venció o el usuario dejó de ser admin.
CREATE OR REPLACE FUNCTION validar_sesion_admin(p_token TEXT) RETURNS VARCHAR
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_temp
AS $$
    SELECT c.ci_documento
    FROM sub_sesiones s
    JOIN sub_usuarios u ON u.id_usuario = s.id_usuario
    JOIN sub_colaboradores c ON c.id_colaborador = u.id_colaborador
    WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND s.expira > NOW()
      AND u.situacion = 'A'
      AND c.habilitado = 'SI'
      AND c.id_rol = 1;
$$;

REVOKE EXECUTE ON FUNCTION validar_sesion_admin(TEXT) FROM PUBLIC, anon, authenticated;

-- AUTENTICAR USUARIO CON BLOQUEO POR INTENTOS FALLIDOS (emite token de sesión de 12 h)
CREATE OR REPLACE FUNCTION autenticar_usuario(
    p_ci_documento TEXT,
    p_password TEXT,
    p_ip TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_intentos_fallidos INTEGER;
    v_id_usuario INTEGER;
    v_hash TEXT;
    v_token TEXT;
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

    -- Primero se busca la cuenta por cédula y recién después se calcula un solo bcrypt.
    -- Con crypt() en el WHERE, Postgres lo evaluaba en cada fila de sub_usuarios y el
    -- login superaba el statement_timeout de anon apenas se registraron varias cuentas.
    SELECT u.id_usuario, u.password_hash INTO v_id_usuario, v_hash
    FROM sub_usuarios u
    JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
    WHERE c.ci_documento = p_ci_documento
      AND c.habilitado = 'SI'
      AND u.situacion = 'A'
    LIMIT 1;

    -- Sin cuenta se calcula igual un bcrypt (con sal nueva): el tiempo de respuesta
    -- no revela qué cédulas tienen cuenta.
    IF v_hash IS DISTINCT FROM crypt(p_password, COALESCE(v_hash, gen_salt('bf', 10))) THEN
        v_id_usuario := NULL;
    END IF;

    INSERT INTO sub_intentos_login (usuario, exitoso, ip_origen)
    VALUES (p_ci_documento, CASE WHEN v_id_usuario IS NULL THEN 'N' ELSE 'S' END, p_ip);

    IF v_id_usuario IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Credenciales inválidas.');
    END IF;

    DELETE FROM sub_sesiones WHERE expira < NOW();

    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO sub_sesiones (token_hash, id_usuario, expira)
    VALUES (encode(digest(v_token, 'sha256'), 'hex'), v_id_usuario, NOW() + INTERVAL '12 hours');

    RETURN (
        SELECT json_build_object(
            'success', true,
            'data', json_build_object(
                'id_usuario', u.id_usuario,
                'id_colaborador', c.id_colaborador,
                'ci_documento', c.ci_documento,
                'nombre', c.nombre,
                'id_rol', c.id_rol,
                'es_admin', COALESCE(c.id_rol = 1, false),
                'token', v_token
            )
        )
        FROM sub_usuarios u
        JOIN sub_colaboradores c ON u.id_colaborador = c.id_colaborador
        WHERE u.id_usuario = v_id_usuario
    );
END;
$$;

-- CERRAR SESIÓN (invalida el token en el servidor)
CREATE OR REPLACE FUNCTION cerrar_sesion(p_token TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    DELETE FROM sub_sesiones WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

-- PROCESAR GANADORES (Tope de 1 por categoría, cascada y desempate: monto > jerarquía > antigüedad)
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
    WHERE id_activo IN (SELECT id_activo FROM temp_ganadores_asignados);

    -- Adjudicados en esta ronda
    SELECT COUNT(*) INTO v_total_adjudicados FROM temp_ganadores_asignados;

    -- Ganadores nuevos: la publicación se pausa hasta que el admin los revise y vuelva a publicar
    IF v_total_adjudicados > 0 THEN
        UPDATE sub_app_config SET resultados_publicados = false WHERE id = 1;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Adjudicación procesada exitosamente con tope por categoría y desempates.',
        'total_adjudicados', v_total_adjudicados
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Firmas anteriores de F07 (sin token): se borran para que no quede una versión sin control de acceso
DROP FUNCTION IF EXISTS publicar_resultados(BOOLEAN);
DROP FUNCTION IF EXISTS reasignar_por_desistimiento(INTEGER, TEXT, TEXT);

-- PUBLICAR / PAUSAR RESULTADOS AL PERSONAL (F07)
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

-- REASIGNAR POR DESISTIMIENTO (F07)
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
    v_id_categoria   INTEGER;
    v_nuevo_id       INTEGER;
    v_nuevo_monto    NUMERIC(10, 2);
    v_nuevo_nombre   TEXT;
    v_hay_candidato  BOOLEAN;
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
            'error', 'El activo ya está Desierto: no hay ganador que pueda desistir.');
    END IF;

    SELECT id_categoria INTO v_id_categoria
    FROM sub_activos
    WHERE id_activo = p_id_activo;

    -- 1. El ganador actual queda como Desistido de este activo
    INSERT INTO sub_desistimientos (id_activo, id_colaborador, monto, motivo, usuario)
    VALUES (p_id_activo, v_resultado.id_colaborador_ganador, v_resultado.monto_final, v_motivo, v_ci_admin)
    ON CONFLICT (id_activo, id_colaborador) DO NOTHING;

    -- 2. Siguiente postor elegible, con el mismo orden de mérito que procesar_ganadores()
    SELECT o.id_colaborador, o.monto, c.nombre
    INTO v_nuevo_id, v_nuevo_monto, v_nuevo_nombre
    FROM sub_ofertas o
    JOIN sub_colaboradores c ON c.id_colaborador = o.id_colaborador
    JOIN sub_cargos ca ON ca.id_cargo = c.id_cargo
    WHERE o.id_activo = p_id_activo
      AND c.habilitado = 'SI'
      AND c.id_rol = 2
      -- nadie que ya haya desistido de este activo (incluye al ganador actual)
      AND NOT EXISTS (
          SELECT 1
          FROM sub_desistimientos d
          WHERE d.id_activo = p_id_activo
            AND d.id_colaborador = o.id_colaborador
      )
      -- tope F06: nadie que ya tenga otro activo de esta categoría
      AND NOT EXISTS (
          SELECT 1
          FROM sub_resultados r2
          JOIN sub_activos a2 ON a2.id_activo = r2.id_activo
          WHERE a2.id_categoria = v_id_categoria
            AND r2.id_activo <> p_id_activo
            AND r2.id_colaborador_ganador = o.id_colaborador
      )
    ORDER BY
        o.monto DESC,
        ca.nivel_jerarquia ASC,
        c.fecha_ingreso ASC,
        o.fecha_hora ASC,
        o.id_oferta ASC
    LIMIT 1;

    v_hay_candidato := FOUND;  -- leer FOUND aquí: la próxima sentencia lo sobrescribe

    -- Orden de adjudicación del nuevo ganador: 1 desistimiento → 2º postor, 2 → 3º, ...
    SELECT COUNT(*) + 1 INTO v_orden_postor
    FROM sub_desistimientos
    WHERE id_activo = p_id_activo;

    -- 3. Reasignar o declarar desierto
    IF v_hay_candidato THEN
        UPDATE sub_resultados
        SET id_colaborador_ganador = v_nuevo_id,
            monto_final            = v_nuevo_monto,
            estado_adjudicacion    = 'Reasignado',
            criterio_desempate     = format('REASIGNADO POR DESISTIMIENTO (%sº POSTOR)', v_orden_postor),
            motivo_desistimiento   = v_motivo,
            fecha_actualizacion    = NOW()
        WHERE id_resultado = v_resultado.id_resultado;
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
        CASE WHEN v_hay_candidato
             THEN format('Reasignado a colaborador %s (USD %s)', v_nuevo_id, v_nuevo_monto)
             ELSE 'Desierto: sin postores elegibles'
        END,
        v_ci_admin
    );

    IF v_hay_candidato THEN
        RETURN json_build_object(
            'success', true,
            'estado_adjudicacion', 'Reasignado',
            'id_colaborador_ganador', v_nuevo_id,
            'colaborador_ganador', v_nuevo_nombre,
            'monto_final', v_nuevo_monto,
            'message', format('Activo reasignado a %s (%sº postor).', v_nuevo_nombre, v_orden_postor)
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

-- ═══════════════════════════════════════════════════════════
-- 9b. FUNCIONES F09 — toda escritura pasa por RPC con token de sesión
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. SESIÓN DE CUALQUIER COLABORADOR
-- ─────────────────────────────────────────────────────────

-- 1.1 Devuelve el id_colaborador dueño del token, o NULL si no es válido o venció.
--     Uso interno: no se expone por la API.
CREATE OR REPLACE FUNCTION validar_sesion(p_token TEXT) RETURNS INTEGER
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_temp
AS $$
    SELECT c.id_colaborador
    FROM sub_sesiones s
    JOIN sub_usuarios u ON u.id_usuario = s.id_usuario
    JOIN sub_colaboradores c ON c.id_colaborador = u.id_colaborador
    WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND s.expira > NOW()
      AND u.situacion = 'A'
      AND c.habilitado = 'SI';
$$;

-- 1.2 Respuesta única para token inválido: el frontend cierra la sesión al ver el código
CREATE OR REPLACE FUNCTION respuesta_sesion_invalida() RETURNS JSON
LANGUAGE sql IMMUTABLE
AS $$
    SELECT json_build_object('success', false, 'codigo', 'SESION_INVALIDA',
        'error', 'Sesión inválida o vencida. Inicie sesión nuevamente.');
$$;

REVOKE EXECUTE ON FUNCTION validar_sesion(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION respuesta_sesion_invalida() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 2. OFERTAS: el colaborador sale del token
--    Las firmas cambian: se borran las anteriores (con cédula) para que no
--    quede una versión que permita actuar en nombre de otro.
-- ─────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS registrar_oferta(INTEGER, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS cancelar_oferta(INTEGER, TEXT);

-- 2.1 Registrar oferta (reglas de 08: solo el rol Usuario oferta)
CREATE OR REPLACE FUNCTION registrar_oferta(
    p_token TEXT,
    p_id_activo INTEGER,
    p_monto NUMERIC
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id_colaborador INTEGER := validar_sesion(p_token);
    v_id_rol         INTEGER;
    v_precio_base    NUMERIC;
    v_estado_activo  VARCHAR(20);
    v_fecha_fin      TIMESTAMP;
BEGIN
    IF v_id_colaborador IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;

    IF v_fecha_fin IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La subasta aún no ha sido habilitada.');
    END IF;

    IF NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false, 'error', 'La subasta ya ha finalizado.');
    END IF;

    SELECT id_rol INTO v_id_rol FROM sub_colaboradores WHERE id_colaborador = v_id_colaborador;

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

    IF p_monto IS NULL OR p_monto < v_precio_base THEN
        RETURN json_build_object('success', false,
            'error', 'El monto ofertado debe ser mayor o igual al precio base (USD ' || v_precio_base || ').');
    END IF;

    INSERT INTO sub_ofertas (id_activo, id_colaborador, monto)
    VALUES (p_id_activo, v_id_colaborador, p_monto);

    RETURN json_build_object('success', true, 'message', 'Oferta registrada exitosamente.');
EXCEPTION
    -- UNIQUE (id_activo, id_colaborador): también cubre dos envíos simultáneos
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Ya realizaste una oferta por este activo.');
END;
$$;

-- 2.2 Anular una oferta propia antes del cierre (P9; el veto sigue en el cliente)
CREATE OR REPLACE FUNCTION cancelar_oferta(
    p_token TEXT,
    p_id_oferta INTEGER
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_id_colaborador INTEGER := validar_sesion(p_token);
    v_fecha_fin      TIMESTAMP;
    v_oferta         sub_ofertas%ROWTYPE;
BEGIN
    IF v_id_colaborador IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;

    IF v_fecha_fin IS NOT NULL AND NOW() > v_fecha_fin THEN
        RETURN json_build_object('success', false,
            'error', 'La subasta ya ha finalizado. No es posible anular ofertas.');
    END IF;

    SELECT * INTO v_oferta FROM sub_ofertas WHERE id_oferta = p_id_oferta;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'La oferta no existe o ya fue anulada previamente.');
    END IF;

    IF v_oferta.id_colaborador <> v_id_colaborador THEN
        RETURN json_build_object('success', false, 'error', 'No tiene permisos para anular esta oferta.');
    END IF;

    DELETE FROM sub_ofertas WHERE id_oferta = p_id_oferta;

    INSERT INTO sub_auditoria_cambios (tabla_afectada, id_registro, accion, campo, valor_anterior, usuario)
    SELECT 'sub_ofertas', p_id_oferta, 'DELETE', 'monto', v_oferta.monto::TEXT, ci_documento
    FROM sub_colaboradores WHERE id_colaborador = v_id_colaborador;

    RETURN json_build_object(
        'success', true,
        'message', 'Oferta anulada exitosamente.',
        'id_activo', v_oferta.id_activo,
        'monto_anulado', v_oferta.monto
    );
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 3. ADJUDICACIÓN: procesar_ganadores() borra y recalcula sub_resultados,
--    así que solo un administrador puede dispararla.
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION procesar_ganadores(p_token TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_fecha_fin TIMESTAMP;
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    -- Adjudicar con la subasta abierta cerraría activos que todavía reciben ofertas
    SELECT fecha_fin_subasta INTO v_fecha_fin FROM sub_app_config WHERE id = 1;
    IF v_fecha_fin IS NULL OR NOW() <= v_fecha_fin THEN
        RETURN json_build_object('success', false,
            'error', 'La subasta sigue abierta. Los ganadores se procesan después de la fecha de cierre.');
    END IF;

    RETURN procesar_ganadores();
END;
$$;

REVOKE EXECUTE ON FUNCTION procesar_ganadores() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 4. COLABORADORES (panel admin)
-- ─────────────────────────────────────────────────────────

-- 4.1 Alta (p_id_colaborador NULL) o edición individual. Es el único camino para asignar el rol Administrador.
CREATE OR REPLACE FUNCTION guardar_colaborador(
    p_token TEXT,
    p_id_colaborador INTEGER,
    p_ci_documento TEXT,
    p_nombre TEXT,
    p_fecha_ingreso DATE,
    p_habilitado TEXT,
    p_id_cargo INTEGER,
    p_id_rol INTEGER
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_id_colaborador IS NULL THEN
        INSERT INTO sub_colaboradores (ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol)
        VALUES (BTRIM(p_ci_documento), BTRIM(p_nombre), p_fecha_ingreso, p_habilitado, p_id_cargo, p_id_rol);
    ELSE
        UPDATE sub_colaboradores
        SET ci_documento = BTRIM(p_ci_documento),
            nombre = BTRIM(p_nombre),
            fecha_ingreso = p_fecha_ingreso,
            habilitado = p_habilitado,
            id_cargo = p_id_cargo,
            id_rol = p_id_rol
        WHERE id_colaborador = p_id_colaborador;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'El colaborador no existe.');
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Ya existe un colaborador con esa cédula.');
    WHEN check_violation OR foreign_key_violation OR not_null_violation OR string_data_right_truncation THEN
        RETURN json_build_object('success', false, 'error', 'Datos inválidos: ' || SQLERRM);
END;
$$;

-- 4.2 Habilitar / deshabilitar desde la lista
CREATE OR REPLACE FUNCTION habilitar_colaborador(
    p_token TEXT,
    p_id_colaborador INTEGER,
    p_habilitado TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_habilitado IS NULL OR p_habilitado NOT IN ('SI', 'NO') THEN
        RETURN json_build_object('success', false, 'error', 'El estado debe ser SI o NO.');
    END IF;

    UPDATE sub_colaboradores SET habilitado = p_habilitado WHERE id_colaborador = p_id_colaborador;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'El colaborador no existe.');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- 4.3 Importación CSV (F08): todas las filas en una sola sentencia; si una falla, no se guarda ninguna.
--     p_filas: [{ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol}, ...]
CREATE OR REPLACE FUNCTION importar_colaboradores(p_token TEXT, p_filas JSONB) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_filas IS NULL OR jsonb_typeof(p_filas) <> 'array' THEN
        RETURN json_build_object('success', false, 'error', 'No se recibieron filas para importar.');
    END IF;

    -- RF-01 de F08: el CSV no asigna el rol Administrador (solo lo conserva quien ya lo tiene)
    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_filas) AS f(ci_documento TEXT, id_rol INTEGER)
        WHERE f.id_rol = 1
          AND NOT EXISTS (
              SELECT 1 FROM sub_colaboradores c
              WHERE c.ci_documento = f.ci_documento AND c.id_rol = 1
          )
    ) THEN
        RETURN json_build_object('success', false,
            'error', 'El CSV no puede asignar el rol Administrador: hágalo desde el formulario individual.');
    END IF;

    INSERT INTO sub_colaboradores (ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol)
    SELECT f.ci_documento, f.nombre, f.fecha_ingreso, f.habilitado, f.id_cargo, f.id_rol
    FROM jsonb_to_recordset(p_filas) AS f(
        ci_documento VARCHAR(20),
        nombre VARCHAR(100),
        fecha_ingreso DATE,
        habilitado VARCHAR(2),
        id_cargo INTEGER,
        id_rol INTEGER
    )
    ON CONFLICT (ci_documento) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        fecha_ingreso = EXCLUDED.fecha_ingreso,
        habilitado = EXCLUDED.habilitado,
        id_cargo = EXCLUDED.id_cargo,
        -- ...ni se lo quita a quien lo tiene
        id_rol = CASE WHEN sub_colaboradores.id_rol = 1 THEN 1 ELSE EXCLUDED.id_rol END;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN json_build_object('success', true, 'total', v_total);
EXCEPTION
    -- Datos inválidos o cédula repetida en el archivo: se informa el error y no se guarda nada
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 5. CONFIGURACIÓN: fecha de cierre
--    TIMESTAMP como la columna: el ISO con 'Z' que manda el cliente se guarda igual que antes.
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION actualizar_fecha_cierre(p_token TEXT, p_fecha_fin TIMESTAMP) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    UPDATE sub_app_config SET fecha_fin_subasta = p_fecha_fin WHERE id = 1;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'error', 'No existe la fila de configuración (sub_app_config.id = 1).');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 6. ACTIVOS (panel admin)
-- ─────────────────────────────────────────────────────────

-- 6.1 Alta (p_id_activo NULL) o edición
CREATE OR REPLACE FUNCTION guardar_activo(
    p_token TEXT,
    p_id_activo INTEGER,
    p_id_categoria INTEGER,
    p_marca TEXT,
    p_modelo TEXT,
    p_serialnumber TEXT,
    p_fam TEXT,
    p_observacion TEXT,
    p_precio_base NUMERIC,
    p_estado TEXT,
    p_foto_url TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_id_activo IS NULL THEN
        INSERT INTO sub_activos (id_categoria, marca, modelo, serialnumber, fam, observacion, precio_base, estado, foto_url)
        VALUES (p_id_categoria, p_marca, p_modelo, p_serialnumber, p_fam, p_observacion, p_precio_base, p_estado, p_foto_url);
    ELSE
        UPDATE sub_activos
        SET id_categoria = p_id_categoria,
            marca = p_marca,
            modelo = p_modelo,
            serialnumber = p_serialnumber,
            fam = p_fam,
            observacion = p_observacion,
            precio_base = p_precio_base,
            estado = p_estado,
            foto_url = p_foto_url
        WHERE id_activo = p_id_activo;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'El activo no existe.');
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN check_violation OR foreign_key_violation OR not_null_violation OR string_data_right_truncation THEN
        RETURN json_build_object('success', false, 'error', 'Datos inválidos: ' || SQLERRM);
END;
$$;

-- 6.2 Baja: falla si el activo ya tiene ofertas o resultado (FK)
CREATE OR REPLACE FUNCTION eliminar_activo(p_token TEXT, p_id_activo INTEGER) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    DELETE FROM sub_activos WHERE id_activo = p_id_activo;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'El activo no existe.');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN json_build_object('success', false,
            'error', 'El activo tiene ofertas o una adjudicación registradas. Cambie su estado a Cerrado en lugar de eliminarlo.');
END;
$$;

-- 6.3 Fotos. Storage no conoce nuestro token, así que la subida se autoriza en dos pasos:
--     el admin pide una ruta (RPC con token) y Storage solo acepta un INSERT en una
--     ruta entregada hace menos de 10 minutos. La ruta es un UUID: no se adivina,
--     y como no hay política de UPDATE, una foto subida no se puede pisar.
CREATE TABLE IF NOT EXISTS sub_subidas_autorizadas (
    ruta    TEXT PRIMARY KEY,
    expira  TIMESTAMPTZ NOT NULL
);

CREATE OR REPLACE FUNCTION autorizar_subida_foto(p_token TEXT, p_extension TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_ruta TEXT;
BEGIN
    IF validar_sesion_admin(p_token) IS NULL THEN
        RETURN respuesta_sesion_invalida();
    END IF;

    IF p_extension IS NULL OR p_extension NOT IN ('jpg', 'webp') THEN
        RETURN json_build_object('success', false, 'error', 'Formato de imagen no permitido (solo JPG o WebP).');
    END IF;

    DELETE FROM sub_subidas_autorizadas WHERE expira < NOW();

    v_ruta := 'fotos/activo_' || gen_random_uuid() || '.' || p_extension;
    INSERT INTO sub_subidas_autorizadas (ruta, expira) VALUES (v_ruta, NOW() + INTERVAL '10 minutes');

    RETURN json_build_object('success', true, 'ruta', v_ruta);
END;
$$;

-- La usa la política de Storage, que corre con el rol del que sube (anon)
CREATE OR REPLACE FUNCTION subida_autorizada(p_ruta TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM sub_subidas_autorizadas WHERE ruta = p_ruta AND expira > NOW());
$$;

-- F10: lecturas que exigen sesión (la anon key solo lee el catálogo)
--   'mis_ofertas'                        → cualquier sesión, solo las propias
--   'resultados'                         → admin siempre; el resto si están publicados
--   'ofertas', 'colaboradores', 'nomina' → solo admin
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

-- ═══════════════════════════════════════════════════════════
-- 10. PERMISOS
--     Las escrituras sensibles solo pasan por funciones SECURITY DEFINER,
--     que corren como dueño de las tablas.
-- ═══════════════════════════════════════════════════════════

-- Sesiones y desistimientos: inaccesibles desde la API
REVOKE ALL ON sub_sesiones, sub_desistimientos FROM PUBLIC, anon, authenticated;
ALTER TABLE sub_sesiones ENABLE ROW LEVEL SECURITY;  -- sin políticas: segunda barrera

-- F09: ninguna tabla ni vista acepta escrituras directas por la API
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
-- Tablas que se creen en el futuro tampoco nacen escribibles
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;

-- Ni siquiera lectura: hashes de contraseña, intentos de login (cédula + IP) y rutas de subida.
-- sub_v_datos_colaborador sigue funcionando: la vista corre con los permisos de su dueño
-- y no expone password_hash.
REVOKE ALL ON sub_usuarios, sub_intentos_login, sub_subidas_autorizadas FROM PUBLIC, anon, authenticated;

-- F10: la API solo lee el catálogo; nómina, ofertas con postor y resultados van por leer_datos().
-- Las tablas nuevas tampoco nacen legibles: hay que darles GRANT SELECT a propósito.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON sub_activos, sub_app_config, sub_cargos, sub_v_resumen_ofertas TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon, authenticated;

-- Adjudicar borra y recalcula resultados: solo vía procesar_ganadores(p_token)
REVOKE EXECUTE ON FUNCTION procesar_ganadores() FROM PUBLIC, anon, authenticated;

-- Funciones expuestas a la API (cada una valida el token por dentro)
GRANT EXECUTE ON FUNCTION registrar_oferta(TEXT, INTEGER, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancelar_oferta(TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION procesar_ganadores(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION guardar_colaborador(TEXT, INTEGER, TEXT, TEXT, DATE, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION habilitar_colaborador(TEXT, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION importar_colaboradores(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION actualizar_fecha_cierre(TEXT, TIMESTAMP) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION guardar_activo(TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION eliminar_activo(TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION autorizar_subida_foto(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION subida_autorizada(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION leer_datos(TEXT, TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════
-- 11. STORAGE — bucket público para fotos de activos
--     (storage.objects tiene RLS activo; sin políticas la subida falla)
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('activos', 'activos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "activos_lectura_publica" ON storage.objects;
CREATE POLICY "activos_lectura_publica"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'activos');

-- Subida solo a una ruta entregada por autorizar_subida_foto() (F09).
-- Sin UPDATE ni DELETE: nadie pisa ni borra fotos desde la API.
DROP POLICY IF EXISTS "activos_subida" ON storage.objects;
CREATE POLICY "activos_subida"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'activos' AND public.subida_autorizada(name));

DROP POLICY IF EXISTS "activos_update" ON storage.objects;

-- ═══════════════════════════════════════════════════════════
-- 12. REALTIME — el temporizador de cierre se sincroniza en
--     todos los clientes (CountdownContext escucha sub_app_config)
-- ═══════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════
-- 13. REGISTRO DE MIGRACIONES — esta instalación ya incluye
--     todo hasta 19; los scripts nuevos se registran al aplicarse
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_migraciones (
    archivo   TEXT PRIMARY KEY,
    aplicada  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON sub_migraciones FROM PUBLIC, anon, authenticated;

INSERT INTO sub_migraciones (archivo) VALUES
('00_instalacion_completa.sql'),
('14_hardening_api.sql'),
('15_registro_migraciones.sql'),
('16_lecturas_con_sesion.sql'),
('17_login_rapido.sql'),
('18_procesar_ganadores_where.sql'),
('19_adjudicacion_por_rondas.sql')
ON CONFLICT (archivo) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- FIN. Próximos pasos (fuera de este script):
--  1) Cargar colaboradores reales (o importar CSV desde el panel admin).
--  2) Marcar al administrador:  UPDATE sub_colaboradores SET id_rol = 1
--       WHERE ci_documento = 'CI_DEL_ADMIN';
--     y que esa persona se registre desde la app.
--  3) Cargar los activos reales (o desde el panel admin).
--  4) Definir la fecha de cierre desde Admin → Configuración.
-- ═══════════════════════════════════════════════════════════

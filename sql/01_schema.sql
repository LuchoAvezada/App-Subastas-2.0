-- ═══════════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Schema Completo
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- Habilitar extensión pgcrypto para hashing de passwords
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════
-- TABLAS MAESTRAS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sub_categorias (
    id_categoria    SERIAL PRIMARY KEY,
    tipo            VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE sub_cargos (
    id_cargo         SERIAL PRIMARY KEY,
    descripcion      VARCHAR(100) NOT NULL,
    nivel_jerarquia  INTEGER NOT NULL
);
-- nivel_jerarquia: número menor = mayor jerarquía
-- Ejemplo: 1 = Gerente General, 5 = Analista, 10 = Operario

CREATE TABLE sub_roles (
    id_rol       SERIAL PRIMARY KEY,
    descripcion  VARCHAR(255) NOT NULL,
    inactivo     SMALLINT NOT NULL DEFAULT 0 CHECK (inactivo IN (0, 1)),
    observacion  VARCHAR(300)
);
-- Rol 1 = Admin, Rol 2 = Usuario

-- ═══════════════════════════════════════════════════════════
-- COLABORADORES Y USUARIOS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sub_colaboradores (
    id_colaborador   SERIAL PRIMARY KEY,
    ci_documento     VARCHAR(20) UNIQUE NOT NULL,
    nombre           VARCHAR(100) NOT NULL,
    fecha_ingreso    DATE NOT NULL,
    habilitado       VARCHAR(2) NOT NULL DEFAULT 'SI' CHECK (habilitado IN ('SI', 'NO')),
    id_cargo         INTEGER NOT NULL REFERENCES sub_cargos(id_cargo),
    id_rol           INTEGER REFERENCES sub_roles(id_rol)
);

CREATE INDEX idx_colab_ci ON sub_colaboradores(ci_documento);
CREATE INDEX idx_colab_habilitado ON sub_colaboradores(habilitado);

CREATE TABLE sub_usuarios (
    id_usuario       SERIAL PRIMARY KEY,
    usuario          VARCHAR(50) NOT NULL,
    password_hash    VARCHAR(250) NOT NULL,
    id_colaborador   INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    fecha_creacion   TIMESTAMP DEFAULT NOW(),
    situacion        VARCHAR(1) DEFAULT 'A' CHECK (situacion IN ('A', 'I'))
);

CREATE INDEX idx_usr_login ON sub_usuarios(usuario);

-- ═══════════════════════════════════════════════════════════
-- ACTIVOS Y CATEGORÍAS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sub_activos (
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

CREATE INDEX idx_activos_categoria ON sub_activos(id_categoria);
CREATE INDEX idx_activos_estado ON sub_activos(estado);

-- ═══════════════════════════════════════════════════════════
-- OFERTAS Y RESULTADOS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sub_ofertas (
    id_oferta        SERIAL PRIMARY KEY,
    id_activo        INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador   INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto            NUMERIC(10, 2) NOT NULL,
    fecha_hora       TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (id_activo, id_colaborador)
);

CREATE INDEX idx_ofertas_activo ON sub_ofertas(id_activo);
CREATE INDEX idx_ofertas_colaborador ON sub_ofertas(id_colaborador);

CREATE TABLE sub_resultados (
    id_resultado              SERIAL PRIMARY KEY,
    id_activo                 INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador_ganador    INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto_final               NUMERIC(10, 2) NOT NULL,
    fecha_cierre              TIMESTAMP DEFAULT NOW(),
    criterio_desempate        VARCHAR(100) NOT NULL
);

CREATE INDEX idx_resultados_activo ON sub_resultados(id_activo);

-- ═══════════════════════════════════════════════════════════
-- CONFIGURACIÓN
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sub_app_config (
    id                    INTEGER PRIMARY KEY DEFAULT 1,
    fecha_fin_subasta     TIMESTAMP,
    
    CHECK (id = 1)
);

INSERT INTO sub_app_config (id) VALUES (1);

-- ═══════════════════════════════════════════════════════════
-- AUDITORÍA Y SEGURIDAD
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sub_intentos_login (
    id_intento       SERIAL PRIMARY KEY,
    usuario          VARCHAR(50),
    fecha_intento    TIMESTAMP DEFAULT NOW(),
    exitoso          VARCHAR(1) NOT NULL CHECK (exitoso IN ('S', 'N')),
    ip_origen        VARCHAR(50)
);

CREATE INDEX idx_intentos_usr_fecha ON sub_intentos_login(usuario, fecha_intento);

CREATE TABLE sub_auditoria_cambios (
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

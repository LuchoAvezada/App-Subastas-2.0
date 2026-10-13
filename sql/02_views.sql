-- ═══════════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Vistas
-- Ejecutar después de 01_schema.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Vista de datos completos del colaborador (incluye estado de registro)
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

-- Vista de ofertas con datos enriquecidos
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

-- Vista de resultados con detalles
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

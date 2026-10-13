-- ═══════════════════════════════════════════════════════════════════
-- Alta/edición de colaboradores desde el panel admin
-- ═══════════════════════════════════════════════════════════════════

-- 1) El formulario necesita listar los cargos para el desplegable.
CREATE POLICY cargos_lectura ON sub_cargos
  FOR SELECT TO anon, authenticated USING (true);

-- 2) La vista no exponía id_cargo (solo la descripción), así que al editar
--    no se podía preseleccionar el cargo. Se agrega al final de la vista.
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
    CASE WHEN u.id_usuario IS NOT NULL THEN 'REGISTRADO' ELSE 'PENDIENTE' END AS usuario_registrado,
    c.id_cargo
FROM sub_colaboradores c
JOIN sub_cargos ca ON c.id_cargo = ca.id_cargo
LEFT JOIN sub_roles r ON c.id_rol = r.id_rol
LEFT JOIN sub_usuarios u ON c.id_colaborador = u.id_colaborador;

SELECT COUNT(*) AS cargos_visibles FROM sub_cargos;

-- ═══════════════════════════════════════════════════════════════════
-- DATOS MAESTROS DESDE APEX — sub_cargos
-- Origen: sub_cargos.xlsx  (24 registros)
-- Conserva los ID_CARGO originales de APEX y reajusta la secuencia.
-- Re-ejecutable (upsert por id_cargo).
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO sub_cargos (id_cargo, descripcion, nivel_jerarquia) VALUES
(1, 'CHOFER', 0),
(2, 'APRENDIZ/TRAINEE', 0),
(3, 'Servicios Generales', 0),
(4, 'Zafrero/Estibador', 0),
(5, 'Basculero', 0),
(6, 'AUXILIAR', 1),
(7, 'Recepcionista', 1),
(8, 'ASISTENTE', 2),
(9, 'Operador de Máquina/Operador de Silo', 2),
(10, 'Soporte de Ventas', 2),
(11, 'Fiscalizadora de UBS', 2),
(12, 'Diseñadora de Marketing', 2),
(13, 'Diseñadora Gráfica', 2),
(14, 'Encargado de UBS', 3),
(15, 'Encargado de CITS y Cámara Fría', 3),
(16, 'Encargado de Laboratorio', 3),
(17, 'ANALISTA', 3),
(18, 'TESORERA', 3),
(19, 'VISITANTE', 0),
(20, 'COORDINADOR/A', 3),
(21, 'GERENTE', 3),
(22, 'DIRECTOR/A', 3),
(23, 'SUPERVISOR/A', 3),
(95, 'CTNI', 3)
ON CONFLICT (id_cargo) DO UPDATE
  SET descripcion     = EXCLUDED.descripcion,
      nivel_jerarquia = EXCLUDED.nivel_jerarquia;

-- CLAVE: la columna es SERIAL. Sin esto, el próximo INSERT automático
-- intentaría usar id=1 y fallaría por clave duplicada.
SELECT setval('sub_cargos_id_cargo_seq', (SELECT MAX(id_cargo) FROM sub_cargos));

-- Verificación
SELECT COUNT(*) AS total_cargos, MIN(id_cargo) AS id_min, MAX(id_cargo) AS id_max
FROM sub_cargos;

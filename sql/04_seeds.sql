-- ═══════════════════════════════════════════════════════════════════════
-- SUBASTA INTERNA AGROTEC — Datos Seed para testing
-- Ejecutar después de 03_functions.sql
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- CATEGORÍAS
-- ─────────────────────────────────────────────────────────
INSERT INTO sub_categorias (id_categoria, tipo) VALUES
(1, 'Tablets'),
(2, 'Celulares'),
(3, 'Notebooks'),
(4, 'Otros');

SELECT setval('sub_categorias_id_categoria_seq', 4);

-- ─────────────────────────────────────────────────────────
-- CARGOS
-- ─────────────────────────────────────────────────────────
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
(10, 'Operario', 10);

SELECT setval('sub_cargos_id_cargo_seq', 10);

-- ─────────────────────────────────────────────────────────
-- ROLES
-- ─────────────────────────────────────────────────────────
INSERT INTO sub_roles (id_rol, descripcion, inactivo, observacion) VALUES
(1, 'Administrador', 0, 'Acceso total al sistema'),
(2, 'Usuario', 0, 'Colaborador participante de la subasta');

SELECT setval('sub_roles_id_rol_seq', 2);

-- ─────────────────────────────────────────────────────────
-- COLABORADORES DE EJEMPLO
-- ─────────────────────────────────────────────────────────
INSERT INTO sub_colaboradores (id_colaborador, ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol) VALUES
(1,  '1234567',  'Juan Carlos Pérez',       '2018-03-15', 'SI', 3, 1),
(2,  '2345678',  'María Elena González',     '2019-06-22', 'SI', 5, 2),
(3,  '3456789',  'Carlos Alberto Ramírez',   '2020-01-10', 'SI', 7, 2),
(4,  '4567890',  'Ana Lucía Fernández',      '2017-11-05', 'SI', 6, 2),
(5,  '5678901',  'Pedro José Martínez',      '2021-04-18', 'SI', 8, 2),
(6,  '6789012',  'Laura Patricia Sánchez',   '2016-08-30', 'SI', 4, 2),
(7,  '7890123',  'Roberto Daniel Acosta',    '2022-02-14', 'SI', 9, 2),
(8,  '8901234',  'Sofía Valentina Torres',   '2019-09-01', 'SI', 7, 2),
(9,  '9012345',  'Diego Alejandro López',    '2015-12-20', 'SI', 2, 2),
(10, '0123456',  'Gabriela Beatriz Ruiz',    '2023-07-11', 'SI', 10, 2);

SELECT setval('sub_colaboradores_id_colaborador_seq', 10);

-- ─────────────────────────────────────────────────────────
-- ACTIVOS DE EJEMPLO
-- ─────────────────────────────────────────────────────────

-- TABLETS (categoría 1)
INSERT INTO sub_activos (id_activo, id_categoria, marca, modelo, serialnumber, observacion, precio_base, estado, fam) VALUES
(1,  1, 'Samsung',  'Galaxy Tab A8',       'TAB-001-2024', 'Pantalla 10.5", estado bueno, incluye cargador', 50.00, 'Disponible', 'FAM-T001'),
(2,  1, 'Samsung',  'Galaxy Tab S6 Lite',  'TAB-002-2024', 'Pantalla 10.4", S-Pen incluido', 80.00, 'Disponible', 'FAM-T002'),
(3,  1, 'Lenovo',   'Tab M10 Plus',        'TAB-003-2024', 'Pantalla 10.6", uso leve', 40.00, 'Disponible', 'FAM-T003'),
(4,  1, 'Apple',    'iPad 9na Gen',        'TAB-004-2024', 'Pantalla 10.2", con funda protectora', 120.00, 'Disponible', 'FAM-T004'),
(5,  1, 'Huawei',   'MatePad T10s',        'TAB-005-2024', 'Pantalla 10.1", buen estado general', 35.00, 'Disponible', 'FAM-T005');

-- CELULARES (categoría 2)
INSERT INTO sub_activos (id_activo, id_categoria, marca, modelo, serialnumber, observacion, precio_base, estado, fam) VALUES
(6,  2, 'Samsung',  'Galaxy A54',          'CEL-001-2024', 'Pantalla 6.4", batería excelente', 100.00, 'Disponible', 'FAM-C001'),
(7,  2, 'Samsung',  'Galaxy S21',          'CEL-002-2024', '128GB, incluye cargador rápido', 150.00, 'Disponible', 'FAM-C002'),
(8,  2, 'Motorola', 'Moto G52',            'CEL-003-2024', 'Pantalla 6.6", uso normal', 60.00, 'Disponible', 'FAM-C003'),
(9,  2, 'Apple',    'iPhone 12',           'CEL-004-2024', '64GB, estado muy bueno', 180.00, 'Disponible', 'FAM-C004'),
(10, 2, 'Xiaomi',   'Redmi Note 12',       'CEL-005-2024', '128GB, incluye protector', 70.00, 'Disponible', 'FAM-C005');

-- NOTEBOOKS (categoría 3)
INSERT INTO sub_activos (id_activo, id_categoria, marca, modelo, serialnumber, observacion, precio_base, estado, fam) VALUES
(11, 3, 'Dell',     'Latitude 5520',       'NB-001-2024', 'i5 11th Gen, 16GB RAM, 256GB SSD', 200.00, 'Disponible', 'FAM-N001'),
(12, 3, 'Lenovo',   'ThinkPad T14',        'NB-002-2024', 'i7 11th Gen, 16GB RAM, 512GB SSD', 280.00, 'Disponible', 'FAM-N002'),
(13, 3, 'HP',       'ProBook 450 G8',      'NB-003-2024', 'i5 11th Gen, 8GB RAM, 256GB SSD', 180.00, 'Disponible', 'FAM-N003'),
(14, 3, 'Dell',     'Inspiron 15 3520',    'NB-004-2024', 'i3 12th Gen, 8GB RAM, 256GB SSD', 150.00, 'Disponible', 'FAM-N004'),
(15, 3, 'Lenovo',   'IdeaPad 3',           'NB-005-2024', 'Ryzen 5, 8GB RAM, 512GB SSD', 170.00, 'Disponible', 'FAM-N005');

-- OTROS (categoría 4)
INSERT INTO sub_activos (id_activo, id_categoria, marca, modelo, serialnumber, observacion, precio_base, estado, fam) VALUES
(16, 4, 'Logitech', 'MX Master 3S',       'OT-001-2024', 'Mouse inalámbrico ergonómico', 25.00, 'Disponible', 'FAM-O001'),
(17, 4, 'Sony',     'WH-1000XM4',         'OT-002-2024', 'Auriculares con cancelación de ruido', 80.00, 'Disponible', 'FAM-O002'),
(18, 4, 'LG',       'UltraWide 29WN600',  'OT-003-2024', 'Monitor 29" ultrawide, resolución 2560x1080', 120.00, 'Disponible', 'FAM-O003'),
(19, 4, 'Canon',    'PIXMA G3160',         'OT-004-2024', 'Impresora multifunción con tinta continua', 45.00, 'Disponible', 'FAM-O004'),
(20, 4, 'APC',      'Back-UPS 600VA',      'OT-005-2024', 'UPS con regulador, batería nueva', 30.00, 'Disponible', 'FAM-O005');

SELECT setval('sub_activos_id_activo_seq', 20);

-- ─────────────────────────────────────────────────────────
-- CONFIGURACIÓN DE SUBASTA (fecha fin de ejemplo)
-- ─────────────────────────────────────────────────────────
UPDATE sub_app_config 
SET fecha_fin_subasta = NOW() + INTERVAL '7 days'
WHERE id = 1;

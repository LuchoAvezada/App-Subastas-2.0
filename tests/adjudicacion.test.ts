import { describe, it, expect } from 'vitest';
import {
  procesarAdjudicacion,
  type OfertaInput,
  type ColaboradorInput,
  type CargoInput,
  type ActivoInput,
} from '../src/lib/adjudicacion';

describe('Algoritmo de Adjudicación F06 (Tope por Categoría y Desempate)', () => {
  const cargos: CargoInput[] = [
    { id_cargo: 1, nivel_jerarquia: 1, descripcion: 'Director' },
    { id_cargo: 2, nivel_jerarquia: 2, descripcion: 'Gerente' },
    { id_cargo: 3, nivel_jerarquia: 3, descripcion: 'Jefe' },
    { id_cargo: 4, nivel_jerarquia: 4, descripcion: 'Analista' },
  ];

  const colaboradores: ColaboradorInput[] = [
    {
      id_colaborador: 101,
      nombre: 'Juan Pérez',
      ci_documento: '1001',
      id_cargo: 4, // Jerarquía 4
      id_rol: 2, // Usuario
      habilitado: 'SI',
      fecha_ingreso: '2020-01-15',
    },
    {
      id_colaborador: 102,
      nombre: 'María López',
      ci_documento: '1002',
      id_cargo: 2, // Jerarquía 2 (Mayor rango)
      id_rol: 2, // Usuario
      habilitado: 'SI',
      fecha_ingreso: '2021-06-01',
    },
    {
      id_colaborador: 103,
      nombre: 'Carlos Rojas',
      ci_documento: '1003',
      id_cargo: 4, // Jerarquía 4
      id_rol: 2, // Usuario
      habilitado: 'SI',
      fecha_ingreso: '2018-03-10', // Más antiguo que Juan
    },
    {
      id_colaborador: 104,
      nombre: 'Admin General',
      ci_documento: '9999',
      id_cargo: 1,
      id_rol: 1, // Admin (NO elegible)
      habilitado: 'SI',
      fecha_ingreso: '2015-01-01',
    },
    {
      id_colaborador: 105,
      nombre: 'Pedro Inhabilitado',
      ci_documento: '5555',
      id_cargo: 3,
      id_rol: 2,
      habilitado: 'NO', // Inhabilitado
      fecha_ingreso: '2019-01-01',
    },
  ];

  it('debe adjudicar a la oferta de mayor monto directamente', () => {
    const activos: ActivoInput[] = [
      { id_activo: 1, id_categoria: 3, marca: 'Dell', modelo: 'Latitude', estado: 'Disponible' },
    ];
    const ofertas: OfertaInput[] = [
      { id_oferta: 1, id_activo: 1, id_colaborador: 101, monto: 350, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 2, id_activo: 1, id_colaborador: 102, monto: 420, fecha_hora: '2026-10-10T11:00:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(1);
    expect(resultados[0].id_activo).toBe(1);
    expect(resultados[0].id_colaborador_ganador).toBe(102);
    expect(resultados[0].monto_final).toBe(420);
    expect(resultados[0].criterio_desempate).toBe('GANADO POR OFERTA MAS ALTA');
  });

  it('debe desempatar por jerarquía ante igualdad de monto', () => {
    const activos: ActivoInput[] = [
      { id_activo: 2, id_categoria: 3, marca: 'Lenovo', modelo: 'ThinkPad', estado: 'Disponible' },
    ];
    const ofertas: OfertaInput[] = [
      { id_oferta: 10, id_activo: 2, id_colaborador: 101, monto: 300, fecha_hora: '2026-10-10T10:00:00Z' }, // Jerarquía 4
      { id_oferta: 11, id_activo: 2, id_colaborador: 102, monto: 300, fecha_hora: '2026-10-10T10:05:00Z' }, // Jerarquía 2 (Mayor rango)
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(1);
    expect(resultados[0].id_colaborador_ganador).toBe(102);
    expect(resultados[0].monto_final).toBe(300);
    expect(resultados[0].criterio_desempate).toBe('GANADO POR JERARQUIA');
  });

  it('debe desempatar por antigüedad ante igualdad de monto y jerarquía', () => {
    const activos: ActivoInput[] = [
      { id_activo: 3, id_categoria: 3, marca: 'HP', modelo: 'ProBook', estado: 'Disponible' },
    ];
    // Juan (101) ingresó 2020-01-15, Carlos (103) ingresó 2018-03-10. Ambos jerarquía 4.
    const ofertas: OfertaInput[] = [
      { id_oferta: 20, id_activo: 3, id_colaborador: 101, monto: 250, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 21, id_activo: 3, id_colaborador: 103, monto: 250, fecha_hora: '2026-10-10T10:30:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(1);
    expect(resultados[0].id_colaborador_ganador).toBe(103); // Carlos por mayor antigüedad
    expect(resultados[0].criterio_desempate).toBe('GANADO POR ANTIGUEDAD');
  });

  it('debe desempatar por fecha de oferta ante igualdad absoluta de monto, jerarquía y antigüedad', () => {
    const activos: ActivoInput[] = [
      { id_activo: 4, id_categoria: 1, marca: 'Samsung', modelo: 'Tab', estado: 'Disponible' },
    ];
    // Supongamos dos colaboradores idénticos en jerarquía y antigüedad
    const colabs = [
      { id_colaborador: 201, nombre: 'Ana', ci_documento: '201', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2020-01-01' },
      { id_colaborador: 202, nombre: 'Bea', ci_documento: '202', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2020-01-01' },
    ];
    const ofertas: OfertaInput[] = [
      { id_oferta: 30, id_activo: 4, id_colaborador: 201, monto: 150, fecha_hora: '2026-10-10T09:00:00Z' },
      { id_oferta: 31, id_activo: 4, id_colaborador: 202, monto: 150, fecha_hora: '2026-10-10T09:15:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colabs, cargos, activos);

    expect(resultados).toHaveLength(1);
    expect(resultados[0].id_colaborador_ganador).toBe(201); // Primera oferta recibida
    expect(resultados[0].criterio_desempate).toBe('GANADO POR REGISTRO DE OFERTA');
  });

  it('debe aplicar el tope de 1 por categoría: si lidera en 2 activos de la misma categoría, gana el de mayor monto y el otro pasa al 2º postor', () => {
    // Categoría 3 (Notebooks)
    const activos: ActivoInput[] = [
      { id_activo: 10, id_categoria: 3, marca: 'Dell', modelo: 'XPS', estado: 'Disponible' },
      { id_activo: 11, id_categoria: 3, marca: 'HP', modelo: 'EliteBook', estado: 'Disponible' },
    ];
    // Juan (101) oferta 600 por Activo 10 y 450 por Activo 11 (lidera ambos).
    // María (102) oferta 500 por Activo 10.
    // Carlos (103) oferta 400 por Activo 11.
    const ofertas: OfertaInput[] = [
      { id_oferta: 1, id_activo: 10, id_colaborador: 101, monto: 600, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 2, id_activo: 10, id_colaborador: 102, monto: 500, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 3, id_activo: 11, id_colaborador: 101, monto: 450, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 4, id_activo: 11, id_colaborador: 103, monto: 400, fecha_hora: '2026-10-10T10:00:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(2);

    // Juan gana el Activo 10 porque es su postura más alta (600 > 450)
    const resActivo10 = resultados.find((r) => r.id_activo === 10);
    expect(resActivo10?.id_colaborador_ganador).toBe(101);
    expect(resActivo10?.monto_final).toBe(600);

    // Para el Activo 11, Juan queda excluido por haber ganado ya en la categoría 3.
    // El Activo 11 pasa al siguiente postor elegible: Carlos (103) con 400.
    const resActivo11 = resultados.find((r) => r.id_activo === 11);
    expect(resActivo11?.id_colaborador_ganador).toBe(103);
    expect(resActivo11?.monto_final).toBe(400);
  });

  it('debe permitir que un colaborador gane activos en categorías DISTINTAS (ej. Notebook y Celular)', () => {
    const activos: ActivoInput[] = [
      { id_activo: 20, id_categoria: 3, marca: 'Dell', modelo: 'Inspiron', estado: 'Disponible' }, // Notebook
      { id_activo: 21, id_categoria: 2, marca: 'Samsung', modelo: 'A54', estado: 'Disponible' }, // Celular
    ];
    const ofertas: OfertaInput[] = [
      { id_oferta: 1, id_activo: 20, id_colaborador: 101, monto: 300, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 2, id_activo: 21, id_colaborador: 101, monto: 180, fecha_hora: '2026-10-10T10:00:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(2);
    // Juan puede ganar ambos porque pertenecen a categorías distintas (3 y 2)
    expect(resultados.find((r) => r.id_activo === 20)?.id_colaborador_ganador).toBe(101);
    expect(resultados.find((r) => r.id_activo === 21)?.id_colaborador_ganador).toBe(101);
  });

  it('debe resolver cascadas múltiples en cadena dentro de una misma categoría', () => {
    // 3 activos en categoría 3
    const activos: ActivoInput[] = [
      { id_activo: 30, id_categoria: 3, marca: 'Dell', modelo: 'L1', estado: 'Disponible' },
      { id_activo: 31, id_categoria: 3, marca: 'Dell', modelo: 'L2', estado: 'Disponible' },
      { id_activo: 32, id_categoria: 3, marca: 'Dell', modelo: 'L3', estado: 'Disponible' },
    ];

    // Juan (101): Activo 30 ($500), Activo 31 ($400)
    // María (102): Activo 31 ($380), Activo 32 ($350)
    // Carlos (103): Activo 32 ($300)
    const ofertas: OfertaInput[] = [
      { id_oferta: 1, id_activo: 30, id_colaborador: 101, monto: 500, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 2, id_activo: 31, id_colaborador: 101, monto: 400, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 3, id_activo: 31, id_colaborador: 102, monto: 380, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 4, id_activo: 32, id_colaborador: 102, monto: 350, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 5, id_activo: 32, id_colaborador: 103, monto: 300, fecha_hora: '2026-10-10T10:00:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(3);

    // 1. Juan (101) lidera en 30 ($500) y 31 ($400). Se queda con el Activo 30 ($500).
    expect(resultados.find((r) => r.id_activo === 30)?.id_colaborador_ganador).toBe(101);

    // 2. Al salir Juan de 31, María (102) queda líder en 31 ($380).
    // María también lideraba en 32 ($350).
    // Compara sus ofertas: $380 > $350 -> María se queda con el Activo 31 ($380).
    expect(resultados.find((r) => r.id_activo === 31)?.id_colaborador_ganador).toBe(102);

    // 3. Al salir María de 32, el Activo 32 pasa al siguiente postor elegible: Carlos (103) con $300.
    expect(resultados.find((r) => r.id_activo === 32)?.id_colaborador_ganador).toBe(103);
  });

  it('debe ignorar ofertas de roles no elegibles (Admin, Visitante) o inhabilitados', () => {
    const activos: ActivoInput[] = [
      { id_activo: 40, id_categoria: 3, marca: 'Dell', modelo: 'X', estado: 'Disponible' },
    ];
    // Admin (104) oferta 900. Pedro inhabilitado (105) oferta 800. Juan (101, rol 2) oferta 300.
    const ofertas: OfertaInput[] = [
      { id_oferta: 1, id_activo: 40, id_colaborador: 104, monto: 900, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 2, id_activo: 40, id_colaborador: 105, monto: 800, fecha_hora: '2026-10-10T10:00:00Z' },
      { id_oferta: 3, id_activo: 40, id_colaborador: 101, monto: 300, fecha_hora: '2026-10-10T10:00:00Z' },
    ];

    const resultados = procesarAdjudicacion(ofertas, colaboradores, cargos, activos);

    expect(resultados).toHaveLength(1);
    expect(resultados[0].id_colaborador_ganador).toBe(101); // Juan gana porque admin e inhabilitado son ignorados
    expect(resultados[0].monto_final).toBe(300);
  });
});

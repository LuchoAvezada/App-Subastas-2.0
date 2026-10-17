import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  normalizarEncabezado,
  normalizarFecha,
  validarNomina,
  filtrarColaboradores,
  ordenarColaboradores,
  type ColaboradorExistente,
} from '../src/lib/colaboradores';
import { asuncionAUtcIso, formatFechaAsuncion } from '../src/lib/utils';
import { ROL, type DatosColaborador } from '../src/types/domain';

// Datos ficticios (P6): ninguna cédula ni nombre corresponde a personas reales.
const CARGOS = new Set([1, 5, 7]);

const existentes: ColaboradorExistente[] = [
  { ci_documento: '1000001', nombre: 'Admin de Prueba', fecha_ingreso: '2015-03-01', habilitado: 'SI', id_cargo: 1, id_rol: ROL.ADMINISTRADOR },
  { ci_documento: '1000002', nombre: 'Visitante Inactivo', fecha_ingreso: '2019-07-15', habilitado: 'NO', id_cargo: 7, id_rol: ROL.VISITANTE },
];

const fila = (datos: Record<string, string> = {}) => ({
  ci_documento: '2000001',
  nombre: 'Persona Nueva',
  fecha_ingreso: '10/02/2021',
  id_cargo: '5',
  ...datos,
});

describe('Importación de nómina por CSV — F08', () => {
  it('normaliza encabezados con mayúsculas, BOM y alias de la cédula', () => {
    expect(normalizarEncabezado('﻿ CI ')).toBe('ci_documento');
    expect(normalizarEncabezado('DOCUMENTO')).toBe('ci_documento');
    expect(normalizarEncabezado('Fecha_Ingreso')).toBe('fecha_ingreso');
  });

  it('acepta fechas DD/MM/AAAA y AAAA-MM-DD y rechaza las inexistentes', () => {
    expect(normalizarFecha('05/03/2020')).toBe('2020-03-05');
    expect(normalizarFecha('5/3/2020')).toBe('2020-03-05');
    expect(normalizarFecha(' 2020-03-05 ')).toBe('2020-03-05');
    expect(normalizarFecha('31/02/2024')).toBeNull();
    expect(normalizarFecha('2024-13-01')).toBeNull();
    expect(normalizarFecha('0020-01-01')).toBeNull();
    expect(normalizarFecha('03-05-2020')).toBeNull();
    expect(normalizarFecha('')).toBeNull();
    expect(normalizarFecha(undefined)).toBeNull();
  });

  it('clasifica nuevos, con cambios y sin cambios conservando rol y habilitación existentes', () => {
    const r = validarNomina(
      [
        fila(),
        // Sin habilitado ni id_rol: conserva NO y Visitante → sin cambios (la CI viene con puntos)
        { ci_documento: '1.000.002', nombre: 'Visitante  Inactivo', fecha_ingreso: '2019-07-15', id_cargo: '7' },
        // Cambia el cargo del admin sin tocar su rol
        { ci_documento: '1000001', nombre: 'Admin de Prueba', fecha_ingreso: '01/03/2015', id_cargo: '5' },
      ],
      existentes,
      CARGOS
    );

    expect(r.errores).toEqual([]);
    expect(r.nuevos).toEqual([
      { ci_documento: '2000001', nombre: 'Persona Nueva', fecha_ingreso: '2021-02-10', habilitado: 'SI', id_cargo: 5, id_rol: ROL.USUARIO },
    ]);
    expect(r.sinCambios).toBe(1);
    expect(r.actualizados).toEqual([{ ...existentes[0], id_cargo: 5 }]);
  });

  it('rechaza filas inválidas con el número de fila de la planilla, sin inventar valores', () => {
    const r = validarNomina(
      [
        fila({ ci_documento: '' }), // fila 2
        fila({ ci_documento: 'ABC-123' }), // fila 3
        fila({ ci_documento: '2000003', fecha_ingreso: '' }), // fila 4: sin fecha → no se inventa
        fila({ ci_documento: '2000004', id_cargo: '' }), // fila 5: sin cargo → no se inventa
        fila({ ci_documento: '2000005', id_cargo: '99' }), // fila 6
        fila({ ci_documento: '2000006', nombre: 'Pe�a' }), // fila 7: archivo no UTF-8
        fila({ ci_documento: '2000007', habilitado: 'quizás' }), // fila 8
        fila({ ci_documento: '2000008', id_rol: '1' }), // fila 9: admin por CSV
        fila({ ci_documento: '1000001', nombre: 'Admin de Prueba', fecha_ingreso: '2015-03-01', id_cargo: '1', id_rol: '2' }), // fila 10: quitar admin
        fila({ ci_documento: '80012345-6', habilitado: 'sí', id_rol: '3' }), // fila 11: válida
      ],
      existentes,
      CARGOS
    );

    const motivos = Object.fromEntries(r.errores.map((e) => [e.fila, e.motivo]));
    expect(Object.keys(motivos).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(motivos[2]).toMatch(/Falta la cédula/);
    expect(motivos[3]).toMatch(/Cédula inválida/);
    expect(motivos[4]).toMatch(/Fecha de ingreso inválida/);
    expect(motivos[5]).toMatch(/Falta el cargo/);
    expect(motivos[6]).toMatch(/cargo 99 no existe/);
    expect(motivos[7]).toMatch(/UTF-8/);
    expect(motivos[8]).toMatch(/SI o NO/);
    expect(motivos[9]).toMatch(/Administrador solo se asigna/);
    expect(motivos[10]).toMatch(/Es administrador/);

    expect(r.actualizados).toEqual([]);
    expect(r.nuevos).toEqual([
      { ci_documento: '80012345-6', nombre: 'Persona Nueva', fecha_ingreso: '2021-02-10', habilitado: 'SI', id_cargo: 5, id_rol: ROL.VISITANTE },
    ]);
  });

  it('detecta cédulas repetidas dentro del archivo', () => {
    const r = validarNomina([fila(), fila({ nombre: 'Otra Persona' })], [], CARGOS);
    expect(r.nuevos).toHaveLength(1);
    expect(r.errores).toEqual([{ fila: 3, ci: '2000001', motivo: 'Cédula repetida (ya está en la fila 2)' }]);
  });
});

describe('Fecha de cierre en hora oficial de Asunción — F08', () => {
  // Simula un equipo de administrador configurado en otra zona horaria
  beforeAll(() => {
    vi.stubEnv('TZ', 'Asia/Tokyo');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('interpreta el selector como hora de Asunción y la guarda en UTC', () => {
    expect(asuncionAUtcIso('2026-12-01T18:00')).toBe('2026-12-01T21:00:00.000Z');
    expect(formatFechaAsuncion('2026-12-01T21:00:00.000Z', "yyyy-MM-dd'T'HH:mm")).toBe('2026-12-01T18:00');
  });
});

describe('Vista de colaboradores: filtros y orden — F08', () => {
  const base = { id_usuario: null, rol: 'Usuario', id_rol: ROL.USUARIO, cargo: 'Analista', nivel_jerarquia: 5, id_cargo: 5 };
  const lista: DatosColaborador[] = [
    { ...base, id_usuario: 9, id_colaborador: 1, ci_documento: '900', nombre: 'Íñigo Pérez', fecha_ingreso: '2018-01-10', habilitado: 'SI', usuario_registrado: 'REGISTRADO' },
    { ...base, id_colaborador: 2, ci_documento: '10000', nombre: 'Ana Gómez', fecha_ingreso: '2012-06-01', habilitado: 'NO', usuario_registrado: 'PENDIENTE', rol: 'Visitante', id_rol: ROL.VISITANTE, cargo: 'Gerente', nivel_jerarquia: 2, id_cargo: 2 },
    { ...base, id_colaborador: 3, ci_documento: '5000', nombre: 'Bruno Díaz', fecha_ingreso: '2020-09-20', habilitado: 'SI', usuario_registrado: 'PENDIENTE' },
  ];
  const ids = (l: DatosColaborador[]) => l.map((c) => c.id_colaborador);

  it('combina búsqueda sin acentos con filtros por campo', () => {
    expect(ids(filtrarColaboradores(lista, 'INIGO perez', {}))).toEqual([1]);
    expect(ids(filtrarColaboradores(lista, '', { habilitado: 'SI', usuario_registrado: 'PENDIENTE' }))).toEqual([3]);
    expect(ids(filtrarColaboradores(lista, 'analista', { id_cargo: '5', id_rol: '' }))).toEqual([1, 3]);
    expect(ids(filtrarColaboradores(lista, 'visitante', { habilitado: 'SI' }))).toEqual([]);
  });

  it('ordena por CI numérica, jerarquía y antigüedad con desempate por nombre', () => {
    expect(ids(ordenarColaboradores(lista, 'ci_documento', true))).toEqual([1, 3, 2]);
    expect(ids(ordenarColaboradores(lista, 'nivel_jerarquia', true))).toEqual([2, 3, 1]);
    expect(ids(ordenarColaboradores(lista, 'fecha_ingreso', false))).toEqual([3, 1, 2]);
    expect(ids(ordenarColaboradores(lista, 'nombre', true))).toEqual([2, 3, 1]);
  });
});

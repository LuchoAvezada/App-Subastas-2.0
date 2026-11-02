import { describe, it, expect } from 'vitest';
import { explicarOfertas, textoCriterio, type Desistimiento } from '../src/lib/explicacionOfertas';
import type { ColaboradorInput } from '../src/lib/adjudicacion';
import type { OfertaRecibida, ResultadoDetalle } from '../src/types/domain';

describe('F13: explicación de ofertas ganadoras y perdedoras', () => {
  // nivel_jerarquia viaja en la oferta (vista sub_v_ofertas_recibidas); la antigüedad, en la nómina
  const nivel: Record<number, number> = { 101: 4, 102: 2, 103: 4, 104: 1, 105: 3, 106: 4 };

  const nomina: ColaboradorInput[] = [
    { id_colaborador: 101, nombre: 'Juan', ci_documento: '1001', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2020-01-15' },
    { id_colaborador: 102, nombre: 'María', ci_documento: '1002', id_cargo: 2, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2021-06-01' },
    { id_colaborador: 103, nombre: 'Carlos', ci_documento: '1003', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2018-03-10' },
    { id_colaborador: 104, nombre: 'Admin', ci_documento: '9999', id_cargo: 1, id_rol: 1, habilitado: 'SI', fecha_ingreso: '2015-01-01' },
    { id_colaborador: 105, nombre: 'Pedro', ci_documento: '5555', id_cargo: 3, id_rol: 2, habilitado: 'NO', fecha_ingreso: '2019-01-01' },
    { id_colaborador: 106, nombre: 'Ana', ci_documento: '1006', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2018-03-10' },
  ];

  const categoriaDe: Record<number, string> = {
    1: 'Notebooks', 2: 'Notebooks', 3: 'Celulares', 4: 'Celulares', 5: 'Notebooks', 6: 'Tablets', 7: 'Tablets', 8: 'Otros',
    9: 'Otros', 10: 'Otros',
  };

  let siguienteId = 1;
  const oferta = (id_activo: number, id_colaborador: number, monto: number, fecha_hora = '2026-10-10T10:00:00Z'): OfertaRecibida => ({
    id_oferta: siguienteId++,
    id_activo,
    marca: 'Dell',
    modelo: `M${id_activo}`,
    serialnumber: null,
    fam: null,
    categoria: categoriaDe[id_activo],
    precio_base: 0,
    id_colaborador,
    nombre_colaborador: nomina.find((c) => c.id_colaborador === id_colaborador)!.nombre,
    ci_documento: '',
    cargo: '',
    nivel_jerarquia: nivel[id_colaborador],
    monto,
    fecha_hora_display: '',
    fecha_hora,
  });

  const resultado = (
    id_activo: number,
    ganador: number | null,
    estado: ResultadoDetalle['estado_adjudicacion'] = 'Adjudicado'
  ): ResultadoDetalle => ({
    id_resultado: id_activo,
    id_activo,
    marca: 'Dell',
    modelo: `M${id_activo}`,
    serialnumber: null,
    fam: null,
    categoria: categoriaDe[id_activo],
    precio_base: 0,
    id_colaborador_ganador: ganador,
    colaborador_ganador: '',
    ci_documento: '',
    monto_final: 0,
    criterio_desempate: '',
    fecha_cierre_display: '',
    fecha_cierre: '',
    estado_adjudicacion: estado,
  });

  const ofertas: OfertaRecibida[] = [
    // Activo 1: gana Juan por monto; admin y bloqueado no participan
    oferta(1, 101, 500), oferta(1, 102, 450), oferta(1, 104, 900), oferta(1, 105, 800),
    // Activo 2: empate en monto, gana María por jerarquía
    oferta(2, 102, 300), oferta(2, 103, 300),
    // Activo 3: empate en monto y jerarquía, gana Carlos por antigüedad
    oferta(3, 101, 250), oferta(3, 103, 250),
    // Activo 4: empate total, pero Carlos ya ganó el activo 3 (Celulares): gana Ana por el tope
    oferta(4, 106, 150, '2026-10-10T09:00:00Z'), oferta(4, 103, 150, '2026-10-10T09:15:00Z'),
    // Activo 5: Juan ofertó más pero ya ganó el activo 1 (Notebooks)
    oferta(5, 101, 700), oferta(5, 103, 200),
    // Activo 6: María desistió, se reasignó a Carlos
    oferta(6, 102, 400), oferta(6, 103, 350),
    // Activo 7: Juan desistió y quedó desierto
    oferta(7, 101, 100),
    // Activo 8: todavía sin procesar
    oferta(8, 106, 50),
  ];

  const resultados: ResultadoDetalle[] = [
    resultado(1, 101), resultado(2, 102), resultado(3, 103), resultado(4, 106), resultado(5, 103),
    resultado(6, 103, 'Reasignado'), resultado(7, null, 'Desierto'),
  ];

  const desistimientos: Desistimiento[] = [
    { id_activo: 6, id_colaborador: 102, motivo: 'Desistimiento voluntario del colaborador' },
    { id_activo: 7, id_colaborador: 101, motivo: 'Falta de pago' },
  ];

  const explicadas = explicarOfertas(ofertas, resultados, nomina, desistimientos);
  const de = (id_activo: number, id_colaborador: number) =>
    explicadas.find((e) => e.oferta.id_activo === id_activo && e.oferta.id_colaborador === id_colaborador)!;

  it('devuelve una fila por oferta, ordenadas por prelación dentro de cada activo', () => {
    expect(explicadas).toHaveLength(ofertas.length);
    expect(explicadas.filter((e) => e.oferta.id_activo === 1).map((e) => e.oferta.id_colaborador)).toEqual([104, 105, 101, 102]);
    expect(de(1, 104).posicion).toBe(1);
    expect(de(1, 102).posicion).toBe(4);
  });

  it('explica al ganador por monto y al perdedor con la diferencia', () => {
    expect(de(1, 101)).toMatchObject({ resultado: 'Ganó', comentario: 'Ofertó el monto más alto.' });
    expect(de(1, 102).resultado).toBe('Perdió');
    expect(de(1, 102).comentario).toBe('Perdió por monto: ofertó $450.00, $50.00 menos que la oferta ganadora ($500.00).');
  });

  it('marca como no participantes al admin y al bloqueado', () => {
    expect(de(1, 104).comentario).toBe('No participó de la adjudicación: solo el rol Usuario puede ganar.');
    expect(de(1, 105).comentario).toBe('No participó de la adjudicación: el colaborador está bloqueado.');
  });

  it('explica cada desempate del lado del ganador y del perdedor', () => {
    expect(de(2, 102).comentario).toBe(textoCriterio('GANADO POR JERARQUIA'));
    expect(de(2, 103).comentario).toMatch(/perdió por jerarquía/);
    expect(de(3, 103).comentario).toBe(textoCriterio('GANADO POR ANTIGUEDAD'));
    expect(de(3, 101).comentario).toMatch(/perdió por antigüedad/);
    expect(de(4, 106).comentario).toBe(textoCriterio('GANADO POR TOPE DE CATEGORIA'));
    expect(de(4, 103).comentario).toMatch(/^Tope de categoría: ya ganó el activo #3/);
  });

  it('respeta el criterio de registro guardado antes de F14', () => {
    const r4 = { ...resultado(4, 106), criterio_desempate: 'GANADO POR REGISTRO DE OFERTA' };
    const ev = explicarOfertas(ofertas, [...resultados.filter((r) => r.id_activo !== 4), r4], nomina, desistimientos);
    const en4 = (c: number) => ev.find((e) => e.oferta.id_activo === 4 && e.oferta.id_colaborador === c)!;
    expect(en4(106).comentario).toBe(textoCriterio('GANADO POR REGISTRO DE OFERTA'));
    expect(en4(103).comentario).toMatch(/perdió por orden de registro/);
  });

  it('explica el tope de categoría en el perdedor y en el ganador', () => {
    expect(de(5, 101).resultado).toBe('Perdió');
    expect(de(5, 101).comentario).toBe('Tope de categoría: ya ganó el activo #1 (Dell M1) de Notebooks; máximo uno por colaborador.');
    expect(de(5, 103).comentario).toBe(textoCriterio('GANADO POR TOPE DE CATEGORIA'));
  });

  it('explica desistimientos, reasignaciones, desiertos y pendientes', () => {
    expect(de(6, 102).comentario).toBe('Ganó el activo pero desistió (Desistimiento voluntario del colaborador).');
    expect(de(6, 103)).toMatchObject({ resultado: 'Ganó', comentario: expect.stringMatching(/^Reasignado/) });
    expect(de(7, 101).comentario).toBe('Ganó el activo pero desistió (Falta de pago).');
    expect(de(8, 106)).toMatchObject({ resultado: 'Pendiente', comentario: 'El activo todavía no fue adjudicado.' });
  });

  // Carlos (103) y Ana (106) tienen el mismo nivel y la misma fecha de ingreso
  it('marca a los empatados de un activo en evaluación y deja atrás al resto (F14)', () => {
    const lista = [oferta(9, 103, 200), oferta(9, 106, 200), oferta(9, 101, 150)];
    const ev = explicarOfertas(lista, [resultado(9, null, 'En evaluación')], nomina, []);
    const por = (c: number) => ev.find((e) => e.oferta.id_colaborador === c)!;
    expect(por(103)).toMatchObject({ resultado: 'Pendiente', comentario: textoCriterio('REQUIERE EVALUACION') });
    expect(por(106)).toMatchObject({ resultado: 'Pendiente', comentario: textoCriterio('REQUIERE EVALUACION') });
    expect(por(101)).toMatchObject({ resultado: 'Perdió', comentario: 'Quedó detrás de los postores empatados que evalúa el comité.' });
  });

  it('explica la adjudicación por decisión del comité', () => {
    const lista = [oferta(10, 103, 300), oferta(10, 106, 300)];
    const r = { ...resultado(10, 106), criterio_desempate: 'ADJUDICADO POR DECISION DEL COMITE' };
    const ev = explicarOfertas(lista, [r], nomina, []);
    const por = (c: number) => ev.find((e) => e.oferta.id_colaborador === c)!;
    expect(por(106)).toMatchObject({ resultado: 'Ganó', comentario: textoCriterio('ADJUDICADO POR DECISION DEL COMITE') });
    expect(por(103).comentario).toBe('Empató en monto, jerarquía y antigüedad, y el comité adjudicó el activo a otro postor.');
  });

  it('dice que fue la única oferta válida cuando no hubo otro postor elegible', () => {
    const solo = explicarOfertas([oferta(8, 106, 50), oferta(8, 105, 900)], [resultado(8, 106)], nomina, []);
    expect(solo.find((e) => e.oferta.id_colaborador === 106)?.comentario).toBe('Fue la única oferta válida.');
  });
});

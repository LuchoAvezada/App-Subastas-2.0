import { describe, it, expect } from 'vitest';
import {
  calcularReasignacion,
  puedeVerResultados,
  generarReporteGanadores,
  type ReasignacionInput,
} from '../src/lib/desistimiento';
import type { ResultadoAdjudicacion, OfertaInput, ColaboradorInput, CargoInput, ActivoInput } from '../src/lib/adjudicacion';
import type { Usuario } from '../src/types/domain';

describe('Feature F07: Publicación de Resultados y Reasignación por Desistimiento', () => {
  const cargos: CargoInput[] = [
    { id_cargo: 1, nivel_jerarquia: 1, descripcion: 'Director' },
    { id_cargo: 2, nivel_jerarquia: 2, descripcion: 'Gerente' },
    { id_cargo: 3, nivel_jerarquia: 3, descripcion: 'Jefe' },
    { id_cargo: 4, nivel_jerarquia: 4, descripcion: 'Analista' },
  ];

  const colaboradores: ColaboradorInput[] = [
    { id_colaborador: 101, nombre: 'Juan Pérez', ci_documento: '1001', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2020-01-15' },
    { id_colaborador: 102, nombre: 'María López', ci_documento: '1002', id_cargo: 2, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2021-06-01' },
    { id_colaborador: 103, nombre: 'Carlos Rojas', ci_documento: '1003', id_cargo: 4, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2018-03-10' },
    { id_colaborador: 104, nombre: 'Ana Gómez', ci_documento: '1004', id_cargo: 3, id_rol: 2, habilitado: 'SI', fecha_ingreso: '2019-05-20' },
  ];

  const activos: ActivoInput[] = [
    { id_activo: 1, id_categoria: 3, marca: 'Dell', modelo: 'Latitude', estado: 'Disponible' }, // Notebook
    { id_activo: 2, id_categoria: 3, marca: 'Lenovo', modelo: 'ThinkPad', estado: 'Disponible' }, // Notebook
  ];

  describe('Reasignación automática por desistimiento', () => {
    it('debe reasignar el activo al 2º postor cuando el ganador inicial desiste', () => {
      // Activo 1: Juan (101) ofertó 500 (ganador), María (102) ofertó 450 (2º postor)
      const ofertas: OfertaInput[] = [
        { id_oferta: 1, id_activo: 1, id_colaborador: 101, monto: 500, fecha_hora: '2026-10-10T10:00:00Z' },
        { id_oferta: 2, id_activo: 1, id_colaborador: 102, monto: 450, fecha_hora: '2026-10-10T11:00:00Z' },
      ];

      const resultadosActuales: ResultadoAdjudicacion[] = [
        { id_activo: 1, id_colaborador_ganador: 101, monto_final: 500, criterio_desempate: 'GANADO POR OFERTA MAS ALTA' },
      ];

      const input: ReasignacionInput = {
        idActivo: 1,
        motivo: 'Desistimiento voluntario del colaborador',
        resultadosActuales,
        ofertas,
        colaboradores,
        cargos,
        activos,
      };

      const resultado = calcularReasignacion(input);

      expect(resultado.id_activo).toBe(1);
      expect(resultado.estado_adjudicacion).toBe('Reasignado');
      expect(resultado.id_colaborador_ganador).toBe(102); // Promovida María
      expect(resultado.monto_final).toBe(450);
      expect(resultado.criterio_desempate).toContain('REASIGNADO POR DESISTIMIENTO');
      expect(resultado.motivo_desistimiento).toBe('Desistimiento voluntario del colaborador');
    });

    it('debe respetar el tope de 1 por categoría al reasignar: saltar al 3º si el 2º ya ganó en esa categoría', () => {
      // Activo 1: Juan (101) $500, María (102) $450, Carlos (103) $400.
      // Pero María (102) YA tiene adjudicado el Activo 2 de esa misma categoría (Notebooks).
      const ofertas: OfertaInput[] = [
        { id_oferta: 1, id_activo: 1, id_colaborador: 101, monto: 500, fecha_hora: '2026-10-10T10:00:00Z' },
        { id_oferta: 2, id_activo: 1, id_colaborador: 102, monto: 450, fecha_hora: '2026-10-10T11:00:00Z' },
        { id_oferta: 3, id_activo: 1, id_colaborador: 103, monto: 400, fecha_hora: '2026-10-10T12:00:00Z' },
      ];

      const resultadosActuales: ResultadoAdjudicacion[] = [
        { id_activo: 1, id_colaborador_ganador: 101, monto_final: 500, criterio_desempate: 'GANADO POR OFERTA MAS ALTA' },
        { id_activo: 2, id_colaborador_ganador: 102, monto_final: 600, criterio_desempate: 'GANADO POR OFERTA MAS ALTA' },
      ];

      const input: ReasignacionInput = {
        idActivo: 1,
        motivo: 'No se presentó a firmar descuento',
        resultadosActuales,
        ofertas,
        colaboradores,
        cargos,
        activos,
      };

      const resultado = calcularReasignacion(input);

      // María no puede ganar el Activo 1 porque ya tiene el Activo 2 (ambos notebooks).
      // Se promueve al 3º postor: Carlos (103) con $400.
      expect(resultado.id_colaborador_ganador).toBe(103);
      expect(resultado.monto_final).toBe(400);
      expect(resultado.estado_adjudicacion).toBe('Reasignado');
    });

    it('debe marcar el activo como Desierto si no hay más postores elegibles tras el desistimiento', () => {
      // Solo Juan ofertó por el Activo 1
      const ofertas: OfertaInput[] = [
        { id_oferta: 1, id_activo: 1, id_colaborador: 101, monto: 500, fecha_hora: '2026-10-10T10:00:00Z' },
      ];

      const resultadosActuales: ResultadoAdjudicacion[] = [
        { id_activo: 1, id_colaborador_ganador: 101, monto_final: 500, criterio_desempate: 'GANADO POR OFERTA MAS ALTA' },
      ];

      const input: ReasignacionInput = {
        idActivo: 1,
        motivo: 'Desistimiento de compra',
        resultadosActuales,
        ofertas,
        colaboradores,
        cargos,
        activos,
      };

      const resultado = calcularReasignacion(input);

      expect(resultado.id_activo).toBe(1);
      expect(resultado.estado_adjudicacion).toBe('Desierto');
      expect(resultado.id_colaborador_ganador).toBeNull();
      expect(resultado.monto_final).toBe(0);
      expect(resultado.motivo_desistimiento).toBe('Desistimiento de compra');
    });

    it('no debe devolver el activo a quien ya desistió: Juan desiste → María; María desiste → Carlos, no Juan', () => {
      const ofertas: OfertaInput[] = [
        { id_oferta: 1, id_activo: 1, id_colaborador: 101, monto: 500, fecha_hora: '2026-10-10T10:00:00Z' },
        { id_oferta: 2, id_activo: 1, id_colaborador: 102, monto: 450, fecha_hora: '2026-10-10T11:00:00Z' },
        { id_oferta: 3, id_activo: 1, id_colaborador: 103, monto: 400, fecha_hora: '2026-10-10T12:00:00Z' },
      ];

      const resultado = calcularReasignacion({
        idActivo: 1,
        motivo: 'Falta de pago',
        resultadosActuales: [
          { id_activo: 1, id_colaborador_ganador: 102, monto_final: 450, criterio_desempate: 'REASIGNADO POR DESISTIMIENTO (2º POSTOR)' },
        ],
        ofertas,
        colaboradores,
        cargos,
        activos,
        desistidos: [101],
      });

      expect(resultado.id_colaborador_ganador).toBe(103); // Juan tiene la oferta más alta, pero ya desistió
      expect(resultado.monto_final).toBe(400);
      expect(resultado.criterio_desempate).toBe('REASIGNADO POR DESISTIMIENTO (3º POSTOR)');
    });
  });

  describe('Reglas de visibilidad y acceso a resultados (Gobernanza)', () => {
    const adminUser: Usuario = {
      id_usuario: 1,
      id_colaborador: 99,
      ci_documento: '999',
      nombre: 'Administrador TI',
      id_rol: 1,
      es_admin: true,
    };

    const regularUser: Usuario = {
      id_usuario: 2,
      id_colaborador: 101,
      ci_documento: '1001',
      nombre: 'Juan Pérez',
      id_rol: 2,
      es_admin: false,
    };

    const visitorUser: Usuario = {
      id_usuario: 3,
      id_colaborador: 200,
      ci_documento: '2000',
      nombre: 'Visitante Externo',
      id_rol: 3,
      es_admin: false,
    };

    it('administradores SIEMPRE pueden ver los resultados, incluso antes de ser publicados', () => {
      expect(puedeVerResultados(adminUser, false)).toBe(true);
      expect(puedeVerResultados(adminUser, true)).toBe(true);
    });

    it('usuarios comunes y visitantes NO pueden ver resultados antes del OK (resultados_publicados = false)', () => {
      expect(puedeVerResultados(regularUser, false)).toBe(false);
      expect(puedeVerResultados(visitorUser, false)).toBe(false);
      expect(puedeVerResultados(null, false)).toBe(false);
    });

    it('todos los usuarios autenticados pueden ver resultados una vez publicados oficialmente (resultados_publicados = true)', () => {
      expect(puedeVerResultados(regularUser, true)).toBe(true);
      expect(puedeVerResultados(visitorUser, true)).toBe(true);
    });
  });

  describe('Generación de Reporte de Ganadores', () => {
    it('debe estructurar el reporte con todas las columnas auditables requeridas', () => {
      const resultadosMock = [
        {
          id_resultado: 1,
          id_activo: 1,
          marca: 'Dell',
          modelo: 'Latitude',
          serialnumber: 'SN123',
          fam: 'FAM-01',
          categoria: 'Notebooks',
          precio_base: 300,
          id_colaborador_ganador: 101,
          colaborador_ganador: 'Juan Pérez',
          ci_documento: '1001',
          monto_final: 500,
          criterio_desempate: 'GANADO POR OFERTA MAS ALTA',
          fecha_cierre_display: '14/10/2026 12:00:00',
          fecha_cierre: '2026-10-14T15:00:00Z',
          estado_adjudicacion: 'Adjudicado' as const,
        },
      ];

      const reporte = generarReporteGanadores(resultadosMock, colaboradores, cargos);

      expect(reporte.totalAdjudicados).toBe(1);
      expect(reporte.montoTotal).toBe(500);
      expect(reporte.items).toHaveLength(1);
      expect(reporte.items[0]['Colaborador Ganador']).toBe('Juan Pérez');
      expect(reporte.items[0]['Monto Final USD']).toBe(500);
      expect(reporte.items[0]['Nivel Jerárquico']).toBe(4);
    });
  });
});

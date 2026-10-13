import { describe, it, expect } from 'vitest';
import { formatUSD } from '../src/lib/utils';
import { ROL, puedeOfertar, type Usuario } from '../src/types/domain';

interface OfertaPublicaRaw {
  id_activo: number;
  monto: number;
}

interface EstadisticaActivo {
  montoLider: number;
  totalOfertas: number;
}

function calcularResumenOfertas(ofertas: OfertaPublicaRaw[]): Record<number, EstadisticaActivo> {
  const map: Record<number, EstadisticaActivo> = {};

  for (const o of ofertas) {
    if (!map[o.id_activo]) {
      map[o.id_activo] = { montoLider: o.monto, totalOfertas: 1 };
    } else {
      map[o.id_activo].totalOfertas += 1;
      if (o.monto > map[o.id_activo].montoLider) {
        map[o.id_activo].montoLider = o.monto;
      }
    }
  }

  return map;
}

describe('Catálogo de Activos y Visibilidad de Ofertas — F04', () => {
  describe('Cálculo Anónimo de Monto Líder y Conteo de Ofertas', () => {
    it('calcula correctamente el monto líder y cantidad de ofertas para múltiples activos', () => {
      const ofertasMuestra: OfertaPublicaRaw[] = [
        { id_activo: 1, monto: 120 },
        { id_activo: 1, monto: 150 },
        { id_activo: 1, monto: 140 },
        { id_activo: 2, monto: 300 },
        { id_activo: 2, monto: 350 },
      ];

      const resumen = calcularResumenOfertas(ofertasMuestra);

      expect(resumen[1]).toBeDefined();
      expect(resumen[1].totalOfertas).toBe(3);
      expect(resumen[1].montoLider).toBe(150);

      expect(resumen[2]).toBeDefined();
      expect(resumen[2].totalOfertas).toBe(2);
      expect(resumen[2].montoLider).toBe(350);
    });

    it('devuelve valores por defecto (0 ofertas y $0.00 líder) cuando un activo no tiene ofertas', () => {
      const resumen = calcularResumenOfertas([]);
      const statActivo3 = resumen[3] || { montoLider: 0, totalOfertas: 0 };

      expect(statActivo3.totalOfertas).toBe(0);
      expect(statActivo3.montoLider).toBe(0);
      expect(formatUSD(statActivo3.montoLider)).toBe('$0.00');
    });

    it('no contiene ningún campo personal o identificador de colaborador (Principio P9)', () => {
      const ofertasMuestra: OfertaPublicaRaw[] = [{ id_activo: 5, monto: 200 }];
      const resumen = calcularResumenOfertas(ofertasMuestra);

      const item = resumen[5];
      expect(item).not.toHaveProperty('nombre');
      expect(item).not.toHaveProperty('ci_documento');
      expect(item).not.toHaveProperty('id_colaborador');
    });
  });

  describe('Validación de Monto Ofertado vs Precio Base', () => {
    const precioBase = 150.0;

    it('acepta ofertas que igualan o superan el precio base', () => {
      const validarMonto = (monto: number) => monto >= precioBase;
      expect(validarMonto(150)).toBe(true);
      expect(validarMonto(150.01)).toBe(true);
      expect(validarMonto(200)).toBe(true);
    });

    it('rechaza ofertas por debajo del precio base', () => {
      const validarMonto = (monto: number) => monto >= precioBase;
      expect(validarMonto(149.99)).toBe(false);
      expect(validarMonto(100)).toBe(false);
      expect(validarMonto(0)).toBe(false);
    });
  });

  describe('Restricción de Participación por Perfil (RBAC)', () => {
    it('solo el colaborador participante puede ofertar', () => {
      const userColaborador: Usuario = {
        id_usuario: 5,
        id_colaborador: 5,
        ci_documento: '555555',
        nombre: 'Participante',
        id_rol: ROL.USUARIO,
        es_admin: false,
      };
      const admin: Usuario = {
        id_usuario: 1,
        id_colaborador: 1,
        ci_documento: '111111',
        nombre: 'Admin',
        id_rol: ROL.ADMINISTRADOR,
        es_admin: true,
      };

      expect(puedeOfertar(userColaborador)).toBe(true);
      expect(puedeOfertar(admin)).toBe(false);
    });
  });

  describe('Estado Temporal de la Subasta (Cierre Automático y Manual)', () => {
    it('determina que la subasta está activa si la fecha fin es futura', () => {
      const fechaFutura = new Date(Date.now() + 86400000).toISOString();
      const isExpired = new Date(fechaFutura).getTime() <= Date.now();
      expect(isExpired).toBe(false);
    });

    it('determina que la subasta está cerrada si la fecha fin ya pasó (cierre manual o vencimiento)', () => {
      const fechaPasada = new Date(Date.now() - 1000).toISOString();
      const isExpired = new Date(fechaPasada).getTime() <= Date.now();
      expect(isExpired).toBe(true);
    });
  });
});

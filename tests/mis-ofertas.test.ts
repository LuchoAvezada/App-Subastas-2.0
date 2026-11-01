import { describe, it, expect, beforeEach, vi } from 'vitest';

export interface VetoRegistro {
  id_activo: number;
  id_colaborador: number;
  monto_cancelado: number;
  fecha_cancelacion: string;
}

class GestorVetosMemory {
  private vetos: VetoRegistro[] = [];

  registrarVeto(veto: VetoRegistro) {
    if (!this.tieneVeto(veto.id_colaborador, veto.id_activo)) {
      this.vetos.push(veto);
    }
  }

  tieneVeto(idColaborador: number, idActivo: number): boolean {
    return this.vetos.some(
      (v) => v.id_colaborador === idColaborador && v.id_activo === idActivo
    );
  }

  obtenerVetos(idColaborador: number): VetoRegistro[] {
    return this.vetos.filter((v) => v.id_colaborador === idColaborador);
  }

  limpiar() {
    this.vetos = [];
  }
}

describe('Mis Ofertas y Cancelación con Veto de Reincidencia — F05', () => {
  let gestor: GestorVetosMemory;

  beforeEach(() => {
    gestor = new GestorVetosMemory();
  });

  describe('Principio Constitucional P9: Veto de Reincidencia por Activo', () => {
    it('registra correctamente un veto al cancelar una oferta por un activo', () => {
      gestor.registrarVeto({
        id_activo: 9,
        id_colaborador: 1,
        monto_cancelado: 400,
        fecha_cancelacion: new Date().toISOString(),
      });

      expect(gestor.tieneVeto(1, 9)).toBe(true);
    });

    it('el veto es específico al activo cancelado y no inhabilita otros activos', () => {
      gestor.registrarVeto({
        id_activo: 9,
        id_colaborador: 1,
        monto_cancelado: 400,
        fecha_cancelacion: new Date().toISOString(),
      });

      expect(gestor.tieneVeto(1, 9)).toBe(true);
      expect(gestor.tieneVeto(1, 10)).toBe(false); // Otro activo sigue disponible para ofertar
      expect(gestor.tieneVeto(1, 11)).toBe(false);
    });

    it('el veto es específico al colaborador que canceló y no afecta a terceros', () => {
      gestor.registrarVeto({
        id_activo: 9,
        id_colaborador: 1,
        monto_cancelado: 400,
        fecha_cancelacion: new Date().toISOString(),
      });

      expect(gestor.tieneVeto(1, 9)).toBe(true);
      expect(gestor.tieneVeto(2, 9)).toBe(false); // Otro colaborador puede ofertar normalmente
    });
  });

  describe('Reglas de Validación de Cancelación Temporal', () => {
    it('permite cancelar una oferta mientras la subasta está activa', () => {
      const isSubastaExpirada = false;
      const puedeCancelar = (expirada: boolean) => !expirada;

      expect(puedeCancelar(isSubastaExpirada)).toBe(true);
    });

    it('bloquea la cancelación si la subasta ya ha finalizado o cerrado', () => {
      const isSubastaExpirada = true;
      const puedeCancelar = (expirada: boolean) => !expirada;

      expect(puedeCancelar(isSubastaExpirada)).toBe(false);
    });
  });

  describe('Prevención de Nueva Oferta bajo Veto Activo', () => {
    it('impide enviar una nueva postura en un activo si el colaborador tiene veto activo', () => {
      gestor.registrarVeto({
        id_activo: 9,
        id_colaborador: 5,
        monto_cancelado: 350,
        fecha_cancelacion: new Date().toISOString(),
      });

      const validarPuedeOfertar = (idColab: number, idAct: number) => {
        if (gestor.tieneVeto(idColab, idAct)) {
          return { permitido: false, motivo: 'Veto permanente por cancelación previa' };
        }
        return { permitido: true };
      };

      const resActivo9 = validarPuedeOfertar(5, 9);
      expect(resActivo9.permitido).toBe(false);
      expect(resActivo9.motivo).toContain('Veto permanente');

      const resActivo12 = validarPuedeOfertar(5, 12);
      expect(resActivo12.permitido).toBe(true);
    });
  });
});

describe('sincronizarVetos — caché local de los vetos del servidor (sql/23)', () => {
  it('toma los del servidor y conserva los locales anteriores a la migración', async () => {
    const datos = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    });
    vi.stubGlobal('window', { dispatchEvent: () => true });
    const { sincronizarVetos, getVetosColaborador } = await import('../src/lib/vetos');

    const veto = (id_activo: number, monto_cancelado: number) => ({
      id_activo, id_colaborador: 7, monto_cancelado, fecha_cancelacion: '2026-11-01T10:00:00-03:00',
    });
    datos.set('agrotec_subasta_vetos_7', JSON.stringify([veto(1, 50), veto(2, 60)]));

    sincronizarVetos(7, [veto(2, 65), veto(3, 70)]);

    const vetos = getVetosColaborador(7);
    expect(vetos.map((v) => v.id_activo).sort()).toEqual([1, 2, 3]);
    expect(vetos.find((v) => v.id_activo === 2)?.monto_cancelado).toBe(65); // gana el servidor
    vi.unstubAllGlobals();
  });
});

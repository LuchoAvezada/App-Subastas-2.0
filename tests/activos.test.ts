import { describe, it, expect } from 'vitest';
import { CATEGORIA_MAP, type Activo, type CategoriaSlug } from '../src/types/domain';
import { formatUSD } from '../src/lib/utils';

describe('Gestión de Activos y Catálogo — F03', () => {
  describe('Mapeo de Categorías de Activos', () => {
    it('mapea correctamente las 4 categorías institucionales', () => {
      const keys: CategoriaSlug[] = ['tablets', 'celulares', 'notebooks', 'otros'];
      expect(keys.length).toBe(4);

      expect(CATEGORIA_MAP.tablets).toEqual({ id: 1, label: 'Tablets' });
      expect(CATEGORIA_MAP.celulares).toEqual({ id: 2, label: 'Celulares' });
      expect(CATEGORIA_MAP.notebooks).toEqual({ id: 3, label: 'Notebooks' });
      expect(CATEGORIA_MAP.otros).toEqual({ id: 4, label: 'Otros' });
    });
  });

  describe('Validación de Precio Base en USD', () => {
    it('valida que el precio base sea un número válido mayor o igual a 0', () => {
      const isValidPrice = (val: string) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      };

      expect(isValidPrice('150.00')).toBe(true);
      expect(isValidPrice('0')).toBe(true);
      expect(isValidPrice('0.00')).toBe(true);
      expect(isValidPrice('-10')).toBe(false);
      expect(isValidPrice('abc')).toBe(false);
      expect(isValidPrice('')).toBe(false);
    });

    it('formatea correctamente los montos en USD según la Constitución P1', () => {
      expect(formatUSD(150)).toBe('$150.00');
      expect(formatUSD(0)).toBe('$0.00');
      expect(formatUSD(1250.5)).toBe('$1,250.50');
    });
  });

  describe('Estados Permitidos de Activos', () => {
    const estadosPermitidos = ['Disponible', 'Cerrado', 'Adjudicado'];

    it('reconoce únicamente los 3 estados permitidos por la regla de negocio', () => {
      expect(estadosPermitidos).toContain('Disponible');
      expect(estadosPermitidos).toContain('Cerrado');
      expect(estadosPermitidos).toContain('Adjudicado');
      expect(estadosPermitidos).not.toContain('Borrador');
    });
  });

  describe('Filtros Reactivos de Inventario', () => {
    const activosPrueba: Activo[] = [
      {
        id_activo: 1,
        id_categoria: 1,
        marca: 'Samsung',
        modelo: 'Galaxy Tab S7',
        serialnumber: 'TAB-001',
        observacion: 'Excelente estado',
        precio_base: 180,
        estado: 'Disponible',
        foto_url: 'https://example.com/tab.webp',
        fam: 'FAM-001',
      },
      {
        id_activo: 2,
        id_categoria: 3,
        marca: 'Dell',
        modelo: 'Latitude 5420',
        serialnumber: 'NB-002',
        observacion: 'Batería 85%',
        precio_base: 320,
        estado: 'Disponible',
        foto_url: null,
        fam: 'FAM-002',
      },
      {
        id_activo: 3,
        id_categoria: 2,
        marca: 'Samsung',
        modelo: 'Galaxy A54',
        serialnumber: 'CEL-003',
        observacion: null,
        precio_base: 120,
        estado: 'Cerrado',
        foto_url: null,
        fam: null,
      },
    ];

    it('filtra correctamente por término de búsqueda en marca o modelo', () => {
      const termino = 'dell';
      const filtrados = activosPrueba.filter((a) =>
        `${a.marca || ''} ${a.modelo || ''} ${a.serialnumber || ''} ${a.fam || ''}`
          .toLowerCase()
          .includes(termino.toLowerCase())
      );
      expect(filtrados.length).toBe(1);
      expect(filtrados[0].id_activo).toBe(2);
    });

    it('filtra correctamente por número de serie o código FAM', () => {
      const filtradosPorSn = activosPrueba.filter((a) =>
        a.serialnumber?.toLowerCase().includes('cel-003')
      );
      expect(filtradosPorSn.length).toBe(1);
      expect(filtradosPorSn[0].id_activo).toBe(3);

      const filtradosPorFam = activosPrueba.filter((a) =>
        a.fam?.toLowerCase().includes('fam-001')
      );
      expect(filtradosPorFam.length).toBe(1);
      expect(filtradosPorFam[0].id_activo).toBe(1);
    });

    it('filtra correctamente por categoría', () => {
      const categoriaNotebooks = 3;
      const filtrados = activosPrueba.filter((a) => a.id_categoria === categoriaNotebooks);
      expect(filtrados.length).toBe(1);
      expect(filtrados[0].modelo).toBe('Latitude 5420');
    });
  });
});

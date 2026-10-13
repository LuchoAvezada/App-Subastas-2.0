import { describe, it, expect } from 'vitest';
import { puedeOfertar, ROL, CATEGORIA_MAP } from '../src/types/domain';

describe('Reglas de Dominio — App Subastas 2.0', () => {
  it('solo el rol USUARIO (id_rol = 2) puede ofertar en la subasta', () => {
    const colaboradorUsuario = {
      id_usuario: 1,
      id_colaborador: 10,
      ci_documento: '4567890',
      nombre: 'Colaborador Participante',
      id_rol: ROL.USUARIO,
      es_admin: false,
    };

    const admin = {
      id_usuario: 2,
      id_colaborador: 20,
      ci_documento: '1234567',
      nombre: 'Administrador TI',
      id_rol: ROL.ADMINISTRADOR,
      es_admin: true,
    };

    const visitante = {
      id_usuario: 3,
      id_colaborador: 30,
      ci_documento: '7890123',
      nombre: 'Visitante Externo',
      id_rol: ROL.VISITANTE,
      es_admin: false,
    };

    expect(puedeOfertar(colaboradorUsuario)).toBe(true);
    expect(puedeOfertar(admin)).toBe(false);
    expect(puedeOfertar(visitante)).toBe(false);
    expect(puedeOfertar(null)).toBe(false);
    expect(puedeOfertar(undefined)).toBe(false);
  });

  it('cuenta con las 4 categorías oficiales de activos mapeadas', () => {
    expect(CATEGORIA_MAP.tablets.id).toBe(1);
    expect(CATEGORIA_MAP.tablets.label).toBe('Tablets');

    expect(CATEGORIA_MAP.celulares.id).toBe(2);
    expect(CATEGORIA_MAP.celulares.label).toBe('Celulares');

    expect(CATEGORIA_MAP.notebooks.id).toBe(3);
    expect(CATEGORIA_MAP.notebooks.label).toBe('Notebooks');

    expect(CATEGORIA_MAP.otros.id).toBe(4);
    expect(CATEGORIA_MAP.otros.label).toBe('Otros');
  });
});

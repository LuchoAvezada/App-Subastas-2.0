import { describe, it, expect } from 'vitest';
import { validatePassword } from '../src/lib/utils';
import { ROL, puedeOfertar, type Usuario } from '../src/types/domain';

describe('Autenticación y Seguridad — F02', () => {
  describe('Validación de Complejidad de Contraseña (validatePassword)', () => {
    const ciValida = '1234567';

    it('rechaza contraseñas con menos de 8 caracteres', () => {
      const error = validatePassword('Ab1!', ciValida);
      expect(error).toBe('La contraseña debe tener al menos 8 caracteres.');
    });

    it('rechaza contraseñas sin letras mayúsculas', () => {
      const error = validatePassword('contrasena123', ciValida);
      expect(error).toBe('La contraseña debe contener al menos una letra mayúscula.');
    });

    it('rechaza contraseñas sin letras minúsculas', () => {
      const error = validatePassword('CONTRASENA123', ciValida);
      expect(error).toBe('La contraseña debe contener al menos una letra minúscula.');
    });

    it('rechaza contraseñas sin números', () => {
      const error = validatePassword('ContrasenaSegura', ciValida);
      expect(error).toBe('La contraseña debe contener al menos un número.');
    });

    it('rechaza contraseñas con exactamente 7 caracteres aunque cumplan complejidad', () => {
      const error = validatePassword('Abc1234', ciValida);
      expect(error).toBe('La contraseña debe tener al menos 8 caracteres.');
    });

    it('acepta contraseñas con exactamente 8 caracteres si cumplen complejidad', () => {
      const error = validatePassword('Abc12345', ciValida);
      expect(error).toBeNull();
    });

    it('rechaza contraseñas idénticas a la cédula de identidad', () => {
      const ciOcho = '12345678';
      const errorCi = validatePassword(ciOcho, ciOcho);
      expect(errorCi).not.toBeNull();
    });

    it('rechaza explícitamente contraseñas que cumplan complejidad pero coincidan con la cédula', () => {
      const ciCompleja = 'Agrotec2026';
      const error = validatePassword(ciCompleja, ciCompleja);
      expect(error).toBe('La contraseña no puede ser igual al documento de identidad.');
    });

    it('acepta contraseñas robustas que cumplen todos los criterios', () => {
      const error = validatePassword('Agrotec#2026', ciValida);
      expect(error).toBeNull();
    });
  });

  describe('Control de Acceso y Regla de Ofertas (puedeOfertar)', () => {
    it('permite ofertar exclusivamente al rol USUARIO (Rol 2)', () => {
      const usuarioComun: Usuario = {
        id_usuario: 10,
        id_colaborador: 10,
        ci_documento: '3456789',
        nombre: 'Colaborador Participante',
        id_rol: ROL.USUARIO,
        es_admin: false,
      };
      expect(puedeOfertar(usuarioComun)).toBe(true);
    });

    it('bloquea ofertas a usuarios con rol ADMINISTRADOR (Rol 1, Constitución P9)', () => {
      const admin: Usuario = {
        id_usuario: 1,
        id_colaborador: 1,
        ci_documento: '1234567',
        nombre: 'Administrador TI',
        id_rol: ROL.ADMINISTRADOR,
        es_admin: true,
      };
      expect(puedeOfertar(admin)).toBe(false);
    });

    it('bloquea ofertas a usuarios con rol VISITANTE (Rol 3)', () => {
      const visitante: Usuario = {
        id_usuario: 99,
        id_colaborador: 99,
        ci_documento: '9999999',
        nombre: 'Visitante Externo',
        id_rol: ROL.VISITANTE,
        es_admin: false,
      };
      expect(puedeOfertar(visitante)).toBe(false);
    });

    it('bloquea ofertas cuando el usuario no está autenticado (null o undefined)', () => {
      expect(puedeOfertar(null)).toBe(false);
      expect(puedeOfertar(undefined)).toBe(false);
    });
  });

  describe('Normalización de Identificador de Documento', () => {
    it('elimina espacios accidentales al inicio y al final de la cédula', () => {
      const ciConEspacios = '  4567890  ';
      const ciLimpia = ciConEspacios.trim();
      expect(ciLimpia).toBe('4567890');
      expect(ciLimpia.length).toBe(7);
    });
  });

  describe('Integridad de Estructura de Sesión de Usuario', () => {
    it('serializa y deserializa correctamente el objeto Usuario de sesión', () => {
      const usuarioMock: Usuario = {
        id_usuario: 42,
        id_colaborador: 88,
        ci_documento: '4567890',
        nombre: 'Juan Pérez',
        id_rol: 2,
        es_admin: false,
      };

      const serializado = JSON.stringify(usuarioMock);
      const deserializado = JSON.parse(serializado) as Usuario;

      expect(deserializado.id_usuario).toBe(42);
      expect(deserializado.ci_documento).toBe('4567890');
      expect(deserializado.nombre).toBe('Juan Pérez');
      expect(deserializado.id_rol).toBe(2);
      expect(deserializado.es_admin).toBe(false);
    });

    it('detecta payload corrupto o incompleto sin identificadores requeridos', () => {
      const malformedPayload = JSON.stringify({ nombre: 'Desconocido' });
      const parsed = JSON.parse(malformedPayload);
      const isValid = Boolean(parsed.id_usuario && parsed.ci_documento);
      expect(isValid).toBe(false);
    });
  });
});

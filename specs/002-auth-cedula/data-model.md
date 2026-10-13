# Data Model: F02 — Autenticación por Cédula y Seguridad de Acceso

**Feature Branch**: `002-auth-cedula`  
**Fecha**: 2026-10-13  
**Estado**: Especificado  

---

## 1. Entidades de Base de Datos (PostgreSQL / Supabase)

### 1.1 `sub_colaboradores` (Nómina de Personal Pre-cargada)
Almacena la información institucional de cada colaborador de Agrotec.
```sql
CREATE TABLE sub_colaboradores (
    id_colaborador SERIAL PRIMARY KEY,
    ci_documento VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    habilitado VARCHAR(2) NOT NULL DEFAULT 'SI' CHECK (habilitado IN ('SI', 'NO')),
    id_cargo INTEGER REFERENCES sub_cargos(id_cargo),
    id_rol INTEGER DEFAULT 2 REFERENCES sub_roles(id_rol)
);
```

### 1.2 `sub_usuarios` (Credenciales y Cuentas Activas)
Almacena el hash seguro de contraseña y el estado de la cuenta.
```sql
CREATE TABLE sub_usuarios (
    id_usuario SERIAL PRIMARY KEY,
    usuario VARCHAR(20) UNIQUE NOT NULL,          -- Coincide con ci_documento
    password_hash VARCHAR(255) NOT NULL,          -- Hasheado con Blowfish (pgcrypto gen_salt('bf', 10))
    id_colaborador INTEGER UNIQUE NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    situacion CHAR(1) DEFAULT 'A' CHECK (situacion IN ('A', 'I'))
);
```

### 1.3 `sub_intentos_login` (Auditoría y Rate Limiting)
Registro de intentos de acceso para bloqueo ante fuerza bruta.
```sql
CREATE TABLE sub_intentos_login (
    id_intento SERIAL PRIMARY KEY,
    usuario VARCHAR(20) NOT NULL,
    fecha_intento TIMESTAMPTZ DEFAULT NOW(),
    exitoso CHAR(1) NOT NULL CHECK (exitoso IN ('S', 'N')),
    ip_origen VARCHAR(45)
);
```

### 1.4 `sub_roles` (Roles del Sistema)
```sql
CREATE TABLE sub_roles (
    id_rol SERIAL PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL,
    inactivo INTEGER DEFAULT 0,
    observacion VARCHAR(200)
);
-- Valores fijos: 1 = Administrador, 2 = Usuario, 3 = Visitante
```

---

## 2. Tipos de Dominio en Frontend (`src/types/domain.ts`)

```typescript
export interface Usuario {
  id_usuario: number;
  id_colaborador: number;
  ci_documento: string;
  nombre: string;
  id_rol: number | null;
  es_admin: boolean;
}

export const ROL = {
  ADMINISTRADOR: 1,
  USUARIO: 2,
  VISITANTE: 3,
} as const;

export function puedeOfertar(usuario: Usuario | null | undefined): boolean {
  return usuario?.id_rol === ROL.USUARIO;
}

export interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (ci: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registrar: (ci: string, password: string) => Promise<{ success: boolean; error?: string }>;
}
```

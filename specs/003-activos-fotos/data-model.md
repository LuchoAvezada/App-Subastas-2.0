# Data Model: F03 — Gestión de Activos y Carga de Fotos (Panel Admin)

**Feature Branch**: `003-activos-fotos`  
**Fecha**: 2026-10-13  
**Estado**: Especificado  

---

## 1. Entidades de Base de Datos (PostgreSQL / Supabase)

### 1.1 `sub_activos`
```sql
CREATE TABLE sub_activos (
    id_activo        SERIAL PRIMARY KEY,
    id_categoria     INTEGER NOT NULL REFERENCES sub_categorias(id_categoria),
    marca            VARCHAR(100),
    modelo           VARCHAR(100),
    serialnumber     VARCHAR(100),
    observacion      TEXT,
    precio_base      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_base >= 0),
    estado           VARCHAR(20) NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible', 'Cerrado', 'Adjudicado')),
    foto_url         TEXT,
    fam              VARCHAR(50)
);

CREATE INDEX idx_activos_categoria ON sub_activos(id_categoria);
CREATE INDEX idx_activos_estado ON sub_activos(estado);
```

### 1.2 `sub_categorias`
```sql
CREATE TABLE sub_categorias (
    id_categoria SERIAL PRIMARY KEY,
    tipo         VARCHAR(50) NOT NULL
);
-- 1: Tablets, 2: Celulares, 3: Notebooks, 4: Otros
```

---

## 2. Tipos de Dominio en Frontend (`src/types/domain.ts`)

```typescript
export interface Activo {
  id_activo: number;
  id_categoria: number;
  marca: string | null;
  modelo: string | null;
  serialnumber: string | null;
  observacion: string | null;
  precio_base: number;
  estado: 'Disponible' | 'Cerrado' | 'Adjudicado';
  foto_url: string | null;
  fam: string | null;
}

export type CategoriaSlug = 'tablets' | 'celulares' | 'notebooks' | 'otros';

export const CATEGORIA_MAP: Record<CategoriaSlug, { id: number; label: string }> = {
  tablets: { id: 1, label: 'Tablets' },
  celulares: { id: 2, label: 'Celulares' },
  notebooks: { id: 3, label: 'Notebooks' },
  otros: { id: 4, label: 'Otros' },
};
```

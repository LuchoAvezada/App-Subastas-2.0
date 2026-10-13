# Data Model: F04 — Catálogo de Activos, Visibilidad de Ofertas y Pujas

**Feature Branch**: `004-catalogo-ofertas`  
**Fecha**: 2026-10-13  
**Estado**: Especificado  

---

## 1. Entidades de Base de Datos Afectadas

### 1.1 `sub_ofertas`
```sql
CREATE TABLE sub_ofertas (
    id_oferta        SERIAL PRIMARY KEY,
    id_activo        INTEGER NOT NULL REFERENCES sub_activos(id_activo),
    id_colaborador   INTEGER NOT NULL REFERENCES sub_colaboradores(id_colaborador),
    monto            NUMERIC(10, 2) NOT NULL,
    fecha_hora       TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (id_activo, id_colaborador)
);
```

### 1.2 `sub_app_config`
```sql
CREATE TABLE sub_app_config (
    id                    INTEGER PRIMARY KEY DEFAULT 1,
    fecha_fin_subasta     TIMESTAMP,
    
    CHECK (id = 1)
);
```

---

## 2. Tipos de Dominio en Frontend (`src/types/domain.ts`)

```typescript
export interface EstadisticasActivo {
  id_activo: number;
  monto_lider: number;
  total_ofertas: number;
}

export interface AppConfig {
  id: number;
  fecha_fin_subasta: string | null;
}
```

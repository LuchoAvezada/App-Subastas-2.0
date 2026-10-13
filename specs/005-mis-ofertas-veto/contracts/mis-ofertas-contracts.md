# Contratos de Interfaz: F05 — Mis Ofertas y Vetos

## 1. Cancelación de Oferta (`useOfertas`)

```typescript
cancelarOferta: (
  idOferta: number,
  activo: {
    id_activo: number;
    marca?: string;
    modelo?: string;
    categoria?: string;
    monto: number;
  }
) => Promise<RpcResponse>;
```

### Respuestas:
- Éxito: `{ success: true, message: 'Oferta cancelada exitosamente. Se ha registrado el veto para este activo.' }`
- Error (Subasta cerrada): `{ success: false, error: 'No es posible cancelar la oferta: la subasta ya ha finalizado.' }`
- Error (Sin sesión): `{ success: false, error: 'Debe iniciar sesión para cancelar una oferta.' }`
- Error (Red / Supabase): `{ success: false, error: '...' }`

## 2. Validación de Veto (`useVetos` o `src/lib/vetos.ts`)

```typescript
export function tieneVeto(idColaborador: number, idActivo: number): boolean;
export function guardarVeto(veto: VetoRegistro): void;
export function listarVetos(idColaborador: number): VetoRegistro[];
```

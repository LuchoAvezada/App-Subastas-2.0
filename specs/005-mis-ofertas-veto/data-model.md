# Modelo de Datos: F05 — Mis Ofertas y Vetos

## 1. Entidad VetoRegistro

```typescript
export interface VetoRegistro {
  id_activo: number;
  id_colaborador: number;
  marca?: string;
  modelo?: string;
  categoria?: string;
  monto_cancelado: number;
  fecha_cancelacion: string; // ISO 8601
  motivo?: string;
}
```

## 2. Operaciones de Dominio

- `obtenerVetos(idColaborador: number): VetoRegistro[]`
- `tieneVetoActivo(idColaborador: number, idActivo: number): boolean`
- `registrarVeto(veto: VetoRegistro): void`
- `puedeOfertarActivo(usuario: Usuario | null, idActivo: number): boolean`

## 3. Estado de la Oferta en la UI

Una oferta en la UI de *Mis Ofertas* puede estar en:
- `Activa`: Subasta en curso, la oferta compite válidamente. Puede cancelarse.
- `Bloqueada por Cierre`: Subasta finalizada, pendiente de adjudicación o adjudicada. No puede cancelarse.
- `Cancelada / Vetada`: Oferta retirada previamente. El colaborador no puede volver a ofertar por ese activo.

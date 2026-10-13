# Contracts: F04 — Catálogo de Activos y Registro de Ofertas

**Feature Branch**: `004-catalogo-ofertas`  
**Fecha**: 2026-10-13  
**Estado**: Especificado  

---

## 1. RPC Supabase: `registrar_oferta`

### Invocación:
```typescript
supabase.rpc('registrar_oferta', {
  p_id_activo: number,
  p_ci_documento: string,
  p_monto: number,
})
```

### Respuestas:
- **Éxito:**
  ```json
  { "success": true, "message": "Oferta registrada exitosamente." }
  ```
- **Error - Subasta Finalizada / Cerrada:**
  ```json
  { "success": false, "error": "La subasta ya ha finalizado." }
  ```
- **Error - Perfil No Habilitado (Admin / Visitante):**
  ```json
  { "success": false, "error": "Su perfil no está habilitado para realizar ofertas. La subasta está reservada a los colaboradores participantes." }
  ```
- **Error - Monto Menor al Base:**
  ```json
  { "success": false, "error": "El monto ofertado debe ser mayor o igual al precio base (USD ...)." }
  ```
- **Error - Oferta Duplicada:**
  ```json
  { "success": false, "error": "Ya realizaste una oferta por este activo." }
  ```

---

## 2. Consulta de Agregación de Ofertas (Anónima)

```typescript
supabase
  .from('sub_ofertas')
  .select('id_activo, monto')
```
Retorna únicamente montos y activos asociados, resguardando la privacidad de los colaboradores.

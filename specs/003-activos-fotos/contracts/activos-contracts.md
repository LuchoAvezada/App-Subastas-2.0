# Contracts & Endpoints: F03 — Gestión de Activos y Carga de Fotos

**Feature Branch**: `003-activos-fotos`  
**Fecha**: 2026-10-13  
**Estado**: Especificado  

---

## 1. Operaciones Supabase: Tabla `sub_activos`

### 1.1 Listado de Activos
```typescript
supabase
  .from('sub_activos')
  .select('*')
  .order('id_activo', { ascending: true })
```

### 1.2 Inserción de Nuevo Activo
```typescript
supabase
  .from('sub_activos')
  .insert({
    id_categoria: number,
    marca: string | null,
    modelo: string | null,
    serialnumber: string | null,
    fam: string | null,
    observacion: string | null,
    precio_base: number,
    estado: 'Disponible' | 'Cerrado' | 'Adjudicado',
    foto_url: string | null,
  })
```

### 1.3 Actualización de Activo
```typescript
supabase
  .from('sub_activos')
  .update(payload)
  .eq('id_activo', idActivo)
```

### 1.4 Eliminación de Activo
```typescript
supabase
  .from('sub_activos')
  .delete()
  .eq('id_activo', idActivo)
```

---

## 2. Operaciones Supabase Storage: Bucket `activos`

### 2.1 Subida de Imagen
```typescript
supabase.storage
  .from('activos')
  .upload(filePath, blob, { upsert: true, contentType: blob.type })
```

### 2.2 Obtención de URL Pública
```typescript
supabase.storage
  .from('activos')
  .getPublicUrl(filePath).data.publicUrl
```

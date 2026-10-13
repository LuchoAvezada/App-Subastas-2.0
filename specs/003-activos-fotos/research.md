# Research & Decisiones Técnicas: F03 — Gestión de Activos y Carga de Fotos (Panel Admin)

**Feature Branch**: `003-activos-fotos`  
**Fecha**: 2026-10-13  
**Estado**: Completado  

---

## 1. Almacenamiento de Fotografías: Supabase Storage Bucket `activos`

- **Contexto:** Se requiere almacenar y servir fotografías reales de los equipos en subasta.
- **Decisión:** Bucket público de Supabase Storage denominado `activos`.
- **Estrategia de Carga:**
  - En el formulario `ActivoForm.tsx`, cuando el usuario selecciona una imagen, no se sube inmediatamente al servidor.
  - Se genera un Blob comprimido en memoria (`comprimirImagen`) y una URL efímera (`URL.createObjectURL(blob)`) para vista previa instantánea.
  - La subida física a `supabase.storage.from('activos')` ocurre únicamente al presionar "Guardar" en el formulario.
  - Esto previene archivos huérfanos o basura en el bucket si el usuario cancela o cierra el modal.

---

## 2. Compresión de Imagen en Cliente (WebP)

- **Contexto:** Las fotos tomadas desde smartphones modernos pesan entre 4 MB y 12 MB, lo que ralentizaría la carga en catálogo y consumiría cuota excesiva de red.
- **Decisión:** `comprimirImagen(file)` en `src/lib/image.ts`:
  - Utiliza `createImageBitmap` con `{ imageOrientation: 'from-image' }` para corregir orientación EXIF de cámaras móviles.
  - Escala el lado mayor a un máximo de 800 píxeles manteniendo la relación de aspecto.
  - Recodifica a `image/webp` con calidad 0.8.
  - Reduce el peso de cada foto a ~40-120 KB manteniendo nitidez excelente para pantallas y móviles.

---

## 3. Modelo de Precios y Moneda

- **Contexto:** Constitución P1 ratifica USD como moneda innegociable.
- **Decisión:**
  - El campo `precio_base` se almacena como `NUMERIC(10,2)` con restricción `CHECK (precio_base >= 0)`.
  - En frontend se formatea con `formatUSD(amount)` para mostrar `$X.XX`.

---

## 4. Miniatura en Tabla de Inventario

- **Contexto:** La tabla administrativa actualmente no mostraba la fotografía asociada al activo.
- **Decisión:** Agregar una columna `Foto` con una miniatura redonda/cuadrada suave (40x40 px) y fallback a un icono de equipo cuando `foto_url` sea nula.

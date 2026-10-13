const MAX_PX = 800;

/**
 * Redimensiona al lado mayor MAX_PX y recodifica a WebP.
 * Si el navegador no puede decodificar el archivo (p. ej. HEIC en Windows),
 * devuelve el original sin tocar.
 */
export async function comprimirImagen(file: File): Promise<Blob> {
  try {
    // imageOrientation evita que las fotos de celular salgan rotadas por EXIF
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const escala = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.8));
    return blob ?? file;
  } catch {
    return file;
  }
}

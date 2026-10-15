import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import type { Activo } from '../../types/domain';
import { comprimirImagen } from '../../lib/image';
import { ImageIcon, UploadSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react';

interface ActivoFormProps {
  activoToEdit?: Activo | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ActivoForm({ activoToEdit, onSuccess, onCancel }: ActivoFormProps) {
  const [idCategoria, setIdCategoria] = useState<number>(activoToEdit?.id_categoria || 1);
  const [marca, setMarca] = useState(activoToEdit?.marca || '');
  const [modelo, setModelo] = useState(activoToEdit?.modelo || '');
  const [serialnumber, setSerialnumber] = useState(activoToEdit?.serialnumber || '');
  const [fam, setFam] = useState(activoToEdit?.fam || '');
  const [observacion, setObservacion] = useState(activoToEdit?.observacion || '');
  const [precioBase, setPrecioBase] = useState(activoToEdit ? String(activoToEdit.precio_base) : '');
  const [estado, setEstado] = useState<'Disponible' | 'Cerrado' | 'Adjudicado'>(
    activoToEdit?.estado || 'Disponible'
  );
  // fotoUrl = imagen ya guardada en Storage (caso edición).
  // fotoBlob = imagen nueva elegida, TODAVÍA NO subida: se sube recién al guardar,
  // para no dejar archivos huérfanos si se cancela el modal o falla el guardado.
  const [fotoUrl, setFotoUrl] = useState(activoToEdit?.foto_url || '');
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoPreview, setFotoPreview] = useState(activoToEdit?.foto_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo seleccionado debe ser una imagen (JPEG, PNG, WebP).');
      return;
    }

    setUploadingImage(true);
    setError(null);
    try {
      const blob = await comprimirImagen(file);
      // Solo se comprime y se muestra localmente. La subida ocurre en handleSubmit.
      if (fotoPreview.startsWith('blob:')) URL.revokeObjectURL(fotoPreview);
      setFotoBlob(blob);
      setFotoPreview(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Error procesando imagen:', err);
      setError('No se pudo procesar la imagen seleccionada.');
    } finally {
      setUploadingImage(false);
    }
  };

  const quitarImagen = () => {
    if (fotoPreview.startsWith('blob:')) URL.revokeObjectURL(fotoPreview);
    setFotoBlob(null);
    setFotoPreview('');
    setFotoUrl('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const basePriceNum = parseFloat(precioBase);
    if (isNaN(basePriceNum) || basePriceNum < 0) {
      setError('El precio base debe ser un número válido mayor o igual a 0.');
      return;
    }

    setSaving(true);
    try {
      // La imagen se sube recién acá, cuando el activo se va a guardar de verdad.
      let urlFinal = fotoUrl;
      if (fotoBlob) {
        const ext = fotoBlob.type === 'image/webp' ? 'webp' : 'jpg';
        const filePath = `fotos/activo_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('activos')
          .upload(filePath, fotoBlob, { upsert: true, contentType: fotoBlob.type });
        if (uploadError) throw uploadError;
        urlFinal = supabase.storage.from('activos').getPublicUrl(filePath).data.publicUrl;
      }

      const payload = {
        id_categoria: idCategoria,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        serialnumber: serialnumber.trim() || null,
        fam: fam.trim() || null,
        observacion: observacion.trim() || null,
        precio_base: basePriceNum,
        estado,
        foto_url: urlFinal.trim() || null,
      };

      if (activoToEdit?.id_activo) {
        const { error: updateError } = await supabase
          .from('sub_activos')
          .update(payload)
          .eq('id_activo', activoToEdit.id_activo);

        if (updateError) throw updateError;
        toast.success('Activo actualizado correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('sub_activos')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Activo creado correctamente');
      }

      onSuccess();
    } catch (err) {
      console.error('Error guardando activo:', err);
      // Supabase devuelve PostgrestError (objeto plano, no Error): sin esto
      // el mensaje real quedaba oculto tras un texto genérico.
      const msg = (err as { message?: string })?.message;
      setError(msg || 'Error al guardar el activo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
          <WarningCircleIcon className="w-[18px] h-[18px] text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Categoría */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Categoría *
          </label>
          <select
            value={idCategoria}
            onChange={(e) => setIdCategoria(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 py-2.5 px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-agrotec-500 font-medium"
          >
            <option value={1}>Tablets</option>
            <option value={2}>Celulares</option>
            <option value={3}>Notebooks</option>
            <option value={4}>Otros</option>
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Estado *
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'Disponible' | 'Cerrado' | 'Adjudicado')}
            className="w-full rounded-lg border border-gray-300 py-2.5 px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-agrotec-500 font-medium"
          >
            <option value="Disponible">Disponible</option>
            <option value="Cerrado">Cerrado</option>
            <option value="Adjudicado">Adjudicado</option>
          </select>
        </div>

        <Input
          label="Marca *"
          required
          placeholder="Ej: Dell, Samsung, Apple"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
        />

        <Input
          label="Modelo *"
          required
          placeholder="Ej: Latitude 5520, Galaxy A54"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
        />

        <Input
          label="Número de Serie (S/N)"
          placeholder="Ej: NB-001-2024"
          value={serialnumber}
          onChange={(e) => setSerialnumber(e.target.value)}
        />

        <Input
          label="Código FAM (Opcional)"
          placeholder="Ej: FAM-N001"
          value={fam}
          onChange={(e) => setFam(e.target.value)}
        />

        <Input
          label="Precio Base USD *"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Ej: 150.00"
          value={precioBase}
          onChange={(e) => setPrecioBase(e.target.value)}
        />

        {/* Fotografía: se puede subir, reemplazar o quitar en cualquier momento */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Fotografía del Activo
          </label>
          <div className="flex items-center gap-4">
            {fotoPreview ? (
              <img
                src={fotoPreview}
                alt="Vista previa de la fotografía del activo"
                className="w-20 h-20 rounded-lg object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 grid place-items-center text-gray-300 shrink-0">
                <ImageIcon weight="light" className="w-6 h-6" />
              </div>
            )}

            <div className="flex flex-col items-start gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus-within:ring-2 focus-within:ring-agrotec-500 shadow-sm">
                <UploadSimpleIcon className="w-4 h-4 text-gray-500" />
                <span>
                  {uploadingImage ? 'Procesando...' : fotoPreview ? 'Cambiar imagen' : 'Subir imagen'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={handleImageUpload}
                />
              </label>

              {fotoPreview && (
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Quitar imagen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Observación */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
          Observaciones / Estado del Equipo
        </label>
        <textarea
          rows={3}
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Detalles sobre accesorios, batería, golpes o condiciones del activo..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-agrotec-500"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          {activoToEdit ? 'Guardar Cambios' : 'Registrar Activo'}
        </Button>
      </div>
    </form>
  );
}

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useCountdown } from '../../hooks/useCountdown';
import { formatFechaAsuncion } from '../../lib/utils';
import { Calendar, Clock, Save } from 'lucide-react';

export function ConfigSubasta() {
  const countdown = useCountdown();
  const [fechaFinInput, setFechaFinInput] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (countdown.fechaFin) {
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const d = new Date(countdown.fechaFin);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setFechaFinInput(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [countdown.fechaFin]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fechaFinInput) {
      toast.error('Seleccione una fecha y hora de cierre válida.');
      return;
    }

    setSaving(true);
    try {
      const isoDate = new Date(fechaFinInput).toISOString();

      const { error } = await supabase
        .from('sub_app_config')
        .update({ fecha_fin_subasta: isoDate })
        .eq('id', 1);

      if (error) throw error;

      toast.success('Fecha de cierre de subasta actualizada');
      await countdown.refreshConfig();
    } catch (err) {
      console.error('Error guardando configuración:', err);
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-agrotec-700" />
          <span>Vigencia y Cierre de la Subasta</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Establezca el límite temporal tras el cual el sistema bloqueará nuevas posturas.
        </p>
      </div>

      {/* Current status display */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Fecha y Hora de Cierre Actual (Asunción)
          </span>
          <span className="text-base font-bold text-gray-900 mt-0.5 block">
            {countdown.fechaFin
              ? formatFechaAsuncion(countdown.fechaFin)
              : 'No configurada'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Estado:</span>
          {countdown.isExpired ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
              Finalizada
            </span>
          ) : countdown.fechaFin ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              En Curso ({countdown.display})
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              Inactiva
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          label="Nueva Fecha y Hora de Cierre"
          type="datetime-local"
          required
          value={fechaFinInput}
          onChange={(e) => setFechaFinInput(e.target.value)}
          leftIcon={<Clock className="w-4 h-4" />}
          helperText="Hora local de Asunción (GMT-3 / GMT-4 según época del año)"
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { useCountdown } from '../../hooks/useCountdown';
import { formatFechaAsuncion } from '../../lib/utils';
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  FloppyDiskIcon,
  LockIcon,
  LockOpenIcon,
  PlayIcon,
  WarningIcon,
} from '@phosphor-icons/react';

export function ConfigSubasta() {
  const countdown = useCountdown();
  const [fechaFinInput, setFechaFinInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalCerrarOpen, setModalCerrarOpen] = useState(false);
  const [modalAbrirOpen, setModalAbrirOpen] = useState(false);
  const [opcionHoras, setOpcionHoras] = useState<number>(24);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (countdown.fechaFin) {
      // Formato para input datetime-local
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

      toast.success('Fecha de cierre de subasta actualizada.');
      await countdown.refreshConfig();
    } catch (err) {
      console.error('Error guardando configuración:', err);
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  // Cierre inmediato manual
  const handleCerrarInmediato = async () => {
    setProcesandoAccion(true);
    try {
      // Se establece la fecha de fin a ahora mismo para bloquear de inmediato
      const isoDate = new Date().toISOString();

      const { error } = await supabase
        .from('sub_app_config')
        .update({ fecha_fin_subasta: isoDate })
        .eq('id', 1);

      if (error) throw error;

      toast.success('La recepción de ofertas ha sido cerrada con éxito.');
      setModalCerrarOpen(false);
      await countdown.refreshConfig();
    } catch (err) {
      console.error('Error cerrando subasta:', err);
      toast.error('No fue posible cerrar la recepción de ofertas.');
    } finally {
      setProcesandoAccion(false);
    }
  };

  // Apertura / reanudación con plazo
  const handleAbrirConPlazo = async (horas: number) => {
    setProcesandoAccion(true);
    try {
      const fechaNueva = new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('sub_app_config')
        .update({ fecha_fin_subasta: fechaNueva })
        .eq('id', 1);

      if (error) throw error;

      toast.success(`Recepción de ofertas abierta por ${horas >= 24 ? `${horas / 24} día(s)` : `${horas} hora(s)`}.`);
      setModalAbrirOpen(false);
      await countdown.refreshConfig();
    } catch (err) {
      console.error('Error abriendo subasta:', err);
      toast.error('No fue posible abrir la recepción de ofertas.');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const isSubastaActiva = !countdown.isExpired && !!countdown.fechaFin;

  return (
    <div className="space-y-6">
      {/* Control Inmediato: Abrir / Cerrar Recepción de Ofertas */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isSubastaActiva ? 'bg-emerald-500 animate-pulse' : 'bg-[#8A2733]'}`} />
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Estado Operativo: Recepción de Ofertas
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
              Control rápido para administradores. Abra o cierre inmediatamente la recepción de ofertas para todos los colaboradores de la empresa.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSubastaActiva ? (
              <Button
                variant="danger"
                size="md"
                className="bg-[#8A2733] hover:bg-[#6e1e28] text-white border-transparent shadow-sm"
                leftIcon={<LockIcon className="w-[18px] h-[18px]" />}
                onClick={() => setModalCerrarOpen(true)}
              >
                Cerrar Recepción de Ofertas Ahora
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                leftIcon={<LockOpenIcon className="w-[18px] h-[18px]" />}
                onClick={() => setModalAbrirOpen(true)}
              >
                Abrir / Reanudar Recepción
              </Button>
            )}
          </div>
        </div>

        {/* Current status display card */}
        <div className="mt-6 p-4.5 rounded-2xl bg-[#F5F5F5] border border-[#E4E4E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Fecha y Hora de Cierre Actual (Asunción)
            </span>
            <span className="text-base font-extrabold text-gray-900 mt-0.5 block">
              {countdown.fechaFin ? formatFechaAsuncion(countdown.fechaFin) : 'No configurada'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Estado del Sistema:</span>
            {countdown.isExpired ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F9D7E0] text-[#8A2733] border border-rose-200">
                Cerrada / Finalizada
              </span>
            ) : countdown.fechaFin ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E8F0EB] text-[#1C5A34] border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1C5A34] animate-ping" />
                En Curso ({countdown.display})
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-700">
                Inactiva
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Programación Específica por Fecha / Hora */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarBlankIcon className="w-[22px] h-[22px] text-[#1C5A34]" />
            <span>Programar Fecha y Hora Exacta de Cierre</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Defina manualmente el día y la hora límite de vencimiento automático del temporizador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            label="Fecha y Hora Límite de Cierre"
            type="datetime-local"
            required
            value={fechaFinInput}
            onChange={(e) => setFechaFinInput(e.target.value)}
            leftIcon={<ClockIcon className="w-[18px] h-[18px]" />}
            helperText="Hora local de Asunción (GMT-3)"
          />

          <div className="pt-2 flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              leftIcon={<FloppyDiskIcon className="w-[18px] h-[18px]" />}
            >
              Guardar Nueva Fecha
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Confirmación de Cierre Inmediato */}
      {modalCerrarOpen && (
        <Modal
          isOpen={modalCerrarOpen}
          onClose={() => !procesandoAccion && setModalCerrarOpen(false)}
          title={
            <span className="flex items-center gap-2 text-[#8A2733]">
              <WarningIcon className="w-[22px] h-[22px] text-[#8A2733]" />
              <span>Cerrar Recepción de Ofertas Inmediatamente</span>
            </span>
          }
          description="Confirmación administrativa obligatoria para finalización anticipada."
          size="md"
        >
          <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <p className="font-semibold">
                ¿Está seguro de cerrar la recepción de ofertas en este momento?
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-[11px] text-rose-800">
                <li>Ningún colaborador podrá enviar nuevas ofertas o cancelar ofertas existentes.</li>
                <li>Todas las ofertas registradas hasta el momento serán preservadas.</li>
                <li>Podrá reabrir la subasta en cualquier momento si fuera necesario.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="outline"
                disabled={procesandoAccion}
                onClick={() => setModalCerrarOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="bg-[#8A2733] hover:bg-[#6e1e28] text-white"
                isLoading={procesandoAccion}
                leftIcon={<LockIcon className="w-[18px] h-[18px]" />}
                onClick={handleCerrarInmediato}
              >
                Confirmar Cierre Ahora
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Apertura / Reanudación */}
      {modalAbrirOpen && (
        <Modal
          isOpen={modalAbrirOpen}
          onClose={() => !procesandoAccion && setModalAbrirOpen(false)}
          title={
            <span className="flex items-center gap-2 text-[#1C5A34]">
              <LockOpenIcon className="w-[22px] h-[22px] text-[#1C5A34]" />
              <span>Abrir / Reanudar Recepción de Ofertas</span>
            </span>
          }
          description="Seleccione la vigencia que tendrá la recepción de ofertas a partir de este momento."
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircleIcon className="w-[18px] h-[18px] text-[#1C5A34]" />
                Se habilitará inmediatamente el botón de pujas en el catálogo.
              </p>
              <p className="text-[11px] text-emerald-800 mt-1">
                Elija un plazo de vigencia para el temporizador regresivo:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: '24 Horas', horas: 24 },
                { label: '48 Horas', horas: 48 },
                { label: '7 Días', horas: 168 },
              ].map((opt) => (
                <button
                  key={opt.horas}
                  type="button"
                  onClick={() => setOpcionHoras(opt.horas)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    opcionHoras === opt.horas
                      ? 'border-[#1C5A34] bg-[#E8F0EB] text-[#1C5A34] font-bold shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-black">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    +{opt.horas >= 24 ? `${opt.horas / 24}d` : `${opt.horas}h`}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="outline"
                disabled={procesandoAccion}
                onClick={() => setModalAbrirOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                isLoading={procesandoAccion}
                leftIcon={<PlayIcon className="w-[18px] h-[18px]" />}
                onClick={() => handleAbrirConPlazo(opcionHoras)}
              >
                Habilitar Ofertas ({opcionHoras >= 24 ? `${opcionHoras / 24}d` : `${opcionHoras}h`})
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

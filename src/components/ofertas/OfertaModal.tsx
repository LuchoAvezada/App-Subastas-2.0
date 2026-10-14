import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatUSD } from '../../lib/utils';
import { useOfertas } from '../../hooks/useOfertas';
import { useToast } from '../ui/Toast';
import type { Activo } from '../../types/domain';
import type { EstadisticaActivo } from '../../hooks/useResumenOfertas';
import { useAuth } from '../../hooks/useAuth';
import { hasVetoColaborador } from '../../lib/vetos';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Tag,
  Info,
  TrendingUp,
  Users,
  Ban,
} from 'lucide-react';

interface OfertaModalProps {
  activo: Activo;
  resumen?: EstadisticaActivo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function OfertaModal({ activo, resumen, isOpen, onClose, onSuccess }: OfertaModalProps) {
  const [monto, setMonto] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { usuario } = useAuth();
  const isVetado = usuario ? hasVetoColaborador(usuario.id_colaborador, activo.id_activo) : false;
  const { enviarOferta, misOfertas } = useOfertas();
  const ofertaPrevia = misOfertas.find((o) => o.id_activo === activo.id_activo);
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      setError('Por favor ingrese un monto numérico válido.');
      return;
    }

    if (numMonto < activo.precio_base) {
      setError(`El monto no puede ser inferior al precio base (${formatUSD(activo.precio_base)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await enviarOferta(activo.id_activo, numMonto);
      if (res.success) {
        toast.success(`¡Oferta de ${formatUSD(numMonto)} registrada con éxito!`);
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || 'No fue posible registrar la oferta.');
      }
    } catch {
      setError('Error al registrar la oferta. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-agrotec-700" />
          <span>Realizar Oferta</span>
        </span>
      }
      description="Ingrese el monto que desea ofrecer por este activo tecnológico."
      size="md"
    >
      <div className="space-y-4">
        {/* Asset summary card */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              ID ACTIVO #{activo.id_activo} {activo.fam && `• FAM: ${activo.fam}`}
            </div>
            <h4 className="text-base font-extrabold text-gray-900 mt-0.5">
              {activo.marca} {activo.modelo}
            </h4>
            {activo.serialnumber && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">S/N: {activo.serialnumber}</p>
            )}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              PRECIO BASE
            </div>
            <div className="text-lg font-black text-agrotec-800">
              {formatUSD(activo.precio_base)}
            </div>
          </div>
        </div>

        {/* Live auction stats banner (P9: Anonimato) */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F5F5F5] border border-[#E4E4E4] text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1C5A34] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Mayor Oferta Actual</span>
              <span className="font-extrabold text-gray-900">
                {resumen && resumen.totalOfertas > 0 ? formatUSD(resumen.montoLider) : 'Sin ofertas aún'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Ofertas Registradas</span>
              <span className="font-extrabold text-gray-900">
                {resumen?.totalOfertas || 0} {resumen?.totalOfertas === 1 ? 'oferta' : 'ofertas'}
              </span>
            </div>
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Monto a Ofertar (USD)"
            id="monto"
            type="number"
            step="0.01"
            min={activo.precio_base}
            required
            placeholder={`Mínimo ${activo.precio_base}`}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
            helperText={`Debe ser igual o mayor a ${formatUSD(activo.precio_base)}`}
          />

          {isVetado && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900 animate-fade-in">
              <Ban className="w-4 h-4 text-[#8A2733] shrink-0 mt-0.5" />
              <span>
                ⚠️ <strong>IMPORTANTE:</strong> Al anular su oferta por este activo, no podrá volver a
                ofertar por el mismo. Podrá continuar ofertando en cualquier otro item de la subasta.
              </span>
            </div>
          )}

          {ofertaPrevia && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ya enviaste una oferta de <strong>{formatUSD(ofertaPrevia.monto)}</strong> por este activo.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!!ofertaPrevia || isVetado}
              isLoading={submitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirmar Oferta
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

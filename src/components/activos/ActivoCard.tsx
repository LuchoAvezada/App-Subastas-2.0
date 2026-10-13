import { useState } from 'react';
import { OfertaModal } from '../ofertas/OfertaModal';
import { formatUSD } from '../../lib/utils';
import { Button } from '../ui/Button';
import { EstadoBadge } from '../ui/Badge';
import { useCountdown } from '../../hooks/useCountdown';
import { puedeOfertar } from '../../types/domain';
import type { Activo } from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { Gavel, ImageOff, ShieldAlert } from 'lucide-react';

interface ActivoCardProps {
  activo: Activo;
  onOfertaSuccess?: () => void;
}

export function ActivoCard({ activo, onOfertaSuccess }: ActivoCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const countdown = useCountdown();
  const { usuario } = useAuth();

  // Admins y visitantes no participan de la subasta (regla reforzada en registrar_oferta)
  const habilitadoParaOfertar = puedeOfertar(usuario);
  const isAuctionClosed = countdown.isExpired;
  const isAvailable =
    activo.estado === 'Disponible' && !isAuctionClosed && habilitadoParaOfertar;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-agrotec-300 transition-all duration-200 flex flex-col overflow-hidden group">
        {/* Card header badge */}
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-gray-100">
          <span className="text-[11px] font-mono font-bold text-gray-500 tracking-wider">
            ID #{activo.id_activo} {activo.fam && `• ${activo.fam}`}
          </span>
          <EstadoBadge estado={isAuctionClosed && activo.estado === 'Disponible' ? 'Cerrado' : activo.estado} />
        </div>

        {/* Image or Placeholder */}
        <div className="relative h-44 bg-gray-50 overflow-hidden flex items-center justify-center border-b border-gray-100">
          {activo.foto_url && !imgError ? (
            <img
              src={activo.foto_url}
              alt={`${activo.marca || ''} ${activo.modelo || ''}`}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-300 gap-2">
              <ImageOff className="w-10 h-10 stroke-1" />
              <span className="text-[11px] font-medium text-gray-400">Sin fotografía</span>
            </div>
          )}
        </div>

        {/* Details body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 leading-snug">
              <span className="text-agrotec-800">{activo.marca}</span> {activo.modelo}
            </h3>

            {activo.serialnumber && (
              <p className="text-xs text-gray-500 font-mono mt-1">S/N: {activo.serialnumber}</p>
            )}

            {activo.observacion && (
              <p className="mt-2 text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {activo.observacion}
              </p>
            )}
          </div>

          {/* Pricing & CTA */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Precio Base
                </span>
                <span className="text-xl font-black text-agrotec-800 tracking-tight">
                  {formatUSD(activo.precio_base)}
                </span>
              </div>
            </div>

            <Button
              variant={isAvailable ? 'primary' : 'outline'}
              className="w-full"
              size="md"
              disabled={!isAvailable}
              onClick={() => setModalOpen(true)}
              leftIcon={isAvailable ? <Gavel className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-gray-400" />}
            >
              {!habilitadoParaOfertar
                ? 'Solo para participantes'
                : isAuctionClosed
                ? 'Subasta Finalizada'
                : activo.estado === 'Disponible'
                ? 'Realizar Oferta'
                : 'No Disponible'}
            </Button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <OfertaModal
          activo={activo}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={onOfertaSuccess}
        />
      )}
    </>
  );
}

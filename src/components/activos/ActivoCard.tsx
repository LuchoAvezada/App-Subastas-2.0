import { useState } from 'react';
import { OfertaModal } from '../ofertas/OfertaModal';
import { formatUSD } from '../../lib/utils';
import { Button } from '../ui/Button';
import { EstadoBadge } from '../ui/Badge';
import { useCountdown } from '../../hooks/useCountdown';
import { puedeOfertar } from '../../types/domain';
import type { Activo } from '../../types/domain';
import type { EstadisticaActivo } from '../../hooks/useResumenOfertas';
import { useAuth } from '../../hooks/useAuth';
import { hasVetoColaborador } from '../../lib/vetos';
import { Gavel, ImageOff, ShieldAlert, TrendingUp, Ban } from 'lucide-react';

interface ActivoCardProps {
  activo: Activo;
  resumen?: EstadisticaActivo;
  onOfertaSuccess?: () => void;
}

export function ActivoCard({ activo, resumen, onOfertaSuccess }: ActivoCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const countdown = useCountdown();
  const { usuario } = useAuth();

  // Veto permanente por desistimiento voluntario (Principio P9)
  const isVetado = usuario ? hasVetoColaborador(usuario.id_colaborador, activo.id_activo) : false;

  // Admins y visitantes no participan de la subasta (regla reforzada en registrar_oferta)
  const habilitadoParaOfertar = puedeOfertar(usuario);
  const isAuctionClosed = countdown.isExpired;
  const isAvailable =
    activo.estado === 'Disponible' && !isAuctionClosed && habilitadoParaOfertar && !isVetado;

  const totalOfertas = resumen?.totalOfertas || 0;
  const montoLider = resumen && resumen.totalOfertas > 0 ? resumen.montoLider : null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-[#1C5A34]/40 transition-all duration-200 flex flex-col overflow-hidden group">
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
              <span className="text-[#1C5A34]">{activo.marca}</span> {activo.modelo}
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

          {/* Pricing, Current High Bid & CTA */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            {/* Estadísticas de Ofertas (P9: Anónimo, Precio Base, Monto Líder, Cantidad de Ofertas) */}
            <div className="grid grid-cols-2 gap-2 mb-2 bg-[#F5F5F5] p-2.5 rounded-xl border border-[#E4E4E4]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Precio Base
                </span>
                <span className="text-sm font-black text-gray-900 tracking-tight block">
                  {formatUSD(activo.precio_base)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3 text-[#1C5A34]" /> Mayor Oferta
                </span>
                <span className="text-sm font-black text-[#1C5A34] tracking-tight block">
                  {montoLider ? formatUSD(montoLider) : 'Sin ofertas'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-3 px-0.5">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${totalOfertas > 0 ? 'bg-[#1C5A34]' : 'bg-gray-300'}`}></span>
                <span>{totalOfertas} {totalOfertas === 1 ? 'oferta enviada' : 'ofertas enviadas'}</span>
              </span>
            </div>

            {isVetado && (
              <div className="mb-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-[#8A2733] shrink-0" />
                <span>Veto activo por cancelación previa (P9)</span>
              </div>
            )}

            <Button
              variant={isAvailable ? 'primary' : 'outline'}
              className="w-full"
              size="md"
              disabled={!isAvailable}
              onClick={() => setModalOpen(true)}
              leftIcon={
                isVetado ? (
                  <Ban className="w-4 h-4 text-[#8A2733]" />
                ) : isAvailable ? (
                  <Gavel className="w-4 h-4" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-gray-400" />
                )
              }
            >
              {isVetado
                ? 'Oferta cancelada (Veto)'
                : !habilitadoParaOfertar
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
          resumen={resumen}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={onOfertaSuccess}
        />
      )}
    </>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useOfertas } from '../hooks/useOfertas';
import { useCountdown } from '../hooks/useCountdown';
import { useAuth } from '../hooks/useAuth';
import { formatUSD, formatFechaAsuncion } from '../lib/utils';
import { getVetosColaborador, type VetoRegistro } from '../lib/vetos';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  History,
  RefreshCw,
  ArrowRight,
  Ban,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OfertaRecibida } from '../types/domain';

export function MisOfertasPage() {
  const { misOfertas, loading, refetch, cancelarOferta } = useOfertas();
  const countdown = useCountdown();
  const { usuario } = useAuth();
  const toast = useToast();

  const [ofertaACancelar, setOfertaACancelar] = useState<OfertaRecibida | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [vetos, setVetos] = useState<VetoRegistro[]>([]);

  // Cargar lista de vetos para este colaborador
  useEffect(() => {
    if (usuario?.id_colaborador) {
      setVetos(getVetosColaborador(usuario.id_colaborador));
    }
  }, [usuario?.id_colaborador]);

  // Escuchar evento de nuevo veto registrado
  useEffect(() => {
    const onVeto = () => {
      if (usuario?.id_colaborador) {
        setVetos(getVetosColaborador(usuario.id_colaborador));
      }
    };
    window.addEventListener('agrotec_veto_registrado', onVeto);
    return () => window.removeEventListener('agrotec_veto_registrado', onVeto);
  }, [usuario?.id_colaborador]);

  // Lista combinada de ofertas para visualización completa: Activas y Canceladas
  // Garantiza que ningún activo vetado/cancelado aparezca como activo (deduplicación)
  const todasLasOfertas = useMemo(() => {
    const vetosSet = new Set(vetos.map((v) => v.id_activo));

    const activas = misOfertas
      .filter((o) => !vetosSet.has(o.id_activo))
      .map((o) => ({
        tipo: 'activa' as const,
        id_oferta: o.id_oferta,
        id_activo: o.id_activo,
        marca: o.marca,
        modelo: o.modelo,
        categoria: o.categoria,
        serialnumber: o.serialnumber,
        fam: o.fam,
        precio_base: o.precio_base,
        monto: Number(o.monto),
        fecha_hora_display: o.fecha_hora_display,
        original: o,
      }));

    const canceladas = vetos.map((v) => ({
      tipo: 'cancelada' as const,
      id_oferta: -v.id_activo,
      id_activo: v.id_activo,
      marca: v.marca || 'Activo',
      modelo: v.modelo || '',
      categoria: v.categoria || 'Equipos',
      serialnumber: '—',
      fam: null,
      precio_base: null,
      monto: v.monto_cancelado,
      fecha_hora_display: formatFechaAsuncion(v.fecha_cancelacion),
      original: null,
    }));

    return [...activas, ...canceladas];
  }, [misOfertas, vetos]);

  const ofertasActivasCount = useMemo(() => {
    const vetosSet = new Set(vetos.map((v) => v.id_activo));
    return misOfertas.filter((o) => !vetosSet.has(o.id_activo)).length;
  }, [misOfertas, vetos]);

  const handleConfirmarCancelacion = async () => {
    if (!ofertaACancelar) return;
    setCancelando(true);
    try {
      const res = await cancelarOferta(ofertaACancelar.id_oferta, {
        id_activo: ofertaACancelar.id_activo,
        marca: ofertaACancelar.marca,
        modelo: ofertaACancelar.modelo,
        categoria: ofertaACancelar.categoria,
        monto: Number(ofertaACancelar.monto),
      });

      if (res.success) {
        toast.success(
          `Oferta por ${ofertaACancelar.marca} ${ofertaACancelar.modelo} cancelada.`
        );
        if (usuario?.id_colaborador) {
          setVetos(getVetosColaborador(usuario.id_colaborador));
        }
        setOfertaACancelar(null);
      } else {
        toast.error(res.error || 'No fue posible cancelar la oferta.');
      }
    } catch {
      toast.error('Ocurrió un error inesperado al cancelar la oferta.');
    } finally {
      setCancelando(false);
    }
  };

  const isSubastaCerrada = countdown.isExpired;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5" />
            <span>Registro Personal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Mis Ofertas Realizadas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Consulte y haga seguimiento del estado de sus posturas vigentes y canceladas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary KPI cards: Solo Ofertas Activas y Ofertas Canceladas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 block">Ofertas Activas</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">
            {ofertasActivasCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 block">Ofertas Canceladas</span>
          <span className="text-2xl font-black text-[#8A2733] mt-1 block flex items-center gap-2">
            {vetos.length}
            {vetos.length > 0 && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F9D7E0] text-[#8A2733] border border-rose-200">
                Cancelada
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Table listing */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando sus ofertas..." />
        </div>
      ) : todasLasOfertas.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12 text-gray-300 stroke-1" />}
          title="Aún no ha realizado ofertas"
          description="Explore las diferentes categorías del catálogo de activos e ingrese sus ofertas antes del cierre oficial."
          action={
            <Link to="/catalogo/tablets">
              <Button leftIcon={<ArrowRight className="w-4 h-4" />}>
                Explorar Catálogos
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Listado de Postulaciones ({todasLasOfertas.length})
            </h3>
            <span className="text-[11px] text-gray-400">
              {isSubastaCerrada
                ? 'La subasta cerró: las ofertas no pueden cancelarse'
                : 'Puede cancelar una postura antes del cierre'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Activo</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Serial / FAM</th>
                  <th className="py-3.5 px-4 text-right">Precio Base</th>
                  <th className="py-3.5 px-4 text-right">Mi Oferta</th>
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {todasLasOfertas.map((o) => {
                  const isCancelada = o.tipo === 'cancelada';

                  return (
                    <tr
                      key={`${o.tipo}-${o.id_oferta}-${o.id_activo}`}
                      className={`transition-colors ${
                        isCancelada ? 'bg-rose-50/30 text-gray-500' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div
                          className={`font-bold ${
                            isCancelada ? 'text-gray-600 line-through' : 'text-gray-900'
                          }`}
                        >
                          {o.marca} {o.modelo}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">ID #{o.id_activo}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {o.categoria}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                        {o.serialnumber || o.fam || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                        {o.precio_base !== null ? formatUSD(o.precio_base) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base">
                        {isCancelada ? (
                          <span className="text-gray-400 line-through">
                            {formatUSD(o.monto)}
                          </span>
                        ) : (
                          <span className="text-agrotec-800">{formatUSD(o.monto)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {o.fecha_hora_display}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCancelada ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F9D7E0] text-[#8A2733] border border-rose-200">
                            <Ban className="w-3 h-3" />
                            Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F0EB] text-[#1C5A34] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Activa
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCancelada ? (
                          <span className="text-xs text-gray-400 italic font-normal">
                            Anulada
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSubastaCerrada}
                            onClick={() => o.original && setOfertaACancelar(o.original)}
                            className="text-[#8A2733] border-[#8A2733]/30 hover:bg-[#F9D7E0]/50 hover:border-[#8A2733] text-xs font-bold"
                            leftIcon={<Ban className="w-3.5 h-3.5 text-[#8A2733]" />}
                          >
                            {isSubastaCerrada ? 'Finalizada' : 'Cancelar'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Institucional de Confirmación de Cancelación */}
      {ofertaACancelar && (
        <Modal
          isOpen={!!ofertaACancelar}
          onClose={() => !cancelando && setOfertaACancelar(null)}
          title={
            <span className="flex items-center gap-2 text-[#8A2733]">
              <AlertTriangle className="w-5 h-5 text-[#8A2733]" />
              <span>¿Cancelar oferta por {ofertaACancelar.marca} {ofertaACancelar.modelo}?</span>
            </span>
          }
          description="Confirmación obligatoria de anulación de postura según el reglamento de la subasta."
          size="md"
        >
          <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Activo #{ofertaACancelar.id_activo} &bull; {ofertaACancelar.categoria}
                </span>
                <span className="font-black text-sm text-gray-900 mt-0.5 block">
                  {ofertaACancelar.marca} {ofertaACancelar.modelo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Oferta a Anular
                </span>
                <span className="font-black text-base text-[#8A2733] block">
                  {formatUSD(ofertaACancelar.monto)}
                </span>
              </div>
            </div>

            {/* Advertencia con el texto exacto solicitado por el usuario */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2.5">
              <p className="text-xs leading-relaxed text-rose-800">
                Al confirmar la anulación, tu oferta de{' '}
                <strong>{formatUSD(ofertaACancelar.monto)}</strong> será retirada inmediatamente de
                la subasta y pasará al estado <strong>-Cancelada-</strong>.
              </p>

              <div className="p-3 rounded-lg bg-rose-100/90 border border-rose-300 font-semibold text-rose-950 text-xs leading-relaxed">
                ⚠️ <strong>IMPORTANTE:</strong> Al anular su oferta por este activo, no podrá volver a
                ofertar por el mismo. Podrá continuar ofertando en cualquier otro item de la subasta.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                disabled={cancelando}
                onClick={() => setOfertaACancelar(null)}
              >
                Conservar Oferta
              </Button>
              <Button
                variant="danger"
                className="bg-[#8A2733] hover:bg-[#6e1e28] text-white"
                isLoading={cancelando}
                leftIcon={<Ban className="w-4 h-4" />}
                onClick={handleConfirmarCancelacion}
              >
                Confirmar y Cancelar Oferta
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

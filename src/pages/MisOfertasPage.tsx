import { useState, useEffect } from 'react';
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
  Download,
  RefreshCw,
  ArrowRight,
  Ban,
  AlertTriangle,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
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

  const handleExportCSV = () => {
    if (misOfertas.length === 0) return;

    const dataToExport = misOfertas.map((o) => ({
      'ID Oferta': o.id_oferta,
      'ID Activo': o.id_activo,
      'Categoría': o.categoria,
      'Marca': o.marca || '',
      'Modelo': o.modelo || '',
      'Serial Number': o.serialnumber || '',
      'Precio Base USD': o.precio_base,
      'Monto Ofertado USD': o.monto,
      'Fecha y Hora': o.fecha_hora_display,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mis_ofertas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          `Oferta por ${ofertaACancelar.marca} ${ofertaACancelar.modelo} cancelada. Veto registrado.`
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

  const totalOfertado = misOfertas.reduce((acc, curr) => acc + Number(curr.monto), 0);
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
            Consulte, supervise y gestione sus posturas en la subasta interna
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

          <Button
            variant="secondary"
            size="sm"
            disabled={misOfertas.length === 0}
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 block">Total de Ofertas Activas</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">{misOfertas.length}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 block">Monto Acumulado Ofertado</span>
          <span className="text-2xl font-black text-agrotec-800 mt-1 block">
            {formatUSD(totalOfertado)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-gray-500 block">Estado de la Subasta</span>
          {isSubastaCerrada ? (
            <span className="text-xs font-bold text-[#8A2733] bg-[#F9D7E0] border border-rose-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5" />
              Subasta Finalizada
            </span>
          ) : (
            <span className="text-xs font-bold text-[#1C5A34] bg-[#E8F0EB] border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1C5A34] animate-pulse" />
              En Curso ({countdown.display})
            </span>
          )}
        </div>
      </div>

      {/* Table listing */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando sus ofertas..." />
        </div>
      ) : misOfertas.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12 text-gray-300 stroke-1" />}
          title="Aún no ha realizado ofertas activas"
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
              Postulaciones Vigentes ({misOfertas.length})
            </h3>
            <span className="text-[11px] text-gray-400">
              {isSubastaCerrada
                ? 'La subasta cerró: las ofertas no pueden cancelarse'
                : 'Puede cancelar una postura antes del cierre (con veto P9)'}
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
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {misOfertas.map((o) => (
                  <tr key={o.id_oferta} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">
                        {o.marca} {o.modelo}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">ID #{o.id_activo}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {o.categoria}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      {o.serialnumber || o.fam || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      {formatUSD(o.precio_base)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-agrotec-800 text-base">
                      {formatUSD(o.monto)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {o.fecha_hora_display}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubastaCerrada}
                        onClick={() => setOfertaACancelar(o)}
                        className="text-[#8A2733] border-[#8A2733]/30 hover:bg-[#F9D7E0]/50 hover:border-[#8A2733] text-xs font-bold"
                        leftIcon={<Ban className="w-3.5 h-3.5 text-[#8A2733]" />}
                      >
                        {isSubastaCerrada ? 'Finalizada' : 'Cancelar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de Vetos / Ofertas Canceladas (Principio P9) */}
      {vetos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-[#F9D7E0]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#8A2733]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A2733]">
                Historial de Ofertas Canceladas &mdash; Vetos de Reincidencia (Principio P9)
              </h3>
            </div>
            <span className="text-[11px] text-gray-500">
              Total vetados: {vetos.length}
            </span>
          </div>

          <div className="p-4 divide-y divide-gray-100">
            {vetos.map((v) => (
              <div
                key={`${v.id_activo}-${v.fecha_cancelacion}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-extrabold text-gray-900">
                    {v.marca || 'Activo'} {v.modelo || ''} (ID #{v.id_activo})
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Categoría: {v.categoria || 'Equipos'} &bull; Monto que ofertaste:{' '}
                    <strong>{formatUSD(v.monto_cancelado)}</strong> &bull; Cancelada:{' '}
                    {formatFechaAsuncion(v.fecha_cancelacion)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F9D7E0] text-[#8A2733] border border-rose-200 inline-flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Veto de Reincidencia Activo
                  </span>
                </div>
              </div>
            ))}
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
          description="Confirmación obligatoria de desistimiento voluntario según la Constitución de la Subasta."
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
                  Oferta a Retirar
                </span>
                <span className="font-black text-base text-[#8A2733] block">
                  {formatUSD(ofertaACancelar.monto)}
                </span>
              </div>
            </div>

            {/* Advertencia obligatoria de VETO P9 */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sm text-rose-950">
                <ShieldAlert className="w-4 h-4 text-[#8A2733]" />
                Principio P9: Regla de Veto de Reincidencia
              </div>
              <p className="text-xs leading-relaxed text-rose-800">
                Al confirmar la cancelación, tu oferta de{' '}
                <strong>{formatUSD(ofertaACancelar.monto)}</strong> será retirada inmediatamente de
                la subasta.
              </p>
              <div className="p-2.5 rounded-lg bg-rose-100/70 border border-rose-300 font-semibold text-rose-950 text-[11px]">
                ⚠️ <strong>IMPORTANTE:</strong> Por política corporativa de equidad,{' '}
                <u>quedarás vetado permanentemente de volver a ofertar por este activo</u>. Podrás
                continuar ofertando en cualquier otro bien de la subasta.
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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatUSD } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { useRpcSesion } from '../hooks/useRpcSesion';
import { useCountdown } from '../hooks/useCountdown';
import { puedeVerResultados } from '../lib/desistimiento';
import { explicarOfertas, type Desistimiento } from '../lib/explicacionOfertas';
import type { ActivoReporte } from '../lib/reportesPostSubasta';
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  FilePdfIcon,
  FileXlsIcon,
  MedalIcon,
  TrophyIcon,
  UserMinusIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { OfertaRecibida, ResultadoDetalle } from '../types/domain';
import type { ColaboradorInput } from '../lib/adjudicacion';

export function ResultadosPage() {
  const { usuario, logout } = useAuth();
  const countdown = useCountdown();
  const toast = useToast();
  const rpc = useRpcSesion();

  const [resultados, setResultados] = useState<ResultadoDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [generando, setGenerando] = useState<'pdf' | 'excel' | null>(null);

  // Modales
  const [desistimientoModalOpen, setDesistimientoModalOpen] = useState(false);
  const [activoDesistimiento, setActivoDesistimiento] = useState<ResultadoDetalle | null>(null);
  const [motivoDesistimiento, setMotivoDesistimiento] = useState('Desistimiento voluntario del colaborador');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [procesandoDesistimiento, setProcesandoDesistimiento] = useState(false);

  const fetchResultados = useCallback(async () => {
    setLoading(true);
    try {
      // El servidor los entrega al admin siempre y al resto solo si están publicados (F10)
      const res = await rpc<{ filas: ResultadoDetalle[] }>('leer_datos', { p_consulta: 'resultados' });

      if (res.success) {
        setResultados(res.filas ?? []);
      }
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    } finally {
      setLoading(false);
    }
  }, [rpc]);

  useEffect(() => {
    fetchResultados();
  }, [fetchResultados]);

  const canView = puedeVerResultados(usuario, countdown.resultadosPublicados);

  const categorias = useMemo(
    () => [...new Set(resultados.map((r) => r.categoria))].sort((a, b) => a.localeCompare(b)),
    [resultados]
  );
  const visibles = filtroCategoria ? resultados.filter((r) => r.categoria === filtroCategoria) : resultados;

  // Reportes post-subasta F13 (solo admin): respetan el filtro de categoría
  const handleGenerarReporte = async (tipo: 'pdf' | 'excel') => {
    setGenerando(tipo);
    try {
      const [ofertas, nomina, desistimientos, { data: activos, error }, reportes] = await Promise.all([
        rpc<{ filas: OfertaRecibida[] }>('leer_datos', { p_consulta: 'ofertas' }),
        rpc<{ filas: ColaboradorInput[] }>('leer_datos', { p_consulta: 'nomina' }),
        rpc<{ filas: Desistimiento[] }>('leer_datos', { p_consulta: 'desistimientos' }),
        supabase.from('sub_activos').select('id_activo, observacion, estado'),
        import('../lib/reportesPostSubasta'),
      ]);
      for (const res of [ofertas, nomina, desistimientos]) {
        if (!res.success) throw new Error(res.error);
      }
      if (error) throw error;

      const explicadas = explicarOfertas(
        ofertas.filas ?? [],
        resultados,
        nomina.filas ?? [],
        desistimientos.filas ?? []
      ).filter((e) => !filtroCategoria || e.oferta.categoria === filtroCategoria);
      const mapaActivos = new Map((activos as ActivoReporte[]).map((a) => [a.id_activo, a]));

      if (tipo === 'pdf') {
        await reportes.descargarPdfComite(visibles, explicadas, mapaActivos, filtroCategoria);
      } else {
        await reportes.descargarExcelOfertas(visibles, explicadas, mapaActivos, filtroCategoria);
      }
      toast.success(tipo === 'pdf' ? 'PDF para el comité generado.' : 'Excel de ofertas generado.');
    } catch (err) {
      console.error('Error generando el reporte:', err);
      toast.error('No fue posible generar el reporte.');
    } finally {
      setGenerando(null);
    }
  };

  // Ejecutar Reasignación por Desistimiento
  const handleConfirmarDesistimiento = async () => {
    if (!activoDesistimiento) return;
    setProcesandoDesistimiento(true);

    const motivoFinal = motivoDesistimiento === 'Otro'
      ? (motivoOtro.trim() || 'Desistimiento de compra documentado')
      : motivoDesistimiento;

    try {
      // La función identifica al admin por el token (null si la sesión es anterior al token)
      const { data, error } = await supabase.rpc('reasignar_por_desistimiento', {
        p_token: usuario?.token ?? null,
        p_id_activo: activoDesistimiento.id_activo,
        p_motivo: motivoFinal,
      });

      if (error) throw error;

      const res = data as unknown as { success: boolean; message?: string; error?: string; codigo?: string };
      if (res.success) {
        toast.success(res.message || 'Adjudicación reasignada exitosamente.');
        setDesistimientoModalOpen(false);
        setActivoDesistimiento(null);
        await fetchResultados();
      } else {
        toast.error(res.error || 'No se pudo reasignar el activo.');
        if (res.codigo === 'SESION_INVALIDA') logout();
      }
    } catch (err) {
      console.error('Error al registrar desistimiento:', err);
      toast.error('Error al ejecutar la reasignación en el servidor.');
    } finally {
      setProcesandoDesistimiento(false);
    }
  };

  const totalRecaudado = visibles.reduce((acc, curr) => acc + Number(curr.monto_final), 0);

  // REDIRECCIÓN SILENCIOSA SI NO ESTÁ PUBLICADO Y NO ES ADMIN
  if (!canView) {
    return <Navigate to="/" replace />;
  }

  // VISTA DISPONIBLE (PUBLICADO O VISTA PREVIA ADMINISTRATIVA)
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner de Estado para Administradores */}
      {usuario?.es_admin && (
        <div className={`p-4.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          countdown.resultadosPublicados
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/90 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-3">
            {countdown.resultadosPublicados ? (
              <EyeIcon className="w-[22px] h-[22px] text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <EyeSlashIcon className="w-[22px] h-[22px] text-amber-700 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {countdown.resultadosPublicados
                  ? 'Resultados Publicados Oficialmente'
                  : 'Vista Previa Administrativa — Oculto para Colaboradores'}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {countdown.resultadosPublicados
                  ? 'La pestaña Resultados Finales está visible para todos los colaboradores.'
                  : 'Los colaboradores no tienen acceso ni ven la pestaña Resultados Finales hasta que active la publicación.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              disabled={resultados.length === 0 || generando !== null}
              isLoading={generando === 'pdf'}
              leftIcon={<FilePdfIcon className="w-4 h-4" />}
              onClick={() => handleGenerarReporte('pdf')}
            >
              PDF para el comité
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              disabled={resultados.length === 0 || generando !== null}
              isLoading={generando === 'excel'}
              leftIcon={<FileXlsIcon className="w-4 h-4" />}
              onClick={() => handleGenerarReporte('excel')}
            >
              Excel de ofertas
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
            <TrophyIcon className="w-4 h-4" />
            <span>Resultados Oficiales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Activos Adjudicados
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Nómina de adjudicaciones tras la ejecución de las reglas de equidad institucional
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResultados}
            leftIcon={<ArrowsClockwiseIcon className="w-4 h-4" />}
          >
            Actualizar
          </Button>

        </div>
      </div>

      {/* Filtro por categoría */}
      {categorias.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filtrar por categoría">
          <span className="text-xs font-semibold text-gray-500 mr-1">Categoría:</span>
          {['', ...categorias].map((cat) => {
            const activa = filtroCategoria === cat;
            return (
              <button
                key={cat || 'todas'}
                type="button"
                aria-pressed={activa}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activa
                    ? 'bg-agrotec-700 border-agrotec-700 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-agrotec-300 hover:text-agrotec-800'
                }`}
              >
                {cat || 'Todas'}
              </button>
            );
          })}
        </div>
      )}

      {/* KPI Cards: solo administración (F13) */}
      {usuario?.es_admin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 block">Total Activos Adjudicados</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{visibles.length}</span>
            </div>
            <div className="p-3 bg-agrotec-50 rounded-2xl text-agrotec-800">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 block">Monto Total Adjudicado</span>
              <span className="text-2xl font-black text-agrotec-800 mt-1 block">
                {formatUSD(totalRecaudado)}
              </span>
            </div>
            <div className="p-3 bg-agrotec-50 rounded-2xl text-agrotec-800">
              <MedalIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Table listing */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando resultados de la subasta..." />
        </div>
      ) : resultados.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon weight="light" className="w-12 h-12 text-gray-300" />}
          title="Aún no se han generado resultados"
          description="Los resultados estarán disponibles una vez que la subasta finalice y la administración procese la adjudicación inicial."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Activo Adjudicado</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Colaborador Ganador</th>
                  <th className="py-3.5 px-4 text-right">Monto Final</th>
                  <th className="py-3.5 px-4">Estado / Criterio</th>
                  <th className="py-3.5 px-4">Fecha Adjudicación</th>
                  {usuario?.es_admin && <th className="py-3.5 px-4 text-right">Gestión</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {visibles.map((r) => {
                  const estado = r.estado_adjudicacion || 'Adjudicado';
                  const isDesierto = estado === 'Desierto';

                  return (
                    <tr key={r.id_resultado} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">
                          {r.marca} {r.modelo}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          ID #{r.id_activo} {r.serialnumber && `• S/N: ${r.serialnumber}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {r.categoria}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isDesierto ? (
                          <div className="font-bold text-rose-700 italic">Sin Adjudicar (Desierto)</div>
                        ) : (
                          <>
                            <div className="font-bold text-gray-900">{r.colaborador_ganador}</div>
                            <div className="text-xs text-gray-500 font-mono">CI: {r.ci_documento}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-agrotec-800 text-base">
                        {isDesierto ? '-' : formatUSD(r.monto_final)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            estado === 'Adjudicado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : estado === 'Reasignado'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : estado === 'Desierto'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {estado}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {r.criterio_desempate}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                        {r.fecha_cierre_display}
                      </td>

                      {/* Acción de Gestión de Desistimiento exclusiva para Admins */}
                      {usuario?.es_admin && (
                        <td className="py-3.5 px-4 text-right">
                          {!isDesierto && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-800 hover:bg-amber-50 hover:border-amber-300 text-xs py-1 px-2.5"
                              leftIcon={<UserMinusIcon className="w-4 h-4 text-amber-700" />}
                              onClick={() => {
                                setActivoDesistimiento(r);
                                setMotivoDesistimiento('Desistimiento voluntario del colaborador');
                                setMotivoOtro('');
                                setDesistimientoModalOpen(true);
                              }}
                            >
                              Desistimiento
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* Modal Registrar Desistimiento de Ganador */}
      {desistimientoModalOpen && activoDesistimiento && (
        <Modal
          isOpen={desistimientoModalOpen}
          onClose={() => !procesandoDesistimiento && setDesistimientoModalOpen(false)}
          title={
            <span className="flex items-center gap-2 text-rose-800">
              <WarningIcon className="w-[22px] h-[22px] text-rose-700" />
              <span>Registrar Desistimiento de Ganador</span>
            </span>
          }
          description="Reasignación automática al siguiente postor elegible de la subasta."
          size="md"
        >
          <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1">
              <p className="font-bold text-sm">
                {activoDesistimiento.marca} {activoDesistimiento.modelo}
              </p>
              <p className="text-xs text-rose-800">
                Ganador actual que declina: <strong>{activoDesistimiento.colaborador_ganador}</strong> ({formatUSD(activoDesistimiento.monto_final)})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block text-xs">
                Motivo del Desistimiento:
              </label>
              <select
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1C5A34]"
                value={motivoDesistimiento}
                onChange={(e) => setMotivoDesistimiento(e.target.value)}
              >
                <option value="Desistimiento voluntario del colaborador">Desistimiento voluntario del colaborador</option>
                <option value="Falta de pago o plazo de descuento de nómina vencido">Falta de pago o plazo de descuento de nómina vencido</option>
                <option value="Decisión administrativa o descalificación">Decisión administrativa o descalificación</option>
                <option value="Otro">Otro motivo debidamente documentado</option>
              </select>

              {motivoDesistimiento === 'Otro' && (
                <input
                  type="text"
                  placeholder="Especifique el motivo..."
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  className="w-full mt-2 p-2 rounded-xl border border-gray-200 text-xs"
                />
              )}
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">¿Qué ocurrirá a continuación?</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                <li>El sistema buscará automáticamente al <strong>siguiente postor elegible</strong> en el ranking.</li>
                <li>Se aplicará la regla de equidad: si el siguiente postor ya ganó otro activo en esta categoría, saltará al subsiguiente.</li>
                <li>Si no existen más postores elegibles, el activo pasará al estado <strong>Desierto</strong>.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                disabled={procesandoDesistimiento}
                onClick={() => setDesistimientoModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="bg-rose-700 hover:bg-rose-800 text-white"
                isLoading={procesandoDesistimiento}
                leftIcon={<UserMinusIcon className="w-[18px] h-[18px]" />}
                onClick={handleConfirmarDesistimiento}
              >
                Confirmar Reasignación
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

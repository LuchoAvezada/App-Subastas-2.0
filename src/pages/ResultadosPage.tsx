import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatUSD } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { useCountdown } from '../hooks/useCountdown';
import { puedeVerResultados, generarReporteGanadores } from '../lib/desistimiento';
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  MedalIcon,
  TrophyIcon,
  UserMinusIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { ResultadoDetalle } from '../types/domain';
import Papa from 'papaparse';

export function ResultadosPage() {
  const { usuario, logout } = useAuth();
  const countdown = useCountdown();
  const toast = useToast();

  const [resultados, setResultados] = useState<ResultadoDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [desistimientoModalOpen, setDesistimientoModalOpen] = useState(false);
  const [activoDesistimiento, setActivoDesistimiento] = useState<ResultadoDetalle | null>(null);
  const [motivoDesistimiento, setMotivoDesistimiento] = useState('Desistimiento voluntario del colaborador');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [procesandoDesistimiento, setProcesandoDesistimiento] = useState(false);

  const fetchResultados = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sub_v_resultados_detalle')
        .select('*')
        .order('id_resultado', { ascending: true });

      if (!error) {
        setResultados((data as ResultadoDetalle[]) || []);
      }
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResultados();
  }, [fetchResultados]);

  const canView = puedeVerResultados(usuario, countdown.resultadosPublicados);

  // Exportar CSV estándar de resultados
  const handleExportCSV = () => {
    if (resultados.length === 0) return;

    const dataToExport = resultados.map((r) => ({
      'ID Resultado': r.id_resultado,
      'ID Activo': r.id_activo,
      'Categoría': r.categoria,
      'Marca / Modelo': `${r.marca || ''} ${r.modelo || ''}`.trim(),
      'Serial Number': r.serialnumber || '',
      'FAM': r.fam || '',
      'Colaborador Ganador': r.colaborador_ganador,
      'CI Ganador': r.ci_documento,
      'Monto Adjudicado USD': r.monto_final,
      'Criterio Aplicado': r.criterio_desempate,
      'Estado Adjudicación': r.estado_adjudicacion || 'Adjudicado',
      'Fecha Adjudicación': r.fecha_cierre_display,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resultados_subasta_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar reporte formal de ganadores
  const handleDescargarReporteGanadores = async () => {
    try {
      // Obtener datos maestros para cruzar niveles jerárquicos
      const [{ data: colabs }, { data: cargos }] = await Promise.all([
        supabase.from('sub_colaboradores').select('id_colaborador, id_cargo, fecha_ingreso'),
        supabase.from('sub_cargos').select('id_cargo, nivel_jerarquia'),
      ]);

      const reporte = generarReporteGanadores(
        resultados,
        (colabs as any) || [],
        (cargos as any) || []
      );

      const csv = Papa.unparse(reporte.items);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_ganadores_adjudicados_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Reporte de ganadores generado exitosamente.');
    } catch (err) {
      console.error('Error generando reporte de ganadores:', err);
      toast.error('No fue posible generar el reporte.');
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

  const totalRecaudado = resultados.reduce((acc, curr) => acc + Number(curr.monto_final), 0);

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

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              leftIcon={<DownloadSimpleIcon className="w-4 h-4" />}
              onClick={handleDescargarReporteGanadores}
            >
              Generar Reporte de Ganadores (CSV)
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

          <Button
            variant="secondary"
            size="sm"
            disabled={resultados.length === 0}
            onClick={handleExportCSV}
            leftIcon={<DownloadSimpleIcon className="w-4 h-4" />}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 block">Total Activos Adjudicados</span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">{resultados.length}</span>
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
                {resultados.map((r) => {
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

import { useState, useEffect, useCallback } from 'react';
import { formatUSD } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { useRpcSesion } from '../../hooks/useRpcSesion';
import { Modal } from '../ui/Modal';
import {
  ArrowsClockwiseIcon,
  CaretRightIcon,
  DownloadSimpleIcon,
  GavelIcon,
  StackIcon,
  TrophyIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { OfertaRecibida } from '../../types/domain';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';

export function PanelEvaluacion() {
  const [ofertas, setOfertas] = useState<OfertaRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivoId, setSelectedActivoId] = useState<number | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const rpc = useRpcSesion();

  const fetchOfertas = useCallback(async () => {
    setLoading(true);
    try {
      // Ordenadas por activo, monto, jerarquía y fecha en el servidor (F10: solo admin)
      const res = await rpc<{ filas: OfertaRecibida[] }>('leer_datos', { p_consulta: 'ofertas' });

      if (res.success) {
        const fetched = res.filas ?? [];
        setOfertas(fetched);
        if (fetched.length > 0 && selectedActivoId === null) {
          setSelectedActivoId(fetched[0].id_activo);
        }
      }
    } catch (err) {
      console.error('Error al cargar ofertas:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedActivoId, rpc]);

  useEffect(() => {
    fetchOfertas();
  }, [fetchOfertas]);

  // Group offers by activo
  const activosConOfertas = Array.from(
    new Set(ofertas.map((o) => o.id_activo))
  ).map((idActivo) => {
    const list = ofertas.filter((o) => o.id_activo === idActivo);
    const primerOferta = list[0];
    return {
      idActivo,
      marca: primerOferta.marca,
      modelo: primerOferta.modelo,
      categoria: primerOferta.categoria,
      precioBase: primerOferta.precio_base,
      totalOfertas: list.length,
      mayorOferta: Math.max(...list.map((o) => Number(o.monto))),
      candidatoGanador: list[0], // Top ranked by order
    };
  });

  const ofertasDelActivoSeleccionado = ofertas.filter(
    (o) => o.id_activo === selectedActivoId
  );

  const handleExportAllCSV = () => {
    if (ofertas.length === 0) return;

    const dataToExport = ofertas.map((o) => ({
      'ID Oferta': o.id_oferta,
      'ID Activo': o.id_activo,
      'Categoría': o.categoria,
      'Marca': o.marca || '',
      'Modelo': o.modelo || '',
      'Serial Number': o.serialnumber || '',
      'FAM': o.fam || '',
      'Precio Base USD': o.precio_base,
      'Colaborador': o.nombre_colaborador,
      'CI Colaborador': o.ci_documento,
      'Cargo': o.cargo,
      'Nivel Jerárquico': o.nivel_jerarquia,
      'Monto Ofertado USD': o.monto,
      'Fecha y Hora': o.fecha_hora_display,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_todas_ofertas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEjecutarAdjudicacion = async () => {
    setProcessing(true);
    try {
      // Adjudicar borra y recalcula los resultados: el servidor exige token de administrador
      const res = await rpc<{ total_adjudicados: number }>('procesar_ganadores');
      if (res.success) {
        toast.success(`¡Proceso completado! Se adjudicaron ${res.total_adjudicados || 0} activos.`);
        setIsProcessModalOpen(false);
        navigate('/resultados');
      } else {
        toast.error(res.error || res.message || 'Error al procesar ganadores');
      }
    } catch (err) {
      console.error('Error en procesar_ganadores:', err);
      toast.error(err instanceof Error ? err.message : 'Error al ejecutar adjudicación.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Resumen General
          </span>
          <span className="text-base font-bold text-gray-900">
            {ofertas.length} ofertas registradas en {activosConOfertas.length} activos
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOfertas}
            leftIcon={<ArrowsClockwiseIcon className="w-4 h-4" />}
          >
            Actualizar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={ofertas.length === 0}
            onClick={handleExportAllCSV}
            leftIcon={<DownloadSimpleIcon className="w-4 h-4" />}
          >
            Exportar CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsProcessModalOpen(true)}
            leftIcon={<GavelIcon className="w-[18px] h-[18px] text-amber-300" />}
            className="bg-agrotec-900 hover:bg-agrotec-950"
          >
            Procesar Ganadores
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando ofertas del sistema..." />
        </div>
      ) : ofertas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
          <StackIcon weight="light" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No hay ofertas registradas</h3>
          <p className="text-xs text-gray-500 mt-1">Aún no se han recibido posturas por ningún activo de la subasta.</p>
        </div>
      ) : (
        /* Master-Detail Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Master: Lista de Activos */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Activos Ofertados ({activosConOfertas.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {activosConOfertas.map((item) => {
                const isSelected = item.idActivo === selectedActivoId;
                return (
                  <button
                    key={item.idActivo}
                    onClick={() => setSelectedActivoId(item.idActivo)}
                    className={`w-full text-left p-4 transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-agrotec-50/80 border-l-4 border-agrotec-800'
                        : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-mono text-gray-400">
                        ID #{item.idActivo} • {item.categoria}
                      </div>
                      <div className="font-extrabold text-sm text-gray-900 mt-0.5">
                        {item.marca} {item.modelo}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Base: {formatUSD(item.precioBase)} &bull; Top:{' '}
                        <strong className="text-agrotec-800 font-mono">
                          {formatUSD(item.mayorOferta)}
                        </strong>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-agrotec-100 text-agrotec-800">
                        {item.totalOfertas} {item.totalOfertas === 1 ? 'oferta' : 'ofertas'}
                      </span>
                      <CaretRightIcon className="w-[18px] h-[18px] text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail: Ranking de Ofertas para el Activo Seleccionado */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            {selectedActivoId && ofertasDelActivoSeleccionado.length > 0 ? (
              <div>
                {/* Header del Activo */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-agrotec-700">
                        Activo en Evaluación
                      </span>
                      <h3 className="text-lg font-black text-gray-900">
                        {ofertasDelActivoSeleccionado[0].marca}{' '}
                        {ofertasDelActivoSeleccionado[0].modelo}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        ID #{selectedActivoId} {ofertasDelActivoSeleccionado[0].serialnumber && `• S/N: ${ofertasDelActivoSeleccionado[0].serialnumber}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">
                        PRECIO BASE
                      </span>
                      <span className="text-base font-black text-gray-800 font-mono">
                        {formatUSD(ofertasDelActivoSeleccionado[0].precio_base)}
                      </span>
                    </div>
                  </div>

                  {/* Proyección del Ganador */}
                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <TrophyIcon className="w-[18px] h-[18px]" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                          Candidato Ganador Actual (Ranking #1)
                        </span>
                        <span className="text-xs font-bold text-emerald-950">
                          {ofertasDelActivoSeleccionado[0].nombre_colaborador} (
                          {ofertasDelActivoSeleccionado[0].cargo})
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-base font-black text-emerald-900">
                      {formatUSD(ofertasDelActivoSeleccionado[0].monto)}
                    </span>
                  </div>
                </div>

                {/* Tabla de Ofertas para este activo */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 uppercase font-semibold text-gray-500 tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Posición</th>
                        <th className="py-3 px-4">Colaborador</th>
                        <th className="py-3 px-4">Jerarquía</th>
                        <th className="py-3 px-4 text-right">Oferta</th>
                        <th className="py-3 px-4">Fecha y Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {ofertasDelActivoSeleccionado.map((o, idx) => (
                        <tr
                          key={o.id_oferta}
                          className={idx === 0 ? 'bg-emerald-50/30' : 'hover:bg-gray-50/50'}
                        >
                          <td className="py-3 px-4 font-mono font-bold">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-black">
                                <TrophyIcon className="w-4 h-4" /> #1
                              </span>
                            ) : (
                              `#${idx + 1}`
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{o.nombre_colaborador}</div>
                            <div className="text-[10px] text-gray-400 font-mono">CI: {o.ci_documento}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{o.cargo}</div>
                            <div className="text-[10px] text-gray-400">Nivel {o.nivel_jerarquia}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-agrotec-800 text-sm">
                            {formatUSD(o.monto)}
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-mono">
                            {o.fecha_hora_display}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 text-sm">
                Seleccione un activo para ver el desglose de ofertas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Procesar Ganadores */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title="¿Ejecutar Algoritmo de Adjudicación?"
        description="Adjudica los activos que siguen disponibles. Solo se puede ejecutar después de la fecha de cierre."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <WarningIcon className="w-[22px] h-[22px] text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1.5">
              <div>
                <strong>Atención:</strong> Se evalúan las ofertas de los activos que siguen <strong>Disponibles</strong>. Los resultados de rondas anteriores se conservan. Se aplica:
              </div>
              <ul className="list-disc list-inside pl-1 text-[11px] text-amber-800 space-y-0.5">
                <li><strong>Tope de equidad (Q-03):</strong> Máximo 1 activo adjudicado por categoría por colaborador en toda la subasta, contando las rondas anteriores.</li>
                <li><strong>Efecto cascada:</strong> Si un postor lidera múltiples activos en una categoría, se le adjudica el de mayor monto y los demás se reasignan al siguiente postor elegible.</li>
                <li><strong>Desempates determinísticos:</strong> 1º Monto, 2º Nivel de Jerarquía, 3º Antigüedad de ingreso.</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Los activos asignados pasarán al estado <strong>Adjudicado</strong>. Si hay ganadores nuevos, la publicación de resultados se pausa hasta que la vuelva a activar en Configuración.
            Los activos sin ofertas quedan <strong>Disponibles</strong>: para una segunda ronda, defina una nueva fecha de cierre.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setIsProcessModalOpen(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleEjecutarAdjudicacion}
              isLoading={processing}
              leftIcon={<GavelIcon className="w-[18px] h-[18px]" />}
            >
              Confirmar y Adjudicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

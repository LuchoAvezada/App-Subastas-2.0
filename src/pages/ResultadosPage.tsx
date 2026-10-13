import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatUSD } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Trophy, Download, RefreshCw, Award, CheckCircle2 } from 'lucide-react';
import type { ResultadoDetalle } from '../types/domain';
import Papa from 'papaparse';

export function ResultadosPage() {
  const [resultados, setResultados] = useState<ResultadoDetalle[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalRecaudado = resultados.reduce((acc, curr) => acc + Number(curr.monto_final), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Resultados Oficiales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Activos Adjudicados
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Lista oficial de ganadores tras la ejecución del algoritmo de adjudicación
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResultados}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={resultados.length === 0}
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
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
            <CheckCircle2 className="w-6 h-6" />
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
            <Award className="w-6 h-6" />
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
          icon={<Trophy className="w-12 h-12 text-gray-300 stroke-1" />}
          title="Aún no se han publicado resultados"
          description="Los resultados oficiales estarán disponibles una vez que finalice la subasta y la administración procese la adjudicación."
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
                  <th className="py-3.5 px-4">Criterio de Desempate</th>
                  <th className="py-3.5 px-4">Fecha Cierre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {resultados.map((r) => (
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
                      <div className="font-bold text-gray-900">{r.colaborador_ganador}</div>
                      <div className="text-xs text-gray-500 font-mono">CI: {r.ci_documento}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-agrotec-800 text-base">
                      {formatUSD(r.monto_final)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {r.criterio_desempate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                      {r.fecha_cierre_display}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

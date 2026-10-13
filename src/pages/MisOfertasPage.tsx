import { useOfertas } from '../hooks/useOfertas';
import { formatUSD } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { History, Download, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';

export function MisOfertasPage() {
  const { misOfertas, loading, refetch } = useOfertas();

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

  const totalOfertado = misOfertas.reduce((acc, curr) => acc + Number(curr.monto), 0);

  return (
    <div className="space-y-6">
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
            Consulte y haga seguimiento de sus posturas para los activos subastados
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
          <span className="text-xs font-semibold text-gray-500 block">Total de Ofertas Realizadas</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">{misOfertas.length}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 block">Monto Acumulado Ofertado</span>
          <span className="text-2xl font-black text-agrotec-800 mt-1 block">
            {formatUSD(totalOfertado)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-gray-500 block">Estado de Evaluación</span>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full inline-block mt-2">
            En espera de cierre de subasta
          </span>
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

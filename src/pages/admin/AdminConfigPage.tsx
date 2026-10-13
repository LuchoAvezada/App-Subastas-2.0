import { ConfigSubasta } from '../../components/admin/ConfigSubasta';
import { Settings } from 'lucide-react';

export function AdminConfigPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200/80">
        <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
          <Settings className="w-3.5 h-3.5" />
          <span>Parámetros Globales</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Configuración del Sistema
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Ajustes de cronograma y vigencia de las subastas activas
        </p>
      </div>

      <ConfigSubasta />
    </div>
  );
}

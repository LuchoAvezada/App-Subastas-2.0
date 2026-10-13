import { PanelEvaluacion } from '../../components/ofertas/PanelEvaluacion';
import { Gavel } from 'lucide-react';

export function AdminOfertasPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200/80">
        <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
          <Gavel className="w-3.5 h-3.5" />
          <span>Módulo de Control y Adjudicación</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Panel de Ofertas y Evaluación
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Supervisión de posturas en tiempo real y ejecución del algoritmo de desempate corporativo
        </p>
      </div>

      <PanelEvaluacion />
    </div>
  );
}

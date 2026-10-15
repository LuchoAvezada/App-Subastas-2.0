import { ColaboradoresList } from '../../components/admin/ColaboradoresList';
import { UsersIcon } from '@phosphor-icons/react';

export function AdminColaboradoresPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200/80">
        <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
          <UsersIcon className="w-4 h-4" />
          <span>Gestión de Personal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Nómina de Colaboradores
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Administre la habilitación de colaboradores para participar en la subasta e importe nuevos registros
        </p>
      </div>

      <ColaboradoresList />
    </div>
  );
}

import { ListIcon } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { usuario } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E4E4E4] border-l-4 border-l-[#1C5A34] px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-agrotec-500"
          aria-label="Abrir menú"
        >
          <ListIcon className="w-[22px] h-[22px]" />
        </button>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-agrotec-800">
            Agrotec S.A.
          </span>
          <h2 className="text-sm font-bold text-gray-900 hidden sm:block">
            Portal de Subastas de Activos
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-agrotec-50 border border-agrotec-100 text-agrotec-900 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-agrotec-600 animate-pulse"></span>
          <span>Sesión iniciada: {usuario?.nombre}</span>
        </div>
      </div>
    </header>
  );
}

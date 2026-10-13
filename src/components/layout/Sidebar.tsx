import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Tablet,
  Smartphone,
  Laptop,
  Boxes,
  Gavel,
  History,
  Trophy,
  PackagePlus,
  Users,
  Settings,
  LogOut,
  Clock,
  ShieldCheck,
  LayoutDashboard,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCountdown } from '../../hooks/useCountdown';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const countdown = useCountdown();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Cerrar el drawer móvil con Escape (a11y)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-all duration-150 group border-l-4',
      isActive
        ? 'bg-[#E8F0EB] text-[#1C5A34] border-[#1C5A34] font-bold rounded-r-lg'
        : 'border-transparent text-[#6D6D6D] hover:text-[#1C5A34] hover:bg-[#E8F0EB]/60 rounded-lg'
    );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        aria-label="Navegación principal"
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-72 bg-white border-r border-[#E4E4E4] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#E4E4E4]">
          <div className="flex items-center gap-2.5">
            <img src="/brand/logo-agrotec.svg" alt="Agrotec" className="h-9 w-auto" />
            <span className="text-[10px] uppercase font-bold tracking-widest bg-[#F9D7E0] text-[#8A2733] px-2 py-0.5 rounded">
              Subasta
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5A34]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Live Countdown Badge Widget — Tarjeta limpia sin degradados oscuros */}
        <div className="px-4 pt-4 pb-2">
          <div className="p-3.5 rounded-xl bg-white text-[#262626] border border-[#E4E4E4] shadow-none">
            <div className="flex items-center justify-between text-xs text-[#6D6D6D] mb-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1C5A34]" />
                Cierre de Subasta
              </span>
              {countdown.isExpired ? (
                <span className="text-[10px] bg-[#F9D7E0] text-[#8A2733] font-bold px-1.5 py-0.5 rounded">
                  FINALIZADA
                </span>
              ) : (
                <span className="text-[10px] bg-[#E8F0EB] text-[#1C5A34] font-bold px-1.5 py-0.5 rounded">
                  ACTIVA
                </span>
              )}
            </div>
            <div className="font-mono text-base font-bold tracking-wider text-[#1C5A34]">
              {countdown.loading ? (
                <span className="text-xs font-sans text-gray-400 font-normal">Cargando...</span>
              ) : countdown.isExpired ? (
                <span className="text-sm font-sans text-[#8A2733] font-semibold">Subasta Cerrada</span>
              ) : countdown.fechaFin ? (
                countdown.display
              ) : (
                <span className="text-xs font-sans text-gray-400 font-normal">Por definir</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
          {/* General navigation */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Principal
            </div>
            <nav className="space-y-1">
              <NavLink to="/" end className={navItemClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Inicio</span>
              </NavLink>
              <NavLink to="/mis-ofertas" className={navItemClass} onClick={onClose}>
                <History className="w-4 h-4" />
                <span>Mis Ofertas</span>
              </NavLink>
              <NavLink to="/resultados" className={navItemClass} onClick={onClose}>
                <Trophy className="w-4 h-4" />
                <span>Resultados Finales</span>
              </NavLink>
            </nav>
          </div>

          {/* Categories navigation */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Catálogo de Activos
            </div>
            <nav className="space-y-1">
              <NavLink to="/catalogo/tablets" className={navItemClass} onClick={onClose}>
                <Tablet className="w-4 h-4" />
                <span>Tablets</span>
              </NavLink>
              <NavLink to="/catalogo/celulares" className={navItemClass} onClick={onClose}>
                <Smartphone className="w-4 h-4" />
                <span>Celulares</span>
              </NavLink>
              <NavLink to="/catalogo/notebooks" className={navItemClass} onClick={onClose}>
                <Laptop className="w-4 h-4" />
                <span>Notebooks</span>
              </NavLink>
              <NavLink to="/catalogo/otros" className={navItemClass} onClick={onClose}>
                <Boxes className="w-4 h-4" />
                <span>Otros Equipos</span>
              </NavLink>
            </nav>
          </div>

          {/* Admin section */}
          {usuario?.es_admin && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider px-3 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Administración</span>
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/ofertas" className={navItemClass} onClick={onClose}>
                  <Gavel className="w-4 h-4 text-amber-600" />
                  <span>Panel de Ofertas</span>
                </NavLink>
                <NavLink to="/admin/activos" className={navItemClass} onClick={onClose}>
                  <PackagePlus className="w-4 h-4 text-amber-600" />
                  <span>Carga de Activos</span>
                </NavLink>
                <NavLink to="/admin/colaboradores" className={navItemClass} onClick={onClose}>
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Colaboradores</span>
                </NavLink>
                <NavLink to="/admin/config" className={navItemClass} onClick={onClose}>
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span>Configuración</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 truncate">
                {usuario?.nombre || 'Colaborador'}
              </div>
              <div className="text-xs text-gray-500 font-mono truncate">
                CI: {usuario?.ci_documento}
              </div>
            </div>
            {usuario?.es_admin && (
              <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Admin
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200/80 hover:border-red-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

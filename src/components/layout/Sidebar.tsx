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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCountdown } from '../../hooks/useCountdown';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
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

  const navItemClass = (_title?: string) => ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center text-sm font-medium transition-all duration-150 group border-l-4 py-2.5',
      isCollapsed
        ? 'justify-center px-0 rounded-lg'
        : 'gap-3 px-3.5',
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
          'fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-[#E4E4E4] flex flex-col transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-72 lg:w-20' : 'w-72'
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-[#E4E4E4] transition-all',
            isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
          )}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expandir barra lateral"
                className="hidden lg:flex p-1.5 rounded-lg text-gray-500 hover:text-[#1C5A34] hover:bg-[#E8F0EB] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img src="/brand/logo-agrotec.svg" alt="Agrotec" className="h-9 w-auto shrink-0" />
                <span className="text-[10px] uppercase font-bold tracking-widest bg-[#F9D7E0] text-[#8A2733] px-2 py-0.5 rounded shrink-0">
                  Subasta
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Botón para compactar en escritorio */}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Compactar barra lateral"
                  className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-[#1C5A34] hover:bg-[#E8F0EB] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {/* Botón para cerrar en móvil */}
                <button
                  onClick={onClose}
                  aria-label="Cerrar menú"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5A34]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Live Countdown Badge Widget */}
        <div className={cn('pt-4 pb-2 transition-all', isCollapsed ? 'px-2' : 'px-4')}>
          {isCollapsed ? (
            <div
              className="p-2.5 rounded-xl bg-white text-[#262626] border border-[#E4E4E4] flex flex-col items-center justify-center cursor-default group"
              title={`Cierre de Subasta: ${
                countdown.isExpired
                  ? 'Subasta Finalizada'
                  : countdown.fechaFin
                  ? countdown.display
                  : 'Por definir'
              }`}
            >
              <Clock
                className={cn(
                  'w-5 h-5',
                  countdown.isExpired ? 'text-[#8A2733]' : 'text-[#1C5A34]'
                )}
              />
              <span
                className={cn(
                  'w-2 h-2 rounded-full mt-1.5',
                  countdown.isExpired ? 'bg-[#8A2733]' : 'bg-[#1C5A34]'
                )}
              />
            </div>
          ) : (
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
          )}
        </div>

        {/* Navigation list */}
        <div
          className={cn(
            'flex-1 overflow-y-auto py-3 space-y-5 transition-all',
            isCollapsed ? 'px-2' : 'px-4'
          )}
        >
          {/* General navigation */}
          <div>
            {!isCollapsed ? (
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Principal
              </div>
            ) : (
              <div className="h-px bg-gray-200 my-1 mx-2" />
            )}
            <nav className="space-y-1">
              <NavLink to="/" end className={navItemClass('Inicio')} onClick={onClose} title="Inicio">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Inicio</span>}
              </NavLink>
              <NavLink
                to="/mis-ofertas"
                className={navItemClass('Mis Ofertas')}
                onClick={onClose}
                title="Mis Ofertas"
              >
                <History className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Mis Ofertas</span>}
              </NavLink>
              <NavLink
                to="/resultados"
                className={navItemClass('Resultados Finales')}
                onClick={onClose}
                title="Resultados Finales"
              >
                <Trophy className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Resultados Finales</span>}
              </NavLink>
            </nav>
          </div>

          {/* Categories navigation */}
          <div>
            {!isCollapsed ? (
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Catálogo de Activos
              </div>
            ) : (
              <div className="h-px bg-gray-200 my-1 mx-2" />
            )}
            <nav className="space-y-1">
              <NavLink
                to="/catalogo/tablets"
                className={navItemClass('Tablets')}
                onClick={onClose}
                title="Tablets"
              >
                <Tablet className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Tablets</span>}
              </NavLink>
              <NavLink
                to="/catalogo/celulares"
                className={navItemClass('Celulares')}
                onClick={onClose}
                title="Celulares"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Celulares</span>}
              </NavLink>
              <NavLink
                to="/catalogo/notebooks"
                className={navItemClass('Notebooks')}
                onClick={onClose}
                title="Notebooks"
              >
                <Laptop className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Notebooks</span>}
              </NavLink>
              <NavLink
                to="/catalogo/otros"
                className={navItemClass('Otros Equipos')}
                onClick={onClose}
                title="Otros Equipos"
              >
                <Boxes className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Otros Equipos</span>}
              </NavLink>
            </nav>
          </div>

          {/* Admin section */}
          {usuario?.es_admin && (
            <div>
              {!isCollapsed ? (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider px-3 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Administración</span>
                </div>
              ) : (
                <div className="h-px bg-amber-200 my-1 mx-2" />
              )}
              <nav className="space-y-1">
                <NavLink
                  to="/admin/ofertas"
                  className={navItemClass('Panel de Ofertas')}
                  onClick={onClose}
                  title="Panel de Ofertas"
                >
                  <Gavel className="w-4 h-4 text-amber-600 shrink-0" />
                  {!isCollapsed && <span>Panel de Ofertas</span>}
                </NavLink>
                <NavLink
                  to="/admin/activos"
                  className={navItemClass('Carga de Activos')}
                  onClick={onClose}
                  title="Carga de Activos"
                >
                  <PackagePlus className="w-4 h-4 text-amber-600 shrink-0" />
                  {!isCollapsed && <span>Carga de Activos</span>}
                </NavLink>
                <NavLink
                  to="/admin/colaboradores"
                  className={navItemClass('Colaboradores')}
                  onClick={onClose}
                  title="Colaboradores"
                >
                  <Users className="w-4 h-4 text-amber-600 shrink-0" />
                  {!isCollapsed && <span>Colaboradores</span>}
                </NavLink>
                <NavLink
                  to="/admin/config"
                  className={navItemClass('Configuración')}
                  onClick={onClose}
                  title="Configuración"
                >
                  <Settings className="w-4 h-4 text-amber-600 shrink-0" />
                  {!isCollapsed && <span>Configuración</span>}
                </NavLink>
              </nav>
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div
          className={cn(
            'border-t border-gray-100 bg-gray-50/60 transition-all',
            isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-4'
          )}
        >
          {isCollapsed ? (
            <>
              <div
                className="w-9 h-9 rounded-full bg-[#E8F0EB] text-[#1C5A34] font-bold text-xs flex items-center justify-center border border-[#1C5A34]/20 cursor-default"
                title={`${usuario?.nombre || 'Colaborador'} (CI: ${usuario?.ci_documento || ''})`}
              >
                {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'AG'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
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
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200/80 hover:border-red-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cerrar Sesión</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

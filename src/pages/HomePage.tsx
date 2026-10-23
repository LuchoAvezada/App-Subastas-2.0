import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCountdown } from '../hooks/useCountdown';
import { useOfertas } from '../hooks/useOfertas';
import { useActivos } from '../hooks/useActivos';
import { cn } from '../lib/utils';
import {
  ArrowRightIcon,
  ClockIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  DevicesIcon,
  LaptopIcon,
  MedalIcon,
  SparkleIcon,
} from '@phosphor-icons/react';

export function HomePage() {
  const { usuario } = useAuth();
  const countdown = useCountdown();
  const { misOfertas } = useOfertas();
  const { activos } = useActivos();

  const totalDisponibles = activos.filter((a) => a.estado === 'Disponible').length;

  const categories = [
    {
      slug: 'tablets',
      title: 'Tablets',
      description: 'Acceda para ver los ítems disponibles',
      icon: <DeviceTabletIcon className="w-7 h-7 text-agrotec-700" />,
      count: activos.filter((a) => a.id_categoria === 1 && a.estado === 'Disponible').length,
    },
    {
      slug: 'celulares',
      title: 'Celulares',
      description: 'Acceda para ver los ítems disponibles',
      icon: <DeviceMobileIcon className="w-7 h-7 text-blue-700" />,
      count: activos.filter((a) => a.id_categoria === 2 && a.estado === 'Disponible').length,
    },
    {
      slug: 'notebooks',
      title: 'Notebooks',
      description: 'Acceda para ver los ítems disponibles',
      icon: <LaptopIcon className="w-7 h-7 text-indigo-700" />,
      count: activos.filter((a) => a.id_categoria === 3 && a.estado === 'Disponible').length,
    },
    {
      slug: 'otros',
      title: 'Otros Equipos',
      description: 'Acceda para ver los ítems disponibles',
      icon: <DevicesIcon className="w-7 h-7 text-amber-700" />,
      count: activos.filter((a) => a.id_categoria === 4 && a.estado === 'Disponible').length,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-agrotec-900 via-agrotec-800 to-agrotec-700 text-white p-6 sm:p-8 lg:p-10 shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 bottom-0 w-64 h-32 bg-agrotec-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-agrotec-100 text-xs font-semibold mb-4 backdrop-blur-sm">
              <SparkleIcon className="w-4 h-4 text-agrotec-300" />
              <span>Subasta Interna Agrotec 2026</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Bienvenido, {usuario?.nombre.split(' ')[0]}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-agrotec-100 leading-relaxed">
              Participe de la subasta de activos tecnológicos. Explore los catálogos de equipos y registre sus ofertas antes del cierre.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/catalogo/notebooks"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-agrotec-900 font-bold text-sm shadow-md hover:bg-agrotec-50 transition-all active:scale-95"
              >
                <span>Explorar Catálogo</span>
                <ArrowRightIcon className="w-[18px] h-[18px]" />
              </Link>
              <Link
                to="/mis-ofertas"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 font-medium text-sm transition-all border border-white/20"
              >
                <span>Ver mis ofertas ({misOfertas.length})</span>
              </Link>
            </div>
          </div>

          {/* Mascota Oficial Nino */}
          <div className="flex justify-center md:justify-end items-end shrink-0 -mb-6 sm:-mb-8 lg:-mb-10 self-center md:self-end">
            <img
              src="/brand/mascota-nino.png"
              alt="Nino - Mascota Oficial Agrotec"
              className="w-56 sm:w-64 md:w-72 lg:w-96 xl:w-[420px] max-w-full h-auto object-contain select-none pointer-events-none drop-shadow-2xl transition-transform duration-300 hover:scale-105"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Countdown Timer Card */}
      <div className={cn(
        'rounded-2xl border p-6 sm:p-8 shadow-sm transition-all',
        countdown.isExpired
          ? 'bg-gradient-to-r from-rose-50/40 via-white to-white border-rose-200'
          : 'bg-white border-gray-200/90'
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
              <ClockIcon className={cn('w-[18px] h-[18px]', countdown.isExpired ? 'text-[#8A2733]' : 'text-[#1C5A34] animate-pulse')} />
              <span className={countdown.isExpired ? 'text-[#8A2733]' : 'text-[#1C5A34]'}>
                {countdown.isExpired ? 'Subasta Finalizada' : 'Tiempo Restante para Ofertar'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">
              {countdown.isExpired
                ? 'La subasta ha finalizado'
                : 'Cierre oficial de la subasta'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {countdown.isExpired
                ? 'La recepción de ofertas se encuentra cerrada. Los resultados están en proceso de adjudicación.'
                : 'Una vez finalizado el tiempo, ya no se considerarán ofertas.'}
            </p>
          </div>

          {/* Time digits */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={cn(
              'flex flex-col items-center justify-center w-16 sm:w-20 py-3 rounded-2xl text-center border',
              countdown.isExpired
                ? 'bg-rose-50 border-rose-200 text-[#8A2733]'
                : 'bg-agrotec-50 border-agrotec-200 text-agrotec-900'
            )}>
              <span className="text-2xl sm:text-3xl font-black font-mono">
                {String(countdown.days).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-500 mt-1">Días</span>
            </div>
            <span className="text-2xl font-bold text-gray-300">:</span>
            <div className={cn(
              'flex flex-col items-center justify-center w-16 sm:w-20 py-3 rounded-2xl text-center border',
              countdown.isExpired
                ? 'bg-rose-50 border-rose-200 text-[#8A2733]'
                : 'bg-agrotec-50 border-agrotec-200 text-agrotec-900'
            )}>
              <span className="text-2xl sm:text-3xl font-black font-mono">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-500 mt-1">Horas</span>
            </div>
            <span className="text-2xl font-bold text-gray-300">:</span>
            <div className={cn(
              'flex flex-col items-center justify-center w-16 sm:w-20 py-3 rounded-2xl text-center border',
              countdown.isExpired
                ? 'bg-rose-50 border-rose-200 text-[#8A2733]'
                : 'bg-agrotec-50 border-agrotec-200 text-agrotec-900'
            )}>
              <span className="text-2xl sm:text-3xl font-black font-mono">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-500 mt-1">Min</span>
            </div>
            <span className="text-2xl font-bold text-gray-300">:</span>
            <div className={cn(
              'flex flex-col items-center justify-center w-16 sm:w-20 py-3 rounded-2xl text-center border',
              countdown.isExpired
                ? 'bg-rose-50 border-rose-200 text-[#8A2733]'
                : 'bg-agrotec-50 border-agrotec-200 text-agrotec-900'
            )}>
              <span className="text-2xl sm:text-3xl font-black font-mono">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-500 mt-1">Seg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Categorías Disponibles ({totalDisponibles} activos listos para ofertar)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/catalogo/${cat.slug}`}
              className="group bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm hover:shadow-md hover:border-agrotec-400 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-gray-50 group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-agrotec-50 text-agrotec-800 border border-agrotec-200">
                    {cat.count} {cat.count === 1 ? 'activo' : 'activos'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-agrotec-800 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-agrotec-800 group-hover:translate-x-1 transition-transform">
                <span>Ver catálogo</span>
                <ArrowRightIcon className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Business Rules and Criteria Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2 mb-4">
          <MedalIcon className="w-[22px] h-[22px] text-agrotec-700" />
          <span>Reglas de Adjudicación de la Subasta</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-agrotec-100 text-agrotec-800 font-bold flex items-center justify-center text-sm mb-2">
              1
            </div>
            <h4 className="text-sm font-bold text-gray-900">Monto Más Alto</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Los criterios solo aplican en caso de empates en monto de oferta, en primera instancia se le adjudica el item al colaborador con la oferta mayor .
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-agrotec-100 text-agrotec-800 font-bold flex items-center justify-center text-sm mb-2">
              2
            </div>
            <h4 className="text-sm font-bold text-gray-900">Desempate por Jerarquía</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Si dos colaboradores ofertan el mismo monto, se evalúa el nivel de jerarquía del cargo.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-agrotec-100 text-agrotec-800 font-bold flex items-center justify-center text-sm mb-2">
              3
            </div>
            <h4 className="text-sm font-bold text-gray-900">Desempate por Antigüedad</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Si persiste el empate luego del punto 2, se adjudica el activo al colaborador con mayor antiguedad dentro de la organización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

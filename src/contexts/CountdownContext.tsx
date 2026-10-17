import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getSecondsRemaining, formatCountdown } from '../lib/utils';

/** Respuesta de la RPC publicar_resultados */
export interface ResultadoPublicacion {
  success: boolean;
  error?: string;
  codigo?: string;
}

export interface CountdownState {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  display: string;
  isExpired: boolean;
  loading: boolean;
  fechaFin: string | null;
  resultadosPublicados: boolean;
  setPublicarResultados: (publicar: boolean, token: string | undefined) => Promise<ResultadoPublicacion>;
  refreshConfig: () => Promise<void>;
}

const defaultState: CountdownState = {
  totalSeconds: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  display: '0d 00:00:00',
  isExpired: false,
  loading: true,
  fechaFin: null,
  resultadosPublicados: false,
  setPublicarResultados: async () => ({ success: false }),
  refreshConfig: async () => {},
};

export const CountdownContext = createContext<CountdownState>(defaultState);

/**
 * Proveedor global de cuenta regresiva de subasta y estado de gobernanza.
 * Una sola instancia que comparte el estado con todos los consumidores.
 * Al llamar a refreshConfig() o setPublicarResultados() desde cualquier componente,
 * el nuevo fechaFin y el estado de publicación se propagan automáticamente entre todas las pestañas.
 */
export function CountdownProvider({ children }: { children: ReactNode }) {
  const [fechaFin, setFechaFin] = useState<string | null>(null);
  const [resultadosPublicados, setResultadosPublicados] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('agrotec_resultados_publicados');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchConfig = useCallback(async () => {
    try {
      // Usar select('*') para que nunca falle si una columna nueva aún no fue migrada
      const { data, error } = await supabase
        .from('sub_app_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setFechaFin(data.fecha_fin_subasta ?? null);
        if (typeof data.resultados_publicados === 'boolean') {
          setResultadosPublicados(data.resultados_publicados);
          localStorage.setItem('agrotec_resultados_publicados', String(data.resultados_publicados));
        }
      }
    } catch (err) {
      console.error('Error fetching auction config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const setPublicarResultados = useCallback(async (
    publicar: boolean,
    token: string | undefined
  ): Promise<ResultadoPublicacion> => {
    // 1. Persistir en Supabase: la función verifica que el token sea de un administrador
    const { data, error } = await supabase.rpc('publicar_resultados', {
      p_token: token ?? null,
      p_publicar: publicar,
    });
    if (error) {
      console.error('Error al publicar resultados:', error);
      return { success: false, error: 'No fue posible conectar con el servidor.' };
    }
    const res = data as ResultadoPublicacion;
    if (!res.success) return res;

    // 2. Estado local y persistencia en localStorage (solo tras confirmar en la base)
    setResultadosPublicados(publicar);
    try {
      localStorage.setItem('agrotec_resultados_publicados', String(publicar));
    } catch (e) {
      console.warn('Error saving to localStorage:', e);
    }

    // 3. Notificar a todas las pestañas y ventanas activas del navegador
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrotec_resultados_publicados_change', { detail: publicar }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('agrotec_subasta_sync');
          bc.postMessage({ type: 'RESULTADOS_PUBLICADOS', value: publicar });
          bc.close();
        }
      }
    } catch (e) {
      console.warn('Error broadcasting publication change:', e);
    }

    return res;
  }, []);

  // Carga inicial y suscripción Realtime a cambios en sub_app_config
  useEffect(() => {
    fetchConfig();

    // Suscripción Realtime para sincronizar automáticamente clientes cuando cambie sub_app_config
    const channel = supabase
      .channel('sub_app_config_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sub_app_config' },
        () => {
          fetchConfig();
        }
      )
      .subscribe();

    // Escuchar eventos entre pestañas y ventanas
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agrotec_resultados_publicados' && e.newValue !== null) {
        setResultadosPublicados(e.newValue === 'true');
      }
    };
    const handleCustom = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      if (custom.detail !== undefined) {
        setResultadosPublicados(Boolean(custom.detail));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('agrotec_resultados_publicados_change', handleCustom);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('agrotec_subasta_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'RESULTADOS_PUBLICADOS') {
          setResultadosPublicados(Boolean(msg.data.value));
        }
      };
    }

    // Respaldo de sincronización periódica cada 30 segundos
    const pollInterval = setInterval(() => {
      fetchConfig();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('agrotec_resultados_publicados_change', handleCustom);
      if (bc) bc.close();
      clearInterval(pollInterval);
    };
  }, [fetchConfig]);

  // Temporizador regresivo vinculado a fechaFin
  useEffect(() => {
    if (!fechaFin) {
      setTotalSeconds(0);
      return;
    }

    // Cálculo inicial
    const remaining = getSecondsRemaining(fechaFin);
    setTotalSeconds(remaining);

    if (remaining <= 0) return;

    const timer = setInterval(() => {
      const currentRemaining = getSecondsRemaining(fechaFin);
      setTotalSeconds(currentRemaining);

      if (currentRemaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [fechaFin]);

  const parts = formatCountdown(totalSeconds);

  const value: CountdownState = {
    totalSeconds,
    ...parts,
    isExpired: !loading && fechaFin !== null && totalSeconds <= 0,
    loading,
    fechaFin,
    resultadosPublicados,
    setPublicarResultados,
    refreshConfig: fetchConfig,
  };

  return (
    <CountdownContext.Provider value={value}>
      {children}
    </CountdownContext.Provider>
  );
}

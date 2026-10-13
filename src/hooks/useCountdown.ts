import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getSecondsRemaining, formatCountdown } from '../lib/utils';

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
  refreshConfig: () => Promise<void>;
}

export function useCountdown(initialTargetDate?: string | null): CountdownState {
  const [fechaFin, setFechaFin] = useState<string | null>(initialTargetDate ?? null);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(!initialTargetDate);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sub_app_config')
        .select('fecha_fin_subasta')
        .eq('id', 1)
        .single();

      if (!error && data?.fecha_fin_subasta) {
        setFechaFin(data.fecha_fin_subasta);
      }
    } catch (err) {
      console.error('Error fetching auction end date:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTargetDate !== undefined) {
      setFechaFin(initialTargetDate);
      setLoading(false);
    } else {
      fetchConfig();
    }
  }, [initialTargetDate, fetchConfig]);

  useEffect(() => {
    if (!fechaFin) {
      setTotalSeconds(0);
      return;
    }

    // Initial calculation
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

  return {
    totalSeconds,
    ...parts,
    isExpired: !loading && fechaFin !== null && totalSeconds <= 0,
    loading,
    fechaFin,
    refreshConfig: fetchConfig,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { hasVetoColaborador, registrarVeto } from '../lib/vetos';
import type { OfertaRecibida, RpcResponse } from '../types/domain';

export function useOfertas() {
  const { usuario } = useAuth();
  const [misOfertas, setMisOfertas] = useState<OfertaRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMisOfertas = useCallback(async () => {
    if (!usuario) {
      setMisOfertas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('sub_v_ofertas_recibidas')
        .select('*')
        .eq('id_colaborador', usuario.id_colaborador)
        .order('fecha_hora', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMisOfertas((data as OfertaRecibida[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ofertas');
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    fetchMisOfertas();
  }, [fetchMisOfertas]);

  /**
   * Enviar oferta mediante la función RPC segura registrar_oferta
   */
  const enviarOferta = async (idActivo: number, monto: number): Promise<RpcResponse> => {
    if (!usuario) {
      return { success: false, error: 'Debe iniciar sesión para ofertar.' };
    }

    // Validación de veto permanente (Principio Constitucional P9)
    if (hasVetoColaborador(usuario.id_colaborador, idActivo)) {
      return {
        success: false,
        error: 'Posees un veto permanente de reincidencia en este activo debido a una cancelación previa.',
      };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('registrar_oferta', {
        p_id_activo: idActivo,
        p_ci_documento: usuario.ci_documento,
        p_monto: monto,
      });

      if (rpcError) {
        return { success: false, error: rpcError.message };
      }

      const response = data as unknown as RpcResponse;
      if (response.success) {
        await fetchMisOfertas();
      }
      return response;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error de conexión al enviar la oferta.',
      };
    }
  };

  /**
   * Cancelar una oferta activa y registrar el veto permanente (Principio P9)
   */
  const cancelarOferta = async (
    idOferta: number,
    activoInfo: {
      id_activo: number;
      marca?: string | null;
      modelo?: string | null;
      categoria?: string | null;
      monto: number;
    }
  ): Promise<RpcResponse> => {
    if (!usuario) {
      return { success: false, error: 'Debe iniciar sesión para cancelar una oferta.' };
    }

    try {
      // 1. Validar que la subasta no haya finalizado
      const { data: configData } = await supabase
        .from('sub_app_config')
        .select('fecha_fin_subasta')
        .eq('id', 1)
        .single();

      if (configData?.fecha_fin_subasta) {
        const fechaFin = new Date(configData.fecha_fin_subasta).getTime();
        if (Date.now() > fechaFin) {
          return {
            success: false,
            error: 'La subasta ya ha finalizado. No es posible cancelar ofertas en este momento.',
          };
        }
      }

      // 2. Ejecutar la eliminación de la oferta en la base de datos
      const { error: deleteError } = await supabase
        .from('sub_ofertas')
        .delete()
        .eq('id_oferta', idOferta)
        .eq('id_colaborador', usuario.id_colaborador);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message || 'No fue posible cancelar la oferta en la base de datos.',
        };
      }

      // 3. Registrar veto permanente en el activo (Principio P9)
      registrarVeto({
        id_activo: activoInfo.id_activo,
        id_colaborador: usuario.id_colaborador,
        marca: activoInfo.marca,
        modelo: activoInfo.modelo,
        categoria: activoInfo.categoria,
        monto_cancelado: activoInfo.monto,
        fecha_cancelacion: new Date().toISOString(),
      });

      // 4. Refrescar lista de ofertas del usuario
      await fetchMisOfertas();

      return {
        success: true,
        message: 'Oferta cancelada con éxito. Se ha registrado el veto de reincidencia en este activo.',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al procesar la cancelación.',
      };
    }
  };

  return {
    misOfertas,
    loading,
    error,
    refetch: fetchMisOfertas,
    enviarOferta,
    cancelarOferta,
  };
}

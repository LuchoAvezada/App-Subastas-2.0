import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { RpcResponse } from '../types/domain';

/**
 * Llama una función RPC que valida el token de sesión (F09): toda escritura pasa por acá.
 * Agrega p_token y cierra la sesión local si el servidor la rechaza.
 */
export function useRpcSesion() {
  const { usuario, logout } = useAuth();

  return useCallback(
    async <T extends object = object>(
      funcion: string,
      args: Record<string, unknown> = {}
    ): Promise<RpcResponse & Partial<T>> => {
      const { data, error } = await supabase.rpc(funcion, { p_token: usuario?.token ?? null, ...args });
      type Respuesta = RpcResponse & Partial<T>;
      if (error) return { success: false, error: error.message } as Respuesta;

      const res = data as Respuesta;
      if (res.codigo === 'SESION_INVALIDA') logout();
      return res;
    },
    [usuario, logout]
  );
}

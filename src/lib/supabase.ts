import { createClient } from '@supabase/supabase-js';

// En producción la API está detrás del mismo Nginx que sirve la página, así que
// el mismo build funciona por la IP de la LAN y por el túnel público.
const supabaseUrl = import.meta.env.PROD ? window.location.origin : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). ' +
    'Copy .env.example to .env and fill in your project credentials.'
  );
}

// Usar any en el cliente para máxima compatibilidad y evitar colisiones de tipos en RPC y schemas dinámicos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

import { useContext } from 'react';
import { CountdownContext } from '../contexts/CountdownContext';
import type { CountdownState } from '../contexts/CountdownContext';

/**
 * Hook que devuelve el estado compartido de la cuenta regresiva de la subasta.
 * Consume el CountdownContext global proporcionado por CountdownProvider en App.tsx.
 * Todos los componentes que llamen a useCountdown() comparten la misma instancia,
 * por lo que cuando un administrador cierra/abre la subasta, el cambio se refleja
 * inmediatamente en el Sidebar, HomePage, ActivoCard, MisOfertasPage, etc.
 */
export function useCountdown(): CountdownState {
  const context = useContext(CountdownContext);
  if (!context) {
    throw new Error('useCountdown debe usarse dentro de un CountdownProvider');
  }
  return context;
}

export type { CountdownState };

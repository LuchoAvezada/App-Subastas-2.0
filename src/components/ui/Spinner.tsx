import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 p-4"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn('animate-spin text-agrotec-700', sizes[size], className)}
        aria-hidden="true"
      />
      {label ? (
        <p className="text-xs font-medium text-gray-500">{label}</p>
      ) : (
        <span className="sr-only">Cargando…</span>
      )}
    </div>
  );
}

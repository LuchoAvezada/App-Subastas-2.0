import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'agrotec';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', size = 'md', children, className }: BadgeProps) {
  const variants = {
    agrotec: 'bg-[#E8F0EB] text-[#1C5A34] border-[#1C5A34]/20',
    success: 'bg-[#E8F0EB] text-[#1C5A34] border-[#1C5A34]/30',
    warning: 'bg-[#FFF3E0] text-[#B26A46] border-[#B26A46]/30',
    danger: 'bg-[#F9D7E0] text-[#8A2733] border-[#8A2733]/30',
    info: 'bg-[#E8F0EB] text-[#1C5A34] border-[#1C5A34]/20',
    neutral: 'bg-[#F5F5F5] text-[#6D6D6D] border-[#E4E4E4]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide uppercase',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case 'Disponible':
      return <Badge variant="success">Disponible</Badge>;
    case 'Cerrado':
      return <Badge variant="warning">Cerrado</Badge>;
    case 'Adjudicado':
      return <Badge variant="neutral">Adjudicado</Badge>;
    default:
      return <Badge variant="neutral">{estado}</Badge>;
  }
}

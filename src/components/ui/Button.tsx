import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

    const variants = {
      primary:
        'bg-[#1C5A34] text-white hover:opacity-90 focus:ring-[#1C5A34] shadow-none font-bold active:scale-[0.98]',
      secondary:
        'bg-white text-[#1C5A34] border border-[#BEBEBE] hover:bg-[#E8F0EB] hover:border-[#1C5A34] focus:ring-[#1C5A34] font-bold shadow-none active:scale-[0.98]',
      outline:
        'border border-[#BEBEBE] text-[#262626] bg-white hover:bg-[#F5F5F5] focus:ring-[#1C5A34] shadow-none',
      danger:
        'bg-[#8A2733] text-white hover:opacity-90 focus:ring-[#8A2733] shadow-none font-bold',
      ghost:
        'text-[#6D6D6D] hover:text-[#1C5A34] hover:bg-[#E8F0EB] focus:ring-[#1C5A34]',
      success:
        'bg-[#1C5A34] text-white hover:opacity-90 focus:ring-[#1C5A34] shadow-none font-bold',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-5 py-3 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const describedById = inputId
      ? error
        ? `${inputId}-error`
        : helperText
        ? `${inputId}-helper`
        : undefined
      : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedById}
            className={cn(
              'block w-full rounded-lg border text-sm transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              'py-2.5 bg-white text-gray-900 placeholder:text-gray-400',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 text-red-900'
                : 'border-gray-300 focus:border-agrotec-600 focus:ring-agrotec-100',
              props.disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1.5 text-xs text-red-600 font-medium animate-fade-in"
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={inputId ? `${inputId}-helper` : undefined}
            className="mt-1.5 text-xs text-gray-500"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

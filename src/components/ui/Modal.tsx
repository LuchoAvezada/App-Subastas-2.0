import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const titleId = title ? `${baseId}-title` : undefined;
  const descId = description ? `${baseId}-desc` : undefined;

  const getFocusable = () =>
    dialogRef.current
      ? Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
      : [];

  // Foco inicial y bloqueo de scroll: SOLO depende de isOpen.
  // Si dependiera de onClose (que suele venir como arrow inline), cada render
  // del padre reejecutaría el efecto y devolvería el foco al primer campo,
  // expulsando al usuario mientras escribe.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    (getFocusable()[0] ?? dialogRef.current)?.focus();

    return () => {
      document.body.style.overflow = 'unset';
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Escape + focus trap. Reatar el listener en cada render es inofensivo.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal dialog wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          className={cn(
            'relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all',
            'w-full sm:my-8 animate-scale-in border border-gray-100 focus:outline-none',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <div>
                {title && (
                  <h3 id={titleId} className="text-lg font-bold text-gray-900 tracking-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p id={descId} className="mt-1 text-xs text-gray-500">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

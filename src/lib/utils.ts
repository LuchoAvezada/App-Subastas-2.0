import { formatInTimeZone } from 'date-fns-tz';
import { formatDistanceToNowStrict, isPast, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';

const TIMEZONE = 'America/Asuncion';

/**
 * Parsea cualquier timestamp de base de datos garantizando su interpretación en UTC
 * si el string carece de indicador de zona horaria (evita desfases por timezone local).
 */
export function parseUtcDate(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  if (!fecha) return new Date();
  if (typeof fecha === 'string' && !fecha.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(fecha)) {
    return new Date(`${fecha}Z`);
  }
  return new Date(fecha);
}

/**
 * Format a timestamp to Asunción timezone display string
 */
export function formatFechaAsuncion(fecha: string | Date, formato = 'dd/MM/yyyy HH:mm:ss'): string {
  return formatInTimeZone(parseUtcDate(fecha), TIMEZONE, formato);
}

/**
 * Format a timestamp as a relative "time ago" string
 */
export function formatTimeAgo(fecha: string | Date): string {
  return formatDistanceToNowStrict(parseUtcDate(fecha), { locale: es, addSuffix: true });
}

/**
 * Check if a date is in the past
 */
export function hasPassed(fecha: string | Date): boolean {
  return isPast(parseUtcDate(fecha));
}

/**
 * Get seconds remaining until a target date
 */
export function getSecondsRemaining(targetDate: string | Date): number {
  const diff = differenceInSeconds(parseUtcDate(targetDate), new Date());
  return Math.max(0, diff);
}

/**
 * Format seconds as DD:HH:MM:SS countdown
 */
export function formatCountdown(totalSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  display: string;
} {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  let display: string;
  if (days > 0) {
    display = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return { days, hours, minutes, seconds, display };
}

/**
 * Format a number as USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate password complexity
 * Returns null if valid, or an error message string
 */
export function validatePassword(password: string, ciDocumento: string): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra mayúscula.';
  }
  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra minúscula.';
  }
  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe contener al menos un número.';
  }
  if (password === ciDocumento) {
    return 'La contraseña no puede ser igual al documento de identidad.';
  }
  return null;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Classnames utility (simple version)
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

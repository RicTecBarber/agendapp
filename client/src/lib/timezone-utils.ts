import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Obtém o fuso horário local do navegador
 */
export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Converte uma string de data UTC para o fuso horário local
 */
export function utcToLocal(utcDateString: string): Date {
  const utcDate = parseISO(utcDateString);
  const timeZone = getLocalTimeZone();
  return toZonedTime(utcDate, timeZone);
}

/**
 * Converte uma data local para UTC
 */
export function localToUtc(localDate: Date): Date {
  const timeZone = getLocalTimeZone();
  // Cria uma data em UTC baseada na data local
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const seconds = localDate.getSeconds();
  
  // Obtém offset do timezone em minutos
  const timezoneOffset = localDate.getTimezoneOffset();
  
  // Cria uma data UTC ajustada pelo offset do timezone
  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  utcDate.setMinutes(utcDate.getMinutes() - timezoneOffset);
  
  return utcDate;
}

/**
 * Formata uma data UTC para exibição no fuso horário local
 */
export function formatLocalTime(utcDateString: string, formatStr: string = 'HH:mm'): string {
  const timeZone = getLocalTimeZone();
  return formatInTimeZone(parseISO(utcDateString), timeZone, formatStr);
}

/**
 * Formata data para YYYY-MM-DD (usado para APIs)
 */
export function formatDateForApi(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Cria uma data com a hora especificada no fuso horário local
 * e retorna o equivalente UTC para enviar ao servidor
 */
export function createUtcDateFromLocalTime(date: Date, timeString: string): Date {
  // Clone a data para não modificar a original
  const localDate = new Date(date);
  
  // Parse o timeString (formato "HH:mm")
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Defina as horas e minutos na data local
  localDate.setHours(hours, minutes, 0, 0);
  
  // Converta para UTC
  return localToUtc(localDate);
}

/**
 * Verifica se a data está no passado
 */
export function isDateInPast(date: Date): boolean {
  return date < new Date();
}
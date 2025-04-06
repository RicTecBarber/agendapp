import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { apiRequest } from '@/lib/queryClient';

// Fuso horário padrão do Brasil (Brasília)
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

// Armazena o fuso horário configurado nas configurações da barbearia
let configuredTimezone: string | null = null;

/**
 * Carrega o fuso horário configurado nas configurações da barbearia
 */
export async function loadConfiguredTimezone(): Promise<string> {
  try {
    const response = await apiRequest('GET', '/api/barbershop-settings');
    const settings = await response.json();
    if (settings && settings.timezone) {
      configuredTimezone = settings.timezone;
      console.log(`Fuso horário carregado: ${configuredTimezone}`);
    } else {
      configuredTimezone = BRAZIL_TIMEZONE;
      console.log(`Usando fuso horário padrão: ${configuredTimezone}`);
    }
    return configuredTimezone;
  } catch (error) {
    console.error('Erro ao carregar o fuso horário configurado:', error);
    configuredTimezone = BRAZIL_TIMEZONE;
    return BRAZIL_TIMEZONE;
  }
}

/**
 * Obtém o fuso horário configurado
 */
export function getLocalTimeZone(): string {
  // Retorna o fuso horário configurado ou o padrão do Brasil se não estiver configurado
  return configuredTimezone || BRAZIL_TIMEZONE;
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
  // O fuso horário de Brasília é UTC-3
  const brazilOffsetHours = -3;
  
  // Cria uma data em UTC baseada na data local
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const seconds = localDate.getSeconds();
  
  // Cria uma nova data UTC e ajusta com o offset do Brasil (UTC-3)
  // Quando for 9:00 no Brasil, será 12:00 em UTC
  const utcDate = new Date(Date.UTC(year, month, day, hours - brazilOffsetHours, minutes, seconds));
  
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
  
  // O fuso horário de Brasília é UTC-3
  const brazilOffsetHours = -3;
  
  // Cria uma data UTC considerando o fuso de Brasília
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  
  console.log(`Horário local Brasil: ${hours}:${minutes}`);
  console.log(`Ajustando para UTC: ${hours - brazilOffsetHours}:${minutes}`);
  
  // Quando for 9:00 no Brasil, será 12:00 em UTC
  const utcDate = new Date(Date.UTC(year, month, day, hours - brazilOffsetHours, minutes, 0, 0));
  
  return utcDate;
}

/**
 * Verifica se a data está no passado
 */
export function isDateInPast(date: Date): boolean {
  return date < new Date();
}
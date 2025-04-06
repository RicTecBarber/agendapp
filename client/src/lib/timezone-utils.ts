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
 * Obtém o offset do fuso horário configurado em horas
 */
export function getTimezoneOffset(): number {
  const timezone = getLocalTimeZone();
  
  // Mapa de offsets para fusos horários brasileiros
  const timezoneOffsets: Record<string, number> = {
    'America/Sao_Paulo': -3,  // UTC-3
    'America/Recife': -3,     // UTC-3
    'America/Maceio': -3,     // UTC-3
    'America/Fortaleza': -3,  // UTC-3
    'America/Bahia': -3,      // UTC-3
    'America/Belem': -3,      // UTC-3
    'America/Cuiaba': -4,     // UTC-4
    'America/Manaus': -4,     // UTC-4
    'America/Boa_Vista': -4,  // UTC-4
    'America/Porto_Velho': -4, // UTC-4
    'America/Rio_Branco': -5   // UTC-5
  };
  
  // Retorna o offset configurado ou o padrão de Brasília (-3) se não estiver no mapa
  return timezoneOffsets[timezone] || -3;
}

/**
 * Converte uma data local para UTC
 */
export function localToUtc(localDate: Date): Date {
  // Obtém o offset configurado
  const timezoneOffset = getTimezoneOffset();
  
  // Cria uma data em UTC baseada na data local
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const seconds = localDate.getSeconds();
  
  // Cria uma nova data UTC ajustando com o offset configurado
  // Por exemplo: Quando for 9:00 em UTC-3, será 12:00 em UTC
  const utcDate = new Date(Date.UTC(year, month, day, hours - timezoneOffset, minutes, seconds));
  
  console.log(`Conversão para UTC: Local (${hours}:${minutes}) => UTC (${utcDate.getUTCHours()}:${utcDate.getUTCMinutes()})`);
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
  
  // Obtém o offset configurado baseado no fuso horário selecionado
  const timezoneOffset = getTimezoneOffset();
  
  // Cria uma data UTC considerando o fuso horário configurado
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  
  console.log(`Horário local: ${hours}:${minutes} (fuso: ${getLocalTimeZone()}, offset: ${timezoneOffset})`);
  console.log(`Ajustando para UTC: ${hours - timezoneOffset}:${minutes}`);
  
  // Quando for 9:00 em fuso com offset -3, será 12:00 em UTC
  const utcDate = new Date(Date.UTC(year, month, day, hours - timezoneOffset, minutes, 0, 0));
  
  return utcDate;
}

/**
 * Verifica se a data está no passado
 */
export function isDateInPast(date: Date): boolean {
  return date < new Date();
}
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
    // É normal não conseguir carregar as configurações quando o usuário não está logado ou o tenant não existe
    // Silenciosamente use o fuso horário padrão
    configuredTimezone = BRAZIL_TIMEZONE;
    return BRAZIL_TIMEZONE;
  }
}

/**
 * ABORDAGEM SIMPLIFICADA: Sempre retorna o fuso horário padrão do Brasil
 */
export function getLocalTimeZone(): string {
  // Retorna sempre o padrão do Brasil
  console.log(`Usando fuso horário fixo: ${BRAZIL_TIMEZONE}`);
  return BRAZIL_TIMEZONE;
}

/**
 * NOVA ABORDAGEM: Não convertemos mais de UTC para local
 * Simplesmente parseamos a string da data e a retornamos como está
 */
export function utcToLocal(utcDateString: string): Date {
  // Simplesmente parseamos a string para objeto Date sem converter fusos
  const date = parseISO(utcDateString);
  console.log(`[NOVA ABORDAGEM] utcToLocal - Data original: ${utcDateString}, Retornando: ${date.toISOString()}`);
  return date;
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
 * NOVA ABORDAGEM: Não convertemos mais para UTC
 * Retornamos a data local como está para trabalhar apenas com horários locais
 */
export function localToUtc(localDate: Date): Date {
  // Clone a data para não modificar a original
  const clonedDate = new Date(localDate);
  
  console.log(`[NOVA ABORDAGEM] localToUtc - Não convertendo mais: ${clonedDate.toISOString()}`);
  return clonedDate;
}

/**
 * NOVA ABORDAGEM: Formata uma data para exibição sem fazer conversões de fuso
 */
export function formatLocalTime(dateString: string, formatStr: string = 'HH:mm'): string {
  // Simplesmente parse a data e formata-a diretamente, sem conversões de fuso
  const date = parseISO(dateString);
  return format(date, formatStr);
}

/**
 * Formata data para YYYY-MM-DD (usado para APIs)
 */
export function formatDateForApi(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Cria uma data com a hora especificada e a formata para salvar como UTC
 * usando Date.UTC para garantir que os horários não sejam convertidos pelo fuso do servidor
 */
export function createUtcDateFromLocalTime(date: Date, timeString: string): Date {
  // Parse o timeString (formato "HH:mm")
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // CORREÇÃO: Criar a data com UTC para garantir que o horário seja preservado exatamente como informado
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Criar a data usando UTC para evitar conversões automáticas do fuso horário do servidor
  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
  
  console.log(`[CORREÇÃO] Criando data com UTC: ano=${year}, mês=${month+1}, dia=${day}, hora=${hours}:${minutes}`);
  console.log(`[CORREÇÃO] Data resultante em ISO: ${utcDate.toISOString()}`);
  console.log(`[CORREÇÃO] Horas extraídas (UTC): ${utcDate.getUTCHours()}:${utcDate.getUTCMinutes()}`);
  
  // Formato especial para o backend (marca que usamos nossa solução customizada)
  const isoWithLocalMarker = `${utcDate.toISOString().slice(0, -1)}LOCAL`;
  console.log(`[CORREÇÃO] Data com marcador LOCAL: ${isoWithLocalMarker}`);
  
  // Adicionar propriedade especial à data para o backend reconhecer
  Object.defineProperty(utcDate, 'toJSON', {
    value: function() {
      return isoWithLocalMarker;
    }
  });
  
  return utcDate;
}

/**
 * Verifica se a data está no passado
 */
export function isDateInPast(date: Date): boolean {
  return date < new Date();
}
// Função para converter uma string de tempo (formato HH:MM) em um objeto com horas e minutos
export function parseTime(timeStr: string): { hours: number, minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}
import { QueryClient, QueryFunction, DefaultOptions } from "@tanstack/react-query";

// Cache TTL padrão em milissegundos
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutos
const DEFAULT_CACHE_TIME = 60 * 60 * 1000; // 1 hora

// Verificar se estamos em um dispositivo móvel com base no userAgent
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Determinar se a conexão está lenta
function isConnectionSlow(): boolean {
  // Usar API Connection se disponível
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      return conn.saveData || 
             conn.effectiveType === 'slow-2g' || 
             conn.effectiveType === '2g' || 
             conn.effectiveType === '3g';
    }
  }
  
  // Fallback para detecção baseada em largura de banda
  return false;
}

// Detectar problemas de rede
function detectNetworkIssues(): Promise<boolean> {
  return new Promise((resolve) => {
    // Verificar se o navegador está online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      resolve(true);
      return;
    }
    
    // Testar ping para verificar latência da conexão
    const start = Date.now();
    const pingUrl = '/api/barbershop-settings'; // Endpoint leve para testar latência
    
    fetch(pingUrl, { 
      method: 'HEAD',
      cache: 'no-store' 
    })
      .then(response => {
        const latency = Date.now() - start;
        resolve(latency > 1000); // Se latência > 1 segundo, considera conexão problemática
      })
      .catch(() => {
        resolve(true); // Se o ping falhar, assume problemas de rede
      });
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Configurações otimizadas para devices móveis
function getDefaultQueryOptions(): Partial<DefaultOptions> {
  const isMobile = isMobileDevice();
  const slowConnection = isConnectionSlow();
  const shouldOptimize = isMobile || slowConnection;
  
  // Em dispositivos com baixo desempenho, aumentar tempos de cache
  const staleTime = shouldOptimize 
    ? DEFAULT_STALE_TIME * 3 // 15 minutos para dispositivos lentos
    : DEFAULT_STALE_TIME;
  
  return {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: !shouldOptimize, // Desativar refetch em foco para dispositivos lentos
      staleTime: staleTime,
      // cacheTime: DEFAULT_CACHE_TIME, - O nome dessa propriedade mudou na v5 do tanstack query
      refetchOnMount: false, // Não refetchar automaticamente ao montar o componente
      retry: (failureCount, error) => {
        // Limitar retentativas em dispositivos lentos
        if (shouldOptimize && failureCount >= 1) return false;
        
        // Não tentar novamente para erros 4xx
        if (error instanceof Error && error.message.startsWith('4')) {
          return false;
        }
        
        return failureCount < 2; // Máximo de 2 tentativas para outros casos
      },
      // Estratégia de persistência em cache
      structuralSharing: true,
      keepPreviousData: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Limitar retentativas em dispositivos lentos
        if (shouldOptimize && failureCount >= 1) return false;
        
        // Não tentar novamente para erros 4xx
        if (error instanceof Error && error.message.startsWith('4')) {
          return false;
        }
        
        return failureCount < 1; // Apenas 1 tentativa adicional para mutações
      },
      onError: (error) => {
        console.error('Erro na mutação:', error);
      }
    },
  };
}

// Função para criar uma instância do cliente de consulta (query client)
export function createOptimizedQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: getDefaultQueryOptions()
  });
  
  try {
    // Persistência manual simples para localStorage
    if (typeof window !== 'undefined') {
      // Salvar cache quando o aplicativo é fechado
      window.addEventListener('beforeunload', () => {
        try {
          // Obter dados do cache atual
          const queryCache = queryClient.getQueryCache();
          const queries = queryCache.getAll();
          
          // Salvar apenas os dados mais importantes
          const cacheToSave = queries
            .filter(query => 
              // Filtrar apenas consultas que vale a pena persistir
              query.state.status === 'success' && 
              !query.queryKey.some(k => k.toString().includes('temp')) &&
              !query.queryKey.some(k => k.toString().includes('timestamp'))
            )
            .map(query => ({
              queryKey: query.queryKey,
              data: query.state.data,
              dataUpdatedAt: query.state.dataUpdatedAt
            }));
          
          if (cacheToSave.length > 0) {
            window.localStorage.setItem('agenda-app-cache', JSON.stringify(cacheToSave));
          }
        } catch (error) {
          console.error('Erro ao salvar cache:', error);
        }
      });
      
      // Restaurar dados do cache quando o aplicativo inicia
      try {
        const cachedData = window.localStorage.getItem('agenda-app-cache');
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);
          
          // Restaurar cada consulta individualmente
          if (Array.isArray(parsedCache)) {
            parsedCache.forEach(item => {
              if (item.queryKey && item.data) {
                queryClient.setQueryData(item.queryKey, item.data);
              }
            });
          }
        }
      } catch (error) {
        console.error('Erro ao restaurar cache:', error);
        // Limpar cache corrompido
        window.localStorage.removeItem('agenda-app-cache');
      }
    }
  } catch (e) {
    console.error('Erro ao configurar persistência de cache:', e);
  }
  
  return queryClient;
}

// API request otimizado com timeout, retry e lógica de offline
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: {
    timeout?: number;
    retries?: number;
    checkNetworkFirst?: boolean;
    abortSignal?: AbortSignal;
  } = {},
): Promise<Response> {
  const { 
    timeout = 30000, // 30 segundos timeout padrão
    retries = 1,
    checkNetworkFirst = false,
    abortSignal
  } = options;
  
  // Verificar problemas de rede antes de tentar a requisição
  if (checkNetworkFirst) {
    const hasNetworkIssues = await detectNetworkIssues();
    if (hasNetworkIssues) {
      throw new Error('Problemas de conexão detectados. Verifique sua internet e tente novamente.');
    }
  }
  
  // Lógica de retry com exponential backoff
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Configurar timeout para evitar requisições pendentes por muito tempo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const signal = abortSignal || controller.signal;
      
      const res = await fetch(url, {
        method,
        headers: {
          ...(data ? { "Content-Type": "application/json" } : {}),
          // Adicionar cabeçalho para identificar solicitações de dispositivos móveis
          'X-Device-Type': isMobileDevice() ? 'mobile' : 'desktop',
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        signal,
        // Cache optimizations
        cache: method.toUpperCase() === 'GET' ? 'default' : 'no-store',
      });
      
      clearTimeout(timeoutId);
      await throwIfResNotOk(res);
      return res;
    } catch (error: any) {
      lastError = error;
      
      // Se for um erro de timeout ou abort, não tentar novamente
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error('A solicitação excedeu o tempo limite. Tente novamente mais tarde.');
      }
      
      // Se não for o último retry, esperar antes de tentar novamente
      if (attempt < retries) {
        // Exponential backoff: 300ms, 600ms, 1.2s, etc.
        const backoffTime = Math.min(300 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  // Se chegamos aqui, todas as tentativas falharam
  throw lastError || new Error('Falha na requisição após múltiplas tentativas');
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Adicionar adaptação para conexões lentas
    const isLowPerformance = isMobileDevice() || isConnectionSlow();
    const timeout = isLowPerformance ? 45000 : 30000; // Timeout maior para dispositivos lentos
    const shouldUseCache = isLowPerformance && typeof window !== 'undefined' && 'caches' in window;
    
    // URL a ser buscada
    const url = queryKey[0] as string;
    
    // Em dispositivos de baixo desempenho, tentar buscar do cache primeiro
    if (shouldUseCache) {
      try {
        const cache = await window.caches.open('agenda-app-api-cache');
        const cachedResponse = await cache.match(url);
        
        if (cachedResponse) {
          const data = await cachedResponse.json();
          
          // Iniciar a revalidação em segundo plano
          fetch(url, { credentials: "include" })
            .then(async res => {
              if (res.ok) {
                const newData = await res.clone().json();
                await cache.put(url, res);
                // Atualizar o cache client com os novos dados
                queryClient.setQueryData(queryKey, newData);
              }
            })
            .catch(err => console.error('Falha na revalidação:', err));
          
          // Retornar dados do cache imediatamente
          return data;
        }
      } catch (e) {
        console.error('Erro ao acessar cache:', e);
        // Continuar com fetch normal se o cache falhar
      }
    }
    
    // Configurar timeout para evitar requisições pendentes por muito tempo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
        headers: {
          'X-Device-Type': isMobileDevice() ? 'mobile' : 'desktop',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Salvar no cache para uso futuro em dispositivos lentos
      if (shouldUseCache && res.ok) {
        try {
          const cache = await window.caches.open('agenda-app-api-cache');
          await cache.put(url, new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=3600', // 1 hora
            }
          }));
        } catch (e) {
          console.error('Erro ao salvar no cache:', e);
        }
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Mensagens de erro mais amigáveis
      if (error.name === 'AbortError') {
        throw new Error('A requisição demorou muito tempo. Verifique sua conexão.');
      }
      
      throw error;
    }
  };

// Criar instância do cliente de consulta
export const queryClient = createOptimizedQueryClient();

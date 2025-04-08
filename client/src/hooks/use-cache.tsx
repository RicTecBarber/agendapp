import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShouldOptimize } from '@/hooks/use-mobile';

// Tipos para a configuração do cache
interface CacheOptions {
  // Tempo de vida do cache em milissegundos
  ttl?: number;
  // Usar localStorage para persistência entre sessões 
  persistent?: boolean;
  // Nome do cache (para storage persistente)
  cacheName?: string;
  // Prefixo usado para todas as chaves deste cache
  keyPrefix?: string;
}

// Implementação principal do hook
export function useLocalCache<T>(defaultOptions?: CacheOptions) {
  const shouldOptimize = useShouldOptimize();
  
  // Configurações padrão
  const options = useMemo(() => ({
    ttl: 1000 * 60 * 30, // 30 minutos padrão
    persistent: true,
    cacheName: 'app-cache',
    keyPrefix: 'cache:',
    ...defaultOptions
  }), [defaultOptions]);

  // Cache em memória (otimizado para dispositivos móveis)
  const memoryCache = useMemo(() => new Map<string, { data: T, timestamp: number }>(), []);

  // Função para gerar uma chave completa com o prefixo
  const getFullKey = useCallback((key: string): string => {
    return `${options.keyPrefix}${key}`;
  }, [options.keyPrefix]);

  // Verificar se o item está expirado
  const isExpired = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp > options.ttl;
  }, [options.ttl]);

  // Obter um item do cache
  const getItem = useCallback(<R = T>(key: string): R | null => {
    const fullKey = getFullKey(key);
    
    // Tentar ler do cache em memória primeiro (mais rápido)
    if (memoryCache.has(fullKey)) {
      const cachedItem = memoryCache.get(fullKey);
      if (cachedItem && !isExpired(cachedItem.timestamp)) {
        return cachedItem.data as R;
      }
      // Se expirado, remover do cache em memória
      memoryCache.delete(fullKey);
    }
    
    // Se persistente e não encontrado em memória, tentar localStorage
    if (options.persistent && typeof window !== 'undefined') {
      try {
        const storedItem = localStorage.getItem(`${options.cacheName}:${fullKey}`);
        if (storedItem) {
          const parsedItem = JSON.parse(storedItem);
          
          if (!isExpired(parsedItem.timestamp)) {
            // Atualizar cache em memória para futuras leituras
            memoryCache.set(fullKey, parsedItem);
            return parsedItem.data as R;
          }
          
          // Se expirado, remover do localStorage
          localStorage.removeItem(`${options.cacheName}:${fullKey}`);
        }
      } catch (error) {
        console.error('Erro ao ler do cache persistente:', error);
      }
    }
    
    return null;
  }, [getFullKey, isExpired, memoryCache, options.cacheName, options.persistent]);

  // Definir um item no cache
  const setItem = useCallback((key: string, data: T, customTtl?: number): void => {
    if (data === undefined || data === null) return;
    
    const fullKey = getFullKey(key);
    const timestamp = Date.now();
    const cacheItem = { data, timestamp };
    
    // Sempre salvar em memória
    memoryCache.set(fullKey, cacheItem);
    
    // Se configurado para persistência, salvar também no localStorage
    if (options.persistent && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `${options.cacheName}:${fullKey}`,
          JSON.stringify(cacheItem)
        );
      } catch (error) {
        console.error('Erro ao salvar no cache persistente:', error);
        
        // Em caso de quota excedida, tentar limpar itens antigos
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          cleanExpiredItems();
        }
      }
    }
    
    // Se foi definido um TTL personalizado, criar um timeout para expiração
    if (customTtl) {
      setTimeout(() => {
        removeItem(key);
      }, customTtl);
    }
  }, [getFullKey, memoryCache, options.cacheName, options.persistent]);

  // Remover um item do cache
  const removeItem = useCallback((key: string): void => {
    const fullKey = getFullKey(key);
    
    // Remover da memória
    memoryCache.delete(fullKey);
    
    // Remover do localStorage se persistente
    if (options.persistent && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${options.cacheName}:${fullKey}`);
      } catch (error) {
        console.error('Erro ao remover do cache persistente:', error);
      }
    }
  }, [getFullKey, memoryCache, options.cacheName, options.persistent]);

  // Limpar todo o cache (memória e persistente)
  const clearCache = useCallback((): void => {
    // Limpar memória
    memoryCache.clear();
    
    // Limpar localStorage se persistente
    if (options.persistent && typeof window !== 'undefined') {
      try {
        // Remover apenas os itens deste cache específico
        const prefix = `${options.cacheName}:${options.keyPrefix}`;
        
        Object.keys(localStorage)
          .filter(key => key.startsWith(prefix))
          .forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.error('Erro ao limpar cache persistente:', error);
      }
    }
  }, [memoryCache, options.cacheName, options.keyPrefix, options.persistent]);

  // Limpar itens expirados do cache (útil para economizar espaço)
  const cleanExpiredItems = useCallback((): void => {
    // Limpar da memória
    for (const [key, item] of memoryCache.entries()) {
      if (isExpired(item.timestamp)) {
        memoryCache.delete(key);
      }
    }
    
    // Limpar do localStorage se persistente
    if (options.persistent && typeof window !== 'undefined') {
      try {
        const prefix = `${options.cacheName}:${options.keyPrefix}`;
        
        Object.keys(localStorage)
          .filter(key => key.startsWith(prefix))
          .forEach(key => {
            try {
              const item = JSON.parse(localStorage.getItem(key) || '');
              if (isExpired(item.timestamp)) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              // Se não puder ser parseado, remover
              localStorage.removeItem(key);
            }
          });
      } catch (error) {
        console.error('Erro ao limpar itens expirados do cache persistente:', error);
      }
    }
  }, [isExpired, memoryCache, options.cacheName, options.keyPrefix, options.persistent]);

  // Limpar itens expirados periodicamente (mais frequente em dispositivos otimizados)
  useEffect(() => {
    const interval = setInterval(
      cleanExpiredItems, 
      shouldOptimize ? 1000 * 60 * 5 : 1000 * 60 * 30  // 5 ou 30 minutos
    );
    
    // Cleanup do interval
    return () => clearInterval(interval);
  }, [cleanExpiredItems, shouldOptimize]);

  // API retornada pelo hook
  return {
    getItem,
    setItem,
    removeItem,
    clearCache,
    cleanExpiredItems
  };
}

// Hook simplificado para uso em componentes
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>, 
  options?: CacheOptions & { 
    disabled?: boolean,
    refetchInterval?: number 
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const shouldOptimize = useShouldOptimize();
  const cache = useLocalCache<T>(options);
  
  const refetch = useCallback(async (force: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar cache somente se não for forçado a atualizar
      if (!force && !options?.disabled) {
        const cachedData = cache.getItem(key);
        if (cachedData !== null) {
          setData(cachedData);
          setIsLoading(false);
          
          // Se estamos otimizando, podemos retornar os dados do cache sem refetch
          if (shouldOptimize) {
            return;
          }
        }
      }
      
      // Buscar novos dados
      const newData = await fetcher();
      setData(newData);
      
      // Atualizar cache se não desabilitado
      if (!options?.disabled) {
        cache.setItem(key, newData);
      }
      
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Em caso de erro, tentar usar dados do cache mesmo que force=true
      if (!options?.disabled) {
        const cachedData = cache.getItem(key);
        if (cachedData !== null) {
          setData(cachedData);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [cache, fetcher, key, options?.disabled, shouldOptimize]);
  
  // Efeito para carregar dados iniciais e configurar refetch periódico
  useEffect(() => {
    // Carregar dados imediatamente
    refetch();
    
    // Configurar refetch periódico se especificado
    if (options?.refetchInterval) {
      const intervalTime = shouldOptimize 
        ? Math.max(options.refetchInterval, 60000) // Mínimo 1 minuto para dispositivos otimizados
        : options.refetchInterval;
        
      const interval = setInterval(() => refetch(), intervalTime);
      return () => clearInterval(interval);
    }
  }, [options?.refetchInterval, refetch, shouldOptimize]);
  
  return { 
    data, 
    isLoading, 
    error, 
    refetch, 
    lastUpdated 
  };
}

// Hook para armazenar dados de formulário localmente 
// (útil para salvar progresso em formulários longos)
export function useCachedForm<T extends Record<string, any>>(
  formId: string,
  initialValues: T, 
  options?: CacheOptions & { 
    autoSaveDelay?: number, 
    disabled?: boolean 
  }
) {
  const [formData, setFormData] = useState<T>(initialValues);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  
  const cache = useLocalCache<T>(options);
  const autoSaveDelay = options?.autoSaveDelay || 2000; // 2 segundos padrão
  
  // Carregar dados do cache ao inicializar
  useEffect(() => {
    if (options?.disabled) return;
    
    const cachedFormData = cache.getItem<T>(formId);
    if (cachedFormData) {
      setFormData(cachedFormData);
    }
  }, [cache, formId, options?.disabled]);
  
  // Salvar no cache quando formData mudar
  useEffect(() => {
    if (options?.disabled || !isDirty) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      
      try {
        cache.setItem(formId, formData);
        setLastSaved(Date.now());
        setIsDirty(false);
      } catch (error) {
        console.error('Erro ao salvar formulário no cache:', error);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);
    
    return () => clearTimeout(timer);
  }, [autoSaveDelay, cache, formData, formId, isDirty, options?.disabled]);
  
  // Atualizar valores do formulário
  const updateFormValues = useCallback((values: Partial<T>) => {
    setFormData(prev => ({
      ...prev,
      ...values
    }));
    setIsDirty(true);
  }, []);
  
  // Limpar formulário e cache associado
  const resetForm = useCallback((newValues?: T) => {
    const valuesToSet = newValues || initialValues;
    setFormData(valuesToSet);
    
    if (!options?.disabled) {
      if (newValues) {
        // Se novos valores foram fornecidos, atualizar o cache
        cache.setItem(formId, valuesToSet);
      } else {
        // Caso contrário, remover do cache
        cache.removeItem(formId);
      }
    }
    
    setIsDirty(false);
    setLastSaved(newValues ? Date.now() : null);
  }, [cache, formId, initialValues, options?.disabled]);
  
  return {
    formData,
    updateFormValues,
    resetForm,
    isDirty,
    isSaving,
    lastSaved
  };
}

// Hook para armazenar temporariamente um conjunto de dados complexos
// Útil para gerenciar estado temporário entre páginas sem usar context
export function useSharedCache<T = any>(namespace = 'shared') {
  const cache = useLocalCache<Record<string, any>>({
    ttl: 1000 * 60 * 60, // 1 hora
    persistent: true,
    cacheName: 'shared-state',
    keyPrefix: namespace + ':'
  });
  
  // Obter um valor específico de um namespace
  const getValue = useCallback(<R = any>(key: string): R | null => {
    const data = cache.getItem<Record<string, any>>(namespace);
    if (!data) return null;
    return (data[key] as R) || null;
  }, [cache, namespace]);
  
  // Definir um valor específico em um namespace
  const setValue = useCallback(<R = any>(key: string, value: R): void => {
    const currentData = cache.getItem<Record<string, any>>(namespace) || {};
    const newData = {
      ...currentData,
      [key]: value
    };
    cache.setItem(namespace, newData);
  }, [cache, namespace]);
  
  // Remover um valor específico de um namespace
  const removeValue = useCallback((key: string): void => {
    const currentData = cache.getItem<Record<string, any>>(namespace);
    if (!currentData) return;
    
    const { [key]: _, ...rest } = currentData;
    cache.setItem(namespace, rest);
  }, [cache, namespace]);
  
  // Limpar todo o namespace
  const clearNamespace = useCallback((): void => {
    cache.removeItem(namespace);
  }, [cache, namespace]);
  
  return {
    getValue,
    setValue,
    removeValue,
    clearNamespace
  };
}
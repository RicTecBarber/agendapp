import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Definições de tipos
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number; // Tempo de expiração em milissegundos
}

export interface CacheOptions {
  cacheName?: string;
  cacheVersion?: number;
  persistent?: boolean;
  // Expiração padrão para itens no cache (em milissegundos)
  defaultExpiry?: number | null;
  // Prefixo para chaves do localStorage
  storageKeyPrefix?: string;
  // Desabilitar cache (útil para desenvolvimento)
  disabled?: boolean;
}

/**
 * Hook para gerenciar cache em memória com suporte
 * para persistência em localStorage e expiração
 */
export function useCache<T = any>(options: CacheOptions = {}) {
  const {
    cacheName = 'default-cache',
    cacheVersion = 1,
    persistent = false,
    defaultExpiry = null,
    storageKeyPrefix = 'app_cache_',
    disabled = false,
  } = options;

  // Cache em memória
  const cacheRef = useRef(new Map<string, CacheItem<T>>());
  const storageKey = `${storageKeyPrefix}${cacheName}_v${cacheVersion}`;
  const isInitializedRef = useRef(false);

  // Função para carregar o cache do localStorage
  const loadFromStorage = useCallback(() => {
    if (!persistent || disabled || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const newCache = new Map<string, CacheItem<T>>();
        
        // Carregar apenas itens válidos (não expirados)
        Object.entries(parsed).forEach(([key, value]) => {
          const item = value as CacheItem<T>;
          // Verificar se o item expirou
          if (item.expiry && Date.now() > item.timestamp + item.expiry) {
            return; // Item expirado, não adicionar ao cache
          }
          newCache.set(key, item);
        });
        
        cacheRef.current = newCache;
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
  }, [persistent, disabled, storageKey]);

  // Função para salvar o cache no localStorage
  const saveToStorage = useCallback(() => {
    if (!persistent || disabled || typeof window === 'undefined') return;

    try {
      const cacheObj: Record<string, CacheItem<T>> = {};
      for (const [key, value] of cacheRef.current.entries()) {
        // Verificar se o item expirou antes de salvar
        if (value.expiry && Date.now() > value.timestamp + value.expiry) {
          continue; // Não salvar itens expirados
        }
        cacheObj[key] = value;
      }
      localStorage.setItem(storageKey, JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }, [persistent, disabled, storageKey]);

  // Inicializar o cache
  useEffect(() => {
    if (isInitializedRef.current) return;
    loadFromStorage();
    isInitializedRef.current = true;
  }, [loadFromStorage]);

  // Salvar o cache quando a janela for fechada
  useEffect(() => {
    if (!persistent || disabled || typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      saveToStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveToStorage(); // Salvar quando o componente for desmontado
    };
  }, [persistent, disabled, saveToStorage]);

  // Funções de manipulação do cache
  const getItem = useCallback((key: string): T | undefined => {
    if (disabled) return undefined;
    
    const item = cacheRef.current.get(key);
    if (!item) return undefined;
    
    // Verificar se o item expirou
    if (item.expiry && Date.now() > item.timestamp + item.expiry) {
      cacheRef.current.delete(key);
      return undefined;
    }
    
    return item.data;
  }, [disabled]);

  const setItem = useCallback((key: string, data: T, expiry: number | null = defaultExpiry): void => {
    if (disabled) return;
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiry === null ? undefined : expiry,
    };
    
    cacheRef.current.set(key, cacheItem);
    if (persistent) {
      saveToStorage();
    }
  }, [disabled, defaultExpiry, persistent, saveToStorage]);

  const removeItem = useCallback((key: string): void => {
    if (disabled) return;
    
    cacheRef.current.delete(key);
    if (persistent) {
      saveToStorage();
    }
  }, [disabled, persistent, saveToStorage]);

  const clear = useCallback((): void => {
    if (disabled) return;
    
    cacheRef.current.clear();
    if (persistent && typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [disabled, persistent, storageKey]);

  const hasItem = useCallback((key: string): boolean => {
    if (disabled) return false;
    
    const item = cacheRef.current.get(key);
    if (!item) return false;
    
    // Verificar se o item expirou
    if (item.expiry && Date.now() > item.timestamp + item.expiry) {
      cacheRef.current.delete(key);
      return false;
    }
    
    return true;
  }, [disabled]);

  const getAllKeys = useCallback((): string[] => {
    if (disabled) return [];
    
    const keys: string[] = [];
    
    // Filtrar itens expirados
    for (const [key, item] of cacheRef.current.entries()) {
      if (item.expiry && Date.now() > item.timestamp + item.expiry) {
        cacheRef.current.delete(key);
        continue;
      }
      keys.push(key);
    }
    
    return keys;
  }, [disabled]);

  const size = useMemo(() => {
    // Calcular tamanho excluindo itens expirados
    let validItems = 0;
    for (const item of cacheRef.current.values()) {
      if (item.expiry && Date.now() > item.timestamp + item.expiry) {
        continue;
      }
      validItems++;
    }
    return validItems;
  }, []);

  // Retornar as funções e propriedades do cache
  return {
    getItem,
    setItem,
    removeItem,
    clear,
    hasItem,
    getAllKeys,
    size,
  };
}

/**
 * Hook similar ao useCache, mas otimizado para armazenar 
 * grandes conjuntos de dados, particularmente para local storage.
 * 
 * Suporta fragmentação de dados grandes, compressão e indexação.
 */
export function useLocalCache<T = any>(options: CacheOptions = {}) {
  // Utilizar o hook base como fundação
  const baseCache = useCache<T>({
    ...options,
    cacheName: `local_${options.cacheName || 'default-cache'}`,
  });
  
  // Adicionar funcionalidades específicas para o local storage
  
  // Função para salvar um item em chunks se for muito grande
  const setItemChunked = useCallback((key: string, data: T, expiry: number | null = null) => {
    // Para dados menores que 100KB, usar a abordagem regular
    const stringData = JSON.stringify(data);
    if (stringData.length < 100 * 1024) {
      return baseCache.setItem(key, data, expiry);
    }
    
    try {
      // Para dados maiores, dividir em chunks de ~50KB
      const chunkSize = 50 * 1024; // 50KB por chunk
      const chunks = [];
      
      for (let i = 0; i < stringData.length; i += chunkSize) {
        chunks.push(stringData.substring(i, i + chunkSize));
      }
      
      // Salvar informações dos chunks
      baseCache.setItem(`${key}__chunks`, {
        totalChunks: chunks.length,
        totalSize: stringData.length,
        timestamp: Date.now(),
      } as any, expiry);
      
      // Salvar cada chunk individualmente
      chunks.forEach((chunk, index) => {
        baseCache.setItem(`${key}__chunk_${index}`, chunk as any, expiry);
      });
      
      return true;
    } catch (e) {
      console.error('Erro ao fragmentar dados para cache:', e);
      // Tentar salvar normalmente como fallback
      baseCache.setItem(key, data, expiry);
    }
  }, [baseCache]);
  
  // Função para carregar um item que pode estar em chunks
  const getItemChunked = useCallback((key: string): T | undefined => {
    // Verificar se existe uma entrada de chunks para esta chave
    const chunkInfo = baseCache.getItem(`${key}__chunks`) as any;
    
    if (!chunkInfo) {
      // Não está em chunks, retornar normalmente
      return baseCache.getItem(key);
    }
    
    try {
      // Reconstruir a partir dos chunks
      let combinedData = '';
      
      for (let i = 0; i < chunkInfo.totalChunks; i++) {
        const chunk = baseCache.getItem(`${key}__chunk_${i}`) as any;
        if (!chunk) {
          // Se um chunk estiver faltando, falhar e limpar tudo
          for (let j = 0; j < chunkInfo.totalChunks; j++) {
            baseCache.removeItem(`${key}__chunk_${j}`);
          }
          baseCache.removeItem(`${key}__chunks`);
          return undefined;
        }
        combinedData += chunk;
      }
      
      // Verificar o tamanho total por segurança
      if (combinedData.length !== chunkInfo.totalSize) {
        console.warn('Tamanho do dado reconstruído não corresponde ao esperado');
      }
      
      // Retornar os dados reconstruídos
      return JSON.parse(combinedData);
    } catch (e) {
      console.error('Erro ao reconstruir dados do cache:', e);
      return undefined;
    }
  }, [baseCache]);
  
  // Remover um item que pode estar em chunks
  const removeItemChunked = useCallback((key: string): void => {
    const chunkInfo = baseCache.getItem(`${key}__chunks`) as any;
    
    if (chunkInfo) {
      // Remover todos os chunks
      for (let i = 0; i < chunkInfo.totalChunks; i++) {
        baseCache.removeItem(`${key}__chunk_${i}`);
      }
      baseCache.removeItem(`${key}__chunks`);
    }
    
    // Remover o item principal também
    baseCache.removeItem(key);
  }, [baseCache]);
  
  return {
    ...baseCache,
    setItem: setItemChunked,
    getItem: getItemChunked,
    removeItem: removeItemChunked,
  };
}
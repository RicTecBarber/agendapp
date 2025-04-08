import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Constantes para gerenciamento de memória
 */
const MEMORY_CHECK_INTERVAL = 30000; // 30 segundos
const LOW_MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB em bytes
const CRITICAL_MEMORY_THRESHOLD = 50 * 1024 * 1024; // 50MB em bytes
const RESOURCE_MEMORY_ESTIMATES = {
  images: {
    lowRes: 0.5 * 1024 * 1024, // 500KB por imagem de baixa resolução
    highRes: 2 * 1024 * 1024, // 2MB por imagem de alta resolução
    animation: 5 * 1024 * 1024 // 5MB por animação
  },
  videos: {
    preview: 5 * 1024 * 1024, // 5MB para um preview de vídeo
    medium: 20 * 1024 * 1024, // 20MB para um vídeo médio
    high: 50 * 1024 * 1024 // 50MB para um vídeo HD
  },
  animations: {
    simple: 1 * 1024 * 1024, // 1MB para animações simples
    complex: 5 * 1024 * 1024 // 5MB para animações complexas
  }
};

/**
 * Hook para monitorar a memória disponível do navegador
 * e fornecer callbacks/utilidades para gerenciamento de memória
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
    jsHeapSizeLimit?: number;
    availableMemory?: number;
    isLowMemory: boolean;
    isCriticalMemory: boolean;
  }>({
    isLowMemory: false,
    isCriticalMemory: false
  });
  
  const memoryWarningShown = useRef<boolean>(false);
  
  const checkMemory = useCallback(() => {
    // Verifica se a API de Performance está disponível
    if (typeof performance === 'undefined' || !performance.memory) {
      return null;
    }
    
    try {
      const memory = (performance as any).memory;
      const totalJSHeapSize = memory?.totalJSHeapSize;
      const usedJSHeapSize = memory?.usedJSHeapSize;
      const jsHeapSizeLimit = memory?.jsHeapSizeLimit;
      const availableMemory = jsHeapSizeLimit - usedJSHeapSize;
      
      const isLowMemory = availableMemory < LOW_MEMORY_THRESHOLD;
      const isCriticalMemory = availableMemory < CRITICAL_MEMORY_THRESHOLD;
      
      // Definir flags globais para otimização
      if (typeof window !== 'undefined') {
        window.__OPTIMIZE_IMAGES = isLowMemory;
      }
      
      // Mostrar aviso de memória baixa
      if (isCriticalMemory && !memoryWarningShown.current && typeof window !== 'undefined') {
        memoryWarningShown.current = true;
        window.__MEMORY_WARNING_SHOWN = true;
        console.warn('Memória crítica detectada. Otimizações de memória ativadas.');
      }
      
      return {
        totalJSHeapSize,
        usedJSHeapSize,
        jsHeapSizeLimit,
        availableMemory,
        isLowMemory,
        isCriticalMemory
      };
    } catch (error) {
      console.error('Erro ao verificar memória:', error);
      return null;
    }
  }, []);
  
  // Atualizar informações de memória periodicamente
  useEffect(() => {
    // Verificação inicial
    const initialMemoryInfo = checkMemory();
    if (initialMemoryInfo) {
      setMemoryInfo(initialMemoryInfo);
    }
    
    // Configurar intervalo para verificação periódica
    const intervalId = setInterval(() => {
      const memoryInfo = checkMemory();
      if (memoryInfo) {
        setMemoryInfo(memoryInfo);
      }
    }, MEMORY_CHECK_INTERVAL);
    
    // Limpeza
    return () => clearInterval(intervalId);
  }, [checkMemory]);
  
  // Função para liberar memória sob demanda
  const freeMemory = useCallback(() => {
    // Forçar coleta de lixo se o navegador suportar
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        console.warn('Falha ao tentar liberar memória:', error);
      }
    }
    
    // Limpar caches que possam estar consumindo memória
    if (typeof caches !== 'undefined') {
      try {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('image') || name.includes('media')) {
              caches.delete(name);
            }
          });
        });
      } catch (error) {
        console.warn('Falha ao limpar caches:', error);
      }
    }
  }, []);
  
  return {
    ...memoryInfo,
    checkMemory,
    freeMemory
  };
}

/**
 * Verifica se há memória suficiente disponível para carregar recursos pesados
 * como imagens de alta resolução, vídeos, etc.
 */
export function hasEnoughMemoryFor(resourceType: 'images' | 'videos' | 'animations'): boolean {
  // Se não temos acesso à API de memória, assumir que tem memória suficiente
  if (typeof performance === 'undefined' || !performance.memory) {
    return true;
  }
  
  try {
    const memory = (performance as any).memory;
    if (!memory) return true;
    
    const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    
    // Verificar com base no tipo de recurso
    switch (resourceType) {
      case 'images':
        // Assumir que vamos carregar várias imagens (10)
        return availableMemory > (RESOURCE_MEMORY_ESTIMATES.images.highRes * 10);
      case 'videos':
        // Verificar para um vídeo médio
        return availableMemory > RESOURCE_MEMORY_ESTIMATES.videos.medium;
      case 'animations':
        // Verificar para várias animações simples (5)
        return availableMemory > (RESOURCE_MEMORY_ESTIMATES.animations.simple * 5);
      default:
        return true;
    }
  } catch (error) {
    console.warn('Erro ao verificar memória disponível:', error);
    return true; // Em caso de erro, permitir carregamento
  }
}

/**
 * Hook para detectar e prevenir vazamentos de memória
 * em componentes com muitos elementos ou dados
 */
export function useLeakPrevention(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const unmountHandler = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef<boolean>(true);
  
  useEffect(() => {
    // Registrar quando o componente é montado
    mountTime.current = Date.now();
    isMounted.current = true;
    
    return () => {
      // Quando o componente é desmontado
      isMounted.current = false;
      
      // Verificar quanto tempo o componente esteve montado
      const mountDuration = Date.now() - mountTime.current;
      
      // Para componentes que estiveram montados por mais tempo,
      // agendar uma verificação após a desmontagem para garantir
      // que a memória foi liberada
      if (mountDuration > 60000) { // 1 minuto ou mais
        unmountHandler.current = setTimeout(() => {
          // Forçar coleta de lixo se possível
          if ('gc' in window) {
            try {
              (window as any).gc();
            } catch (error) {
              // Silenciar erro
            }
          }
          
          // Verificar memória após a coleta de lixo
          if (typeof performance !== 'undefined' && performance.memory) {
            const memory = (performance as any).memory;
            console.info(`[MemoryCheck] ${componentName} liberou ${Math.round(memory.usedJSHeapSize / (1024 * 1024))}MB após desmontagem`);
          }
        }, 1000); // Verificar 1 segundo após a desmontagem
      }
    };
  }, [componentName]);
  
  // Função para limpar referências e cancelar manejadores pendentes
  const cleanupReferences = useCallback((refs: any[]) => {
    if (!isMounted.current) return;
    
    // Limpar todas as referências passadas
    refs.forEach(ref => {
      if (ref && typeof ref === 'object') {
        if ('current' in ref) {
          ref.current = null;
        } else {
          // Tentar limpar outros tipos de objetos
          Object.keys(ref).forEach(key => {
            ref[key] = null;
          });
        }
      }
    });
    
    // Cancelar qualquer verificação pendente
    if (unmountHandler.current) {
      clearTimeout(unmountHandler.current);
      unmountHandler.current = null;
    }
  }, []);
  
  return {
    isMounted,
    cleanupReferences
  };
}
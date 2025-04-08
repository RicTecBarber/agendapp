import { useEffect, useRef, useState, useCallback } from 'react';

// Detectar se uma imagem caberia na memória disponível
export function hasEnoughMemoryFor(
  width: number, 
  height: number, 
  bytesPerPixel: number = 4
): boolean {
  // Calcular tamanho aproximado da imagem em bytes
  const imageSizeBytes = width * height * bytesPerPixel;
  
  // Em navegadores modernos, tentar verificar a memória disponível
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    if (memory && memory.jsHeapSizeLimit) {
      // Verificar se a imagem ocuparia mais de 20% da memória máxima disponível
      return imageSizeBytes < (memory.jsHeapSizeLimit * 0.2);
    }
  }
  
  // Fallback para uma heurística simples baseada no tamanho da imagem
  // Considerar que imagens maiores que 16MP podem causar problemas
  const MAX_SAFE_PIXELS = 16 * 1024 * 1024; // 16 megapixels
  return (width * height) < MAX_SAFE_PIXELS;
}

// Hook para detecção de vazamentos de memória
export function useLeakPrevention(warningThresholdMB: number = 100) {
  const [memoryWarning, setMemoryWarning] = useState(false);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  
  // Monitorar uso de memória
  useEffect(() => {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }
    
    const memory = (performance as any).memory;
    if (!memory) return;
    
    const checkMemoryUsage = () => {
      const usedHeapSize = memory.usedJSHeapSize / (1024 * 1024); // Em MB
      if (usedHeapSize > warningThresholdMB) {
        setMemoryWarning(true);
      } else {
        setMemoryWarning(false);
      }
    };
    
    // Verificar a cada 5 segundos
    const intervalId = setInterval(checkMemoryUsage, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [warningThresholdMB]);
  
  // Função para registrar limpezas
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.push(cleanupFn);
    return () => {
      const index = cleanupFunctionsRef.current.indexOf(cleanupFn);
      if (index !== -1) {
        cleanupFunctionsRef.current.splice(index, 1);
      }
    };
  }, []);
  
  // Funcionalidade de limpeza de emergência
  const forceCleanup = useCallback(() => {
    // Executar todas as funções de limpeza registradas
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (e) {
        console.error('Erro ao executar limpeza de memória:', e);
      }
    });
    
    // Tentar forçar o garbage collector (com sintaxe especial não padronizada)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // Silenciosamente ignorar se gc não estiver disponível
      }
    }
    
    setMemoryWarning(false);
  }, []);
  
  return {
    memoryWarning,
    registerCleanup,
    forceCleanup
  };
}

// Função de limpeza de cache de imagens
export function clearImageCache() {
  if (typeof window === 'undefined') return;
  
  // Tentar limpar o cache de serviços de worker
  if ('caches' in window) {
    try {
      // Limpar caches relacionados a imagens
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName.includes('image'))
            .map(cacheName => caches.delete(cacheName))
        );
      });
    } catch (e) {
      console.error('Erro ao limpar cache de imagens:', e);
    }
  }
}

// Função para liberar memória em situações críticas
export function emergencyMemoryCleanup() {
  // Limpar caches de imagens
  clearImageCache();
  
  // Tentar limpar outros recursos
  if (typeof window !== 'undefined') {
    // Limpar todos os timeouts e intervals pendentes
    const highestId = window.setTimeout(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
      window.clearTimeout(i);
      window.clearInterval(i);
    }
    
    // Remover event listeners desnecessários
    // (Isso deve ser feito com cuidado, apenas em componentes específicos)
    
    // Liberar memória de canvas não utilizados
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx && !canvas.getAttribute('data-keep')) {
        // Limpar canvas e liberar contexto
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // @ts-ignore - Método não padronizado em alguns navegadores
        if (ctx.reset) ctx.reset();
      }
    });
  }
}

// Hook para monitorar e relatar uso de memória
export function useMemoryUsage(reportInterval: number = 10000) {
  const [memoryStats, setMemoryStats] = useState<{
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
    timestamp: number;
  } | null>(null);
  
  useEffect(() => {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }
    
    const memory = (performance as any).memory;
    if (!memory) return;
    
    const updateMemoryStats = () => {
      setMemoryStats({
        totalJSHeapSize: memory.totalJSHeapSize / (1024 * 1024), // MB
        usedJSHeapSize: memory.usedJSHeapSize / (1024 * 1024), // MB
        jsHeapSizeLimit: memory.jsHeapSizeLimit / (1024 * 1024), // MB
        timestamp: Date.now(),
      });
    };
    
    updateMemoryStats();
    const intervalId = setInterval(updateMemoryStats, reportInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [reportInterval]);
  
  return memoryStats;
}

// Componente para mostrar alertas de uso excessivo de memória
export function MemoryWarningBanner({ 
  thresholdMB = 150,
  autoCleanupThresholdMB = 200
}: { 
  thresholdMB?: number,
  autoCleanupThresholdMB?: number
}) {
  const memoryStats = useMemoryUsage(5000);
  const [showWarning, setShowWarning] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Verificar se devemos mostrar o aviso
  useEffect(() => {
    if (!memoryStats) return;
    
    const usedMemory = memoryStats.usedJSHeapSize;
    
    if (usedMemory > thresholdMB) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    
    // Auto-limpeza de emergência se exceder muito
    if (usedMemory > autoCleanupThresholdMB) {
      emergencyMemoryCleanup();
    }
  }, [memoryStats, thresholdMB, autoCleanupThresholdMB]);
  
  if (!showWarning) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-yellow-100 border-yellow-400 border text-yellow-800 rounded-lg shadow-lg">
      <div className="p-3">
        <div className="flex justify-between items-center">
          <div className="font-medium">Alerta de Memória</div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-yellow-700 hover:text-yellow-900"
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
        
        {!isCollapsed && memoryStats && (
          <div className="mt-2 text-sm">
            <div>Uso: {Math.round(memoryStats.usedJSHeapSize)} MB</div>
            <div>Limite: {Math.round(memoryStats.jsHeapSizeLimit)} MB</div>
            <div className="mt-2">
              <button
                onClick={() => emergencyMemoryCleanup()}
                className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-yellow-900"
              >
                Limpar Memória
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
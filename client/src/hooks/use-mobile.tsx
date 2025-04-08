import { useState, useEffect, useCallback, useMemo } from 'react';

// Thresholds para detecção
const MOBILE_WIDTH_THRESHOLD = 640; // Breakpoint para dispositivos móveis em pixels
const LOW_MEMORY_THRESHOLD = 2048; // Memória disponível limite para detecção de dispositivos de baixo desempenho (em MB)
const LOW_CORES_THRESHOLD = 4; // Número máximo de cores para considerarmos um dispositivo de baixo desempenho
const SLOW_CONNECTION_THRESHOLD = 1.5; // Velocidade máxima de conexão para considerarmos lenta (em Mbps)

// Tipos de dispositivo
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ConnectionType = 'slow' | 'medium' | 'fast' | 'unknown';
export type PerformanceProfile = 'low' | 'medium' | 'high' | 'unknown';

/**
 * Hook principal para detectar dispositivos móveis
 * Retorna true se o dispositivo atual for considerado móvel
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Função para verificar se é dispositivo móvel
    const checkMobile = () => {
      // Verificar largura da tela
      const isMobileWidth = window.innerWidth < MOBILE_WIDTH_THRESHOLD;
      
      // Verificar se há touch
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Verificar user agent para dispositivos móveis
      const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      // Consideramos móvel se atender pelo menos dois critérios
      const detectedAsMobile = 
        (isMobileWidth && hasTouch) || 
        (isMobileWidth && mobileUserAgent) || 
        (hasTouch && mobileUserAgent);
      
      setIsMobile(detectedAsMobile);
    };
    
    // Verificar imediatamente e adicionar listener para resize
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  return isMobile;
}

/**
 * Hook para detectar o tipo de dispositivo mais precisamente
 * Categoriza entre mobile, tablet e desktop
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  
  useEffect(() => {
    // Função para detectar o tipo de dispositivo
    const detectDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;
      
      // Verificar user agent para tablets específicos
      const isTabletUserAgent = /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
      
      // Dispositivos com tela pequena são considerados móveis
      if (width < 640) {
        setDeviceType('mobile');
        return;
      }
      
      // Tablets geralmente têm largura entre 640px e 1024px
      // ou uma proporção de aspecto próxima de 4:3
      if (
        (width >= 640 && width <= 1024 && aspectRatio < 1.4) || 
        isTabletUserAgent
      ) {
        setDeviceType('tablet');
        return;
      }
      
      // Caso contrário, consideramos desktop
      setDeviceType('desktop');
    };
    
    detectDeviceType();
    window.addEventListener('resize', detectDeviceType);
    
    return () => {
      window.removeEventListener('resize', detectDeviceType);
    };
  }, []);
  
  return deviceType;
}

/**
 * Hook para detectar o tipo de conexão de internet do usuário
 * Categoriza entre slow, medium e fast
 */
export function useConnectionType(): ConnectionType {
  const [connectionType, setConnectionType] = useState<ConnectionType>('unknown');
  
  useEffect(() => {
    // Tentar obter informações da conexão via Network Information API
    const connection = navigator.connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      // Função para atualizar o tipo de conexão
      const updateConnectionType = () => {
        // Verificar velocidade efetiva se disponível
        if ('downlink' in connection) {
          const downlink = connection.downlink; // Mbps
          
          if (downlink < SLOW_CONNECTION_THRESHOLD) {
            setConnectionType('slow');
          } else if (downlink < 5) {
            setConnectionType('medium');
          } else {
            setConnectionType('fast');
          }
          return;
        }
        
        // Fallback para effectiveType se disponível
        if ('effectiveType' in connection) {
          const effectiveType = connection.effectiveType;
          
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            setConnectionType('slow');
          } else if (effectiveType === '3g') {
            setConnectionType('medium');
          } else if (effectiveType === '4g') {
            setConnectionType('fast');
          }
          return;
        }
        
        // Se não conseguimos determinar, usar tipo de conexão
        if ('type' in connection) {
          const type = connection.type;
          
          if (type === 'cellular' || type === 'none') {
            setConnectionType('slow');
          } else if (type === 'wifi' || type === 'ethernet') {
            setConnectionType('fast');
          } else {
            setConnectionType('medium');
          }
          return;
        }
        
        // Não conseguimos determinar
        setConnectionType('unknown');
      };
      
      // Configurar listeners para mudanças de conexão
      updateConnectionType();
      connection.addEventListener('change', updateConnectionType);
      
      return () => {
        connection.removeEventListener('change', updateConnectionType);
      };
    } else {
      // Fallback: tentar detectar com base em velocidade de carregamento
      const startTime = performance.now();
      
      // Carregar um pequeno recurso para testar a velocidade
      fetch('/api/barbershop-settings')
        .then(() => {
          const loadTime = performance.now() - startTime;
          
          // Determinar tipo de conexão com base no tempo de carregamento
          if (loadTime > 1000) {
            setConnectionType('slow');
          } else if (loadTime > 300) {
            setConnectionType('medium');
          } else {
            setConnectionType('fast');
          }
        })
        .catch(() => {
          // Se houver erro, assumir conexão lenta
          setConnectionType('slow');
        });
    }
  }, []);
  
  return connectionType;
}

/**
 * Hook para detecção da capacidade de performance do dispositivo
 * Combina vários fatores para estimar o perfil de performance
 */
export function usePerformanceProfile(): PerformanceProfile {
  const isMobile = useMobile();
  const connectionType = useConnectionType();
  const [performanceProfile, setPerformanceProfile] = useState<PerformanceProfile>('unknown');
  
  useEffect(() => {
    // Função para detectar o perfil de performance
    const detectPerformanceProfile = () => {
      let score = 0;
      
      // 1. Verificar memória disponível
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        if (memory && memory.jsHeapSizeLimit) {
          const totalMemoryMB = memory.jsHeapSizeLimit / (1024 * 1024);
          
          if (totalMemoryMB < LOW_MEMORY_THRESHOLD) {
            // Dispositivo de baixa memória
            score -= 2;
          } else if (totalMemoryMB > 4096) {
            // Dispositivo com bastante memória
            score += 1;
          }
        }
      }
      
      // 2. Verificar número de núcleos da CPU
      if (navigator.hardwareConcurrency) {
        const cores = navigator.hardwareConcurrency;
        
        if (cores <= LOW_CORES_THRESHOLD) {
          // Poucos núcleos
          score -= 1;
        } else if (cores >= 8) {
          // Muitos núcleos
          score += 2;
        }
      }
      
      // 3. Considerar tipo de dispositivo
      if (isMobile) {
        score -= 1;
      }
      
      // 4. Considerar tipo de conexão
      if (connectionType === 'slow') {
        score -= 1;
      } else if (connectionType === 'fast') {
        score += 1;
      }
      
      // 5. Verificar se o dispositivo tem bateria (móvel)
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          if (battery.charging === false && battery.level < 0.2) {
            // Bateria baixa e não carregando - economizar recursos
            score -= 1;
            determineProfile(score);
          }
        });
      }
      
      // Determinar perfil com base na pontuação
      determineProfile(score);
    };
    
    const determineProfile = (score: number) => {
      if (score <= -2) {
        setPerformanceProfile('low');
      } else if (score >= 2) {
        setPerformanceProfile('high');
      } else {
        setPerformanceProfile('medium');
      }
    };
    
    detectPerformanceProfile();
  }, [isMobile, connectionType]);
  
  return performanceProfile;
}

/**
 * Hook utilitário que indica se devemos aplicar otimizações de performance
 * Retorna true para dispositivos que precisam de otimizações adicionais
 */
export function useShouldOptimize(): boolean {
  const isMobile = useMobile();
  const connectionType = useConnectionType();
  const performanceProfile = usePerformanceProfile();
  
  // Memoizar o resultado para evitar recálculos desnecessários
  const shouldOptimize = useMemo(() => {
    // Sempre otimizar para dispositivos de baixo desempenho
    if (performanceProfile === 'low') {
      return true;
    }
    
    // Otimizar para dispositivos móveis com conexão lenta
    if (isMobile && connectionType === 'slow') {
      return true;
    }
    
    // Otimizar com base em flags específicas de navegadores
    if (typeof navigator !== 'undefined') {
      // Data saver mode
      if ('connection' in navigator && (navigator as any).connection.saveData) {
        return true;
      }
      
      // Modo de desempenho reduzido (alguns navegadores)
      if ('userAgentData' in navigator && (navigator as any).userAgentData?.mobile) {
        return true;
      }
    }
    
    // Otimizar com base na memória disponível
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.jsHeapSizeLimit) {
        const totalMemoryMB = memory.jsHeapSizeLimit / (1024 * 1024);
        if (totalMemoryMB < LOW_MEMORY_THRESHOLD) {
          return true;
        }
      }
    }
    
    // Não otimizar para outros casos
    return false;
  }, [isMobile, connectionType, performanceProfile]);
  
  return shouldOptimize;
}

/**
 * Hook para detecção de modo escuro/claro do sistema
 */
export function usePrefersDarkMode(): boolean {
  const [prefersDarkMode, setPrefersDarkMode] = useState(() => {
    return typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  });
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDarkMode(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return prefersDarkMode;
}

/**
 * Hook que detecta se o dispositivo está em modo de economia de energia
 */
export function usePowerSaveMode(): boolean {
  const [isPowerSaveMode, setIsPowerSaveMode] = useState(false);
  
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if ('saveData' in connection) {
        setIsPowerSaveMode(connection.saveData);
        
        const handleChange = () => {
          setIsPowerSaveMode(connection.saveData);
        };
        
        connection.addEventListener('change', handleChange);
        return () => {
          connection.removeEventListener('change', handleChange);
        };
      }
    }
    
    // Tentar detectar pelo modo de baixa potência/economia de bateria
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const checkLowPower = () => {
          // Assumimos modo de economia se bateria estiver baixa e não carregando
          const isLowPower = battery.charging === false && battery.level < 0.2;
          setIsPowerSaveMode(isLowPower);
        };
        
        battery.addEventListener('levelchange', checkLowPower);
        battery.addEventListener('chargingchange', checkLowPower);
        
        checkLowPower();
        
        return () => {
          battery.removeEventListener('levelchange', checkLowPower);
          battery.removeEventListener('chargingchange', checkLowPower);
        };
      });
    }
  }, []);
  
  return isPowerSaveMode;
}
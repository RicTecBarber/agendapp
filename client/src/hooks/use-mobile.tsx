import { useState, useEffect, useCallback } from 'react';

// Configuração padrão para detecção de dispositivos móveis
const DEFAULT_MOBILE_BREAKPOINT = 768; // pixels
const DEFAULT_TABLET_BREAKPOINT = 1024; // pixels
const CONNECTION_CHECK_INTERVAL = 60000; // 1 minuto

/**
 * Hook para verificar se o dispositivo é móvel baseado na largura da tela
 */
export function useIsMobile(breakpoint = DEFAULT_MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkMobile = () => {
      // Verificações para SSR
      if (typeof window === 'undefined') return false;
      
      // Verificar largura da tela
      const screenWidth = window.innerWidth;
      setIsMobile(screenWidth < breakpoint);
    };
    
    // Verificação inicial
    checkMobile();
    
    // Adicionar listener para mudanças de tamanho da tela
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);
  
  return isMobile;
}

/**
 * Hook para verificar se o dispositivo é um tablet
 */
export function useIsTablet(
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT, 
  tabletBreakpoint = DEFAULT_TABLET_BREAKPOINT
) {
  const [isTablet, setIsTablet] = useState<boolean>(false);
  
  useEffect(() => {
    const checkTablet = () => {
      // Verificações para SSR
      if (typeof window === 'undefined') return false;
      
      // Verificar largura da tela
      const screenWidth = window.innerWidth;
      setIsTablet(screenWidth >= mobileBreakpoint && screenWidth < tabletBreakpoint);
    };
    
    // Verificação inicial
    checkTablet();
    
    // Adicionar listener para mudanças de tamanho da tela
    window.addEventListener('resize', checkTablet);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkTablet);
  }, [mobileBreakpoint, tabletBreakpoint]);
  
  return isTablet;
}

/**
 * Verifica parâmetros da conexão de rede do usuário
 */
export function useConnectionInfo() {
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [saveData, setSaveData] = useState<boolean>(false);
  const [isLowEnd, setIsLowEnd] = useState<boolean>(false);
  
  const updateConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return;
    
    // Verificar a API Network Information 
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        setConnectionType(conn.type || null);
        setEffectiveType(conn.effectiveType || null);
        setDownlink(conn.downlink || null);
        setSaveData(!!conn.saveData);
      }
    }
    
    // Verificar RAM do dispositivo (disponível em alguns browsers)
    if ('deviceMemory' in navigator) {
      setIsLowEnd((navigator as any).deviceMemory < 4);
    }
  }, []);
  
  useEffect(() => {
    // Verificação inicial
    updateConnectionInfo();
    
    // Configurar ouvinte para mudanças na conexão se o navegador suportar
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      
      if (conn && conn.addEventListener) {
        conn.addEventListener('change', updateConnectionInfo);
        
        // Configurar intervalo de verificação como fallback
        const intervalId = setInterval(updateConnectionInfo, CONNECTION_CHECK_INTERVAL);
        
        return () => {
          conn.removeEventListener('change', updateConnectionInfo);
          clearInterval(intervalId);
        };
      }
    }
    
    // Fallback para navegadores sem API de conexão
    const intervalId = setInterval(updateConnectionInfo, CONNECTION_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, [updateConnectionInfo]);
  
  return {
    connectionType,
    effectiveType,
    downlink,
    saveData,
    isLowEnd,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || (downlink && downlink < 1.5)
  };
}

/**
 * Hook para verificar se a aplicação deve usar otimizações para dispositivos móveis
 * Combina verificações de:
 * - Tamanho da tela (mobile/tablet)
 * - Memória do dispositivo
 * - Tipo e qualidade da conexão
 * - Modo de economia de dados
 */
export function useShouldOptimize() {
  const isMobile = useIsMobile();
  const { 
    isSlowConnection, 
    saveData, 
    isLowEnd 
  } = useConnectionInfo();
  
  // Considerar otimizações se qualquer uma das condições for verdadeira
  return isMobile || isSlowConnection || saveData || isLowEnd;
}

/**
 * Hook para verificar se o dispositivo tem tela touchscreen
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Verificações para SSR
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setIsTouch(null);
      return;
    }
    
    // Verificar se é um dispositivo touch via matchMedia
    if (window.matchMedia) {
      setIsTouch(window.matchMedia('(hover: none), (pointer: coarse)').matches);
      return;
    }
    
    // Fallback - verificar userAgent
    const touchUserAgents = /android|iphone|ipad|ipod|webos|windows phone/i;
    setIsTouch(touchUserAgents.test(navigator.userAgent.toLowerCase()));
  }, []);
  
  return isTouch;
}

/**
 * Hook que fornece funções adaptadas para diferentes tipos de dispositivos
 * como toques longos em dispositivos móveis versus hover em computadores
 */
export function useDeviceAdaptiveControls() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  // Mapeamento de eventos baseado no tipo de dispositivo
  const getEventHandlers = (
    onClick: () => void,
    onHover?: () => void,
    onLongPress?: () => void,
    longPressDelay = 500
  ) => {
    if (isTouch) {
      // Para dispositivos de toque
      let timer: NodeJS.Timeout | null = null;
      
      return {
        onClick,
        onPointerDown: () => {
          if (onLongPress) {
            timer = setTimeout(() => {
              onLongPress();
            }, longPressDelay);
          }
        },
        onPointerUp: () => {
          if (timer) clearTimeout(timer);
        },
        onPointerLeave: () => {
          if (timer) clearTimeout(timer);
        },
        onTouchStart: () => {
          if ('vibrate' in navigator) {
            // Feedback tátil sutil para iniciar o toque
            navigator.vibrate(5);
          }
        },
        onTouchEnd: () => {}
      };
    } else {
      // Para dispositivos não-touch
      return {
        onClick,
        onMouseEnter: onHover,
        onFocus: onHover
      };
    }
  };

  return {
    isMobile,
    isTouch,
    getEventHandlers
  };
}

/**
 * Hook que disponibiliza diversas funções e utilidades
 * para otimização e adaptação em dispositivos móveis
 */
export function useMobileOptimization() {
  const isMobile = useIsMobile();
  const { isSlowConnection } = useConnectionInfo();
  const isLowPerformance = isMobile || isSlowConnection;
  
  // Função para gerar um atraso proporcional para carregamento progressivo
  const getProgressiveDelay = (index: number, baseDelay = 100) => {
    if (!isLowPerformance) return 0;
    return Math.min(index * baseDelay, 2000); // Máximo de 2 segundos de atraso
  };
  
  // Função para priorizar recursos críticos vs não-críticos
  const shouldLoadResource = (priority: 'critical' | 'high' | 'medium' | 'low') => {
    if (!isLowPerformance) return true;
    
    switch (priority) {
      case 'critical':
        return true;
      case 'high':
        return true;
      case 'medium':
        return !isSlowConnection;
      case 'low':
        return false; // Não carregar recursos de baixa prioridade em dispositivos lentos
      default:
        return true;
    }
  };
  
  return {
    isMobile,
    isLowPerformance,
    isSlowConnection,
    getProgressiveDelay,
    shouldLoadResource
  };
}
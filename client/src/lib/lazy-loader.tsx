import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useShouldOptimize } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';

interface LazyLoaderProps {
  // Caminho do componente a ser carregado
  componentPath: string;
  // Fallback enquanto o componente está carregando
  fallback?: React.ReactNode;
  // Props a serem passados para o componente carregado
  componentProps?: Record<string, any>;
  // Tempo de atraso intencional (útil para diminuir carregamentos muito rápidos que causam flickering)
  delay?: number;
  // Tempo limite para exibir erro de timeout
  timeout?: number;
  // Componente a ser exibido em caso de erro
  errorComponent?: React.ReactNode;
  // Baixa prioridade (carrega apenas quando o viewport está ocioso)
  lowPriority?: boolean;
  // Condicional para carregar o componente
  shouldLoad?: boolean;
}

/**
 * Componente para carregamento dinâmico de componentes React
 * de forma eficiente e otimizada para melhor desempenho
 */
export function LazyLoader({
  componentPath,
  fallback = <DefaultLoadingComponent />,
  componentProps = {},
  delay = 0,
  timeout = 10000,
  errorComponent = <DefaultErrorComponent />,
  lowPriority = false,
  shouldLoad = true,
}: LazyLoaderProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const shouldOptimize = useShouldOptimize();
  
  useEffect(() => {
    if (!shouldLoad) return;
    
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;
    
    // Configurar temporizador de timeout
    if (timeout > 0) {
      timeoutTimer = setTimeout(() => {
        if (isMounted) {
          setTimedOut(true);
        }
      }, timeout);
    }
    
    // Função para carregar o componente
    const loadComponent = async () => {
      try {
        // Se houver atraso especificado, aguardar
        if (delay > 0) {
          await new Promise(resolve => {
            timer = setTimeout(resolve, delay);
          });
        }
        
        // Importar o componente dinamicamente
        const module = await import(/* @vite-ignore */ componentPath);
        
        // Obter o componente padrão exportado
        const Component = module.default;
        
        // Verificar se o componente existe
        if (!Component) {
          throw new Error(`Componente não encontrado em ${componentPath}`);
        }
        
        // Atualizar o estado apenas se o componente ainda estiver montado
        if (isMounted) {
          setComponent(() => Component);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Erro ao carregar componente ${componentPath}:`, err);
        
        // Atualizar estado de erro apenas se o componente ainda estiver montado
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Erro ao carregar componente'));
          setLoading(false);
        }
      }
    };
    
    // Escolher estratégia de carregamento
    if (lowPriority && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // Carregar em período ocioso para componentes de baixa prioridade
      (window as any).requestIdleCallback(() => {
        loadComponent();
      }, { timeout: 2000 });
    } else {
      // Carregar imediatamente
      loadComponent();
    }
    
    // Limpeza ao desmontar
    return () => {
      isMounted = false;
      
      if (timer) {
        clearTimeout(timer);
      }
      
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    };
  }, [componentPath, delay, timeout, lowPriority, shouldLoad]);
  
  // Renderizar componente de erro em caso de falha
  if (error || timedOut) {
    return (
      <>
        {React.isValidElement(errorComponent) 
          ? errorComponent 
          : <DefaultErrorComponent error={error?.message || 'Tempo limite excedido'} />}
      </>
    );
  }
  
  // Renderizar fallback enquanto estiver carregando
  if (loading || !Component) {
    return (
      <>
        {React.isValidElement(fallback) 
          ? fallback 
          : <DefaultLoadingComponent />}
      </>
    );
  }
  
  // Renderizar o componente carregado
  return <Component {...componentProps} />;
}

/**
 * Componente padrão de indicação de carregamento
 */
export function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[100px] p-4">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Componente padrão para exibir erro de carregamento
 */
export function DefaultErrorComponent({ error = 'Erro ao carregar componente' }: { error?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[100px] p-4 text-destructive bg-destructive/10 rounded-md">
      <div className="text-base font-medium">Erro ao carregar</div>
      <div className="text-sm text-destructive-foreground">{error}</div>
    </div>
  );
}

/**
 * Função de ajuda para criar componentes lazy com melhor performance e gerenciamento de erros
 */
export function createLazyComponent<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: {
    fallback?: React.ReactNode;
    errorComponent?: React.ReactNode;
    lowPriority?: boolean;
  } = {}
) {
  const LazyComponent = lazy(async () => {
    try {
      // Envolver a importação em um try/catch para tratamento de erros
      return await importFn();
    } catch (error) {
      console.error('Erro ao carregar componente lazy:', error);
      // Retornar um componente de erro ao invés de propagar a exceção
      return {
        default: (() => options.errorComponent || <DefaultErrorComponent />) as React.ComponentType<T>,
      };
    }
  });
  
  return (props: T) => (
    <Suspense fallback={options.fallback || <DefaultLoadingComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Hook para carregar componentes apenas quando necessário (quando visíveis no viewport)
 */
export function useLazyViewport<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: {
    rootMargin?: string;
    threshold?: number;
    fallback?: React.ReactNode;
    errorComponent?: React.ReactNode;
  } = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null);
  const shouldOptimize = useShouldOptimize();
  
  // Referência para o elemento observado
  const ref = React.useRef<HTMLDivElement>(null);
  
  // Configurações do IntersectionObserver
  const {
    rootMargin = '200px',
    threshold = 0.1,
    fallback = <DefaultLoadingComponent />,
    errorComponent = <DefaultErrorComponent />,
  } = options;
  
  // Configurar o observer quando o componente montar
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Desconectar o observer após detectar visibilidade
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);
  
  // Carregar o componente quando se tornar visível
  useEffect(() => {
    if (!isVisible) return;
    
    let isMounted = true;
    
    const loadComponent = async () => {
      try {
        const module = await importFn();
        if (isMounted) {
          setComponent(() => module.default);
        }
      } catch (error) {
        console.error('Erro ao carregar componente lazy por viewport:', error);
      }
    };
    
    // Se estiver em um dispositivo otimizado, carregar imediatamente sem esperar
    if (shouldOptimize) {
      loadComponent();
    } else {
      // Em dispositivos regulares, usar requestIdleCallback para melhor performance
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          loadComponent();
        }, { timeout: 2000 });
      } else {
        loadComponent();
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [isVisible, importFn, shouldOptimize]);
  
  const LazyComponent = React.useMemo(() => {
    if (!Component) return null;
    
    return (props: T) => <Component {...props} />;
  }, [Component]);
  
  return { ref, LazyComponent, isLoaded: !!Component, fallback, errorComponent };
}
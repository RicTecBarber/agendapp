import React, { ComponentType, lazy, Suspense, useState, useEffect } from 'react';
import { useShouldOptimize } from '@/hooks/use-mobile';

// Tipos de prioridade para carregamento de componentes
type ComponentPriority = 'critical' | 'high' | 'medium' | 'low';

// Opções para configuração do lazy loading
interface LazyLoadOptions {
  fallback?: React.ReactNode;
  priority?: ComponentPriority;
  retries?: number;
  timeout?: number;
  preload?: boolean;
  onError?: (error: Error) => void;
  onLoaded?: () => void;
}

/**
 * Wrapper para React.lazy com tratamento melhorado de erros e
 * lógica para priorizar ou atrasar carregamento de componentes
 * baseado nas condições do dispositivo
 */
export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const {
    fallback = <div className="animate-pulse min-h-[100px] bg-muted rounded-md" />,
    priority = 'medium',
    retries = 2,
    timeout = 10000, // 10 segundos
    preload = false,
    onError,
    onLoaded
  } = options;

  // Função que adiciona tratamento de erros, retry e timeout
  const loadComponent = () => {
    let retriesLeft = retries;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Função para tentar novamente o carregamento
    const attemptLoad = async (): Promise<{ default: T }> => {
      try {
        // Definir timeout para evitar espera infinita
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Timeout ao carregar componente após ${timeout}ms`));
          }, timeout);
        });
        
        // Competição entre carregamento normal e timeout
        const result = await Promise.race([
          factory(),
          timeoutPromise
        ]);
        
        // Limpeza do timeout se o carregamento for bem-sucedido
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Callback de sucesso
        if (onLoaded) {
          onLoaded();
        }
        
        return result;
      } catch (error) {
        // Limpeza do timeout em caso de erro
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Tentar novamente se ainda houver retries disponíveis
        if (retriesLeft > 0) {
          retriesLeft--;
          console.warn(`Erro ao carregar componente. Tentando novamente (${retriesLeft + 1} tentativas restantes)...`);
          
          // Aguardar um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptLoad();
        }
        
        // Se não houver mais retries, propagar o erro
        console.error('Falha ao carregar componente após várias tentativas:', error);
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
        
        throw error;
      }
    };

    return attemptLoad();
  };

  // Componente preguiçoso com tratamento de erros e retries
  const LazyComponent = lazy(loadComponent);

  // Componente wrapper com lógica de otimização
  const OptimizedLazyComponent = (props: React.ComponentProps<T>) => {
    const shouldOptimize = useShouldOptimize();
    const [shouldRender, setShouldRender] = useState(!shouldOptimize || priority === 'critical');
    
    // Para componentes de baixa prioridade em dispositivos que precisam otimização,
    // atrasar o carregamento ou não carregar de forma alguma
    useEffect(() => {
      if (shouldRender) return;
      
      // Determinar se e quando carregar este componente
      let delay = 0;
      let shouldLoad = true;
      
      if (shouldOptimize) {
        switch (priority) {
          case 'high':
            delay = 500; // Pequeno atraso
            break;
          case 'medium':
            delay = 2000; // Atraso mais significativo
            break;
          case 'low':
            shouldLoad = false; // Não carregar em dispositivos que precisam otimização
            break;
          default:
            delay = 0;
        }
      }
      
      if (shouldLoad) {
        const timer = setTimeout(() => {
          setShouldRender(true);
        }, delay);
        
        return () => clearTimeout(timer);
      }
    }, [shouldRender, shouldOptimize]);
    
    // Precarregar o componente se configurado para isso
    useEffect(() => {
      if (preload && !shouldRender) {
        const preloader = factory();
        
        // Evitar que erros de precarregamento quebrem a aplicação
        preloader.catch(() => {
          // Silenciar erro de preload
        });
      }
    }, []);
    
    // Mostrar nada se não devemos renderizar este componente
    if (!shouldRender && priority === 'low' && shouldOptimize) {
      return <div className="hidden" aria-hidden="true" />;
    }
    
    // Mostrar fallback enquanto não renderizamos o componente
    if (!shouldRender) {
      return <>{fallback}</>;
    }
    
    // Renderizar o componente com suspense e fallback
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
  
  return OptimizedLazyComponent;
}

/**
 * Função para carregar um componente sob demanda
 * só quando este for explicitamente necessário
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  let Component: React.ComponentType<React.ComponentProps<T>> | null = null;
  
  // Função para iniciar o carregamento
  const load = () => {
    if (!Component) {
      Component = lazyLoad(importFunc, options);
    }
    return Component;
  };
  
  // Componente proxy que carrega o real quando necessário
  const LazyComponentLoader = (props: React.ComponentProps<T>) => {
    const LoadedComponent = load();
    return <LoadedComponent {...props} />;
  };
  
  return {
    Component: LazyComponentLoader,
    preload: load
  };
}
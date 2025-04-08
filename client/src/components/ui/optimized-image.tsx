import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShouldOptimize } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  lowResSrc?: string;
  placeholderColor?: string;
  lazyLoad?: boolean;
  threshold?: number;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  fallbackSrc?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onLoaded?: () => void;
  onError?: (error: ErrorEvent) => void;
}

/**
 * Componente de imagem otimizado para aplicações web
 * Inclui carregamento lazy, fallback, placeholder, e otimizações para dispositivos móveis
 */
export function OptimizedImage({
  src,
  alt,
  lowResSrc,
  placeholderColor = '#f3f4f6',
  lazyLoad = true,
  threshold = 0.1,
  quality = 'auto',
  fallbackSrc,
  loadingComponent,
  errorComponent,
  onLoaded,
  onError,
  className,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [actualSrc, setActualSrc] = useState(lowResSrc || src);
  const shouldOptimize = useShouldOptimize();
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Determinar a qualidade da imagem com base nas configurações e capacidades do dispositivo
  const actualQuality = useMemo(() => {
    if (quality !== 'auto') return quality;
    
    return shouldOptimize ? 'low' : 'high';
  }, [quality, shouldOptimize]);
  
  // Aplicar otimizações de qualidade para dispositivos de baixo desempenho
  const optimizedSrc = useMemo(() => {
    // Se for um URL CDN que suporta parâmetros de qualidade (ex: Cloudinary, Imgix)
    if (src.includes('cloudinary.com') || src.includes('imgix.net')) {
      const separator = src.includes('?') ? '&' : '?';
      const qualityMap = {
        low: 30,
        medium: 60,
        high: 85,
      };
      
      const qualityValue = qualityMap[actualQuality as keyof typeof qualityMap];
      return `${src}${separator}q=${qualityValue}&auto=format`;
    }
    
    return src;
  }, [src, actualQuality]);
  
  // Configurar observador de interseção para carregamento lazy
  useEffect(() => {
    if (!lazyLoad || !imgRef.current) {
      setActualSrc(optimizedSrc);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActualSrc(optimizedSrc);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
        threshold,
      }
    );
    
    observer.observe(imgRef.current);
    
    return () => {
      if (imgRef.current) {
        observer.disconnect();
      }
    };
  }, [lazyLoad, optimizedSrc, threshold]);
  
  // Handler para carregamento da imagem
  const handleLoad = () => {
    setLoaded(true);
    onLoaded?.();
  };
  
  // Handler para erro de carregamento
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setError(true);
    if (fallbackSrc && !actualSrc.includes(fallbackSrc)) {
      setActualSrc(fallbackSrc);
    }
    onError?.(e as unknown as ErrorEvent);
  };
  
  // Estilo para placeholder
  const placeholderStyle = {
    backgroundColor: placeholderColor,
  };
  
  // Renderizar componente de loading se estiver carregando
  if (!loaded && !error && loadingComponent) {
    return (
      <div 
        className={cn("relative overflow-hidden", className)}
        style={placeholderStyle}
        {...props}
      >
        {loadingComponent}
        <img
          ref={imgRef}
          src={actualSrc}
          alt={alt}
          className="opacity-0 absolute inset-0 w-full h-full object-cover"
          onLoad={handleLoad}
          onError={handleError}
          loading={lazyLoad ? 'lazy' : undefined}
        />
      </div>
    );
  }
  
  // Renderizar componente de erro se houve erro de carregamento
  if (error && errorComponent) {
    return (
      <div 
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        {errorComponent}
      </div>
    );
  }
  
  // Renderizar imagem com placeholder
  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={!loaded ? placeholderStyle : undefined}
      {...props}
    >
      <img
        ref={imgRef}
        src={actualSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          !loaded && "opacity-0",
          loaded && "opacity-100"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazyLoad ? 'lazy' : undefined}
      />
    </div>
  );
}

/**
 * Hook para otimizar o carregamento de imagens em listas grandes
 */
export function useOptimizedImageList(
  urls: string[],
  options: {
    quality?: 'low' | 'medium' | 'high' | 'auto';
    preloadCount?: number;
    concurrentLoads?: number;
  } = {}
) {
  const { 
    quality = 'auto',
    preloadCount = 5,
    concurrentLoads = 3,
  } = options;
  
  const shouldOptimize = useShouldOptimize();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const loadingQueue = useRef<string[]>([]);
  const activeLoads = useRef<Set<string>>(new Set());
  
  // Determinar a qualidade das imagens
  const actualQuality = useMemo(() => {
    if (quality !== 'auto') return quality;
    return shouldOptimize ? 'low' : 'high';
  }, [quality, shouldOptimize]);
  
  // Pré-carregar imagens
  useEffect(() => {
    if (!urls.length) {
      setLoading(false);
      return;
    }
    
    // Inicializar a fila de carregamento
    loadingQueue.current = [...urls].slice(0, preloadCount);
    activeLoads.current = new Set();
    
    const loadNextBatch = () => {
      // Carregar até o limite de carregamentos concorrentes
      while (
        activeLoads.current.size < concurrentLoads && 
        loadingQueue.current.length > 0
      ) {
        const url = loadingQueue.current.shift()!;
        if (loadedImages.has(url)) continue;
        
        activeLoads.current.add(url);
        
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(url);
            return newSet;
          });
          activeLoads.current.delete(url);
          
          // Verificar se terminamos todos os carregamentos
          if (activeLoads.current.size === 0 && loadingQueue.current.length === 0) {
            setLoading(false);
          } else {
            loadNextBatch();
          }
        };
        
        img.onerror = () => {
          activeLoads.current.delete(url);
          
          // Continuar carregando mesmo com erro
          if (activeLoads.current.size === 0 && loadingQueue.current.length === 0) {
            setLoading(false);
          } else {
            loadNextBatch();
          }
        };
        
        // Aplicar otimizações de qualidade para CDNs que suportam
        let imageUrl = url;
        if (
          (url.includes('cloudinary.com') || url.includes('imgix.net')) &&
          actualQuality !== 'high'
        ) {
          const separator = url.includes('?') ? '&' : '?';
          const qualityMap = {
            low: 30,
            medium: 60,
            high: 85,
          };
          
          const qualityValue = qualityMap[actualQuality as keyof typeof qualityMap];
          imageUrl = `${url}${separator}q=${qualityValue}&auto=format`;
        }
        
        img.src = imageUrl;
      }
    };
    
    loadNextBatch();
    
    return () => {
      // Limpar imagens em carregamento ao desmontar
      loadingQueue.current = [];
      activeLoads.current.clear();
    };
  }, [urls, preloadCount, concurrentLoads, actualQuality, loadedImages]);
  
  return {
    loadedImages,
    loading,
    isImageLoaded: (url: string) => loadedImages.has(url),
    optimizeImageUrl: (url: string) => {
      if (
        (url.includes('cloudinary.com') || url.includes('imgix.net')) &&
        actualQuality !== 'high'
      ) {
        const separator = url.includes('?') ? '&' : '?';
        const qualityMap = {
          low: 30,
          medium: 60,
          high: 85,
        };
        
        const qualityValue = qualityMap[actualQuality as keyof typeof qualityMap];
        return `${url}${separator}q=${qualityValue}&auto=format`;
      }
      return url;
    },
  };
}
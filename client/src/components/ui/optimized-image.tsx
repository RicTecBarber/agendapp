import React, { useState, useEffect, useRef } from 'react';
import { useShouldOptimize } from '@/hooks/use-mobile';
import { hasEnoughMemoryFor } from '@/lib/memory-management';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Tipos de formatos de imagem disponíveis
type ImageFormat = 'original' | 'webp' | 'avif' | 'jpg' | 'png';

// Opções para qualidade da imagem
type ImageQuality = 'low' | 'medium' | 'high' | 'auto';

// Props para o componente OptimizedImage
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  lowResSrc?: string;
  formats?: ImageFormat[];
  quality?: ImageQuality;
  sizes?: string;
  priority?: boolean;
  lazyLoad?: boolean;
  blurEffect?: boolean;
  placeholderColor?: string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loadingStrategy?: 'eager' | 'lazy' | 'progressive';
  className?: string;
  imgClassName?: string;
  wrapperClassName?: string;
}

/**
 * Componente que otimiza o carregamento de imagens para dispositivos móveis
 * com suporte para:
 * - Formato adaptativo (webp/avif para navegadores que suportam)
 * - Qualidade adaptativa baseada no tipo de dispositivo e conexão
 * - Carregamento progressivo (versão de baixa resolução primeiro)
 * - Lazy loading inteligente (só carrega quando necessário)
 * - Fallback para dispositivos de baixa memória
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  lowResSrc,
  formats = ['webp', 'original'],
  quality = 'auto',
  sizes,
  priority = false,
  lazyLoad = true,
  blurEffect = true,
  placeholderColor = '#f0f0f0',
  aspectRatio,
  objectFit = 'cover',
  loadingStrategy = 'lazy',
  className,
  imgClassName,
  wrapperClassName,
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(lowResSrc || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const shouldOptimize = useShouldOptimize();
  
  // Determinar a qualidade baseada nas configurações e tipo do dispositivo
  const getQualityValue = (): number => {
    if (quality === 'auto') {
      if (shouldOptimize) {
        return 60; // Qualidade reduzida para dispositivos móveis
      }
      return 85; // Qualidade padrão para desktop
    }
    
    // Valores fixos baseados na configuração
    switch (quality) {
      case 'low': return 50;
      case 'medium': return 75;
      case 'high': return 90;
      default: return 85;
    }
  };
  
  // Verificar se o navegador suporta um formato específico
  const supportsFormat = (format: ImageFormat): boolean => {
    if (typeof document === 'undefined') return false;
    if (format === 'original') return true;
    
    const canvas = document.createElement('canvas');
    if (!canvas || !canvas.getContext) return false;
    
    switch (format) {
      case 'webp':
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      case 'avif':
        return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      default:
        return true;
    }
  };
  
  // Preparar a URL da imagem com os parâmetros de otimização
  const prepareImageUrl = (originalSrc: string): string => {
    // Verificar se é uma imagem externa ou interna
    const isExternalUrl = originalSrc.startsWith('http') || originalSrc.startsWith('//');
    
    // Se for uma imagem local que não usa CDN, apenas retorna a URL original
    if (!isExternalUrl && !originalSrc.includes('?')) {
      return originalSrc;
    }
    
    try {
      const url = new URL(isExternalUrl ? originalSrc : `https://example.com${originalSrc}`);
      
      // Se estamos otimizando e tem parâmetros de qualidade
      if (shouldOptimize && url.searchParams.has('quality')) {
        url.searchParams.set('quality', getQualityValue().toString());
      }
      
      // Aplicar formato preferido se a URL tiver parâmetro format
      const supportedFormats = formats.filter(supportsFormat);
      if (supportedFormats.length > 0 && url.searchParams.has('format')) {
        url.searchParams.set('format', supportedFormats[0]);
      }
      
      return isExternalUrl ? url.toString() : url.pathname + url.search;
    } catch (e) {
      // Falback para URLs que não são parseáveis
      return originalSrc;
    }
  };
  
  // Carregar a imagem otimizada
  useEffect(() => {
    if (!src) return;
    
    // Verificar se há memória disponível para carregar imagens
    const hasMemory = hasEnoughMemoryFor('images');
    
    // Em caso de dispositivos com pouca memória, usar a versão de baixa qualidade 
    // ou fallback se disponível
    if (shouldOptimize && !hasMemory) {
      if (lowResSrc) {
        setCurrentSrc(lowResSrc);
        setIsLoaded(true);
        return;
      } else if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setIsLoaded(true);
        return;
      }
    }
    
    // Definir estratégia de carregamento
    if (loadingStrategy === 'eager' || priority) {
      // Carregar imediatamente em resolução total
      setCurrentSrc(prepareImageUrl(src));
    } else if (loadingStrategy === 'progressive' && lowResSrc) {
      // Carregar versão de baixa resolução primeiro, depois a versão final
      setCurrentSrc(lowResSrc);
      
      // Pré-carregar a imagem em alta resolução
      const fullImg = new Image();
      fullImg.src = prepareImageUrl(src);
      
      fullImg.onload = () => {
        setCurrentSrc(prepareImageUrl(src));
        setIsLoaded(true);
      };
      
      fullImg.onerror = () => {
        setIsError(true);
        if (fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      };
    } else {
      // Carregamento padrão ou lazy
      setCurrentSrc(prepareImageUrl(src));
    }
  }, [src, lowResSrc, fallbackSrc, loadingStrategy, priority, shouldOptimize, formats, quality]);
  
  // Manipulador para evento de carregamento da imagem
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };
  
  // Manipulador para evento de erro ao carregar imagem
  const handleError = () => {
    setIsError(true);
    if (fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
  };
  
  // Determinar o valor de loading do <img>
  const getLoadingAttr = (): 'eager' | 'lazy' | undefined => {
    if (priority || loadingStrategy === 'eager') return 'eager';
    if (lazyLoad || loadingStrategy === 'lazy') return 'lazy';
    return undefined; // O navegador decide
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden', 
        aspectRatio && `aspect-[${aspectRatio}]`, 
        wrapperClassName
      )}
      style={{ backgroundColor: !isLoaded ? placeholderColor : 'transparent' }}
    >
      {/* Esqueleto/Placeholder enquanto carrega */}
      {!isLoaded && (
        <Skeleton 
          className={cn(
            'absolute inset-0 z-10 animate-pulse',
            blurEffect && 'backdrop-blur-sm'
          )} 
        />
      )}
      
      {/* Imagem principal */}
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          sizes={sizes}
          loading={getLoadingAttr()}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300', 
            objectFit && `object-${objectFit}`, 
            isLoaded ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
          {...props}
        />
      )}
      
      {/* Mensagem de erro ou fallback */}
      {isError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm p-2 text-center">
          Imagem não disponível
        </div>
      )}
    </div>
  );
}

/**
 * Componente para imagens de avatar/perfil otimizadas e com fallback
 */
interface OptimizedAvatarProps extends Omit<OptimizedImageProps, 'objectFit'> {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded' | 'square';
  border?: boolean;
  borderColor?: string;
}

export function OptimizedAvatar({
  src,
  alt,
  name,
  size = 'md',
  shape = 'circle',
  border = false,
  borderColor = 'border-gray-200',
  className,
  ...props
}: OptimizedAvatarProps) {
  // Gerar iniciais do nome como fallback
  const getInitials = (): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Função para gerar uma cor de fundo baseada no nome
  const getNameColor = (): string => {
    if (!name) return '#6E56CF'; // Cor padrão
    
    // Gerar uma cor baseada no hash do nome
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Usar matiz entre 200° e 280° (tons de azul/roxo) para melhor contraste com texto branco
    const h = Math.abs(hash) % 80 + 200;
    const s = 70; // Saturação 
    const l = 60; // Luminosidade
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  };
  
  // Mapear tamanhos para classes
  const sizeClasses = {
    'xs': 'h-6 w-6 text-xs',
    'sm': 'h-8 w-8 text-xs',
    'md': 'h-10 w-10 text-sm',
    'lg': 'h-12 w-12 text-base',
    'xl': 'h-16 w-16 text-lg',
    '2xl': 'h-24 w-24 text-xl',
  };
  
  // Mapear formas para classes
  const shapeClasses = {
    'circle': 'rounded-full',
    'rounded': 'rounded-md',
    'square': 'rounded-none',
  };
  
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-primary/10 text-primary-foreground font-medium',
        sizeClasses[size],
        shapeClasses[shape],
        border && `border-2 ${borderColor}`,
        className
      )}
      style={!src ? { backgroundColor: getNameColor() } : undefined}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full object-cover',
            shapeClasses[shape],
          )}
          objectFit="cover"
          {...props}
        />
      ) : (
        <span className="text-white">{getInitials()}</span>
      )}
    </div>
  );
}
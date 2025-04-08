import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useShouldOptimize } from '@/hooks/use-mobile';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  className?: string;
  bufferItems?: number;
  loadingPlaceholder?: ReactNode;
  emptyPlaceholder?: ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  initialNumToRender?: number;
  maxItemsToRender?: number;
  shouldUseVirtualization?: boolean;
}

/**
 * Componente de virtualização para renderizar listas grandes e eficientes
 * Otimizado para dispositivos móveis e conexões lentas
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  className,
  bufferItems = 5,
  loadingPlaceholder,
  emptyPlaceholder,
  keyExtractor = (_, index) => index,
  onEndReached,
  onEndReachedThreshold = 0.8,
  initialNumToRender = 10,
  maxItemsToRender = 100,
  shouldUseVirtualization: forceVirtualization,
}: VirtualListProps<T>) {
  const shouldOptimize = useShouldOptimize();
  const shouldUseVirtualization = forceVirtualization !== undefined ? forceVirtualization : shouldOptimize;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(items.length === 0);
  const prevItemsLengthRef = useRef(items.length);

  // Calcular quantos itens podem ser exibidos na janela visível
  const visibleItemCount = Math.ceil(containerHeight / itemHeight) + bufferItems * 2;
  
  // Se não for virtualizar, limitar o número de itens para evitar problemas de desempenho
  const limitedItems = shouldUseVirtualization ? items : items.slice(0, maxItemsToRender);
  
  // Detectar mudanças nos itens para mostrar o loading
  useEffect(() => {
    if (items.length !== prevItemsLengthRef.current) {
      setIsLoading(false);
      prevItemsLengthRef.current = items.length;
    }
  }, [items.length]);

  // Atualizar altura do container
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef.current) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }
  }, []);

  // Atualizar os itens visíveis quando ocorre rolagem
  useEffect(() => {
    if (!shouldUseVirtualization) {
      setVisibleItems(limitedItems);
      return;
    }

    // Se a lista for pequena o suficiente, não precisa virtualizar
    if (items.length <= initialNumToRender) {
      setVisibleItems(items);
      return;
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItemCount
    );

    // Se chegarmos próximo ao final da lista, chamar o callback onEndReached
    if (
      onEndReached &&
      endIndex >= items.length * onEndReachedThreshold &&
      endIndex < items.length
    ) {
      setIsLoading(true);
      onEndReached();
    }

    setVisibleItems(items.slice(startIndex, endIndex + 1));
  }, [
    shouldUseVirtualization, 
    scrollTop, 
    containerHeight, 
    items, 
    limitedItems,
    itemHeight, 
    bufferItems, 
    visibleItemCount,
    onEndReached, 
    onEndReachedThreshold,
    initialNumToRender
  ]);

  // Manipular evento de rolagem
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (shouldUseVirtualization) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  // Calcular o espaço em branco antes e depois para manter o scroll correto
  const startIndex = shouldUseVirtualization
    ? Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems)
    : 0;
  const topPadding = shouldUseVirtualization ? startIndex * itemHeight : 0;
  const totalHeight = items.length * itemHeight;
  const bottomPadding = shouldUseVirtualization
    ? Math.max(0, totalHeight - topPadding - (visibleItems.length * itemHeight))
    : 0;

  // Mostrar placeholder quando não houver itens
  if (items.length === 0 && !isLoading && emptyPlaceholder) {
    return <div className={cn("relative overflow-auto", className)}>{emptyPlaceholder}</div>;
  }

  // Mostrar loading placeholder
  if (isLoading && loadingPlaceholder) {
    return <div className={cn("relative overflow-auto", className)}>{loadingPlaceholder}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ height: shouldUseVirtualization ? totalHeight : 'auto' }}
      >
        {shouldUseVirtualization && <div style={{ height: topPadding }} />}
        {visibleItems.map((item, relativeIndex) => {
          const index = shouldUseVirtualization 
            ? startIndex + relativeIndex 
            : relativeIndex;
          
          return (
            <div
              key={keyExtractor(item, index)}
              className="relative"
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
        {shouldUseVirtualization && <div style={{ height: bottomPadding }} />}
      </div>
    </div>
  );
}
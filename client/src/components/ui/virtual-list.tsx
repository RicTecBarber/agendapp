import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useShouldOptimize } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  // Array de itens a serem renderizados
  items: T[];
  // Função para renderizar cada item
  renderItem: (item: T, index: number) => React.ReactNode;
  // Altura estimada de cada item (ou função para calcular)
  estimateSize: (index: number) => number;
  // Altura do contêiner
  height?: string | number;
  // Classes CSS adicionais
  className?: string;
  // Classes CSS para a lista interna
  innerClassName?: string;
  // Desabilitar virtualização (renderiza todos os itens, útil para SSR)
  disableVirtualization?: boolean;
  // Quantidade de itens para pré-carregar antes/depois da área visível
  overscan?: number;
  // Gap entre itens
  gap?: number;
  // Função chamada quando o usuário chega ao final da lista (para paginação)
  onEndReached?: () => void;
  // Distância do final para disparar o callback onEndReached
  onEndReachedThreshold?: number;
  // Altura mínima para cada item
  minItemHeight?: number;
  // Estratégia de otimização para dispositivos de baixo desempenho
  optimizationStrategy?: 'auto' | 'performance' | 'quality';
  // Função chamada quando um item fica visível
  onItemVisible?: (index: number) => void;
}

/**
 * Componente de lista virtualizada para renderização eficiente de grandes listas
 * Utiliza @tanstack/react-virtual para virtualização
 */
export function VirtualList<T>({
  items,
  renderItem,
  estimateSize,
  height = 400,
  className,
  innerClassName,
  disableVirtualization = false,
  overscan = 5,
  gap = 0,
  onEndReached,
  onEndReachedThreshold = 0.9,
  minItemHeight = 20,
  optimizationStrategy = 'auto',
  onItemVisible,
}: VirtualListProps<T>) {
  // Detectar se deve utilizar otimizações adicionais
  const shouldOptimize = useShouldOptimize();
  const [isScrolling, setIsScrolling] = useState(false);
  const [didReachEnd, setDidReachEnd] = useState(false);
  
  // Referência para o elemento pai
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Determinar overscan com base na estratégia de otimização
  const effectiveOverscan = useMemo(() => {
    if (optimizationStrategy === 'performance' || (optimizationStrategy === 'auto' && shouldOptimize)) {
      return Math.max(1, Math.floor(overscan / 2)); // Menor overscan em dispositivos de baixo desempenho
    }
    return overscan;
  }, [overscan, optimizationStrategy, shouldOptimize]);
  
  // Configuração do virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: effectiveOverscan,
  });
  
  // Obter os itens virtualizados
  const virtualItems = virtualizer.getVirtualItems();
  
  // Verificar se chegou ao final da lista
  const checkEndReached = useCallback(() => {
    if (!onEndReached || didReachEnd || !virtualizer) return;
    
    const { scrollOffset, scrollHeight } = virtualizer;
    const parentHeight = parentRef.current?.clientHeight || 0;
    
    const nearEnd = scrollOffset >= (scrollHeight - parentHeight) * onEndReachedThreshold;
    
    if (nearEnd && !didReachEnd) {
      setDidReachEnd(true);
      onEndReached();
    } else if (!nearEnd && didReachEnd) {
      setDidReachEnd(false);
    }
  }, [virtualizer, onEndReached, didReachEnd, onEndReachedThreshold]);
  
  // Efeito para verificar quando items chegam ao final
  useEffect(() => {
    checkEndReached();
  }, [virtualItems, checkEndReached]);
  
  // Handler para eventos de scroll
  const handleScroll = useCallback(() => {
    checkEndReached();
    
    // Acionar callbacks para itens visíveis
    if (onItemVisible) {
      const visibleRange = virtualizer.range;
      for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
        onItemVisible(i);
      }
    }
    
    // Detectar estado de scrolling para otimizações
    if (!isScrolling) {
      setIsScrolling(true);
      
      // Resetar após 150ms de inatividade
      const scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [virtualizer, checkEndReached, isScrolling, onItemVisible]);
  
  // Adicionar evento de scroll
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;
    
    scrollElement.addEventListener('scroll', handleScroll);
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
  
  // Se a virtualização estiver desabilitada, renderizar todos os itens
  if (disableVirtualization) {
    return (
      <div 
        ref={parentRef} 
        className={cn("overflow-auto", className)}
        style={{ height }}
      >
        <div className={innerClassName} style={{ gap }}>
          {items.map((item, index) => (
            <div key={index} style={{ minHeight: minItemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
    >
      <div
        className={innerClassName}
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map(virtualItem => {
          const item = items[virtualItem.index];
          
          // Permitir renderização simplificada durante scroll em dispositivos de baixo desempenho
          const shouldRenderSimplified = 
            isScrolling && 
            (optimizationStrategy === 'performance' || 
             (optimizationStrategy === 'auto' && shouldOptimize));
          
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
                minHeight: minItemHeight,
              }}
            >
              {shouldRenderSimplified ? (
                // Renderização simplificada durante scroll em dispositivos de baixo desempenho
                <div 
                  style={{ 
                    height: virtualItem.size, 
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.25rem',
                  }} 
                />
              ) : (
                renderItem(item, virtualItem.index)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Componente para lista virtualizada em grade (grade virtualizadas)
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  columns = 2,
  estimateSize,
  height = 400,
  className,
  innerClassName,
  disableVirtualization = false,
  overscan = 5,
  gap = 8,
  onEndReached,
  onEndReachedThreshold = 0.9,
  minItemHeight = 20,
  optimizationStrategy = 'auto',
  onItemVisible,
}: VirtualListProps<T> & { columns?: number }) {
  // Converter a lista linear em linhas para a grade
  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);
  
  // Renderizador de linhas
  const renderRow = useCallback((row: T[], rowIndex: number) => {
    return (
      <div 
        className="grid grid-cols-1 gap-2 w-full" 
        style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`, 
        }}
      >
        {row.map((item, colIndex) => (
          <div key={colIndex}>
            {renderItem(item, rowIndex * columns + colIndex)}
          </div>
        ))}
      </div>
    );
  }, [renderItem, columns, gap]);
  
  // Estimativa de tamanho para linhas
  const estimateRowSize = useCallback((index: number) => {
    let maxHeight = 0;
    
    // Estimar a altura para cada item na linha e pegar a maior
    for (let i = 0; i < columns; i++) {
      const itemIndex = index * columns + i;
      if (itemIndex < items.length) {
        const itemHeight = estimateSize(itemIndex);
        maxHeight = Math.max(maxHeight, itemHeight);
      }
    }
    
    return Math.max(maxHeight, minItemHeight) + gap;
  }, [columns, estimateSize, items.length, minItemHeight, gap]);
  
  // Adaptador para onItemVisible
  const handleRowVisible = useCallback((rowIndex: number) => {
    if (!onItemVisible) return;
    
    // Notificar visibilidade para todos os itens na linha
    for (let i = 0; i < columns; i++) {
      const itemIndex = rowIndex * columns + i;
      if (itemIndex < items.length) {
        onItemVisible(itemIndex);
      }
    }
  }, [columns, items.length, onItemVisible]);
  
  return (
    <VirtualList
      items={rows}
      renderItem={renderRow}
      estimateSize={estimateRowSize}
      height={height}
      className={className}
      innerClassName={innerClassName}
      disableVirtualization={disableVirtualization}
      overscan={overscan}
      gap={gap}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      minItemHeight={minItemHeight}
      optimizationStrategy={optimizationStrategy}
      onItemVisible={handleRowVisible}
    />
  );
}
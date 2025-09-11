import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseVirtualizationProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  threshold?: number;
}

interface UseVirtualizationReturn {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    item: any;
  }>;
  totalHeight: number;
  scrollElementProps: {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  shouldVirtualize: boolean;
}

const DEFAULT_THRESHOLD = 100;
const DEFAULT_OVERSCAN = 5;

export function useVirtualization({
  items,
  itemHeight,
  containerHeight,
  overscan = DEFAULT_OVERSCAN,
  threshold = DEFAULT_THRESHOLD,
}: UseVirtualizationProps): UseVirtualizationReturn {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Determine if we should virtualize based on item count
  const shouldVirtualize = items.length > threshold;

  // Calculate total height
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
      };
    }

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, start + visibleCount + overscan),
    };
  }, [
    scrollTop,
    itemHeight,
    containerHeight,
    overscan,
    items.length,
    shouldVirtualize,
  ]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result = [];

    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        item: items[i],
      });
    }

    return result;
  }, [startIndex, endIndex, itemHeight, items]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
  }, []);

  // Scroll element props
  const scrollElementProps = useMemo(
    () => ({
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: "auto" as const,
      },
    }),
    [handleScroll, containerHeight]
  );

  // Reset scroll position when items change significantly
  useEffect(() => {
    if (scrollElementRef.current && items.length === 0) {
      scrollElementRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  return {
    virtualItems,
    totalHeight,
    scrollElementProps,
    shouldVirtualize,
  };
}

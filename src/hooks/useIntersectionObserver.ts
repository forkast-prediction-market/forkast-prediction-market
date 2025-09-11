"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  onIntersect: () => void;
  enabled?: boolean;
}

export function useIntersectionObserver({
  threshold = 0,
  rootMargin = "200px",
  onIntersect,
  enabled = true,
}: UseIntersectionObserverOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && enabled) {
        onIntersect();
      }
    },
    [onIntersect, enabled]
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  // Callback ref that sets up the observer when element is attached
  const targetRef = useCallback(
    (element: HTMLElement | null) => {
      // Cleanup previous observer
      cleanup();

      if (!element || !enabled) return;

      // Create new observer
      observerRef.current = new IntersectionObserver(handleIntersect, {
        threshold,
        rootMargin,
      });

      observerRef.current.observe(element);
    },
    [handleIntersect, threshold, rootMargin, enabled, cleanup]
  );

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return targetRef;
}

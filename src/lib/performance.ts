/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Record a performance metric
   */
  record(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Performance] ${name}: ${value}ms`, metadata);
    }
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.record(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(name, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.record(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(name, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(name?: string) {
    const filteredMetrics = name
      ? this.metrics.filter((m) => m.name === name)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map((m) => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate percentiles
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return {
      count: filteredMetrics.length,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      p50: Math.round(p50 * 100) / 100,
      p90: Math.round(p90 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  } as T;
}

/**
 * Debounce function to delay execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage() {
  if (typeof window !== "undefined" && "memory" in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: Math.round(
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      ),
    };
  }
  return null;
}

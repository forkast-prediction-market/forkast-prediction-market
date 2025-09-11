'use client'

import React, { useEffect, useState } from 'react'
import { requestCache } from '@/lib/cache'
import { getMemoryUsage, performanceMonitor } from '@/lib/performance'

interface PerformanceMonitorProps {
  enabled?: boolean
}

export default function PerformanceMonitor({
  enabled = false,
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(enabled)
  const [stats, setStats] = useState<any>({})
  const [memoryStats, setMemoryStats] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>({})

  useEffect(() => {
    if (!isVisible) { return }

    const updateStats = () => {
      // Performance stats
      const apiRequestStats = performanceMonitor.getStats('api_events_request')
      const cacheHitStats = performanceMonitor.getStats('api_events_cache_hit')
      const scrollTriggerStats = performanceMonitor.getStats('scroll_trigger')
      const renderStats = performanceMonitor.getStats('events_render')

      setStats({
        apiRequest: apiRequestStats,
        cacheHit: cacheHitStats,
        scrollTrigger: scrollTriggerStats,
        render: renderStats,
      })

      // Memory stats
      const memory = getMemoryUsage()
      setMemoryStats(memory)

      // Cache stats
      const cache = requestCache.getStats()
      setCacheStats(cache)
    }

    updateStats()
    const interval = setInterval(updateStats, 1000)

    return () => clearInterval(interval)
  }, [isVisible])

  // Keyboard shortcut to toggle visibility (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-md rounded-lg bg-black/90 p-4 font-mono text-xs text-white">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* API Performance */}
      <div className="mb-2">
        <h4 className="font-semibold text-yellow-400">API Performance</h4>
        {stats.apiRequest
          ? (
              <div className="ml-2">
                <div>
                  Requests:
                  {stats.apiRequest.count}
                </div>
                <div>
                  Avg:
                  {stats.apiRequest.avg}
                  ms
                </div>
                <div>
                  P95:
                  {stats.apiRequest.p95}
                  ms
                </div>
              </div>
            )
          : (
              <div className="ml-2 text-gray-400">No data</div>
            )}
      </div>

      {/* Cache Performance */}
      <div className="mb-2">
        <h4 className="font-semibold text-green-400">Cache Performance</h4>
        {stats.cacheHit
          ? (
              <div className="ml-2">
                <div>
                  Cache Hits:
                  {stats.cacheHit.count}
                </div>
                <div>
                  Avg:
                  {stats.cacheHit.avg}
                  ms
                </div>
              </div>
            )
          : (
              <div className="ml-2 text-gray-400">No cache hits</div>
            )}
        <div className="ml-2">
          <div>
            Total Entries:
            {cacheStats.totalEntries || 0}
          </div>
          <div>
            Valid:
            {cacheStats.validEntries || 0}
          </div>
          <div>
            Expired:
            {cacheStats.expiredEntries || 0}
          </div>
        </div>
      </div>

      {/* Scroll Performance */}
      <div className="mb-2">
        <h4 className="font-semibold text-blue-400">Scroll Performance</h4>
        {stats.scrollTrigger
          ? (
              <div className="ml-2">
                <div>
                  Triggers:
                  {stats.scrollTrigger.count}
                </div>
              </div>
            )
          : (
              <div className="ml-2 text-gray-400">No scroll events</div>
            )}
      </div>

      {/* Render Performance */}
      <div className="mb-2">
        <h4 className="font-semibold text-purple-400">Render Performance</h4>
        {stats.render
          ? (
              <div className="ml-2">
                <div>
                  Renders:
                  {stats.render.count}
                </div>
              </div>
            )
          : (
              <div className="ml-2 text-gray-400">No render data</div>
            )}
      </div>

      {/* Memory Usage */}
      {memoryStats && (
        <div className="mb-2">
          <h4 className="font-semibold text-red-400">Memory Usage</h4>
          <div className="ml-2">
            <div>
              Used:
              {' '}
              {Math.round(memoryStats.usedJSHeapSize / 1024 / 1024)}
              MB
            </div>
            <div>
              Total:
              {' '}
              {Math.round(memoryStats.totalJSHeapSize / 1024 / 1024)}
              MB
            </div>
            <div>
              Usage:
              {memoryStats.usagePercentage}
              %
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  )
}

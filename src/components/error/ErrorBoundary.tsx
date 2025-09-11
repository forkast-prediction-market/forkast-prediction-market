'use client'

import type { ErrorInfo, ReactNode } from 'react'
import React, { Component } from 'react'
import { Button } from '@/components/ui/button'
import { performanceMonitor } from '@/lib/performance'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    })

    // Log error for monitoring
    performanceMonitor.record('error_boundary_catch', 0, {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state

    // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    const delay = Math.min(1000 * 2 ** retryCount, 10000)

    this.setState({
      retryCount: retryCount + 1,
    })

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      })

      performanceMonitor.record('error_boundary_retry', delay, {
        retryCount: retryCount + 1,
        delay,
      })
    }, delay)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    })

    performanceMonitor.record('error_boundary_reset', 0, {
      previousRetryCount: this.state.retryCount,
    })
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      if (fallback) {
        return fallback
      }

      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'An unexpected error occurred'}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Retry attempt
                {' '}
                {retryCount}
              </p>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              Try Again
            </Button>
            <Button variant="ghost" size="sm" onClick={this.handleReset}>
              Reset
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4 max-w-md">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return children
  }
}

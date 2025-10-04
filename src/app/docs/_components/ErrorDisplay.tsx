'use client'

import type { AffiliateDataError } from '@/lib/affiliate-data'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  /**
   * The error object containing error details
   */
  error: AffiliateDataError
  /**
   * Fallback value to display alongside the error
   */
  fallbackValue?: string
  /**
   * Custom className for styling
   */
  className?: string
  /**
   * Whether to show the refresh button
   */
  showRefresh?: boolean
}

/**
 * Component that displays error states with refresh functionality
 * Used by other MDX components when data fetching fails
 */
export function ErrorDisplay({
  error,
  fallbackValue,
  className = '',
  showRefresh = true,
}: ErrorDisplayProps) {
  function handleRefresh() {
    window.location.reload()
  }
  function getErrorMessage(error: AffiliateDataError): string {
    switch (error.code) {
      case 'DATABASE_ERROR':
        return 'Unable to connect to database'
      case 'SETTINGS_NOT_FOUND':
        return 'Settings not found'
      case 'AFFILIATE_SETTINGS_NOT_FOUND':
        return 'Affiliate settings not configured'
      case 'INCOMPLETE_SETTINGS':
        return 'Incomplete settings configuration'
      case 'INVALID_FORMAT':
        return 'Invalid settings format'
      case 'FETCH_ERROR':
        return 'Failed to fetch data'
      case 'INTERNAL_ERROR':
      default:
        return 'Internal server error'
    }
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {fallbackValue && (
        <span className="text-muted-foreground">
          {fallbackValue}
        </span>
      )}
      <span
        className="cursor-help text-xs text-destructive"
        title={`${getErrorMessage(error)} (${error.code})`}
      >
        ⚠️
      </span>
      {showRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
          title="Refresh to retry"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </span>
  )
}

/**
 * Block-level error display for larger error states
 */
export function ErrorDisplayBlock({
  error,
  className = '',
  title = 'Unable to load data',
}: {
  error: AffiliateDataError
  className?: string
  title?: string
}) {
  function handleRefresh() {
    window.location.reload()
  }
  function getErrorMessage(error: AffiliateDataError): string {
    switch (error.code) {
      case 'DATABASE_ERROR':
        return 'We\'re having trouble connecting to our database. Please try refreshing the page.'
      case 'SETTINGS_NOT_FOUND':
        return 'The required settings could not be found. Please contact support if this persists.'
      case 'AFFILIATE_SETTINGS_NOT_FOUND':
        return 'Affiliate settings have not been configured yet. Please contact support.'
      case 'INCOMPLETE_SETTINGS':
        return 'Some required settings are missing. Please contact support.'
      case 'INVALID_FORMAT':
        return 'The settings data format is invalid. Please contact support.'
      case 'FETCH_ERROR':
        return 'Failed to fetch the latest data. Please check your connection and try again.'
      case 'INTERNAL_ERROR':
      default:
        return 'An unexpected error occurred. Please try refreshing the page.'
    }
  }

  return (
    <div className={`rounded-lg border border-destructive/20 bg-destructive/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="text-destructive">
          ⚠️
        </div>
        <div className="flex-1">
          <h4 className="mb-1 font-semibold text-destructive">{title}</h4>
          <p className="mb-3 text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}

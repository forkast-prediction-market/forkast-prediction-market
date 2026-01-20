'use client'

import { useEffect, useState } from 'react'

interface ClientLocationState {
  pathname: string
  search: string
}

function readLocation(): ClientLocationState {
  if (typeof window === 'undefined') {
    return { pathname: '', search: '' }
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
  }
}

let historyPatched = false

function ensureHistoryEvents() {
  if (typeof window === 'undefined' || historyPatched) {
    return
  }

  historyPatched = true
  const { pushState, replaceState } = window.history

  function dispatch() {
    window.dispatchEvent(new Event('app:locationchange'))
  }

  window.history.pushState = (...args) => {
    pushState.apply(window.history, args as Parameters<typeof pushState>)
    dispatch()
  }

  window.history.replaceState = (...args) => {
    replaceState.apply(window.history, args as Parameters<typeof replaceState>)
    dispatch()
  }

  window.addEventListener('popstate', dispatch)
}

export function useClientLocation() {
  const [location, setLocation] = useState(readLocation())

  useEffect(() => {
    ensureHistoryEvents()

    function handleChange() {
      setLocation(readLocation())
    }

    handleChange()
    window.addEventListener('app:locationchange', handleChange)
    return () => {
      window.removeEventListener('app:locationchange', handleChange)
    }
  }, [])

  return location
}

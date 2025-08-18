'use client'

import { useEffect, useState } from 'react'

export function useClientMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  return mounted
}

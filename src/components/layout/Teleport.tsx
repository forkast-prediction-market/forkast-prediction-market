'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface TeleportProps {
  to: string
  children: React.ReactNode
}

export function Teleport({ to, children }: TeleportProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    (async function () {
      const target = document.querySelector(to) as HTMLElement | null

      if (!target) {
        setContainer(null)
        return
      }

      setContainer(target)

      return () => {
        if (target && document.body.contains(target)) {
          document.body.removeChild(target)
        }
      }
    })()
  }, [to])

  if (!container) {
    return null
  }

  return createPortal(children, container)
}

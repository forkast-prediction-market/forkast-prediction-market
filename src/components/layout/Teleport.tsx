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
      let created = false
      let target = document.querySelector(to) as HTMLElement | null

      if (!target) {
        const cleanSelector = to.replace(/^#|\./, '')
        target = document.createElement('div')
        target.id = cleanSelector
        document.body.appendChild(target)
        created = true
      }

      setContainer(target)

      return () => {
        if (created && target && document.body.contains(target)) {
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

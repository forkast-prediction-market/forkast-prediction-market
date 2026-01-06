import { useEffect, useState } from 'react'

interface WindowSize {
  width: number
  height: number
}

export function useWindowSize() {
  const [size, setSize] = useState<WindowSize>({ width: 0, height: 0 })

  useEffect(() => {
    function updateSize() {
      const width = window.innerWidth
      const height = window.innerHeight

      queueMicrotask(() => {
        setSize({ width, height })
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

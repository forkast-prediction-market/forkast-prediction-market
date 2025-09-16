import { useEffect, useState } from 'react'

export function useColumns() {
  const [columns, setColumns] = useState(4)

  useEffect(() => {
    function updateColumns() {
      const width = window.innerWidth

      queueMicrotask(() => {
        if (width >= 1024) {
          setColumns(4)
        }
        else if (width >= 768) {
          setColumns(3)
        }
        else if (width >= 640) {
          setColumns(2)
        }
        else {
          setColumns(1)
        }
      })
    }

    updateColumns()

    const mediaQueries = [
      window.matchMedia('(min-width: 1024px)'),
      window.matchMedia('(min-width: 768px)'),
      window.matchMedia('(min-width: 640px)'),
    ]

    mediaQueries.forEach(mq => mq.addEventListener('change', updateColumns))

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', updateColumns))
    }
  }, [])

  return columns
}

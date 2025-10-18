'use client'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { createContext, useMemo, useState } from 'react'

interface OpenCardContextType {
  openCardId: string | null
  setOpenCardId: Dispatch<SetStateAction<string | null>>
}

export const OpenCardContext = createContext<OpenCardContextType>({
  openCardId: null,
  setOpenCardId: () => {
    throw new Error('setOpenCardId called outside of provider')
  },
})

export function OpenCardProvider({ children }: { children: ReactNode }) {
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const value = useMemo(
    () => ({ openCardId, setOpenCardId }),
    [openCardId],
  )

  return (
    <OpenCardContext value={value}>
      {children}
    </OpenCardContext>
  )
}

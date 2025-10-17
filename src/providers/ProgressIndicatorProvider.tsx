'use client'

import type { ReactNode } from 'react'
import { ProgressProvider } from '@bprogress/next/app'

function ProgressIndicatorProvider({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      height="2px"
      color="var(--primary)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  )
}

export default ProgressIndicatorProvider

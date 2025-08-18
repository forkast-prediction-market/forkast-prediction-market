'use client'

import { ProgressProvider } from '@bprogress/next/app'

function ProgressIndicator({ children }: { children: React.ReactNode }) {
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

export default ProgressIndicator

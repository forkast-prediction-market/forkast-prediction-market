import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return children
}

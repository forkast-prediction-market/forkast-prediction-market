import type { Metadata } from 'next'
import PortfolioLayout from './_components/PortfolioLayout'

export const metadata: Metadata = {
  title: 'Portfolio',
}

export default function PortfolioPage() {
  return <PortfolioLayout />
}

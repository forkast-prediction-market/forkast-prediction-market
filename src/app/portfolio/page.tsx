import type { Metadata } from 'next'
import PortfolioContent from '@/app/portfolio/_components/PortfolioContent'

export const metadata: Metadata = {
  title: 'Portfolio',
}

export default async function PortfolioPage() {
  return <PortfolioContent />
}

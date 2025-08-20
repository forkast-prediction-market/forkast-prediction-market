import type { Metadata } from 'next'
import Content from './_components/Content'

export const metadata: Metadata = {
  title: 'Portfolio',
}

export default async function PortfolioPage() {
  return <Content />
}

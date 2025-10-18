import type { MDXComponents } from 'mdx/types'
import type { Metadata } from 'next'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { notFound, redirect } from 'next/navigation'
import { source } from '@/lib/source'
import { AffiliateShareDisplay } from '../_components/AffiliateShareDisplay'
import { FeeCalculationExample } from '../_components/FeeCalculationExample'
import { PlatformShareDisplay } from '../_components/PlatformShareDisplay'
import { TradingFeeDisplay } from '../_components/TradingFeeDisplay'

function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    TradingFeeDisplay,
    AffiliateShareDisplay,
    PlatformShareDisplay,
    FeeCalculationExample,
    ...components,
  }
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params

  const isOwnerGuideEnabled = JSON.parse(process.env.NEXT_PUBLIC_FORK_OWNER_GUIDE || 'false')
  if (params.slug?.[0] === 'owners' && !isOwnerGuideEnabled) {
    redirect('/docs/users')
  }

  const page = source.getPage(params.slug)
  if (!page) {
    redirect('/docs/users')
  }

  const MDX = page.data.body

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      lastUpdate={page.data.lastModified}
      tableOfContent={{
        style: 'clerk',
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params

  const isOwnerGuideEnabled = JSON.parse(process.env.NEXT_PUBLIC_FORK_OWNER_GUIDE || 'false')
  if (params.slug?.[0] === 'owners' && !isOwnerGuideEnabled) {
    notFound()
  }

  const page = source.getPage(params.slug)
  if (!page) {
    notFound()
  }

  return {
    title: page.data.title,
    description: page.data.description,
  }
}

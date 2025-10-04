import type { MDXComponents } from 'mdx/types'
import type { Metadata } from 'next'
import type { AffiliateDataResult } from '@/lib/affiliate-data-server'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { notFound, redirect } from 'next/navigation'
import { getAffiliateDataForDocs } from '@/components/docs/AffiliateDataProvider'
import { AffiliateShareDisplay } from '@/components/docs/AffiliateShareDisplay'
import { FeeCalculationExample } from '@/components/docs/FeeCalculationExample'
import { PlatformShareDisplay } from '@/components/docs/PlatformShareDisplay'
import { TradingFeeDisplay } from '@/components/docs/TradingFeeDisplay'
import { source } from '@/lib/source'

function getMDXComponents(affiliateData: AffiliateDataResult, components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // Override the affiliate data components with server-side data
    TradingFeeDisplay: (props: any) => <TradingFeeDisplay {...props} data={affiliateData} />,
    AffiliateShareDisplay: (props: any) => <AffiliateShareDisplay {...props} data={affiliateData} />,
    PlatformShareDisplay: (props: any) => <PlatformShareDisplay {...props} data={affiliateData} />,
    FeeCalculationExample: (props: any) => <FeeCalculationExample {...props} data={affiliateData} />,
    ...components,
  }
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) {
    redirect('/docs/users')
  }

  // Fetch affiliate data server-side for each request to ensure current data
  const affiliateData = await getAffiliateDataForDocs()

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
        <MDX components={getMDXComponents(affiliateData)} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) {
    notFound()
  }

  return {
    title: page.data.title,
    description: page.data.description,
  }
}

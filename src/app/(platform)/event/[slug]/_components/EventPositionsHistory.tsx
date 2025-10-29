'use client'

import { Copy, Share, Twitter } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { sanitizeSvg } from '@/lib/utils'

const positionRow = {
  outcome: 'Yes',
  quantity: '2',
  averagePrice: '49¢',
  value: {
    total: '$2,04',
    cost: '$1,00',
  },
  return: {
    summary: '+$1,04',
    percentage: '103,96%',
    unrealized: '+$1,04',
    realized: '+$0,00',
  },
}

const historyEntries = [
  {
    id: '1',
    description: 'Bought 2.04 Yes at 49¢ ($1.00)',
    emphasis: 'Yes',
    timestamp: '1mo ago',
  },
]

const shareCard = {
  image: '/images/how-it-works/1.webp',
  title: 'New US sanctions on Brazilian Supreme Court Justices by September 30?',
  invested: '$1.00',
  toWin: '$2.04',
}

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Forkast'
const siteLogoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG ?? ''

export default function EventPositionsHistory() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border/60 bg-background/40 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Positions</h3>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className={`
              grid grid-cols-[1.4fr_0.6fr_0.7fr_1.2fr_1.4fr_0.6fr] items-center gap-4 border-b border-border/40 pb-3
              text-xs font-semibold tracking-wide text-muted-foreground uppercase
            `}
            >
              <span>Outcome</span>
              <span>Qty</span>
              <span>Avg</span>
              <span>Value</span>
              <span>Return</span>
              <span></span>
            </div>

            <div className={`
              grid grid-cols-[1.4fr_0.6fr_0.7fr_1.2fr_1.4fr_0.6fr] items-center gap-4 py-4 text-sm text-foreground
            `}
            >
              <div>
                <span className={`
                  inline-flex items-center rounded-md bg-yes/10 px-2 py-1 text-xs font-semibold tracking-wide text-yes
                  uppercase
                `}
                >
                  {positionRow.outcome}
                </span>
              </div>

              <div className="font-medium">
                {positionRow.quantity}
              </div>

              <div className="font-medium">
                {positionRow.averagePrice}
              </div>

              <div>
                <div className="font-medium">{positionRow.value.total}</div>
                <div className="text-xs text-muted-foreground">
                  Cost
                  {' '}
                  {positionRow.value.cost}
                </div>
              </div>

              <div className="font-semibold text-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`
                        text-left font-semibold transition-colors
                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                        focus-visible:ring-offset-background focus-visible:outline-none
                      `}
                    >
                      {positionRow.return.summary}
                      {' '}
                      <span className="text-xs font-semibold text-yes">
                        (
                        {positionRow.return.percentage}
                        )
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    sideOffset={8}
                    className={`
                      w-60 rounded-md border border-border/60 bg-background p-3 text-left text-xs text-foreground
                      shadow-lg
                      [&>svg]:hidden
                    `}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Unrealized</span>
                        <span className="font-semibold text-foreground">{positionRow.return.unrealized}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Realized</span>
                        <span className="font-semibold">{positionRow.return.realized}</span>
                      </div>
                      <div className="h-px w-full bg-border/60" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="font-semibold text-foreground">
                          {positionRow.return.summary}
                          {' '}
                          <span className="text-yes">
                            (
                            {positionRow.return.percentage}
                            )
                          </span>
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className={`
                        flex size-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground
                        transition-colors
                        hover:text-foreground
                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                        focus-visible:ring-offset-background focus-visible:outline-none
                      `}
                      aria-label="Share position"
                    >
                      <Share className="size-4" />
                    </button>
                  </DialogTrigger>

                  <DialogContent className="max-w-md space-y-6 text-center sm:p-8">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Shill your bag
                    </DialogTitle>
                    <div className={`
                      rounded-lg border border-border/60 bg-white p-4 text-left shadow-lg
                      sm:p-5
                      dark:bg-background
                    `}
                    >
                      <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground">
                        {siteLogoSvg && (
                          <div
                            className="size-6 [&_*]:fill-current [&_*]:stroke-current"
                            dangerouslySetInnerHTML={{ __html: sanitizeSvg(siteLogoSvg) }}
                          />
                        )}
                        <span className="text-xl font-medium tracking-wide">
                          {siteName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`
                          relative size-16 flex-shrink-0 overflow-hidden rounded-md border border-border/60
                        `}
                        >
                          <Image
                            src={shareCard.image}
                            alt={shareCard.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-semibold text-black dark:text-white">
                            {shareCard.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className={`
                              inline-flex items-center rounded-md bg-yes/10 px-2 py-0.5 text-xs font-semibold
                              tracking-wide text-yes uppercase
                            `}
                            >
                              Yes
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Avg
                              {' '}
                              {positionRow.averagePrice}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 border-t border-dashed border-border/60" />
                        {siteLogoSvg && (
                          <div
                            className="size-5 text-muted-foreground [&_*]:fill-current [&_*]:stroke-current"
                            dangerouslySetInnerHTML={{ __html: sanitizeSvg(siteLogoSvg) }}
                          />
                        )}
                        <span className="h-px flex-1 border-t border-dashed border-border/60" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-left">
                          <span className="text-xs tracking-wide text-muted-foreground uppercase">
                            Invested
                          </span>
                          <div className="text-lg font-semibold text-foreground">
                            {shareCard.invested}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs tracking-wide text-muted-foreground uppercase">
                            To win
                          </span>
                          <div className="text-lg font-semibold text-yes">
                            {shareCard.toWin}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button variant="outline" className="flex-1">
                        <Copy className="size-4" />
                        Copy Image
                      </Button>
                      <Button className="flex-1">
                        <Twitter className="size-4" />
                        Share
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-background/40 p-4">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">History</h3>
        </div>

        <div className="space-y-3">
          {historyEntries.map((entry) => {
            const [before = '', after = ''] = entry.description.split(entry.emphasis)

            return (
              <div
                key={entry.id}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground"
              >
                <span className="text-left">
                  {before}
                  <span className="font-semibold text-yes">
                    {entry.emphasis}
                  </span>
                  {after}
                </span>
                <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

'use client'

import { DialogTitle } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { BanknoteArrowDownIcon, CircleCheckIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'

const proceedsDisplay = '$2.04'

const stats = [
  { label: 'Markets won', value: '1' },
  { label: 'Total return', value: '104.17%' },
  { label: 'Proceeds', value: proceedsDisplay },
]

const wonMarket = {
  image: '/images/how-it-works/1.webp',
  title: 'New US sanctions on Brazilian Supreme Court Justices by September 30?',
  invested: '$1.00',
  proceedsSummary: proceedsDisplay,
  proceedsDetail: '$2.04',
  percentReturn: '+104%',
}

export default function PortfolioMarketsWonCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Forkast'

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card className="border border-border/60 bg-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 md:flex-nowrap md:gap-6 md:p-6">
          <div className="flex flex-wrap items-center gap-4 md:flex-nowrap md:gap-6">
            <div className="relative size-12 overflow-hidden rounded-md border border-border/60">
              <Image
                src={wonMarket.image}
                alt={wonMarket.title}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-8">
              {stats.map((stat, index) => (
                <Fragment key={stat.label}>
                  <div className="flex min-w-27.5 flex-col justify-center text-sm">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      {stat.value}
                    </span>
                  </div>
                  {index < stats.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="mx-2 hidden h-10 w-px rounded-full bg-border/60 md:block"
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          <DialogTrigger asChild>
            <Button className="h-11 shrink-0 px-6">
              <BanknoteArrowDownIcon className="size-4" />
              Claim
            </Button>
          </DialogTrigger>
        </CardContent>
      </Card>

      <DialogContent className="max-w-md space-y-6 text-center sm:p-8">
        <VisuallyHidden>
          <DialogTitle>You Won</DialogTitle>
        </VisuallyHidden>

        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-yes/15">
            <CircleCheckIcon className="size-14 text-yes" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-semibold text-foreground dark:text-white">
            You won
            {' '}
            {wonMarket.proceedsSummary}
          </p>
          <p className="text-sm text-muted-foreground">
            Great job predicting the future on
            {' '}
            {siteName}
            !
          </p>
        </div>

        <Link
          href="#"
          className={`
            flex w-full items-center gap-4 rounded-md p-4 transition-colors
            hover:bg-muted/40
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            focus-visible:ring-offset-background focus-visible:outline-none
            dark:hover:bg-muted/20
          `}
        >
          <div className="relative size-14 overflow-hidden rounded-md">
            <Image
              src={wonMarket.image}
              alt={wonMarket.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{wonMarket.title}</p>
            <p className="text-xs text-muted-foreground">
              Invested
              {' '}
              {wonMarket.invested}
              {' '}
              • Won
              {' '}
              {wonMarket.proceedsDetail}
              {' '}
              (
              {wonMarket.percentReturn}
              )
            </p>
          </div>
        </Link>

        <DialogClose asChild>
          <Button className="h-11 w-full">
            Claim proceeds
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

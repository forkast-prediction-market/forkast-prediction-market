'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const Accordion = AccordionPrimitive.Root

function AccordionItem({ ref, className, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & { ref?: React.RefObject<React.ElementRef<typeof AccordionPrimitive.Item> | null> }) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn('border-b', className)}
      {...props}
    />
  )
}
AccordionItem.displayName = 'AccordionItem'

function AccordionTrigger({ ref, className, children, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & { ref?: React.RefObject<React.ElementRef<typeof AccordionPrimitive.Trigger> | null> }) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          `
            flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all
            hover:underline
            [&[data-state=open]>svg]:rotate-180
          `,
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

function AccordionContent({ ref, className, children, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & { ref?: React.RefObject<React.ElementRef<typeof AccordionPrimitive.Content> | null> }) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={`
        overflow-hidden text-sm
        data-[state=closed]:animate-accordion-up
        data-[state=open]:animate-accordion-down
      `}
      {...props}
    >
      <div className={cn('pt-0 pb-4', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }

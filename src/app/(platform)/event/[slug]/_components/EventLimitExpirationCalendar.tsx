'use client'

import { Clock2Icon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EventLimitExpirationCalendarProps {
  value?: Date
  onChange?: (value: Date) => void
}

function formatTimeInput(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

function mergeDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(segment => Number.parseInt(segment, 10))
  const nextDate = new Date(date)

  const normalizedHours = Number.isFinite(hours) ? hours : 0
  const normalizedMinutes = Number.isFinite(minutes) ? minutes : 0
  nextDate.setHours(normalizedHours, normalizedMinutes, 0, 0)

  return nextDate
}

export default function EventLimitExpirationCalendar({ value, onChange }: EventLimitExpirationCalendarProps) {
  const initialDate = useMemo(() => value ?? new Date(), [value])
  const minDate = useMemo(() => new Date(), [])
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate)
  const [timeValue, setTimeValue] = useState<string>(() => formatTimeInput(initialDate))

  useEffect(() => {
    const nextDate = value ?? new Date()
    setSelectedDate(nextDate)
    setTimeValue(formatTimeInput(nextDate))
  }, [value])

  function handleChange(nextDate: Date, nextTime = timeValue) {
    const mergedDate = mergeDateAndTime(nextDate, nextTime)
    const clampedDate = mergedDate < minDate ? minDate : mergedDate

    if (clampedDate !== mergedDate) {
      setTimeValue(formatTimeInput(clampedDate))
    }

    setSelectedDate(clampedDate)
    onChange?.(clampedDate)
  }

  return (
    <Card className="w-fit py-4">
      <CardContent className="px-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          fromDate={minDate}
          disabled={{ before: minDate }}
          onSelect={(nextDate) => {
            if (!nextDate) {
              return
            }
            handleChange(nextDate)
          }}
          className="bg-transparent p-0"
        />
      </CardContent>
      <CardFooter className="flex flex-col gap-6 border-t px-4 !pt-4">
        <div className="flex w-full flex-col gap-3">
          <Label htmlFor="expiration-time">Expiration Time</Label>
          <div className="relative flex w-full items-center gap-2">
            <Clock2Icon className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground select-none" />
            <Input
              id="expiration-time"
              type="time"
              step="60"
              value={timeValue}
              onChange={(event) => {
                const nextTime = event.target.value || '00:00'
                setTimeValue(nextTime)
                handleChange(selectedDate ?? initialDate, nextTime)
              }}
              className={`
                appearance-none pl-8
                [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none
              `}
            />
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

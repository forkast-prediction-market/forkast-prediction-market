'use client'

import { AlertCircle, Calendar, CheckCircle2, Image, Loader2, Plus, Tag, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getMainTags } from '@/lib/db/tags'

interface EventTag {
  label: string
  slug: string
}

interface MarketOutcome {
  outcome: string
  token_id?: string
}

interface Market {
  question: string
  description: string
  icon: string
  market_slug: string
  outcomes: MarketOutcome[]
}

interface EventForm {
  // Event fields
  event_id: string
  slug: string
  title: string
  description: string
  start_date_iso: string
  end_date_iso: string
  icon: string
  tags: EventTag[]
  show_market_icons: boolean
  resolution_source?: string

  // Event markets
  markets: Market[]
}

export default function CreateEventContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [availableTags, setAvailableTags] = useState<EventTag[]>([])
  const [eventIconFile, setEventIconFile] = useState<File | null>(null)
  const [marketIconFiles, setMarketIconFiles] = useState<{ [key: number]: File | null }>({})

  // Refs for debouncing slug generation
  const eventTitleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tagTimeoutsRef = useRef<{ [key: number]: NodeJS.Timeout | null }>({})
  const marketTimeoutsRef = useRef<{ [key: number]: NodeJS.Timeout | null }>({})
  const [form, setForm] = useState<EventForm>({
    event_id: '',
    slug: '',
    title: '',
    description: '',
    start_date_iso: '',
    end_date_iso: '',
    icon: '',
    tags: [{ label: '', slug: '' }],
    show_market_icons: true,
    resolution_source: '',
    markets: [{
      question: '',
      description: '',
      icon: '',
      market_slug: '',
      outcomes: [
        { outcome: '' },
        { outcome: '' },
      ],
    }],
  })

  // Load available tags on component mount
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await getMainTags()
        setAvailableTags(tags.map(tag => ({
          label: tag.name,
          slug: tag.slug,
        })))
      }
      catch (error) {
        console.error('Error loading tags:', error)
      }
    }
    loadTags()
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (eventTitleTimeoutRef.current) {
        clearTimeout(eventTitleTimeoutRef.current)
      }
      Object.values(tagTimeoutsRef.current).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout)
        }
      })
      Object.values(marketTimeoutsRef.current).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout)
        }
      })
    }
  }, [])

  const generateSlug = useCallback((text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036F]/g, '') // Remove diacritics (accents)
      .replace(/[^\w\s-]/g, '') // Remove remaining special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .trim()
  }, [])

  const handleEventFieldChange = useCallback((field: keyof EventForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // Debounced slug generation for event title
  useEffect(() => {
    if (eventTitleTimeoutRef.current) {
      clearTimeout(eventTitleTimeoutRef.current)
    }

    eventTitleTimeoutRef.current = setTimeout(() => {
      if (form.title.trim()) {
        setForm(prev => ({
          ...prev,
          slug: generateSlug(form.title),
          event_id: generateSlug(form.title),
        }))
      }
    }, 500) // 500ms delay

    return () => {
      if (eventTitleTimeoutRef.current) {
        clearTimeout(eventTitleTimeoutRef.current)
      }
    }
  }, [form.title, generateSlug])

  const handleTagChange = useCallback((index: number, field: keyof EventTag, value: any) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.map((tag, i) =>
        i === index
          ? { ...tag, [field]: value }
          : tag,
      ),
    }))
  }, [])

  // Debounced slug generation for tags
  useEffect(() => {
    form.tags.forEach((tag, index) => {
      if (tagTimeoutsRef.current[index]) {
        clearTimeout(tagTimeoutsRef.current[index]!)
      }

      tagTimeoutsRef.current[index] = setTimeout(() => {
        if (tag.label.trim()) {
          setForm(prev => ({
            ...prev,
            tags: prev.tags.map((t, i) =>
              i === index
                ? { ...t, slug: generateSlug(tag.label) }
                : t,
            ),
          }))
        }
      }, 300) // 300ms delay for tags
    })

    return () => {
      Object.values(tagTimeoutsRef.current).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout)
        }
      })
    }
  }, [form.tags.map(tag => tag.label).join('|'), generateSlug])

  function addTag() {
    setForm(prev => ({
      ...prev,
      tags: [...prev.tags, { label: '', slug: '' }],
    }))
  }

  function addTagFromList(tag: EventTag) {
    // Check if tag already exists
    const exists = form.tags.some(existingTag => existingTag.slug === tag.slug)
    if (!exists) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }))
    }
  }

  function handleEventIconUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setEventIconFile(file)
      // Update form with file name for preview
      setForm(prev => ({
        ...prev,
        icon: file.name,
      }))
    }
  }

  function handleMarketIconUpload(marketIndex: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setMarketIconFiles(prev => ({
        ...prev,
        [marketIndex]: file,
      }))
      // Update form with file name for preview
      setForm(prev => ({
        ...prev,
        markets: prev.markets.map((market, i) =>
          i === marketIndex
            ? { ...market, icon: file.name }
            : market,
        ),
      }))
    }
  }

  function removeTag(index: number) {
    if (form.tags.length > 1) {
      setForm(prev => ({
        ...prev,
        tags: prev.tags.filter((_, i) => i !== index),
      }))
    }
  }

  const handleMarketChange = useCallback((marketIndex: number, field: keyof Market, value: any) => {
    setForm(prev => ({
      ...prev,
      markets: prev.markets.map((market, i) =>
        i === marketIndex
          ? { ...market, [field]: value }
          : market,
      ),
    }))
  }, [])

  // Debounced slug generation for markets
  useEffect(() => {
    form.markets.forEach((market, index) => {
      if (marketTimeoutsRef.current[index]) {
        clearTimeout(marketTimeoutsRef.current[index]!)
      }

      marketTimeoutsRef.current[index] = setTimeout(() => {
        if (market.question.trim()) {
          setForm(prev => ({
            ...prev,
            markets: prev.markets.map((m, i) =>
              i === index
                ? { ...m, market_slug: generateSlug(market.question) }
                : m,
            ),
          }))
        }
      }, 300) // 300ms delay for markets
    })

    return () => {
      Object.values(marketTimeoutsRef.current).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout)
        }
      })
    }
  }, [form.markets.map(market => market.question).join('|'), generateSlug])

  const handleOutcomeChange = useCallback((marketIndex: number, outcomeIndex: number, value: string) => {
    // Update immediately without debouncing to prevent focus loss
    setForm(prev => ({
      ...prev,
      markets: prev.markets.map((market, i) =>
        i === marketIndex
          ? {
              ...market,
              outcomes: market.outcomes.map((outcome, j) =>
                j === outcomeIndex ? { ...outcome, outcome: value } : outcome,
              ),
            }
          : market,
      ),
    }))
  }, [])

  function addMarket() {
    setForm(prev => ({
      ...prev,
      markets: [...prev.markets, {
        question: '',
        description: '',
        icon: '',
        market_slug: '',
        outcomes: [
          { outcome: '' },
          { outcome: '' },
        ],
      }],
    }))
  }

  function removeMarket(index: number) {
    if (form.markets.length > 1) {
      setForm(prev => ({
        ...prev,
        markets: prev.markets.filter((_, i) => i !== index),
      }))
    }
  }

  function validateForm(): string[] {
    const errors: string[] = []

    // Event validations
    if (!form.title.trim()) {
      errors.push('Event title is required')
    }
    if (!form.description.trim()) {
      errors.push('Event description is required')
    }
    if (!form.start_date_iso) {
      errors.push('Start date is required')
    }
    if (!form.end_date_iso) {
      errors.push('End date is required')
    }
    if (!eventIconFile) {
      errors.push('Event icon is required')
    }

    // Validate dates
    if (form.start_date_iso && form.end_date_iso) {
      if (new Date(form.start_date_iso) >= new Date(form.end_date_iso)) {
        errors.push('End date must be after start date')
      }
    }

    // Validate tags
    const validTags = form.tags.filter(tag => tag.label.trim())
    if (validTags.length === 0) {
      errors.push('At least one tag is required')
    }

    // Market validations
    form.markets.forEach((market, index) => {
      if (!market.question.trim()) {
        errors.push(`Market ${index + 1}: Question is required`)
      }
      if (!market.description.trim()) {
        errors.push(`Market ${index + 1}: Description is required`)
      }
      if (!marketIconFiles[index]) {
        errors.push(`Market ${index + 1}: Icon is required`)
      }

      // Validate outcomes
      const validOutcomes = market.outcomes.filter(outcome => outcome.outcome.trim())
      if (validOutcomes.length < 2) {
        errors.push(`Market ${index + 1}: At least 2 outcomes are required`)
      }
    })

    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    setIsLoading(true)

    try {
      // Prepare data for validation and preview only
      const eventData = {
        ...form,
        tags: form.tags.filter(tag => tag.label.trim()), // Remove empty tags
        markets: form.markets.map(market => ({
          ...market,
          outcomes: market.outcomes.filter(outcome => outcome.outcome.trim()), // Remove empty outcomes
          oracle_type: 'native', // Set as native
          resolved_by: process.env.NEXT_PUBLIC_UMA_ADAPTER_ADDRESS || '0xDde785fc1311ab3D4C71aa216dDe6Aa27b6bcC4b',
        })),
      }

      console.log('Event data prepared (validation only):', eventData)

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Event validated successfully! 🎉')
      toast.info('Ready for implementation - data not saved yet')

      // Reset form
      setForm({
        event_id: '',
        slug: '',
        title: '',
        description: '',
        start_date_iso: '',
        end_date_iso: '',
        icon: '',
        tags: [{ label: '', slug: '' }],
        show_market_icons: true,
        resolution_source: '',
        markets: [{
          question: '',
          description: '',
          icon: '',
          market_slug: '',
          outcomes: [
            { outcome: '' },
            { outcome: '' },
          ],
        }],
      })

      // Reset file states
      setEventIconFile(null)
      setMarketIconFiles({})
    }
    catch (error) {
      console.error('Error validating event:', error)
      toast.error('Error validating event. Please try again.')
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create Event/Market</h1>
        <p className="mt-2 text-muted-foreground">
          Create a new event with its prediction markets. All marked fields are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Information */}
        <Card>
          <CardHeader className="pt-8 pb-6">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Event Information
            </CardTitle>
            <CardDescription>
              Configure the basic event information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => handleEventFieldChange('title', e.target.value)}
                  placeholder="Ex: 2024 Presidential Election"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (automatically generated)</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={e => handleEventFieldChange('slug', e.target.value)}
                  placeholder="2024-presidential-election"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Event Description *</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => handleEventFieldChange('description', e.target.value)}
                placeholder="Describe the event and its resolution rules..."
                className="min-h-24"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={form.start_date_iso}
                  onChange={e => handleEventFieldChange('start_date_iso', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={form.end_date_iso}
                  onChange={e => handleEventFieldChange('end_date_iso', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="icon">Event Icon *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="icon"
                    type="file"
                    accept="image/*"
                    onChange={handleEventIconUpload}
                    className={`
                      file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm
                      file:text-primary-foreground
                    `}
                  />
                  {eventIconFile && (
                    <span className="truncate text-sm text-muted-foreground">
                      {eventIconFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution_source">Resolution Source</Label>
                <Input
                  id="resolution_source"
                  value={form.resolution_source}
                  onChange={e => handleEventFieldChange('resolution_source', e.target.value)}
                  placeholder="Ex: https://wikipedia.org/..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show_market_icons"
                checked={form.show_market_icons}
                onCheckedChange={checked => handleEventFieldChange('show_market_icons', checked)}
              />
              <Label htmlFor="show_market_icons">Show market icons</Label>
            </div>
          </CardContent>
        </Card>

        {/* Event Tags */}
        <Card>
          <CardHeader className="pt-8 pb-6">
            <CardTitle className="flex items-center gap-2">
              <Tag className="size-5" />
              Event Tags
            </CardTitle>
            <CardDescription>
              Add tags to categorize the event
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-4">
              {/* Available Tags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Tags (click to add)</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <Button
                        key={tag.slug}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTagFromList(tag)}
                        disabled={form.tags.some(existingTag => existingTag.slug === tag.slug)}
                        className="text-xs"
                      >
                        {tag.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Tags */}
              <div className="space-y-2">
                <Label>Selected Tags *</Label>
                {form.tags.map((tag, index) => (
                  <div key={`tag-${index}`} className="flex items-center gap-4">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Input
                        value={tag.label}
                        onChange={e => handleTagChange(index, 'label', e.target.value)}
                        placeholder="Tag name"
                      />
                      <Input
                        value={tag.slug}
                        onChange={e => handleTagChange(index, 'slug', e.target.value)}
                        placeholder="tag-slug"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeTag(index)}
                      disabled={form.tags.length <= 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="mr-2 size-4" />
                  Add Custom Tag
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Markets */}
        <Card>
          <CardHeader className="pt-8 pb-6">
            <CardTitle className="flex items-center gap-2">
              <Image className="size-5" />
              Prediction Markets
            </CardTitle>
            <CardDescription>
              Configure the markets that will be part of this event
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-8">
              {form.markets.map((market, marketIndex) => (
                <div
                  key={`market-${marketIndex}-${market.market_slug || 'empty'}`}
                  className="space-y-4 rounded-lg border p-8"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">
                      Market
                      {marketIndex + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMarket(marketIndex)}
                      disabled={form.markets.length <= 1}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Market Question *</Label>
                      <Input
                        value={market.question}
                        onChange={e => handleMarketChange(marketIndex, 'question', e.target.value)}
                        placeholder="Ex: Who will be elected president?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Slug (automatically generated)</Label>
                      <Input
                        value={market.market_slug}
                        onChange={e => handleMarketChange(marketIndex, 'market_slug', e.target.value)}
                        placeholder="who-will-be-elected-president"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Textarea
                        value={market.description}
                        onChange={e => handleMarketChange(marketIndex, 'description', e.target.value)}
                        placeholder="Describe the resolution rules for this market..."
                        className="min-h-20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Market Icon *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={e => handleMarketIconUpload(marketIndex, e)}
                          className={`
                            file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm
                            file:text-primary-foreground
                          `}
                        />
                        {marketIconFiles[marketIndex] && (
                          <span className="truncate text-sm text-muted-foreground">
                            {marketIconFiles[marketIndex]?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Outcomes */}
                    <div className="space-y-3">
                      <Label>Response Options *</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {market.outcomes.map((outcome, outcomeIndex) => (
                          <Input
                            key={`outcome-${marketIndex}-${outcomeIndex}`}
                            value={outcome.outcome}
                            onChange={e => handleOutcomeChange(marketIndex, outcomeIndex, e.target.value)}
                            placeholder={outcomeIndex === 0 ? 'Yes' : 'No'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addMarket}>
                <Plus className="mr-2 size-4" />
                Add Market
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Development Status */}
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 text-red-500" />
              <div className="space-y-2">
                <h4 className="font-semibold">Development Status - Not Ready for Production</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • ❌
                    <strong>Database integration not implemented</strong>
                    {' '}
                    - events are not saved
                  </li>
                  <li>
                    • ❌
                    <strong>Blockchain deployment not implemented</strong>
                    {' '}
                    - no smart contract interaction
                  </li>
                  <li>
                    • ❌
                    <strong>Image upload not implemented</strong>
                    {' '}
                    - files are not stored anywhere
                  </li>
                  <li>
                    • ❌
                    <strong>UMA oracle integration pending</strong>
                    {' '}
                    - no resolution mechanism
                  </li>
                  <li>• ⚠️ This form only validates data and shows preview in console</li>
                  <li>• ⚠️ All backend functionality needs to be implemented</li>
                  <li>• ✅ UI and validation logic are complete</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading
              ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Validating...
                  </>
                )
              : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    Validate Event Data
                  </>
                )}
          </Button>
        </div>
      </form>
    </div>
  )
}

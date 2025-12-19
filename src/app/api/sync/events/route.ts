import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/auth-cron'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300

const PNL_SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cmfbr456t4gud01w483uu2d9d/subgraphs/pnl-subgraph/1.0.0/gn'
const MARKET_CREATORS_ADDRESS = process.env.MARKET_CREATORS_ADDRESS
const IRYS_GATEWAY = process.env.IRYS_GATEWAY || 'https://gateway.irys.xyz'
const SYNC_TIME_LIMIT_MS = 250_000
const PNL_PAGE_SIZE = 200

interface SyncCursor {
  conditionId: string
  creationTimestamp: number
}

interface SubgraphCondition {
  id: string
  oracle: string | null
  questionId: string | null
  resolved: boolean
  arweaveHash: string | null
  creator: string | null
  owner?: string | null
  creationTimestamp: string
}

interface SyncStats {
  fetchedCount: number
  processedCount: number
  skippedExistingCount: number
  skippedCreatorCount: number
  errors: { conditionId: string, error: string }[]
  timeLimitReached: boolean
}

function getAllowedCreators(): string[] {
  const fixedCreators = [
    '0x1FD81E09dA67D84f02DB0c0eBabd5a217D1B928d', // Polymarket cloned markets on Amoy
  ]
  const envCreators = MARKET_CREATORS_ADDRESS
    ? MARKET_CREATORS_ADDRESS.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
    : []

  return [...new Set([...fixedCreators, ...envCreators].map(addr => addr.toLowerCase()))]
}
/**
 * 🔄 Market Synchronization Script for Vercel Functions
 *
 * This function syncs prediction markets from the Goldsky PnL subgraph to Supabase:
 * - Fetches new markets from blockchain via subgraph (INCREMENTAL)
 * - Downloads metadata and images from Irys/Arweave
 * - Stores everything in Supabase database and storage
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!isCronAuthorized(auth, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
  }

  try {
    const isRunning = await checkSyncRunning()
    if (isRunning) {
      console.log('🚫 Sync already running, skipping...')
      return NextResponse.json({
        success: false,
        message: 'Sync already running',
        skipped: true,
      }, { status: 409 })
    }

    await updateSyncStatus('running')

    console.log('🚀 Starting incremental market synchronization...')

    const updatedAt = await getLastUpdatedAt()
    console.log(`📊 Last processed at: ${updatedAt}`)

    const syncResult = await syncMarkets()

    await updateSyncStatus('completed', null, syncResult.processedCount)

    if (syncResult.fetchedCount === 0) {
      console.log('📭 No markets fetched from PnL subgraph')
      return NextResponse.json({
        success: true,
        message: 'No new markets to process',
        processed: 0,
        fetched: 0,
      })
    }

    const responsePayload = {
      success: true,
      processed: syncResult.processedCount,
      fetched: syncResult.fetchedCount,
      skippedExisting: syncResult.skippedExistingCount,
      skippedCreators: syncResult.skippedCreatorCount,
      errors: syncResult.errors.length,
      errorDetails: syncResult.errors,
      timeLimitReached: syncResult.timeLimitReached,
    }

    console.log('🎉 Incremental synchronization completed:', responsePayload)
    return NextResponse.json(responsePayload)
  }
  catch (error: any) {
    console.error('💥 Sync failed:', error)

    await updateSyncStatus('error', error.message)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

async function getLastUpdatedAt() {
  const { data, error } = await supabaseAdmin
    .from('subgraph_syncs')
    .select('updated_at')
    .eq('service_name', 'market_sync')
    .eq('subgraph_name', 'pnl')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get last processed timestamp: ${error.message}`)
  }

  return data?.updated_at || 0
}

async function syncMarkets(): Promise<SyncStats> {
  const syncStartedAt = Date.now()
  let cursor = await getLastProcessedConditionCursor()

  if (cursor) {
    const cursorIso = new Date(cursor.creationTimestamp * 1000).toISOString()
    console.log(`⏱️ Resuming sync after condition ${cursor.conditionId} (created at ${cursorIso})`)
  }
  else {
    console.log('📥 No existing markets found, starting full sync')
  }

  const allowedCreators = new Set(getAllowedCreators())

  let fetchedCount = 0
  let processedCount = 0
  let skippedExistingCount = 0
  let skippedCreatorCount = 0
  const errors: { conditionId: string, error: string }[] = []
  let timeLimitReached = false
  const eventIdsNeedingStatusUpdate = new Set<string>()

  while (Date.now() - syncStartedAt < SYNC_TIME_LIMIT_MS) {
    const page = await fetchPnLConditionsPage(cursor)

    if (page.conditions.length === 0) {
      console.log('📦 PnL subgraph returned no additional conditions')
      break
    }

    fetchedCount += page.conditions.length
    console.log(`📑 Processing ${page.conditions.length} conditions (running total fetched: ${fetchedCount})`)

    const existingIds = await getExistingConditionIds(page.conditions.map(condition => condition.id))

    for (const condition of page.conditions) {
      const creationTimestamp = Number(condition.creationTimestamp)
      if (Number.isNaN(creationTimestamp)) {
        console.error(`⚠️ Skipping condition ${condition.id} - invalid creationTimestamp: ${condition.creationTimestamp}`)
        continue
      }

      const conditionCursor: SyncCursor = {
        conditionId: condition.id,
        creationTimestamp,
      }

      if (!condition.creator) {
        console.error(`⚠️ Skipping condition ${condition.id} - missing creator/owner field`)
        cursor = conditionCursor
        continue
      }

      if (!allowedCreators.has(condition.creator)) {
        skippedCreatorCount++
        console.log(`🚫 Skipping market ${condition.id} - creator ${condition.creator} not in allowed list`)
        cursor = conditionCursor
        continue
      }

      if (existingIds.has(condition.id)) {
        skippedExistingCount++
        cursor = conditionCursor
        continue
      }

      if (Date.now() - syncStartedAt >= SYNC_TIME_LIMIT_MS) {
        console.warn('⏹️ Time limit reached during market processing, aborting sync loop')
        timeLimitReached = true
        break
      }

      try {
        const eventIdForStatusUpdate = await processMarket(condition)
        if (eventIdForStatusUpdate) {
          eventIdsNeedingStatusUpdate.add(eventIdForStatusUpdate)
        }
        processedCount++
        console.log(`✅ Processed market: ${condition.id}`)
      }
      catch (error: any) {
        console.error(`❌ Error processing market ${condition.id}:`, error)
        errors.push({
          conditionId: condition.id,
          error: error.message ?? String(error),
        })
      }

      cursor = conditionCursor
    }

    if (eventIdsNeedingStatusUpdate.size > 0) {
      await updateEventStatusesFromMarketsBatch(Array.from(eventIdsNeedingStatusUpdate))
      eventIdsNeedingStatusUpdate.clear()
    }

    if (timeLimitReached) {
      break
    }

    if (page.conditions.length < PNL_PAGE_SIZE) {
      console.log('📭 Last fetched page was smaller than the configured page size; stopping pagination')
      break
    }
  }

  if (eventIdsNeedingStatusUpdate.size > 0) {
    await updateEventStatusesFromMarketsBatch(Array.from(eventIdsNeedingStatusUpdate))
    eventIdsNeedingStatusUpdate.clear()
  }

  return {
    fetchedCount,
    processedCount,
    skippedExistingCount,
    skippedCreatorCount,
    errors,
    timeLimitReached,
  }
}

async function getExistingConditionIds(conditionIds: string[]): Promise<Set<string>> {
  const uniqueIds = Array.from(new Set(conditionIds))
  if (uniqueIds.length === 0) {
    return new Set()
  }

  const existingIds = new Set<string>()
  const chunkSize = 200

  for (let start = 0; start < uniqueIds.length; start += chunkSize) {
    const chunk = uniqueIds.slice(start, start + chunkSize)
    const { data, error } = await supabaseAdmin
      .from('conditions')
      .select('id')
      .in('id', chunk)

    if (error) {
      throw new Error(`Failed to check existing conditions: ${error.message}`)
    }

    for (const row of data ?? []) {
      existingIds.add(row.id)
    }
  }

  return existingIds
}

async function getLastProcessedConditionCursor(): Promise<SyncCursor | null> {
  const { data, error } = await supabaseAdmin
    .from('markets')
    .select('condition_id, created_at')
    .order('created_at', { ascending: false })
    .order('condition_id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get last processed condition: ${error.message}`)
  }

  if (!data?.condition_id || !data?.created_at) {
    return null
  }

  const creationTimestamp = Math.floor(new Date(data.created_at).getTime() / 1000)

  return {
    conditionId: data.condition_id,
    creationTimestamp,
  }
}

async function fetchPnLConditionsPage(afterCursor: SyncCursor | null): Promise<{ conditions: SubgraphCondition[] }> {
  const cursorTimestamp = afterCursor?.creationTimestamp
  const cursorConditionId = afterCursor?.conditionId

  let whereClause = ''
  if (cursorTimestamp !== undefined && cursorConditionId !== undefined) {
    const timestampLiteral = JSON.stringify(cursorTimestamp.toString())
    const conditionIdLiteral = JSON.stringify(cursorConditionId)
    whereClause = `, where: { or: [{ creationTimestamp_gt: ${timestampLiteral} }, { creationTimestamp: ${timestampLiteral}, id_gt: ${conditionIdLiteral} }] }`
  }

  const query = `
    {
      conditions(
        first: ${PNL_PAGE_SIZE},
        orderBy: creationTimestamp,
        orderDirection: asc${whereClause}
      ) {
        id
        oracle
        questionId
        resolved
        arweaveHash
        creator
        owner
        creationTimestamp
      }
    }
  `

  const response = await fetch(PNL_SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`PnL subgraph request failed: ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`PnL subgraph query error: ${result.errors[0].message}`)
  }

  const rawConditions: SubgraphCondition[] = result.data.conditions || []

  const normalizedConditions: SubgraphCondition[] = rawConditions.map((condition) => {
    const owner = condition.owner ?? condition.creator
    return {
      ...condition,
      creator: owner ? owner.toLowerCase() : owner,
    }
  })

  return { conditions: normalizedConditions }
}

async function processMarket(market: SubgraphCondition) {
  await processCondition(market)
  if (!market.arweaveHash) {
    throw new Error(`Market ${market.id} missing required arweaveHash field`)
  }
  const metadata = await fetchMetadata(market.arweaveHash)
  const eventId = await processEvent(
    metadata.event,
    market.creator!,
  )
  return await processMarketData(market, metadata, eventId)
}

async function fetchMetadata(arweaveHash: string) {
  const url = `${IRYS_GATEWAY}/${arweaveHash}`

  const response = await fetch(url, {
    keepalive: true,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from ${url}: ${response.statusText}`)
  }

  const metadata = await response.json()

  if (!metadata.name || !metadata.slug || !metadata.event) {
    throw new Error(`Invalid metadata: missing required fields. Got: ${JSON.stringify(Object.keys(metadata))}`)
  }

  return metadata
}

async function processCondition(market: SubgraphCondition) {
  if (!market.oracle) {
    throw new Error(`Market ${market.id} missing required oracle field`)
  }

  if (!market.questionId) {
    throw new Error(`Market ${market.id} missing required questionId field`)
  }

  if (!market.creator) {
    throw new Error(`Market ${market.id} missing required creator field`)
  }

  if (!market.arweaveHash) {
    throw new Error(`Market ${market.id} missing required arweaveHash field`)
  }

  if (!market.creationTimestamp) {
    throw new Error(`Market ${market.id} missing required creationTimestamp field`)
  }

  const creationTimestamp = Number(market.creationTimestamp)
  if (Number.isNaN(creationTimestamp)) {
    throw new TypeError(`Market ${market.id} has invalid creationTimestamp: ${market.creationTimestamp}`)
  }
  const createdAtIso = new Date(creationTimestamp * 1000).toISOString()

  const { error } = await supabaseAdmin.from('conditions').upsert({
    id: market.id,
    oracle: market.oracle,
    question_id: market.questionId,
    resolved: market.resolved,
    arweave_hash: market.arweaveHash,
    creator: market.creator!,
    created_at: createdAtIso,
  })

  if (error) {
    throw new Error(`Failed to create/update condition: ${error.message}`)
  }

  console.log(`Processed condition: ${market.id}`)
}

function normalizeEventEndDate(rawValue: unknown): string | null {
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (trimmed) {
      const parsed = new Date(trimmed)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString()
      }
    }
  }

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    // Handle Unix seconds or milliseconds
    const timestamp = rawValue > 10_000_000_000 ? rawValue : rawValue * 1000
    const parsed = new Date(timestamp)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return null
}

async function processEvent(eventData: any, creatorAddress: string) {
  if (!eventData || !eventData.slug || !eventData.title) {
    throw new Error(`Invalid event data: ${JSON.stringify(eventData)}`)
  }

  const normalizedEndDate = normalizeEventEndDate(eventData.end_date ?? eventData.endDate)
  const enableNegRiskFlag = normalizeBooleanField(eventData.enable_neg_risk)
  const negRiskAugmentedFlag = normalizeBooleanField(eventData.neg_risk_augmented)
  const eventNegRiskFlag = normalizeBooleanField(eventData.neg_risk)
  const eventNegRiskMarketId = normalizeHexField(eventData.neg_risk_market_id)

  const { data: existingEvent } = await supabaseAdmin
    .from('events')
    .select('id, end_date')
    .eq('slug', eventData.slug)
    .maybeSingle()

  if (existingEvent) {
    const updatePayload: Record<string, any> = {
      enable_neg_risk: enableNegRiskFlag,
      neg_risk_augmented: negRiskAugmentedFlag,
      neg_risk: eventNegRiskFlag,
      neg_risk_market_id: eventNegRiskMarketId ?? null,
    }

    if (normalizedEndDate && normalizedEndDate !== existingEvent.end_date) {
      updatePayload.end_date = normalizedEndDate
    }

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update(updatePayload)
      .eq('id', existingEvent.id)

    if (updateError) {
      console.error(`Failed to update event ${existingEvent.id}:`, updateError)
    }

    console.log(`Event ${eventData.slug} already exists, using existing ID: ${existingEvent.id}`)
    return existingEvent.id
  }

  let iconUrl: string | null = null
  if (eventData.icon) {
    iconUrl = await downloadAndSaveImage(eventData.icon, `events/icons/${eventData.slug}.jpg`)
  }

  console.log(`Creating new event: ${eventData.slug} by creator: ${creatorAddress}`)

  const { data: newEvent, error } = await supabaseAdmin
    .from('events')
    .insert({
      slug: eventData.slug,
      title: eventData.title,
      creator: creatorAddress,
      icon_url: iconUrl,
      show_market_icons: eventData.show_market_icons !== false,
      enable_neg_risk: enableNegRiskFlag,
      neg_risk_augmented: negRiskAugmentedFlag,
      neg_risk: eventNegRiskFlag,
      neg_risk_market_id: eventNegRiskMarketId ?? null,
      rules: eventData.rules || null,
      end_date: normalizedEndDate,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`)
  }

  if (!newEvent?.id) {
    throw new Error(`Event creation failed: no ID returned`)
  }

  console.log(`Created event ${eventData.slug} with ID: ${newEvent.id}`)

  if (eventData.tags?.length > 0) {
    await processTags(newEvent.id, eventData.tags)
  }

  return newEvent.id
}

async function processMarketData(market: SubgraphCondition, metadata: any, eventId: string) {
  if (!eventId) {
    throw new Error(`Invalid eventId: ${eventId}. Event must be created first.`)
  }

  const { data: existingMarket } = await supabaseAdmin
    .from('markets')
    .select('condition_id, event_id')
    .eq('condition_id', market.id)
    .maybeSingle()

  const marketAlreadyExists = Boolean(existingMarket)
  const eventIdForStatusUpdate = existingMarket?.event_id ?? eventId

  if (marketAlreadyExists) {
    console.log(`Market ${market.id} already exists, updating cached data...`)
  }

  let iconUrl: string | null = null
  if (metadata.icon) {
    iconUrl = await downloadAndSaveImage(metadata.icon, `markets/icons/${metadata.slug}.jpg`)
  }

  if (!market.creationTimestamp) {
    throw new Error(`Market ${market.id} missing required creationTimestamp field`)
  }

  const creationTimestamp = Number(market.creationTimestamp)
  if (Number.isNaN(creationTimestamp)) {
    throw new TypeError(`Market ${market.id} has invalid creationTimestamp: ${market.creationTimestamp}`)
  }
  const createdAtIso = new Date(creationTimestamp * 1000).toISOString()

  console.log(`${marketAlreadyExists ? 'Updating' : 'Creating'} market ${market.id} with eventId: ${eventId}`)

  if (!market.oracle) {
    throw new Error(`Market ${market.id} missing required oracle field`)
  }

  const question = normalizeStringField(metadata.question)
  const marketRules = normalizeStringField(metadata.market_rules)
  const resolutionSource = normalizeStringField(metadata.resolution_source)
  const resolutionSourceUrl = normalizeStringField(metadata.resolution_source_url)
  const resolverAddress = normalizeAddressField(metadata.resolver)
  const negRiskFlag = normalizeBooleanField(metadata.neg_risk)
  const negRiskOtherFlag = normalizeBooleanField(metadata.neg_risk_other)
  const negRiskMarketId = normalizeHexField(metadata.neg_risk_market_id)
  const negRiskRequestId = normalizeHexField(metadata.neg_risk_request_id)
  const metadataVersion = normalizeStringField(metadata.version)
  const metadataSchema = normalizeStringField(metadata.schema)

  const marketData = {
    condition_id: market.id,
    event_id: eventId,
    is_resolved: market.resolved,
    is_active: !market.resolved,
    title: metadata.name,
    slug: metadata.slug,
    short_title: metadata.short_title,
    icon_url: iconUrl,
    metadata,
    question: question ?? null,
    market_rules: marketRules ?? null,
    resolution_source: resolutionSource ?? null,
    resolution_source_url: resolutionSourceUrl ?? null,
    resolver: resolverAddress ?? null,
    neg_risk: negRiskFlag,
    neg_risk_other: negRiskOtherFlag,
    neg_risk_market_id: negRiskMarketId ?? null,
    neg_risk_request_id: negRiskRequestId ?? null,
    metadata_version: metadataVersion ?? null,
    metadata_schema: metadataSchema ?? null,
    created_at: createdAtIso,
  }

  const { error } = await supabaseAdmin.from('markets').upsert(marketData)

  if (error) {
    throw new Error(`Failed to create market: ${error.message}`)
  }

  if (!marketAlreadyExists && metadata.outcomes?.length > 0) {
    await processOutcomes(market.id, metadata.outcomes)
  }

  return eventIdForStatusUpdate
}

async function updateEventStatusesFromMarketsBatch(eventIds: string[]) {
  for (const eventId of eventIds) {
    await updateEventStatusFromMarkets(eventId)
  }
}

async function updateEventStatusFromMarkets(eventId: string) {
  const { count: totalCount, error: totalError } = await supabaseAdmin
    .from('markets')
    .select('condition_id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (totalError) {
    console.error(`Failed to compute market counts for event ${eventId}:`, totalError)
    return
  }

  const { count: activeCount, error: activeError } = await supabaseAdmin
    .from('markets')
    .select('condition_id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .or('is_active.eq.true,and(is_active.is.null,is_resolved.eq.false)')

  if (activeError) {
    console.error(`Failed to compute active market count for event ${eventId}:`, activeError)
    return
  }

  const hasMarkets = (totalCount ?? 0) > 0
  const hasActiveMarket = (activeCount ?? 0) > 0

  const nextStatus: 'draft' | 'active' | 'archived'
    = hasActiveMarket
      ? 'active'
      : hasMarkets
        ? 'archived'
        : 'draft'

  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ status: nextStatus })
    .eq('id', eventId)

  if (updateError) {
    console.error(`Failed to update status for event ${eventId}:`, updateError)
  }
}

async function processOutcomes(conditionId: string, outcomes: any[]) {
  const outcomeData = outcomes.map((outcome, index) => ({
    condition_id: conditionId,
    outcome_text: outcome.outcome,
    outcome_index: index,
    token_id: outcome.token_id || (`${conditionId}${index}`),
  }))

  const { error } = await supabaseAdmin.from('outcomes').insert(outcomeData)

  if (error) {
    throw new Error(`Failed to create outcomes: ${error.message}`)
  }
}

async function processTags(eventId: string, tagNames: any[]) {
  for (const tagName of tagNames) {
    if (typeof tagName !== 'string') {
      console.warn(`Skipping invalid tag:`, tagName)
      continue
    }

    const truncatedName = tagName.substring(0, 100)
    const slug = truncatedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100)

    let { data: tag } = await supabaseAdmin
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!tag) {
      const { data: newTag, error } = await supabaseAdmin
        .from('tags')
        .insert({ name: truncatedName, slug })
        .select('id')
        .single()

      if (error) {
        console.error(`Failed to create tag ${truncatedName}:`, error)
        continue
      }
      tag = newTag
    }

    await supabaseAdmin.from('event_tags').upsert(
      {
        event_id: eventId,
        tag_id: tag.id,
      },
      {
        onConflict: 'event_id,tag_id',
        ignoreDuplicates: true,
      },
    )
  }
}

async function downloadAndSaveImage(arweaveHash: string, storagePath: string) {
  try {
    const imageUrl = `${IRYS_GATEWAY}/${arweaveHash}`
    const response = await fetch(imageUrl, {
      keepalive: true,
    })

    if (!response.ok) {
      console.error(`Failed to download image: ${response.statusText}`)
      return null
    }

    const imageBuffer = await response.arrayBuffer()

    const { error } = await supabaseAdmin.storage
      .from('forkast-assets')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      })

    if (error) {
      console.error(`Failed to upload image: ${error.message}`)
      return null
    }

    return storagePath
  }
  catch (error) {
    console.error(`Failed to process image ${arweaveHash}:`, error)
    return null
  }
}

function normalizeStringField(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeAddressField(value: unknown): string | null {
  const normalized = normalizeStringField(value)
  if (!normalized) {
    return null
  }
  return /^0x[a-fA-F0-9]{40}$/.test(normalized)
    ? normalized.toLowerCase()
    : normalized
}

function normalizeHexField(value: unknown): string | null {
  const normalized = normalizeStringField(value)
  if (!normalized) {
    return null
  }
  return normalized.startsWith('0x')
    ? normalized.toLowerCase()
    : normalized
}

function normalizeBooleanField(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  return Boolean(value)
}

async function checkSyncRunning(): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('subgraph_syncs')
    .select('status')
    .eq('service_name', 'market_sync')
    .eq('subgraph_name', 'pnl')
    .eq('status', 'running')
    .gt('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check sync status: ${error.message}`)
  }

  return Boolean(data)
}

async function updateSyncStatus(
  status: 'running' | 'completed' | 'error',
  errorMessage?: string | null,
  totalProcessed?: number,
) {
  const updateData: any = {
    service_name: 'market_sync',
    subgraph_name: 'pnl',
    status,
  }

  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage
  }

  if (totalProcessed !== undefined) {
    updateData.total_processed = totalProcessed
  }

  const { error } = await supabaseAdmin
    .from('subgraph_syncs')
    .upsert(updateData, {
      onConflict: 'service_name,subgraph_name',
    })

  if (error) {
    console.error(`Failed to update sync status to ${status}:`, error)
  }
}

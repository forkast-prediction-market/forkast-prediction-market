import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300 // This function can run for a maximum of 300 seconds

const PNL_SUBGRAPH_URL = process.env.PNL_SUBGRAPH_URL!
const MARKET_CREATORS_ADDRESS = process.env.MARKET_CREATORS_ADDRESS
const IRYS_GATEWAY = process.env.IRYS_GATEWAY || 'https://gateway.irys.xyz'
const SYNC_TIME_LIMIT_MS = 250_000
const PNL_PAGE_SIZE = 200

function getAllowedCreators(): string[] {
  const fixedCreators = [
    '0xa4221e79Aa4c29c8AB2f76be76a4cc97579e542d', // Polymarket cloned markets on Amoy
  ]
  const envCreators = MARKET_CREATORS_ADDRESS
    ? MARKET_CREATORS_ADDRESS.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
    : []

  return [...new Set([...fixedCreators, ...envCreators].map(addr => addr.toLowerCase()))]
}
/**
 * 🔄 Market Synchronization Script for Vercel Functions
 *
 * This function syncs prediction markets from The Graph subgraph to Supabase:
 * - Fetches new markets from blockchain via subgraph (INCREMENTAL)
 * - Downloads metadata and images from Irys/Arweave
 * - Stores everything in Supabase database and storage
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
    .from('sync_status')
    .select('updated_at')
    .eq('service_name', 'market_sync')
    .eq('subgraph_name', 'pnl')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get last processed timestamp: ${error.message}`)
  }

  return data?.updated_at || 0
}

interface SyncCursor {
  conditionId: string
  creationTimestamp: number
}

interface SyncStats {
  fetchedCount: number
  processedCount: number
  skippedExistingCount: number
  skippedCreatorCount: number
  errors: { conditionId: string, error: string }[]
  timeLimitReached: boolean
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
        await processMarket(condition)
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

    if (timeLimitReached) {
      break
    }

    if (page.conditions.length < PNL_PAGE_SIZE) {
      console.log('📭 Last fetched page was smaller than the configured page size; stopping pagination')
      break
    }
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

async function fetchPnLConditionsPage(afterCursor: SyncCursor | null) {
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
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`PnL subgraph request failed: ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`PnL subgraph query error: ${result.errors[0].message}`)
  }

  const rawConditions = result.data.conditions || []

  const normalizedConditions = rawConditions.map((condition: any) => {
    const owner = condition.owner ?? condition.creator
    return {
      ...condition,
      creator: owner ? owner.toLowerCase() : owner,
    }
  })

  return { conditions: normalizedConditions }
}

async function processMarket(market: any) {
  await processCondition(market)
  const metadata = await fetchMetadata(market.arweaveHash)
  const eventId = await processEvent(
    metadata.event,
    market.creator,
  )
  await processMarketData(market, metadata, eventId)
}

async function fetchMetadata(arweaveHash: string) {
  const url = `${IRYS_GATEWAY}/${arweaveHash}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from ${url}: ${response.statusText}`)
  }

  const metadata = await response.json()

  if (!metadata.name || !metadata.slug || !metadata.event) {
    throw new Error(`Invalid metadata: missing required fields. Got: ${JSON.stringify(Object.keys(metadata))}`)
  }

  return metadata
}

async function processCondition(market: any) {
  const { data: existingCondition } = await supabaseAdmin
    .from('conditions')
    .select('id')
    .eq('id', market.id)
    .maybeSingle()

  if (existingCondition) {
    console.log(`Condition ${market.id} already exists, updating if needed...`)
  }

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
    creator: market.creator,
    created_at: createdAtIso,
  })

  if (error) {
    throw new Error(`Failed to create/update condition: ${error.message}`)
  }

  console.log(`Processed condition: ${market.id}`)
}

async function processEvent(eventData: any, creatorAddress: string) {
  if (!eventData || !eventData.slug || !eventData.title) {
    throw new Error(`Invalid event data: ${JSON.stringify(eventData)}`)
  }

  const { data: existingEvent } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', eventData.slug)
    .maybeSingle()

  if (existingEvent) {
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
      rules: eventData.rules || null,
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

async function processMarketData(market: any, metadata: any, eventId: string) {
  if (!eventId) {
    throw new Error(`Invalid eventId: ${eventId}. Event must be created first.`)
  }

  const { data: existingMarket } = await supabaseAdmin
    .from('markets')
    .select('condition_id')
    .eq('condition_id', market.id)
    .maybeSingle()

  if (existingMarket) {
    console.log(`Market ${market.id} already exists, skipping...`)
    return
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

  console.log(`Creating market with eventId: ${eventId}`)

  if (!market.oracle) {
    throw new Error(`Market ${market.id} missing required oracle field`)
  }

  const marketData = {
    condition_id: market.id,
    event_id: eventId,
    is_resolved: market.resolved,
    title: metadata.name,
    slug: metadata.slug,
    short_title: metadata.short_title,
    icon_url: iconUrl,
    metadata,
    created_at: createdAtIso,
  }

  const { error } = await supabaseAdmin.from('markets').upsert(marketData)

  if (error) {
    throw new Error(`Failed to create market: ${error.message}`)
  }

  if (metadata.outcomes?.length > 0) {
    await processOutcomes(market.id, metadata.outcomes)
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
    const response = await fetch(imageUrl)

    if (!response.ok) {
      console.error(`Failed to download image: ${response.statusText}`)
      return null
    }

    const imageBuffer = await response.arrayBuffer()

    const { error } = await supabaseAdmin.storage
      .from('forkast-assets')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
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

async function checkSyncRunning(): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('sync_status')
    .select('status')
    .eq('service_name', 'market_sync')
    .eq('subgraph_name', 'pnl')
    .lt('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check sync status: ${error.message}`)
  }

  return data?.status === 'running'
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
    .from('sync_status')
    .upsert(updateData, {
      onConflict: 'service_name,subgraph_name',
    })

  if (error) {
    console.error(`Failed to update sync status to ${status}:`, error)
  }
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300 // This function can run for a maximum of 300 seconds

const ACTIVITY_SUBGRAPH_URL = process.env.ACTIVITY_SUBGRAPH_URL!
const PNL_SUBGRAPH_URL = process.env.PNL_SUBGRAPH_URL!
const IRYS_GATEWAY = process.env.IRYS_GATEWAY || 'https://gateway.irys.xyz'

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

    const markets = await fetchNewMarkets()
    console.log(`🔍 Found ${markets.length} new markets to process`)

    if (markets.length === 0) {
      await updateSyncStatus('completed', null, 0)
      return NextResponse.json({
        success: true,
        message: 'No new markets to process',
        processed: 0,
      })
    }

    let processedCount = 0
    const errors: { conditionId: string, error: string }[] = []

    for (const market of markets) {
      try {
        await processMarket(market)
        processedCount++
        console.log(`✅ Processed market: ${market.id}`)
      }
      catch (error: any) {
        console.error(`❌ Error processing market ${market.id}:`, error)
        errors.push({
          conditionId: market.id,
          error: error.message,
        })
      }
    }

    await updateSyncStatus('completed', null, processedCount)

    const result = {
      success: true,
      processed: processedCount,
      total: markets.length,
      errors: errors.length,
      errorDetails: errors,
    }

    console.log('🎉 Incremental synchronization completed:', result)
    return NextResponse.json(result)
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
    .eq('subgraph_name', 'activity')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get last processed timestamp: ${error.message}`)
  }

  return data?.updated_at || 0
}

async function fetchNewMarkets() {
  console.log(`🔄 Fetching data from Activity subgraph...`)
  const activityConditions = await fetchFromActivitySubgraph()
  console.log(`📊 Activity subgraph: Found ${activityConditions.length} conditions`)

  console.log(`🔄 Fetching data from PnL subgraph...`)
  const pnlConditions = await fetchFromPnLSubgraph()
  console.log(`📊 PnL subgraph: Found ${pnlConditions.length} conditions`)

  const mergedConditions = mergeConditionsData(activityConditions, pnlConditions)
  console.log(`🎯 Total merged conditions: ${mergedConditions.length}`)

  const newConditions = await filterExistingConditions(mergedConditions)
  console.log(`🆕 New conditions to process: ${newConditions.length}`)

  return newConditions
}

async function fetchFromActivitySubgraph() {
  const first = 1000
  let allConditions: any[] = []
  let skip = 0
  let hasMore = true

  while (hasMore) {
    const query = `
      {
        conditions(
          first: ${first},
          skip: ${skip},
          orderBy: id,
          orderDirection: asc
        ) {
          id
          arweaveHash
          creator
        }
      }
    `

    const response = await fetch(ACTIVITY_SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Activity subgraph request failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      throw new Error(`Activity subgraph query error: ${result.errors[0].message}`)
    }

    const conditions = result.data.conditions || []

    if (conditions.length === 0) {
      hasMore = false
    }
    else {
      allConditions = allConditions.concat(conditions)
      skip += first
      if (conditions.length < first) {
        hasMore = false
      }
    }
  }

  return allConditions
}

async function fetchFromPnLSubgraph() {
  let allConditions: any[] = []
  let skip = 0
  const first = 1000
  let hasMore = true

  while (hasMore) {
    const query = `
      {
        conditions(
          first: ${first},
          skip: ${skip},
          orderBy: id,
          orderDirection: asc
        ) {
          id
          oracle
          questionId
          resolved
          arweaveHash
          creator
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

    const conditions = result.data.conditions || []

    if (conditions.length === 0) {
      hasMore = false
    }
    else {
      allConditions = allConditions.concat(conditions)
      skip += first
      if (conditions.length < first) {
        hasMore = false
      }
    }
  }

  return allConditions
}

async function filterExistingConditions(conditions: any[]) {
  if (conditions.length === 0) {
    return []
  }

  const conditionIds = conditions.map(c => c.id)

  const { data: existingConditions, error } = await supabaseAdmin
    .from('conditions')
    .select('id')
    .in('id', conditionIds)

  if (error) {
    throw new Error(`Failed to check existing conditions: ${error.message}`)
  }

  const existingIds = new Set(existingConditions.map(c => c.id))

  const newConditions = conditions.filter(condition => !existingIds.has(condition.id))

  console.log(`📊 Filtered: ${conditions.length} total, ${existingConditions.length} existing, ${newConditions.length} new`)

  return newConditions
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

  const { error } = await supabaseAdmin.from('conditions').upsert({
    id: market.id,
    oracle: market.oracle,
    question_id: market.questionId,
    resolved: market.resolved,
    arweave_hash: market.arweaveHash,
    creator: market.creator,
    created_at: new Date().toISOString(),
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
    token_id: outcome.token_id,
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
    .eq('subgraph_name', 'activity')
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
    subgraph_name: 'activity',
    status,
    updated_at: new Date().toISOString(),
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

function mergeConditionsData(activityConditions: any[], pnlConditions: any[]) {
  const merged: any[] = []
  const pnlMap = new Map<string, any>()

  pnlConditions.forEach(condition => pnlMap.set(condition.id, condition))

  activityConditions.forEach((activityCondition) => {
    const pnlCondition = pnlMap.get(activityCondition.id)
    if (pnlCondition && pnlCondition.oracle && pnlCondition.questionId) {
      merged.push({
        id: activityCondition.id,
        arweaveHash: activityCondition.arweaveHash,
        creator: activityCondition.creator,
        oracle: pnlCondition.oracle,
        questionId: pnlCondition.questionId,
        resolved: pnlCondition.resolved,
      })
    }
    else {
      console.log(`⚠️ Skipping condition ${activityCondition.id} - missing required fields from PnL subgraph`)
    }
  })

  return merged
}

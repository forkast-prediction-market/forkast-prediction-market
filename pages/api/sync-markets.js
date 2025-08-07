/**
 * 🔄 Market Synchronization Script for Vercel Functions
 *
 * This function syncs prediction markets from The Graph subgraph to Supabase:
 * - Fetches new markets from blockchain via subgraph (INCREMENTAL)
 * - Downloads metadata and images from Irys/Arweave
 * - Stores everything in Supabase database and storage
 * - Tracks last processed timestamp for incremental syncs
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Configuration
const ACTIVITY_SUBGRAPH_URL = process.env.NEXT_PUBLIC_ACTIVITY_SUBGRAPH_URL
const PNL_SUBGRAPH_URL = process.env.NEXT_PUBLIC_PNL_SUBGRAPH_URL
const IRYS_GATEWAY = process.env.IRYS_GATEWAY || 'https://gateway.irys.xyz'

/**
 * Main sync function
 */
export default async function handler(req, res) {
  // Security check for cron jobs
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('🚀 Starting incremental market synchronization...')

    // 1. Get last processed timestamp
    const lastProcessedTimestamp = await getLastProcessedTimestamp()
    console.log(`📊 Last processed timestamp: ${lastProcessedTimestamp}`)

    // 2. Fetch new markets from subgraph
    const markets = await fetchNewMarkets()
    console.log(`🔍 Found ${markets.length} new markets to process`)

    if (markets.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new markets to process',
        processed: 0,
        lastProcessedTimestamp,
      })
    }

    // 3. Process each market
    let processedCount = 0
    const errors = []

    for (const market of markets) {
      try {
        await processMarket(market)
        processedCount++
        console.log(`✅ Processed market: ${market.id}`)
      }
      catch (error) {
        console.error(`❌ Error processing market ${market.id}:`, error)
        errors.push({
          conditionId: market.id,
          error: error.message,
        })
      }
    }

    // 4. Update last processed timestamp (only if we processed something)
    if (processedCount > 0) {
      const currentTimestamp = Math.floor(Date.now() / 1000)
      await updateLastProcessedTimestamp(currentTimestamp)
      console.log(
        `📦 Updated last processed timestamp to: ${currentTimestamp}`,
      )
    }

    // 5. Return results
    const result = {
      success: true,
      processed: processedCount,
      total: markets.length,
      errors: errors.length,
      errorDetails: errors,
      lastProcessedTimestamp:
        processedCount > 0
          ? Math.floor(Date.now() / 1000)
          : lastProcessedTimestamp,
    }

    console.log('🎉 Incremental synchronization completed:', result)
    return res.status(200).json(result)
  }
  catch (error) {
    console.error('💥 Sync failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

/**
 * Get last processed timestamp from sync_status table
 */
async function getLastProcessedTimestamp() {
  const { data, error } = await supabase
    .from('sync_status')
    .select('last_processed_block')
    .eq('service_name', 'market_sync')
    .eq('subgraph_name', 'activity')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    // Not found is OK
    throw new Error(`Failed to get last processed timestamp: ${error.message}`)
  }

  return data?.last_processed_block || 0
}

/**
 * Fetch new markets from The Graph subgraph
 */
async function fetchNewMarkets() {
  console.log(`🔄 Fetching data from Activity subgraph...`)
  const activityConditions = await fetchFromActivitySubgraph()
  console.log(
    `📊 Activity subgraph: Found ${activityConditions.length} conditions`,
  )

  console.log(`🔄 Fetching data from PnL subgraph...`)
  const pnlConditions = await fetchFromPnLSubgraph()
  console.log(`📊 PnL subgraph: Found ${pnlConditions.length} conditions`)

  // Merge data from both subgraphs
  const mergedConditions = mergeConditionsData(
    activityConditions,
    pnlConditions,
  )
  console.log(`🎯 Total merged conditions: ${mergedConditions.length}`)

  // Filter out conditions that already exist in our database
  const newConditions = await filterExistingConditions(mergedConditions)
  console.log(`🆕 New conditions to process: ${newConditions.length}`)

  return newConditions
}

async function fetchFromActivitySubgraph() {
  let allConditions = []
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
          arweaveHash
          creator
        }
      }
    `

    const response = await fetch(ACTIVITY_SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(
        `Activity subgraph request failed: ${response.statusText}`,
      )
    }

    const result = await response.json()

    if (result.errors) {
      throw new Error(
        `Activity subgraph query error: ${result.errors[0].message}`,
      )
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
  let allConditions = []
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
          outcomeSlotCount
          resolved
          arweaveHash
          creator
        }
      }
    `

    const response = await fetch(PNL_SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

function mergeConditionsData(activityConditions, pnlConditions) {
  const merged = []

  // Create a map of PnL conditions for quick lookup
  const pnlMap = new Map()
  pnlConditions.forEach((condition) => {
    pnlMap.set(condition.id, condition)
  })

  // Process each activity condition
  activityConditions.forEach((activityCondition) => {
    const pnlCondition = pnlMap.get(activityCondition.id)

    // Only include if we have complete data
    if (pnlCondition && pnlCondition.oracle && pnlCondition.questionId) {
      merged.push({
        id: activityCondition.id,
        arweaveHash: activityCondition.arweaveHash,
        creator: activityCondition.creator,
        oracle: pnlCondition.oracle,
        questionId: pnlCondition.questionId,
        outcomeSlotCount: pnlCondition.outcomeSlotCount,
        resolved: pnlCondition.resolved,
      })
    }
    else {
      console.log(
        `⚠️ Skipping condition ${activityCondition.id} - missing required fields from PnL subgraph`,
      )
    }
  })

  return merged
}

/**
 * Filter out conditions that already exist in our database
 */
async function filterExistingConditions(conditions) {
  if (conditions.length === 0) {
    return []
  }

  // Get all condition IDs that already exist in our database
  const conditionIds = conditions.map(c => c.id)

  const { data: existingConditions, error } = await supabase
    .from('conditions')
    .select('id')
    .in('id', conditionIds)

  if (error) {
    throw new Error(`Failed to check existing conditions: ${error.message}`)
  }

  // Create a set of existing condition IDs for fast lookup
  const existingIds = new Set(existingConditions.map(c => c.id))

  // Filter out conditions that already exist
  const newConditions = conditions.filter(
    condition => !existingIds.has(condition.id),
  )

  console.log(
    `📊 Filtered: ${conditions.length} total, ${existingConditions.length} existing, ${newConditions.length} new`,
  )

  return newConditions
}

/**
 * Process individual market
 */
async function processMarket(market) {
  // 1. First create/update the condition in the conditions table
  await processCondition(market)

  // 2. Fetch metadata from Irys
  const metadata = await fetchMetadata(market.arweaveHash)

  // 3. Process event (create if doesn't exist) - pass creator address
  const eventId = await processEvent(
    metadata.event || {
      slug: metadata.slug
        ? `${metadata.slug}-event`
        : `event-${market.id.substring(0, 8)}`,
      title: metadata.name
        ? `${metadata.name} Event`
        : `Event ${market.id.substring(0, 8)}`,
    },
    market.creator,
  )

  // 4. Process market images and data
  await processMarketData(market, metadata, eventId)
}

/**
 * Fetch metadata JSON from Irys/Arweave
 */
async function fetchMetadata(arweaveHash) {
  const url = `${IRYS_GATEWAY}/${arweaveHash}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch metadata from ${url}: ${response.statusText}`,
    )
  }

  const metadata = await response.json()

  // Validate required fields
  if (!metadata.name || !metadata.slug) {
    throw new Error(
      `Invalid metadata: missing required fields. Got: ${JSON.stringify(
        Object.keys(metadata),
      )}`,
    )
  }

  // Event can be optional in some cases
  if (!metadata.event) {
    console.warn(
      `⚠️ No event data in metadata for ${metadata.name}, creating default event`,
    )
    metadata.event = {
      slug: `${metadata.slug}-event`,
      title: `${metadata.name} Event`,
      description: 'Auto-generated event',
    }
  }

  return metadata
}

/**
 * Process condition data (create/update in conditions table)
 */
async function processCondition(market) {
  // Check if condition already exists
  const { data: existingCondition } = await supabase
    .from('conditions')
    .select('id')
    .eq('id', market.id)
    .maybeSingle()

  if (existingCondition) {
    console.log(`Condition ${market.id} already exists, updating if needed...`)
  }

  // Validate required fields from merged subgraph data
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

  // Create/update condition
  const { error } = await supabase.from('conditions').upsert({
    id: market.id,
    oracle: market.oracle,
    question_id: market.questionId,
    outcome_slot_count: market.outcomeSlotCount || 2,
    resolved: market.resolved || false,
    arweave_hash: market.arweaveHash,
    creator: market.creator,
    created_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create/update condition: ${error.message}`)
  }

  console.log(`Processed condition: ${market.id}`)
}

/**
 * Process event data (create if doesn't exist)
 */
async function processEvent(eventData, creatorAddress) {
  // Validate event data
  if (!eventData || !eventData.slug || !eventData.title) {
    throw new Error(`Invalid event data: ${JSON.stringify(eventData)}`)
  }

  // Check if event already exists
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id')
    .eq('slug', eventData.slug)
    .maybeSingle()

  if (existingEvent) {
    console.log(
      `Event ${eventData.slug} already exists, using existing ID: ${existingEvent.id}`,
    )
    return existingEvent.id
  }

  // Download and save event icon
  let iconUrl = null
  if (eventData.icon) {
    iconUrl = await downloadAndSaveImage(
      eventData.icon,
      `events/icons/${eventData.slug}.jpg`,
    )
  }

  console.log(
    `Creating new event: ${eventData.slug} by creator: ${creatorAddress}`,
  )

  // Create event
  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      slug: eventData.slug,
      title: eventData.title,
      description: eventData.description || null,
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

  if (!newEvent || !newEvent.id) {
    throw new Error(`Event creation failed: no ID returned`)
  }

  console.log(`Created event ${eventData.slug} with ID: ${newEvent.id}`)

  // Process tags if they exist
  if (eventData.tags && eventData.tags.length > 0) {
    await processTags(newEvent.id, eventData.tags)
  }

  return newEvent.id
}

/**
 * Process market data and images
 */
async function processMarketData(market, metadata, eventId) {
  // Validate eventId
  if (!eventId || typeof eventId !== 'number') {
    throw new Error(
      `Invalid eventId: ${eventId}. Event must be created first.`,
    )
  }

  // Check if market already exists
  const { data: existingMarket } = await supabase
    .from('markets')
    .select('condition_id')
    .eq('condition_id', market.id)
    .maybeSingle()

  if (existingMarket) {
    console.log(`Market ${market.id} already exists, skipping...`)
    return
  }

  // Download and save market icon
  let iconUrl = null
  if (metadata.icon) {
    iconUrl = await downloadAndSaveImage(
      metadata.icon,
      `markets/icons/${metadata.slug}.jpg`,
    )
  }

  console.log(`Creating market with eventId: ${eventId}`)

  // Validate required blockchain fields
  if (!market.oracle) {
    throw new Error(`Market ${market.id} missing required oracle field`)
  }

  // Create market with required fields
  const marketData = {
    condition_id: market.id,
    question_id: market.questionId || market.id, // OK: can derive from condition ID
    oracle: market.oracle, // Must come from subgraph - no fallback
    event_id: eventId,
    name: metadata.name || `Market ${market.id.substring(0, 8)}`, // OK: fallback name
    slug: metadata.slug
      ? `${metadata.slug}-${market.id.substring(0, 8)}`
      : `market-${market.id.substring(0, 8)}`, // OK: fallback slug
    description: metadata.description, // Can be null
    short_title: metadata.short_title || null, // OK: can be null
    outcome_count: market.outcomeSlotCount || metadata.outcomes?.length || 2, // OK: reasonable defaults
    icon_url: iconUrl, // Can be null
    block_number: 0, // Not available from subgraph
    transaction_hash: market.id, // Use condition ID as fallback
    block_timestamp: market.blockTimestamp
      ? new Date(Number.parseInt(market.blockTimestamp) * 1000).toISOString()
      : new Date().toISOString(), // OK: fallback to current time
    metadata, // Can be null/empty
  }

  const { error } = await supabase.from('markets').upsert(marketData)

  if (error) {
    throw new Error(`Failed to create market: ${error.message}`)
  }

  // Create outcomes
  if (metadata.outcomes && metadata.outcomes.length > 0) {
    await processOutcomes(market.id, metadata.outcomes)
  }
}

/**
 * Process market outcomes
 */
async function processOutcomes(conditionId, outcomes) {
  const outcomeData = outcomes.map((outcome, index) => ({
    condition_id: conditionId,
    outcome_text: outcome.outcome || outcome.title || `Outcome ${index + 1}`,
    outcome_index: index,
    token_id: `${conditionId}-${index}`, // Generate token_id as condition_id + outcome_index
  }))

  const { error } = await supabase.from('outcomes').insert(outcomeData)

  if (error) {
    throw new Error(`Failed to create outcomes: ${error.message}`)
  }
}

/**
 * Process event tags
 */
async function processTags(eventId, tagNames) {
  for (const tagName of tagNames) {
    // Skip if tagName is an object (invalid tag format)
    if (typeof tagName !== 'string') {
      console.warn(`Skipping invalid tag:`, tagName)
      continue
    }

    // Truncate name and slug to fit database constraints
    const truncatedName = tagName.substring(0, 100) // Limit to 100 chars
    const slug = truncatedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 100)

    // Get or create tag
    let { data: tag } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!tag) {
      const { data: newTag, error } = await supabase
        .from('tags')
        .insert({
          name: truncatedName,
          slug,
        })
        .select('id')
        .single()

      if (error) {
        console.error(`Failed to create tag ${truncatedName}:`, error)
        continue
      }
      tag = newTag
    }

    // Link event to tag (ignore if already exists)
    await supabase.from('event_tags').upsert(
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

/**
 * Download image from Irys and save to Supabase storage
 */
async function downloadAndSaveImage(arweaveHash, storagePath) {
  try {
    // Download image from Irys
    const imageUrl = `${IRYS_GATEWAY}/${arweaveHash}`
    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }

    const imageBuffer = await response.arrayBuffer()

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('forkast-assets')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    return storagePath
  }
  catch (error) {
    console.error(`Failed to process image ${arweaveHash}:`, error)
    return null // Continue without image
  }
}

/**
 * Update last processed timestamp in sync_status table
 */
async function updateLastProcessedTimestamp(timestamp) {
  const { error } = await supabase.from('sync_status').upsert(
    {
      service_name: 'market_sync',
      subgraph_name: 'activity',
      last_processed_block: timestamp,
      last_sync_timestamp: new Date().toISOString(),
      sync_type: 'incremental',
      status: 'completed',
      total_processed: 1,
    },
    {
      onConflict: 'service_name,subgraph_name',
    },
  )

  if (error) {
    throw new Error(`Failed to update sync status: ${error.message}`)
  }
}

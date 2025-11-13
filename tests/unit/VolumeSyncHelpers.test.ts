import type { VolumeWorkItem } from '@/app/api/sync/volume/helpers'
import { describe, expect, it } from 'vitest'
import {
  chunkVolumeWork,
  normalizeVolumeValue,

} from '@/app/api/sync/volume/helpers'

describe('volume sync helpers', () => {
  it('chunks work items respecting the configured batch size', () => {
    const items: VolumeWorkItem[] = Array.from({ length: 5 }, (_, index) => ({
      conditionId: `cond-${index}`,
      tokenIds: ['a', 'b'],
      previousTotalVolume: '0',
      previousVolume24h: '0',
    }))

    const [first, second] = chunkVolumeWork(items, 3)
    expect(first).toHaveLength(3)
    expect(second).toHaveLength(2)
    expect(first[0].conditionId).toBe('cond-0')
    expect(second[1].conditionId).toBe('cond-4')
  })

  it('normalizes numeric inputs safely', () => {
    expect(normalizeVolumeValue('123.456')).toBe('123.456')
    expect(normalizeVolumeValue('   78 ')).toBe('78')
    expect(normalizeVolumeValue(42.5)).toBe('42.5')
  })

  it('falls back to zero for invalid or negative values', () => {
    expect(normalizeVolumeValue(null)).toBe('0')
    expect(normalizeVolumeValue(undefined)).toBe('0')
    expect(normalizeVolumeValue('')).toBe('0')
    expect(normalizeVolumeValue('abc')).toBe('0')
    expect(normalizeVolumeValue(-1)).toBe('0')
  })
})

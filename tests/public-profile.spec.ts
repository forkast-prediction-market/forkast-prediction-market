import { expect, test } from '@playwright/test'

test.describe('Public profile route', () => {
  test('returns 404 for unknown username', async ({ page }) => {
    await page.goto('/@playwright-missing-user', { waitUntil: 'load' })
    await expect(page.getByText('This page could not be found')).toBeVisible()
  })

  test('returns 404 for unknown address', async ({ page }) => {
    await page.goto('/0x1234567890abcdef1234567890abcdef12345678', { waitUntil: 'load' })
    await expect(page.getByText('This page could not be found')).toBeVisible()
  })

  test('returns correct response for a valid username', async ({ page }) => {
    await page.goto('/@dev_google', { waitUntil: 'load' })
    await expect(page.getByText('0xA8…55180e')).toBeVisible()
  })
})

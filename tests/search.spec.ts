import { expect, test } from '@playwright/test'

test.describe('Header Search', () => {
  test.beforeEach(async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium')
    await page.goto('/')
  })

  test('display search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')
    await expect(searchInput).toBeVisible()
  })

  test('show loading state when searching', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')

    await searchInput.fill('trump')

    const loadingIndicator = page.getByText('Searching...')
    await expect(loadingIndicator).toBeVisible()
  })

  test('display search results for "trump" query', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const searchResults = page.locator('[data-testid="search-results"]')
    await expect(searchResults).toBeVisible()

    const resultItems = page.locator('[data-testid="search-result-item"]')
    await expect(resultItems.first()).toBeVisible()
  })

  test('navigate to event page when clicking on search result', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const firstResult = page.locator('[data-testid="search-result-item"]').first()
    await expect(firstResult).toBeVisible()

    const href = await firstResult.getAttribute('href')
    expect(href).toMatch(/^\/event\//)

    await firstResult.click()

    await page.waitForURL(/\/event\/.*/)
    expect(page.url()).toMatch(/\/event\//)
  })

  test('hide search results when clicking outside', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const searchResults = page.locator('[data-testid="search-results"]')
    await expect(searchResults).toBeVisible()

    await page.click('body')

    await expect(searchResults).not.toBeVisible()
  })

  test('clear search when clicking on a result', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const firstResult = page.locator('[data-testid="search-result-item"]').first()
    await firstResult.click()

    await page.goto('/')

    const searchInputValue = await searchInput.inputValue()
    expect(searchInputValue).toBe('')
  })

  test('do not show results for queries less than 2 characters', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search events')

    await searchInput.fill('t')

    await page.waitForTimeout(500)

    const searchResults = page.locator('[data-testid="search-results"]')
    await expect(searchResults).not.toBeVisible()
  })

  test('show search results only on desktop (hidden on mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const searchContainer = page.locator('.hidden.flex-1.sm\\:mx-4.sm\\:mr-6.sm\\:flex')
    await expect(searchContainer).toHaveClass(/hidden/)
  })
})

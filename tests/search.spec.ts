import { expect, test } from '@playwright/test'

test.describe('Header Search', () => {
  test.beforeEach(async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium')
    await page.goto('/')
  })

  test('display search input', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')
    await expect(searchInput).toBeVisible()
  })

  test('show loading state when searching', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')

    await searchInput.fill('trump')

    const loadingIndicator = page.getByText('Searching...')
    await expect(loadingIndicator).toBeVisible()
  })

  test('display search results for "trump" query', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const searchResults = page.getByTestId('search-results')
    await expect(searchResults).toBeVisible()

    const resultItems = page.getByTestId('search-result-item')
    await expect(resultItems.first()).toBeVisible()
  })

  test('navigate to event page when clicking on search result', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const firstResult = page.getByTestId('search-result-item').first()
    await expect(firstResult).toBeVisible()

    const href = await firstResult.getAttribute('href')
    expect(href).toMatch(/^\/event\//)

    await firstResult.click()

    await page.waitForURL(/\/event\/.*/)
    expect(page.url()).toMatch(/\/event\//)
  })

  test('hide search results when clicking outside', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const searchResults = page.getByTestId('search-results')
    await expect(searchResults).toBeVisible()

    await page.click('body')

    await expect(searchResults).not.toBeVisible()
  })

  test('clear search when clicking on a result', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')

    await searchInput.fill('trump')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })

    const firstResult = page.getByTestId('search-result-item').first()
    await firstResult.click()

    await page.goto('/')

    const searchInputValue = await searchInput.inputValue()
    expect(searchInputValue).toBe('')
  })

  test('do not show results for queries less than 2 characters', async ({ page }) => {
    const searchInput = page.getByTestId('header-search-input')

    await searchInput.fill('t')

    await page.waitForTimeout(500)

    const searchResults = page.getByTestId('search-results')
    await expect(searchResults).not.toBeVisible()
  })

  test('show search results only on desktop (hidden on mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const searchContainer = page.getByTestId('header-search-container')
    await expect(searchContainer).toHaveClass(/hidden/)
  })
})

test.describe('Filter Toolbar Search Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('update URL with search parameter when typing', async ({ page }) => {
    const filterSearchInput = page.getByTestId('filter-search-input')

    await filterSearchInput.waitFor({ state: 'visible' })
    await filterSearchInput.focus()
    await filterSearchInput.pressSequentially('trump')

    await page.waitForURL('/?search=trump')
    expect(page.url()).toContain('search=trump')
  })

  test('remove search parameter when clearing input', async ({ page }) => {
    const filterSearchInput = page.getByTestId('filter-search-input')

    await filterSearchInput.waitFor({ state: 'visible' })
    await filterSearchInput.focus()
    await filterSearchInput.pressSequentially('trump')
    await page.waitForURL('/?search=trump')

    await filterSearchInput.clear()
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('search=trump')
  })

  test('preserve bookmarked parameter when updating search', async ({ page }) => {
    await page.goto('/?bookmarked=true')

    const filterSearchInput = page.getByTestId('filter-search-input')
    await filterSearchInput.waitFor({ state: 'visible' })
    await filterSearchInput.focus()
    await filterSearchInput.pressSequentially('trump')

    await page.waitForURL('/?bookmarked=true&search=trump')
    expect(page.url()).toContain('search=trump')
    expect(page.url()).toContain('bookmarked=true')
  })

  test('initialize with search value from URL', async ({ page }) => {
    await page.goto('/?search=initial-search')

    const filterSearchInput = page.getByTestId('filter-search-input')
    await expect(filterSearchInput).toHaveValue('initial-search')
  })

  test('not update URL on first render', async ({ page }) => {
    await page.goto('/')
    const initialUrl = page.url()
    await page.waitForTimeout(600)
    expect(page.url()).toBe(initialUrl)
  })

  test('handle special characters in search query', async ({ page }) => {
    const filterSearchInput = page.getByTestId('filter-search-input')

    await filterSearchInput.waitFor({ state: 'visible' })
    await filterSearchInput.focus()
    await filterSearchInput.pressSequentially('trump & biden')

    await page.waitForURL('/?search=**')
    expect(page.url()).toContain('search=')
  })
})

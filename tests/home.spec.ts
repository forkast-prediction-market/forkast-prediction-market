import { expect, test } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Forkast | Decentralized Prediction Markets')
})

test('shows appkit modal with log in button', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('header-login-button').click()

  const modal = page.getByText('Connect Wallet')

  await expect(modal).toBeVisible()
})

test('shows appkit modal with sign up button', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('header-signup-button').click()

  const modal = page.getByText('Connect Wallet')

  await expect(modal).toBeVisible()
})

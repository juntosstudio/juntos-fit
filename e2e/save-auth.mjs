import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = 'http://127.0.0.1:4173'
const AUTH_DIR = path.resolve('.auth')
const AUTH_FILE = path.join(AUTH_DIR, 'user.json')

function startVite() {
  const viteBin = path.resolve(
    'node_modules',
    'vite',
    'bin',
    'vite.js',
  )

  return spawn(
    process.execPath,
    [
      viteBin,
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
    ],
    {
      stdio: 'inherit',
      shell: false,
    },
  )
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(BASE_URL)

      if (response.ok) {
        return
      }
    } catch {
      // Vite is still starting.
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 250),
    )
  }

  throw new Error(
    'The local Vite server did not become available.',
  )
}

const vite = startVite()

try {
  await waitForServer()

  const browser = await chromium.launch({
    headless: false,
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(BASE_URL)

  console.log('')
  console.log(
    'Sign in to Juntos Fit in the browser window.',
  )
  console.log(
    'The script will save the session after the Dashboard appears.',
  )
  console.log('')

  await page
    .getByRole('button', {
      name: 'Sign Out',
    })
    .waitFor({
      state: 'visible',
      timeout: 300_000,
    })

  await fs.mkdir(AUTH_DIR, {
    recursive: true,
  })

  await context.storageState({
    path: AUTH_FILE,
  })

  console.log('')
  console.log(
    `Saved Playwright auth state to ${AUTH_FILE}`,
  )

  await browser.close()
} finally {
  vite.kill()
}

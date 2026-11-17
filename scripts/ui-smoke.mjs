import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const baseUrl = 'http://127.0.0.1:4173/FALA/'
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  stdio: 'inherit',
  env: process.env,
})
let browser

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // The Vite preview server is still starting.
    }
    await delay(500)
  }
  throw new Error('Vite preview did not become available at ' + baseUrl)
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(
    dimensions.content <= dimensions.viewport + 1,
    label + ' has horizontal overflow: ' + JSON.stringify(dimensions),
  )
}

try {
  await waitForPreview()
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.brand-logo-light').waitFor({ state: 'visible' })
  const logoLoaded = await page.locator('.brand-logo-light').evaluate(img => img.complete && img.naturalWidth > 0)
  assert.ok(logoLoaded, 'The FALA wordmark SVG must load in the desktop shell.')
  const heroTitleColor = await page.locator('.welcome-strip h1').evaluate(el => getComputedStyle(el).color)
  assert.equal(heroTitleColor, 'rgb(247, 251, 255)', 'The light theme hero title must meet readable contrast on the dark banner.')
  await assertNoHorizontalOverflow(page, 'Desktop 1440px')
  mkdirSync('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/fala-desktop.png', fullPage: true })

  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await page.locator('.brand-logo-dark').waitFor({ state: 'visible' })
  const darkLogoLoaded = await page.locator('.brand-logo-dark').evaluate(img => img.complete && img.naturalWidth > 0)
  assert.ok(darkLogoLoaded, 'The dark theme wordmark SVG must load.')
  await page.getByRole('button', { name: 'Ativar tema claro' }).click()

  await page.locator('.sidebar').getByRole('button', { name: 'Aprender', exact: true }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Curso guiado/)
  await page.locator('.page-content').waitFor({ state: 'visible' })

  await page.locator('.sidebar').getByRole('button', { name: 'Lumi IA', exact: true }).click()
  await page.getByRole('button', { name: 'Praticar conversa', exact: true }).click()
  const chatInput = page.getByRole('textbox', { name: 'Mensagem para a Lumi' })
  assert.match(await chatInput.inputValue(), /practice a short conversation/)
  assert.equal(pageErrors.length, 0, 'No unhandled browser errors should occur during desktop smoke tests.')

  await page.setViewportSize({ width: 834, height: 1112 })
  await assertNoHorizontalOverflow(page, 'Tablet 834px')
  const tabletTitleBox = await page.locator('.topbar-title span').boundingBox()
  assert.ok(tabletTitleBox && tabletTitleBox.height <= 24, 'Tablet page title must stay on a single line.')
  await page.screenshot({ path: 'artifacts/fala-tablet.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await assertNoHorizontalOverflow(page, 'Mobile 390px')
  const mobileProbe = await page.evaluate(() => {
    const icon = document.querySelector('.topbar-brand-icon')
    return {
      innerWidth: window.innerWidth,
      mediaMatches: window.matchMedia('(max-width: 700px)').matches,
      iconDisplay: icon ? getComputedStyle(icon).display : 'missing',
      iconBox: icon ? icon.getBoundingClientRect().toJSON() : null,
    }
  })
  console.log('Mobile viewport probe:', JSON.stringify(mobileProbe))
  assert.ok(mobileProbe.mediaMatches, 'Mobile viewport must activate the 700px responsive breakpoint.')
  await page.locator('.topbar-brand-icon').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  const mobileMenu = page.locator('.mobile-menu')
  await mobileMenu.waitFor({ state: 'visible' })
  await mobileMenu.getByRole('button', { name: 'Descobrir meu nível', exact: true }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Diagnóstico de nível/)
  await page.screenshot({ path: 'artifacts/fala-mobile-diagnostic.png', fullPage: true })

  const answers = [0, 1, 2, 0, 1]
  const options = page.locator('.diagnostic-options button')
  assert.equal(await options.count(), 15, 'Diagnostic should render five questions with three answers each.')
  for (let question = 0; question < answers.length; question += 1) {
    await options.nth(question * 3 + answers[question]).click()
  }
  await page.getByRole('button', { name: /Ver meu resultado/ }).click()
  await page.locator('.diagnostic-result-card').waitFor({ state: 'visible' })
  assert.match(await page.locator('.diagnostic-result-card').innerText(), /5 de 5 questões/)
  assert.equal(pageErrors.length, 0, 'No unhandled browser errors should occur during desktop/tablet/mobile smoke tests.')

  console.log('UI smoke tests passed: desktop, tablet, mobile, light/dark logo, navigation, Lumi prompt and diagnostic.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

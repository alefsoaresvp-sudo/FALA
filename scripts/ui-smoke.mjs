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
  await page.locator('.sidebar .brand-logo-light').waitFor({ state: 'visible' })
  const logoLoaded = await page.locator('.sidebar .brand-logo-light').evaluate(img => img.complete && img.naturalWidth > 0)
  assert.ok(logoLoaded, 'The FALA wordmark SVG must load in the desktop shell.')
  assert.match(await page.locator('.sidebar .brand-logo-light').getAttribute('alt'), /FALA English/)
  const activeNav = page.locator('.sidebar .nav-link[aria-current="page"]')
  assert.equal(await activeNav.innerText(), 'Início', 'The active navigation item must be announced.')
  await page.keyboard.press('Tab')
  const keyboardFocus = await page.evaluate(() => {
    const active = document.activeElement
    return active instanceof HTMLElement && active.matches(':focus-visible') &&
      getComputedStyle(active).outlineStyle !== 'none' &&
      getComputedStyle(active).outlineWidth === '3px'
  })
  assert.ok(keyboardFocus, 'Keyboard navigation must show a visible focus indicator.')
  const practiceCards = page.locator('.dashboard-practice-card')
  assert.equal(await practiceCards.count(), 5, 'The dashboard must show all five quick-practice cards.')
  await practiceCards.filter({ hasText: 'Falar' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Treino de fala/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Escrever' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Laboratório de escrita/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Conversar com a Lumi' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Converse com a Lumi/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Situações reais' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Trilhas de aprendizagem/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Descobrir meu nível' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Diagnóstico de nível/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  const heroTitleColor = await page.locator('.welcome-strip h1').evaluate(el => getComputedStyle(el).color)
  assert.equal(heroTitleColor, 'rgb(247, 251, 255)', 'The light theme hero title must meet readable contrast on the dark banner.')
  await assertNoHorizontalOverflow(page, 'Desktop 1440px')
  mkdirSync('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/fala-desktop.png', fullPage: true })

  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await page.locator('.sidebar .brand-logo-dark').waitFor({ state: 'visible' })
  const darkLogoLoaded = await page.locator('.sidebar .brand-logo-dark').evaluate(img => img.complete && img.naturalWidth > 0)
  assert.ok(darkLogoLoaded, 'The dark theme wordmark SVG must load.')
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
  await page.getByRole('button', { name: 'Ativar tema claro' }).click()
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light')

  await page.locator('.sidebar').getByRole('button', { name: 'Aprender', exact: true }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Curso guiado/)
  await page.locator('.course-intro-card').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Começar minha primeira aula' }).click()
  await page.locator('.lesson-teaching-card').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Começar exercícios' }).click()
  await page.locator('.course-choice-list').getByRole('button', { name: 'Hello', exact: true }).click()
  await page.getByRole('button', { name: /Conferir resposta/ }).click()
  await page.locator('.course-feedback.correct').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.locator('.word-builder').waitFor({ state: 'visible' })

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
  const mobileLogo = page.locator('.mobile-brand-lockup .brand-logo-light')
  await mobileLogo.waitFor({ state: 'visible' })
  const mobileLogoLoaded = await mobileLogo.evaluate(img => img.complete && img.naturalWidth > 0)
  assert.ok(mobileLogoLoaded, 'The mobile page must show the FALA wordmark.')
  assert.equal(await page.locator('.mobile-brand-lockup img:visible').count(), 1, 'Only one theme variant of the mobile wordmark may be visible.')
  await page.screenshot({ path: 'artifacts/fala-mobile.png', fullPage: true })
  await page.locator('.mobile-dock').getByRole('button', { name: 'Mais', exact: true }).click()
  const mobileMoreSheet = page.locator('.mobile-more-sheet')
  await mobileMoreSheet.waitFor({ state: 'visible' })
  await mobileMoreSheet.getByRole('button', { name: 'Descobrir meu nível', exact: true }).click()
  await page.locator('.diagnostic-layout').waitFor({ state: 'visible' })
  await assertNoHorizontalOverflow(page, 'Mobile diagnostic 390px')
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

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
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      lang = 'en-US'
      interimResults = false
      maxAlternatives = 1
      onresult = null
      onerror = null
      onend = null
      start() {
        this.onresult?.({ results: [[{ transcript: 'I am learning English because I want to travel and communicate at work.' }]] })
        this.onend?.()
      }
      stop() { this.onend?.() }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: FakeSpeechRecognition })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: FakeSpeechRecognition })
    class FakeMediaRecorder {
      state = 'inactive'
      mimeType = 'audio/webm;codecs=opus'
      ondataavailable = null
      onstop = null
      onerror = null
      static isTypeSupported(type) { return type.includes('audio/webm') }
      start() { this.state = 'recording' }
      stop() {
        if (this.state !== 'recording') return
        this.state = 'inactive'
        this.ondataavailable?.({ data: new Blob(['mock audio data'], { type: this.mimeType }) })
        this.onstop?.()
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { value: FakeMediaRecorder })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    })
  })
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('dialog', { name: /Seu próximo passo/ }).waitFor({ state: 'visible' })
  await page.keyboard.press('Tab')
  const tourKeyboardFocus = await page.evaluate(() => {
    const active = document.activeElement
    return active instanceof HTMLElement && active.matches(':focus-visible') &&
      getComputedStyle(active).outlineStyle !== 'none' &&
      getComputedStyle(active).outlineWidth === '3px'
  })
  assert.ok(tourKeyboardFocus, 'The initial tour must receive keyboard focus and show a visible focus indicator.')
  await page.keyboard.press('Shift+Tab')
  await page.getByRole('button', { name: 'Pular tour' }).click()
  await page.locator('.sidebar .brand-logo-light').waitFor({ state: 'visible' })
  const logoLoaded = await page.locator('.sidebar .brand-logo-light').evaluate(img => img.complete && img.naturalWidth > 0)
  assert.ok(logoLoaded, 'The FALA wordmark SVG must load in the desktop shell.')
  assert.match(await page.locator('.sidebar .brand-logo-light').getAttribute('alt'), /FALA English/)
  const activeNav = page.locator('.sidebar .nav-link[aria-current="page"]')
  assert.equal(await activeNav.innerText(), 'Início', 'The active navigation item must be announced.')
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).waitFor({ state: 'visible' })
  const practiceCards = page.locator('.dashboard-practice-grid .activity-card')
  assert.equal(await practiceCards.count(), 5, 'The dashboard must show all five quick-practice tools.')
  await practiceCards.filter({ hasText: 'Lumi IA' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Converse com a Lumi/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Trilhas reais' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Trilhas de aprendizagem/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Vocabulário' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Meu vocabulário/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Escrita' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Laboratório de escrita/)
  await page.locator('.sidebar').getByRole('button', { name: 'Início', exact: true }).click()
  await practiceCards.filter({ hasText: 'Music Lab' }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Music Lab/)
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
  const introMethod = await page.locator('.course-intro-steps').innerText()
  for (const phase of ['Aprender', 'Entender', 'Praticar', 'Falar', 'Corrigir', 'Revisar', 'Aplicar']) {
    assert.match(introMethod, new RegExp(phase), 'The lesson introduction must present all seven learning stages.')
  }
  await page.getByRole('button', { name: 'Começar minha primeira aula' }).click()
  await page.locator('.course-hero').waitFor({ state: 'visible' })
  await page.locator('.course-lesson-row:not(.locked)').first().click()
  await page.locator('.lesson-teaching-card').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /Avançar para escuta/ }).click()
  await page.locator('.understand-audio-row').first().waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /Entendi, começar prática/ }).click()
  await page.locator('.course-answer-input').fill('Hello')
  await page.getByRole('button', { name: /Conferir resposta/ }).click()
  await page.locator('.course-feedback.correct').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.locator('.word-builder').waitFor({ state: 'visible' })
  await page.locator('.course-lumi-context-button').click()
  await page.getByRole('dialog', { name: 'Pergunte à Lumi' }).waitFor({ state: 'visible' })
  assert.match(await page.getByRole('textbox', { name: 'Dúvida para a Lumi' }).inputValue(), /estrutura esperada/i)
  await page.getByRole('button', { name: 'Continuar aula' }).click()

  for (const word of ['My', 'name', 'is', 'Ana.']) {
    await page.getByRole('button', { name: word, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Conferir resposta' }).click()
  await page.locator('.course-feedback.correct').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.locator('.course-answer-input').fill('I am Pedro.')
  await page.getByRole('button', { name: 'Conferir resposta' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.locator('.course-answer-input').fill('Good morning.')
  await page.getByRole('button', { name: 'Conferir resposta' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Gravar voz' }).click()
  await page.getByRole('button', { name: 'Parar gravação' }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Parar gravação' }).click()
  await page.getByText(/a transcrição falhou: entre na sua conta/i).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Marcar como praticado sem gravação' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()

  await page.locator('.sidebar').getByRole('button', { name: 'Lumi IA', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar para gravar mensagem' }).waitFor({ state: 'visible' })
  assert.equal(await page.getByRole('button', { name: 'Entrar para gravar mensagem' }).isEnabled(), true, 'Guest users should be offered a clear sign-in action for the Lumi voice-recording fallback.')
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
  await mobileMoreSheet.getByRole('button', { name: 'Music Lab', exact: true }).click()
  assert.match(await page.locator('.topbar-title').innerText(), /Music Lab/)
  await page.locator('.mobile-dock').getByRole('button', { name: 'Progresso', exact: true }).click()
  await page.getByRole('button', { name: 'Fazer diagnóstico prático' }).click()
  await page.locator('.diagnostic-layout').waitFor({ state: 'visible' })
  await assertNoHorizontalOverflow(page, 'Mobile diagnostic 390px')
  await page.screenshot({ path: 'artifacts/fala-mobile-diagnostic.png', fullPage: true })

  const answers = [0, 1, 2, 0, 1]
  const options = page.locator('.diagnostic-options button')
  assert.equal(await options.count(), 15, 'Diagnostic should render five questions with three answers each.')
  for (let question = 0; question < answers.length; question += 1) {
    await options.nth(question * 3 + answers[question]).click()
  }
  await page.locator('.diagnostic-evidence-card textarea').first().fill('I want to improve my English because I need to communicate with customers. I practice every day and I want to speak with confidence.')
  await page.getByRole('button', { name: 'Capturar amostra oral' }).click()
  await page.getByText('Amostra capturada').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /Avaliar as três evidências/ }).click()
  await page.locator('.diagnostic-result-card').waitFor({ state: 'visible' })
  assert.match(await page.locator('.diagnostic-result-card').innerText(), /5 de 5 questões/)
  assert.equal(await page.locator('.diagnostic-score-grid article').count(), 3, 'The diagnostic must show separate knowledge, writing and spoken-transcript scores.')
  assert.match(await page.locator('.diagnostic-result-card').innerText(), /Resultado composto/)
  assert.equal(pageErrors.length, 0, 'No unhandled browser errors should occur during desktop/tablet/mobile smoke tests.')

  console.log('UI smoke tests passed: responsive layouts, navigation, course lesson, MediaRecorder start/stop fallback, Lumi prompt and diagnostic.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

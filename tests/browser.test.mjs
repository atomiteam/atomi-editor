import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium } from 'playwright-core'

let browser
let page

before(async () => {
  const systemBrowser = ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || systemBrowser,
    timeout: 10000,
  })
  page = await browser.newPage()
  page.setDefaultTimeout(6000)
})

after(async () => {
  await browser?.close()
})

async function withPage(run) {
  const errors = []
  const captureError = error => errors.push(error)
  page.on('pageerror', captureError)
  try {
    await page.goto('about:blank')
    const demo = await readFile('demo/index.html', 'utf8')
    await page.setContent(demo.replace(/<script[^>]*><\/script>|<link[^>]*>/g, ''))
    await page.addStyleTag({ path: 'dist/style.css' })
    await page.addStyleTag({ path: 'demo/demo.css' })
    await page.addScriptTag({ path: 'dist/browser/full.js' })
    await page.addScriptTag({ path: 'demo/demo.js' })
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    page.off('pageerror', captureError)
  }
}

test('inserts and edits links and supports undo, even through HTML source mode', () => withPage(async page => {
  const body = page.getByRole('textbox', { name: 'Rich text editor' })
  await body.click()
  await page.keyboard.press('End')
  await page.getByRole('button', { name: 'Link', exact: true }).click()
  await page.getByLabel('URL', { exact: true }).fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Apply' }).click()
  assert.match(await page.getByRole('alert').textContent(), /valid URL/)
  await page.getByLabel('URL', { exact: true }).fill('https://example.org')
  await page.getByLabel('Link text').fill('Example')
  await page.getByRole('button', { name: 'Apply' }).click()
  assert.equal(await body.getByText('Example', { exact: true }).getAttribute('href'), 'https://example.org')
  await page.getByRole('button', { name: 'HTML source' }).click()
  await page.getByLabel('HTML', { exact: true }).fill(
    '<p><a href="/notes" onclick="alert(1)">Notes</a><a href="java&#x09;script:alert(1)">unsafe</a></p><script>bad()</script>',
  )
  await page.getByRole('button', { name: 'Apply' }).click()
  assert.equal(await body.innerHTML(), '<p><a href="/notes">Notes</a>unsafe</p>')
  await page.getByRole('button', { name: 'Undo' }).click()
  assert.equal(await body.getByText('Example', { exact: true }).getAttribute('href'), 'https://example.org')
}))

test('edits a link at the caret and inserts a table with editable rows', () => withPage(async page => {
  const link = page.getByText('workshop agenda', { exact: true })
  const box = await link.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.getByRole('button', { name: 'Link', exact: true }).click()
  assert.equal(await page.getByLabel('URL', { exact: true }).inputValue(), 'https://example.com/workshop')
  assert.equal(await page.getByLabel('Link text').inputValue(), 'workshop agenda')
  await page.getByLabel('URL', { exact: true }).fill('/schedule')
  await page.getByLabel('Link text').fill('Updated agenda')
  await page.getByRole('button', { name: 'Apply' }).click()
  assert.equal(await page.getByText('Updated agenda', { exact: true }).getAttribute('href'), '/schedule')
  assert.equal(await link.count(), 0)
  assert.equal(await page.locator('.ProseMirror a').count(), 1)
  await page.getByRole('textbox', { name: 'Rich text editor' }).press('Control+End')
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByLabel('Rows').fill('2')
  await page.getByLabel('Columns').fill('2')
  await page.getByRole('button', { name: 'Apply' }).click()
  assert.equal(await page.locator('.ProseMirror tr').count(), 2)
  await page.locator('.ProseMirror td').first().click()
  await page.getByRole('button', { name: 'Add row' }).click()
  assert.equal(await page.locator('.ProseMirror tr').count(), 3)
}))

test('loads standalone presets and a custom bundle with the requested plugin set', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs', '--custom', 'links,source'])
  const expected = {
    minimal: ['history', 'formatting'],
    medium: ['history', 'formatting', 'blocks', 'lists', 'links'],
    full: ['history', 'formatting', 'blocks', 'lists', 'links', 'media', 'tables', 'source'],
    custom: ['links', 'source'],
  }
  await withPage(async page => {
    for (const [name, plugins] of Object.entries(expected)) {
      await page.addScriptTag({ path: `dist/browser/${name}.js` })
      assert.deepEqual(await page.evaluate(() => window.AtomiEditor.plugins.map(plugin => plugin.name)), plugins)
    }
  })
})

test('React and Vue synchronize edits, external values, read-only state and unmount', async () => {
  const fixture = await build({
    entryPoints: ['tests/frameworks.ts'],
    write: false,
    bundle: true,
    define: { 'process.env.NODE_ENV': '"development"' },
  })
  await withPage(async page => {
    await page.addScriptTag({ content: fixture.outputFiles[0].text })
    for (const name of ['react', 'vue']) {
      const app = page.locator(`#${name}`)
      const body = app.getByRole('textbox', { name: 'Rich text editor' })
      await body.click()
      await page.keyboard.press('End')
      await page.keyboard.type('!')
      await page.waitForFunction(id => document.querySelector(`#${id} output`).textContent.endsWith('!</p>'), name)
      await app.getByRole('button', { name: 'Replace' }).click()
      await page.waitForFunction(id => document.querySelector(`#${id} .ProseMirror`).textContent === 'External', name)
      await app.getByRole('button', { name: 'Lock', exact: true }).click()
      await page.waitForFunction(id => document.querySelector(`#${id} .ProseMirror`).contentEditable === 'false', name)
    }
    await page.evaluate(() => window.unmountEditors())
    assert.equal(await page.locator('.ProseMirror').count(), 0)
  })
})

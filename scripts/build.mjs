import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const presets = ['minimal', 'medium', 'full']
const plugins = ['history', 'formatting', 'blocks', 'lists', 'links', 'media', 'tables', 'source']
const custom = process.argv[2] === '--custom'
const selected = (process.argv[3] ?? '').split(',').map(name => name.trim()).filter(Boolean)

if (custom && (selected.some(name => !plugins.includes(name)) || new Set(selected).size !== selected.length)) {
  throw new Error(`Select unique plugin names from: ${plugins.join(', ')}`)
}

const options = {
  target: 'es2022',
  legalComments: 'linked',
  logLevel: 'warning',
}

async function standalone(name, entry) {
  const outfile = `dist/browser/${name}.js`
  const result = await build({
    ...options,
    ...entry,
    outfile,
    bundle: true,
    minify: true,
    globalName: 'AtomiEditor',
    format: 'iife',
    write: false,
  })
  await Promise.all(result.outputFiles.map(file => writeFile(file.path, file.contents)))
  const javascript = result.outputFiles.find(file => file.path.endsWith('.js'))
  console.error(`${outfile}  ${javascript.contents.length} bytes  ${gzipSync(javascript.contents).length} gzip bytes`)
}

await mkdir('dist/browser', { recursive: true })
await copyFile('src/style.css', 'dist/style.css')
const bundledDependencies = [
  'orderedmap', 'rope-sequence', 'w3c-keyname', 'prosemirror-commands',
  'prosemirror-history', 'prosemirror-keymap', 'prosemirror-model',
  'prosemirror-schema-list', 'prosemirror-state', 'prosemirror-tables',
  'prosemirror-transform', 'prosemirror-view',
]
const notices = await Promise.all(bundledDependencies.map(async name =>
  `${name}\n\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`,
))
await writeFile('dist/browser/THIRD-PARTY-NOTICES.txt', notices.join('\n\n'))


if (custom) {
  const contents = [
    'export { createEditor, Editor } from "./src/core.ts"',
    ...selected.map(name => `import { ${name} } from "./src/plugins/${name}.ts"`),
    `export const plugins = [${selected.join(', ')}]`,
  ].join('\n')
  await standalone('custom', { stdin: { contents, resolveDir: process.cwd(), loader: 'ts' } })
} else {
  const modules = ['core', 'react', 'vue', ...presets, ...plugins.map(name => `plugins/${name}`), 'plugins/urls']
  await build({
    ...options,
    entryPoints: modules.map(name => `src/${name}.ts`),
    outdir: 'dist', outbase: 'src', format: 'esm',
  })
  await Promise.all(presets.map(name => standalone(name, { entryPoints: [`src/${name}.ts`] })))
}

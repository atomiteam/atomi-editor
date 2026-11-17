# Atomi Editor

Atomi Editor is a modular rich-text HTML editor for vanilla JavaScript, Vue 3, and React. The TypeScript core uses ProseMirror for document transactions, selection, clipboard handling, and browser editing. Formatting and richer document types are installed as plugins.

## Build and try it

Use Node.js 22 or newer.

```sh
npm ci
npm run demo
```

Open [the local demo](http://127.0.0.1:4173). To use the package from another project, run `npm pack` in this repository and install the resulting tarball in your application. It contains ESM modules, TypeScript declarations, CSS, standalone browser scripts, and third-party notices.

## Presets

Each preset exports a plugin list. Use the same list with any integration.

| Preset | Features |
| --- | --- |
| Minimal | Bold, italic, underline, strikethrough, inline code, undo and redo |
| Medium | Minimal, plus headings, quotes, code blocks, dividers, lists with nesting, and link insertion, editing, and removal |
| Full | Medium, plus images by URL with alt text, editable tables, and HTML source editing |

`npm run build` produces standalone scripts in `dist/browser`. Build a custom script with a comma-separated list of plugin names.

```sh
npm run build:custom -- history,formatting,links,source
```

This writes `dist/browser/custom.js`. Share the script with `dist/style.css` and the third-party notices. Available plugin names are `history`, `formatting`, `blocks`, `lists`, `links`, `media`, `tables`, and `source`. For a bundler-based custom setup, import individual plugins such as `@atomiteam/atomi-editor/plugins/links` and pass them to the editor.

## Vanilla JavaScript

```js
import { createEditor, plugins } from '@atomiteam/atomi-editor/full'
import '@atomiteam/atomi-editor/style.css'

const editor = createEditor(document.querySelector('#editor'), {
  plugins,
  label: 'Note content',
  html: '<p>Draft</p>',
  onChange: html => console.log(html),
})

// Read or replace the document, then call destroy when removing the host.
console.log(editor.getHTML())
editor.setHTML('<p>Saved draft</p>')
```

For a plain HTML page, load `dist/style.css` and a standalone script such as `dist/browser/full.js`. It exposes `window.AtomiEditor.createEditor` and `window.AtomiEditor.plugins`.

## Vue 3

```vue
<script setup>
import { ref } from 'vue'
import { AtomiEditor } from '@atomiteam/atomi-editor/vue'
import { plugins } from '@atomiteam/atomi-editor/full'
import '@atomiteam/atomi-editor/style.css'

const html = ref('<p>Draft</p>')
</script>

<template>
  <AtomiEditor v-model="html" :plugins="plugins" label="Note content" />
</template>
```

## React

```jsx
import { useState } from 'react'
import { AtomiEditor } from '@atomiteam/atomi-editor/react'
import { plugins } from '@atomiteam/atomi-editor/full'
import '@atomiteam/atomi-editor/style.css'

export function NoteEditor() {
  const [html, setHtml] = useState('<p>Draft</p>')
  return <AtomiEditor value={html} onChange={setHtml} plugins={plugins} label="Note content" />
}
```

Both adapters use the minimal preset by default and support `readOnly` and `defaultValue`. The plugin list and label are read at mount. Remount with a new component key to switch the document schema. A changed external document replaces the editor state and resets its history. Echoing an emitted value leaves the state and selection intact.

## Plugin API

A plugin can register schema nodes or marks, ProseMirror plugins such as keymaps, and toolbar commands. The core import starts with paragraphs, text, and line breaks. Include plugins for every document feature you intend to store.

```ts
import { createEditor, type EditorPlugin } from '@atomiteam/atomi-editor'

const highlight: EditorPlugin = {
  name: 'highlight',
  marks: {
    highlight: {
      parseDOM: [{ tag: 'mark' }],
      toDOM: () => ['mark', 0],
    },
  },
  setup: ({ marks }) => ({
    toolbar: [{
      label: 'Highlight',
      command(state, dispatch) {
        const { from, to, empty } = state.selection
        if (empty) return false
        const mark = marks.highlight
        const tr = state.tr
        if (state.doc.rangeHasMark(from, to, mark)) tr.removeMark(from, to, mark)
        else tr.addMark(from, to, mark.create())
        dispatch?.(tr)
        return true
      },
    }],
  }),
}

createEditor(document.querySelector('#editor')!, { plugins: [highlight] })
```

Toolbar commands follow the ProseMirror `Command` signature and report availability when called without a dispatcher. Toolbar actions can use `editor.openForm()` for input while preserving the current selection. Plugins can also normalize imported documents with a transaction returned from `setup().normalize`.

HTML import and source edits normalize markup to the active schema. Unsupported tags or attributes may be dropped, and some tags are serialized in canonical form. Built-in URL fields accept web URLs and relative paths, with email and telephone URLs also supported for links. Applications that accept HTML from untrusted clients should enforce their own sanitization at the server and rendering boundaries.

## Checks

Run `npm test` with Chromium installed. Set `CHROMIUM_PATH` if the binary is outside the common system locations, or install a Playwright-managed browser with `npx playwright-core install chromium`.

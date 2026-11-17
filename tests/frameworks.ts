import { createElement, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createApp, defineComponent, h, ref } from 'vue'
import { AtomiEditor as ReactEditor } from '../dist/react.js'
import { AtomiEditor as VueEditor } from '../dist/vue.js'
import { plugins } from '../dist/full.js'

function ReactExample() {
  const [html, setHtml] = useState('<p>React</p>')
  const [locked, setLocked] = useState(false)
  return createElement('section', null,
    createElement(ReactEditor, { value: html, onChange: setHtml, readOnly: locked, plugins }),
    createElement('output', null, html),
    createElement('button', { onClick: () => setHtml('<p>External</p>') }, 'Replace'),
    createElement('button', { onClick: () => setLocked(true) }, 'Lock'),
  )
}

const VueExample = defineComponent({
  setup() {
    const html = ref('<p>Vue</p>')
    const locked = ref(false)
    return () => h('section', [
      h(VueEditor, {
        modelValue: html.value, 'onUpdate:modelValue': value => { html.value = value },
        readOnly: locked.value, plugins,
      }),
      h('output', html.value),
      h('button', { onClick: () => { html.value = '<p>External</p>' } }, 'Replace'),
      h('button', { onClick: () => { locked.value = true } }, 'Lock'),
    ])
  },
})

const reactHost = document.createElement('div')
const vueHost = document.createElement('div')
reactHost.id = 'react'
vueHost.id = 'vue'
document.body.replaceChildren(reactHost, vueHost)
const react = createRoot(reactHost)
const vue = createApp(VueExample)
react.render(createElement(StrictMode, null, createElement(ReactExample)))
vue.mount(vueHost)
Object.assign(window, { unmountEditors: () => { react.unmount(); vue.unmount() } })

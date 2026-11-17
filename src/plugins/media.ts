import type { EditorPlugin } from '../core.js'
import { safeURL, webProtocols } from './urls.js'

export const media: EditorPlugin = {
  name: 'media',
  nodes: {
    image: {
      inline: true, group: 'inline', atom: true, draggable: true,
      attrs: { src: {}, alt: { default: '' } },
      parseDOM: [{
        tag: 'img[src]',
        getAttrs: element => {
          const src = safeURL(element.getAttribute('src') ?? '', webProtocols)
          return src ? { src, alt: element.getAttribute('alt') ?? '' } : false
        },
      }],
      toDOM: node => ['img', {
        src: safeURL(String(node.attrs.src), webProtocols),
        alt: String(node.attrs.alt),
        loading: 'lazy',
        referrerpolicy: 'no-referrer',
      }],
    },
  },
  setup: ({ nodes }) => ({
    toolbar: [{
      label: 'Image',
      action(editor) {
        editor.openForm('Insert image', [
          { name: 'url', label: 'Image URL' },
          { name: 'alt', label: 'Alternative text' },
        ], values => {
          const src = safeURL(values.url, webProtocols)
          if (!src) return 'Enter a valid image URL.'
          const { state } = editor.view
          editor.view.dispatch(state.tr.replaceSelectionWith(
            nodes.image.create({ src, alt: values.alt }), false,
          ).scrollIntoView())
        })
      },
    }],
  }),
}

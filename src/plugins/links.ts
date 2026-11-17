import type { EditorState } from 'prosemirror-state'
import type { EditorPlugin } from '../core.js'
import { linkProtocols, safeURL } from './urls.js'

function linkRange(state: EditorState) {
  const { from, to, empty, $from } = state.selection
  const type = state.schema.marks.link
  const mark = type.isInSet($from.marks())
    ?? type.isInSet($from.nodeAfter?.marks ?? [])
  if (!empty || !mark) return { from, to, href: mark?.attrs.href as string | undefined }
  let start = from
  let end = from
  while (start > $from.start()) {
    const previous = state.doc.resolve(start).nodeBefore
    if (!previous || !mark.isInSet(previous.marks)) break
    start -= previous.nodeSize
  }
  while (end < $from.end()) {
    const next = state.doc.resolve(end).nodeAfter
    if (!next || !mark.isInSet(next.marks)) break
    end += next.nodeSize
  }
  return { from: start, to: end, href: mark.attrs.href as string }
}

export function createLinks(validateURL: (value: string) => string | undefined): EditorPlugin {
  return {
    name: 'links',
    marks: {
      link: {
        attrs: { href: {} }, inclusive: false,
        parseDOM: [{
          tag: 'a[href]',
          getAttrs: element => {
            const href = validateURL(element.getAttribute('href') ?? '')
            return href ? { href } : false
          },
        }],
        toDOM: mark => ['a', { href: validateURL(String(mark.attrs.href)) }, 0],
      },
    },
    setup: ({ marks }) => ({
      toolbar: [
        {
          label: 'Link',
          action(editor) {
            const { from, to, href } = linkRange(editor.view.state)
            editor.openForm('Link', [
              { name: 'url', label: 'URL', value: href },
              ...(from === to ? [{ name: 'text', label: 'Link text' }] : []),
            ], values => {
              const url = validateURL(values.url)
              if (!url) return 'Enter a valid URL.'
              const { state } = editor.view
              const transaction = state.tr
              const mark = marks.link.create({ href: url })
              if (from === to) {
                const text = values.text.trim() || url
                transaction.replaceSelectionWith(state.schema.text(text, [mark]), false)
                transaction.removeStoredMark(marks.link)
              } else {
                transaction.addMark(from, to, mark)
              }
              editor.view.dispatch(transaction.scrollIntoView())
            })
          },
        },
        {
          label: 'Remove link', icon: 'Unlink',
          command(state, dispatch) {
            const { from, to } = linkRange(state)
            if (!state.doc.rangeHasMark(from, to, marks.link)) return false
            dispatch?.(state.tr.removeMark(from, to, marks.link).removeStoredMark(marks.link))
            return true
          },
        },
      ],
    }),
  }
}
export const links = createLinks(value => safeURL(value, linkProtocols))

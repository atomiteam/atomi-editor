import { setBlockType, wrapIn, lift } from 'prosemirror-commands'
import type { NodeSpec } from 'prosemirror-model'
import type { EditorPlugin } from '../core.js'

export const blocks: EditorPlugin = {
  name: 'blocks',
  nodes: {
    heading: {
      group: 'block', content: 'inline*', defining: true,
      attrs: { level: { default: 2 } },
      parseDOM: Array.from({ length: 6 }, (_, index) => ({
        tag: `h${index + 1}`, attrs: { level: index + 1 },
      })),
      toDOM: node => {
        const level = Number(node.attrs.level)
        return [Number.isInteger(level) && level >= 1 && level <= 6 ? `h${level}` : 'h2', 0]
      },
    },
    blockquote: {
      group: 'block', content: 'block+', defining: true,
      parseDOM: [{ tag: 'blockquote' }], toDOM: () => ['blockquote', 0],
    },
    code_block: {
      group: 'block', content: 'text*', marks: '', code: true, defining: true,
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
      toDOM: () => ['pre', ['code', 0]],
    } satisfies NodeSpec,
    horizontal_rule: {
      group: 'block', parseDOM: [{ tag: 'hr' }], toDOM: () => ['hr'],
    },
  },
  setup: ({ nodes }) => ({
    toolbar: [
      { label: 'Paragraph', icon: '¶', command: setBlockType(nodes.paragraph) },
      { label: 'Heading 1', icon: 'H1', command: setBlockType(nodes.heading, { level: 1 }) },
      { label: 'Heading 2', icon: 'H2', command: setBlockType(nodes.heading, { level: 2 }) },
      { label: 'Heading 3', icon: 'H3', command: setBlockType(nodes.heading, { level: 3 }) },
      { label: 'Quote', command: (state, dispatch) =>
        state.selection.$from.blockRange()?.parent.type === nodes.blockquote
          ? lift(state, dispatch)
          : wrapIn(nodes.blockquote)(state, dispatch),
      },
      { label: 'Code block', command: setBlockType(nodes.code_block) },
      { label: 'Divider', action: editor => { editor.insertHTML('<hr>'); editor.focus() } },
    ],
  }),
}

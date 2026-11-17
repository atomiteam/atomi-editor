import { toggleMark } from 'prosemirror-commands'
import type { MarkSpec } from 'prosemirror-model'
import { keymap } from 'prosemirror-keymap'
import type { EditorPlugin } from '../core.js'

const formats = [
  { name: 'strong', tags: ['strong', 'b'], label: 'Bold', icon: 'B', shortcut: 'Mod-b' },
  { name: 'em', tags: ['em', 'i'], label: 'Italic', icon: 'I', shortcut: 'Mod-i' },
  { name: 'underline', tags: ['u'], label: 'Underline', icon: 'U', shortcut: 'Mod-u' },
  { name: 'strike', tags: ['s', 'del', 'strike'], label: 'Strikethrough', icon: 'S' },
  { name: 'code', tags: ['code'], label: 'Inline code', icon: '<>' },
]

export const formatting: EditorPlugin = {
  name: 'formatting',
  marks: Object.fromEntries(formats.map(({ name, tags }) => [name, {
    parseDOM: tags.map(tag => ({ tag })),
    toDOM: () => [tags[0], 0],
  } satisfies MarkSpec])),
  setup(schema) {
    const toolbar = formats.map(({ name, label, icon }) => {
      const mark = schema.marks[name]
      return {
        label,
        icon,
        command: toggleMark(mark),
        active(state: import('prosemirror-state').EditorState) {
          const { empty, $from, from, to } = state.selection
          return empty
            ? !!mark.isInSet(state.storedMarks ?? $from.marks())
            : state.doc.rangeHasMark(from, to, mark)
        },
      }
    })
    const bindings = Object.fromEntries(formats.flatMap(({ shortcut }, index) =>
      shortcut ? [[shortcut, toolbar[index].command]] : [],
    ))
    return { toolbar, plugins: [keymap(bindings)] }
  },
}

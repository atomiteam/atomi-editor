import { keymap } from 'prosemirror-keymap'
import { bulletList, orderedList, listItem, wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import type { EditorPlugin } from '../core.js'

export const lists: EditorPlugin = {
  name: 'lists',
  nodes: {
    bullet_list: { ...bulletList, group: 'block', content: 'list_item+' },
    ordered_list: { ...orderedList, group: 'block', content: 'list_item+' },
    list_item: { ...listItem, content: 'paragraph block*' },
  },
  setup: ({ nodes }) => ({
    plugins: [keymap({ Enter: splitListItem(nodes.list_item) })],
    toolbar: [
      { label: 'Bulleted list', command: wrapInList(nodes.bullet_list) },
      { label: 'Numbered list', command: wrapInList(nodes.ordered_list) },
      { label: 'Indent list item', icon: 'Indent', command: sinkListItem(nodes.list_item) },
      { label: 'Outdent list item', icon: 'Outdent', command: liftListItem(nodes.list_item) },
    ],
  }),
}

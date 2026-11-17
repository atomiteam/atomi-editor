import { history as historyPlugin, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import type { EditorPlugin } from '../core.js'

export const history: EditorPlugin = {
  name: 'history',
  setup: () => ({
    plugins: [historyPlugin(), keymap({ 'Mod-z': undo, 'Shift-Mod-z': redo, 'Mod-y': redo })],
    toolbar: [
      { label: 'Undo', icon: '↶', command: undo },
      { label: 'Redo', icon: '↷', command: redo },
    ],
  }),
}

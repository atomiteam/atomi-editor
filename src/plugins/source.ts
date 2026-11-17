import { closeHistory } from 'prosemirror-history'
import type { EditorPlugin } from '../core.js'

export const source: EditorPlugin = {
  name: 'source',
  setup: () => ({
    toolbar: [{
      label: 'HTML source',
      icon: 'HTML',
      action(editor) {
        editor.openForm('Edit HTML source', [
          { name: 'html', label: 'HTML', value: editor.getHTML(), multiline: true },
        ], values => {
          if (editor.replaceHTML(values.html, closeHistory)) {
            editor.view.dispatch(closeHistory(editor.view.state.tr))
          }
        })
      },
    }],
  }),
}

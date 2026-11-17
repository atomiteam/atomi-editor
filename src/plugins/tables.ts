import { keymap } from 'prosemirror-keymap'
import {
  addColumnAfter, addRowAfter, deleteColumn, deleteRow, deleteTable,
  fixTables, goToNextCell, mergeCells, splitCell, tableEditing, tableNodes, toggleHeaderRow,
} from 'prosemirror-tables'
import type { EditorPlugin } from '../core.js'

const tableSchema = tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })

for (const name of ['table_cell', 'table_header'] as const) {
  const rule = tableSchema[name].parseDOM![0]
  if (!('tag' in rule)) continue
  const readAttributes = rule.getAttrs!
  rule.getAttrs = element => {
    const attrs = readAttributes(element)
    if (!attrs) return attrs
    return {
      ...attrs,
      colspan: boundedSpan(attrs.colspan),
      rowspan: boundedSpan(attrs.rowspan),
      colwidth: null,
    }
  }
}

function boundedSpan(value: number): number {
  return Number.isInteger(value) && value > 0 && value <= 100 ? value : 1
}

export const tables: EditorPlugin = {
  name: 'tables',
  nodes: tableSchema,
  setup: ({ nodes }) => ({
    normalize: fixTables,
    plugins: [keymap({ Tab: goToNextCell(1), 'Shift-Tab': goToNextCell(-1) }), tableEditing()],
    toolbar: [
      {
        label: 'Table',
        action(editor) {
          editor.openForm('Insert table', [
            { name: 'rows', label: 'Rows', value: '3', type: 'number' },
            { name: 'columns', label: 'Columns', value: '3', type: 'number' },
          ], values => {
            const rows = Number(values.rows)
            const columns = Number(values.columns)
            if (!Number.isInteger(rows) || rows < 1 || rows > 30 ||
                !Number.isInteger(columns) || columns < 1 || columns > 20) {
              return 'Choose 1–30 rows and 1–20 columns.'
            }
            const table = nodes.table.create(null, Array.from({ length: rows }, (_, row) =>
              nodes.table_row.create(null, Array.from({ length: columns }, () =>
                (row === 0 ? nodes.table_header : nodes.table_cell).createAndFill()!,
              )),
            ))
            const { state } = editor.view
            editor.view.dispatch(state.tr.replaceSelectionWith(table).scrollIntoView())
          })
        },
      },
      { label: 'Add row', command: addRowAfter },
      { label: 'Add column', command: addColumnAfter },
      { label: 'Delete row', command: deleteRow },
      { label: 'Delete column', command: deleteColumn },
      { label: 'Merge cells', command: mergeCells },
      { label: 'Split cell', command: splitCell },
      { label: 'Toggle header row', command: toggleHeaderRow },
      { label: 'Delete table', command: deleteTable },
    ],
  }),
}

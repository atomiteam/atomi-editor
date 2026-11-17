import { plugins as medium } from './medium.js'
import { media } from './plugins/media.js'
import { source } from './plugins/source.js'
import { tables } from './plugins/tables.js'

export { createEditor, Editor } from './core.js'
export const plugins = [...medium, media, tables, source] as const

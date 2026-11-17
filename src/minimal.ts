import { formatting } from './plugins/formatting.js'
import { history } from './plugins/history.js'

export { createEditor, Editor } from './core.js'
export const plugins = [history, formatting] as const

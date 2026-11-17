import { plugins as minimal } from './minimal.js'
import { blocks } from './plugins/blocks.js'
import { links } from './plugins/links.js'
import { lists } from './plugins/lists.js'

export { createEditor, Editor } from './core.js'
export const plugins = [...minimal, blocks, lists, links] as const

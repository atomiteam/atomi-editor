import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import type { MarkSpec, Node as DocumentNode, NodeSpec } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import type { Command, Plugin, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { baseKeymap, chainCommands, newlineInCode } from 'prosemirror-commands'
import { keymap } from 'prosemirror-keymap'

export interface ToolbarItem {
  label: string
  icon?: string
  command?: Command
  action?: (editor: Editor) => void
  active?: (state: EditorState) => boolean
}

export interface EditorPlugin {
  name: string
  nodes?: Record<string, NodeSpec>
  marks?: Record<string, MarkSpec>
  setup?: (schema: Schema) => {
    plugins?: Plugin[]
    toolbar?: ToolbarItem[]
    normalize?: (state: EditorState) => Transaction | undefined
  }
}

export interface EditorOptions {
  html?: string
  plugins?: readonly EditorPlugin[]
  readOnly?: boolean
  label?: string
  translate?: (label: string) => string
  onChange?: (html: string) => void
}

export interface EditorField {
  name: string
  label: string
  value?: string
  multiline?: boolean
  type?: 'text' | 'number'
}

const nodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
  text: { group: 'inline' },
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'],
  },
}

export class Editor {
  readonly schema: Schema
  readonly view: EditorView
  readonly #root: HTMLElement
  readonly #document: Document
  readonly #toolbar: HTMLElement
  readonly #buttons: Array<{ button: HTMLButtonElement; item: ToolbarItem }> = []
  readonly #plugins: Plugin[]
  readonly #normalizers: Array<(state: EditorState) => Transaction | undefined>
  readonly #translate: (label: string) => string
  readonly #onChange?: EditorOptions['onChange']
  #readOnly: boolean
  #form?: HTMLDivElement
  #destroyed = false

  constructor(host: HTMLElement, options: EditorOptions = {}) {
    this.#document = host.ownerDocument
    this.#readOnly = options.readOnly ?? false
    this.#onChange = options.onChange
    this.#translate = options.translate ?? (label => label)
    const schemaNodes = { ...nodes }
    const schemaMarks: Record<string, MarkSpec> = Object.create(null)
    const names = new Set<string>()
    for (const plugin of options.plugins ?? []) {
      if (names.has(plugin.name)) throw new Error(`Duplicate plugin: ${plugin.name}`)
      names.add(plugin.name)
      for (const [name, spec] of Object.entries(plugin.nodes ?? {})) {
        if (Object.hasOwn(schemaNodes, name)) throw new Error(`Duplicate node: ${name}`)
        Object.defineProperty(schemaNodes, name, { value: spec, enumerable: true })
      }
      for (const [name, spec] of Object.entries(plugin.marks ?? {})) {
        if (Object.hasOwn(schemaMarks, name)) throw new Error(`Duplicate mark: ${name}`)
        schemaMarks[name] = spec
      }
    }
    this.schema = new Schema({ nodes: schemaNodes, marks: schemaMarks })
    const features = (options.plugins ?? []).map(plugin => plugin.setup?.(this.schema))
    this.#normalizers = features.flatMap(feature => feature?.normalize ? [feature.normalize] : [])
    const insertLineBreak: Command = (state, dispatch) => {
      dispatch?.(state.tr.replaceSelectionWith(this.schema.nodes.hard_break.create()).scrollIntoView())
      return true
    }
    this.#plugins = [
      ...features.flatMap(feature => feature?.plugins ?? []),
      keymap({ ...baseKeymap, 'Shift-Enter': chainCommands(newlineInCode, insertLineBreak) }),
    ]
    this.#root = this.#document.createElement('div')
    this.#root.className = 'atomi-editor'
    this.#toolbar = this.#document.createElement('div')
    this.#toolbar.className = 'atomi-toolbar'
    this.#toolbar.setAttribute('role', 'group')
    this.#toolbar.setAttribute('aria-label', this.#translate('Formatting'))
    this.#root.append(this.#toolbar)
    this.view = new EditorView(this.#root, {
      state: this.#stateFromHTML(options.html ?? ''),
      editable: () => !this.#readOnly && !this.#form,
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': options.label ?? 'Rich text editor',
      },
      transformPastedHTML: html => this.#htmlTemplate(html).innerHTML,
      dispatchTransaction: transaction => {
        const previous = this.view.state
        if (this.#readOnly && transaction.docChanged) return
        const next = previous.apply(transaction)
        this.view.updateState(next)
        this.#refresh()
        if (!next.doc.eq(previous.doc)) this.#onChange?.(this.getHTML())
      },
    })
    for (const item of features.flatMap(feature => feature?.toolbar ?? [])) this.#addButton(item)
    this.#toolbar.hidden = this.#buttons.length === 0
    this.#refresh()
    host.append(this.#root)
  }

  getHTML(): string {
    const output = this.#document.createElement('div')
    output.append(DOMSerializer.fromSchema(this.schema).serializeFragment(
      this.view.state.doc.content, { document: this.#document },
    ))
    return output.innerHTML
  }

  setHTML(html: string, options: { emit?: boolean } = {}): void {
    const next = this.#stateFromHTML(html)
    if (next.doc.eq(this.view.state.doc)) return
    this.#closeForm()
    this.view.updateState(next)
    this.#refresh()
    if (options.emit) this.#onChange?.(this.getHTML())
  }

  replaceHTML(html: string, prepare?: (transaction: Transaction) => Transaction): boolean {
    if (this.#readOnly) return false
    const doc = this.#parse(html)
    const state = this.view.state
    if (doc.eq(state.doc)) return false
    const transaction = state.tr.replaceWith(0, state.doc.content.size, doc.content)
    this.view.dispatch(prepare ? prepare(transaction) : transaction)
    return true
  }

  insertHTML(html: string): void {
    if (this.#readOnly) return
    const slice = DOMParser.fromSchema(this.schema).parseSlice(this.#htmlTemplate(html).content)
    if (slice.size) this.view.dispatch(this.view.state.tr.replaceSelection(slice).scrollIntoView())
  }

  run(command: Command): boolean {
    if (this.#readOnly || this.#form) return false
    this.focus()
    return command(this.view.state, this.view.dispatch, this.view)
  }

  focus(): void {
    this.view.focus()
  }

  setReadOnly(readOnly: boolean): void {
    this.#readOnly = readOnly
    if (readOnly) this.#closeForm()
    this.view.updateState(this.view.state)
    this.#refresh()
  }

  openForm(
    title: string,
    fields: readonly EditorField[],
    submit: (values: Readonly<Record<string, string>>) => string | void,
  ): void {
    if (this.#readOnly || this.#form) return
    const form = this.#document.createElement('div')
    form.className = 'atomi-form'
    form.setAttribute('role', 'group')
    form.setAttribute('aria-label', this.#translate(title))
    const heading = this.#document.createElement('strong')
    heading.textContent = this.#translate(title)
    form.append(heading)
    const inputs = new Map<string, HTMLInputElement | HTMLTextAreaElement>()
    for (const field of fields) {
      const label = this.#document.createElement('label')
      label.textContent = this.#translate(field.label)
      const input = field.multiline
        ? this.#document.createElement('textarea')
        : this.#document.createElement('input')
      if (input.tagName === 'INPUT') (input as HTMLInputElement).type = field.type ?? 'text'
      input.value = field.value ?? ''
      inputs.set(field.name, input)
      label.append(input)
      form.append(label)
    }
    const error = this.#document.createElement('div')
    error.setAttribute('role', 'alert')
    const actions = this.#document.createElement('div')
    actions.className = 'atomi-actions'
    const apply = this.#document.createElement('button')
    apply.type = 'button'
    apply.textContent = this.#translate('Apply')
    const cancel = this.#document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = this.#translate('Cancel')
    const dismiss = () => {
      this.#closeForm()
      this.focus()
    }
    cancel.addEventListener('click', dismiss)
    const submitFields = () => {
      const values = Object.fromEntries([...inputs].map(([name, input]) => [name, input.value]))
      const message = submit(values)
      if (message) error.textContent = this.#translate(message)
      else dismiss()
    }
    apply.addEventListener('click', submitFields)
    form.addEventListener('keydown', event => {
      if (event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
      } else if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
        event.preventDefault()
        submitFields()
      }
    })
    actions.append(cancel, apply)
    form.append(error, actions)
    this.#form = form
    this.#toolbar.after(form)
    this.view.updateState(this.view.state)
    this.#refresh()
    const firstInput = inputs.values().next().value ?? apply
    firstInput.focus()
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.view.destroy()
    this.#root.remove()
  }

  #closeForm(): void {
    if (!this.#form) return
    this.#form.remove()
    this.#form = undefined
    this.view.updateState(this.view.state)
    this.#refresh()
  }

  #stateFromHTML(html: string): EditorState {
    let state = EditorState.create({ doc: this.#parse(html), plugins: this.#plugins })
    for (const normalize of this.#normalizers) {
      const transaction = normalize(state)
      if (transaction) state = state.apply(transaction.setMeta('addToHistory', false))
    }
    return state
  }

  #parse(html: string): DocumentNode {
    return DOMParser.fromSchema(this.schema).parse(this.#htmlTemplate(html).content)
  }

  #htmlTemplate(html: string): HTMLTemplateElement {
    const template = this.#document.createElement('template')
    template.innerHTML = html
    for (const element of template.content.querySelectorAll(
      'script, style, template, noscript, iframe, object, embed, svg, math, link, meta, base',
    )) element.remove()
    return template
  }

  #addButton(item: ToolbarItem): void {
    const button = this.#document.createElement('button')
    button.type = 'button'
    const label = this.#translate(item.label)
    button.textContent = item.icon ? this.#translate(item.icon) : label
    button.title = label
    button.setAttribute('aria-label', label)
    button.addEventListener('mousedown', event => event.preventDefault())
    button.addEventListener('click', () => {
      if (item.command) this.run(item.command)
      else item.action?.(this)
    })
    this.#buttons.push({ button, item })
    this.#toolbar.append(button)
  }

  #refresh(): void {
    this.view.dom.setAttribute('aria-readonly', String(this.#readOnly || !!this.#form))
    for (const { button, item } of this.#buttons) {
      button.disabled = this.#readOnly || !!this.#form ||
        (item.command ? !item.command(this.view.state, undefined, this.view) : false)
      if (item.active) button.setAttribute('aria-pressed', String(item.active(this.view.state)))
    }
  }
}

export function createEditor(host: HTMLElement, options?: EditorOptions): Editor {
  return new Editor(host, options)
}

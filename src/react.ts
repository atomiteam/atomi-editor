import { createElement, useEffect, useRef } from 'react'
import type { Editor, EditorOptions } from './core.js'
import { createEditor, plugins as minimal } from './minimal.js'

export interface AtomiEditorProps {
  value?: string
  defaultValue?: string
  onChange?: (html: string) => void
  readOnly?: boolean
  label?: string
  plugins?: EditorOptions['plugins']
  className?: string
}

export function AtomiEditor(props: AtomiEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<Editor | null>(null)
  const latest = useRef(props)

  useEffect(() => {
    latest.current = props
  })
  useEffect(() => {
    const initial = latest.current
    const instance = createEditor(host.current!, {
      html: initial.value ?? initial.defaultValue,
      readOnly: initial.readOnly,
      label: initial.label,
      plugins: initial.plugins ?? minimal,
      onChange: html => latest.current.onChange?.(html),
    })
    editor.current = instance
    return () => {
      instance.destroy()
      editor.current = null
    }
  }, [])
  useEffect(() => {
    if (props.value !== undefined) editor.current?.setHTML(props.value)
  }, [props.value])
  useEffect(() => {
    editor.current?.setReadOnly(props.readOnly ?? false)
  }, [props.readOnly])

  return createElement('div', { ref: host, className: props.className })
}

import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { Editor, EditorPlugin } from './core.js'
import { createEditor, plugins as minimal } from './minimal.js'

export const AtomiEditor = defineComponent({
  name: 'AtomiEditor',
  props: {
    modelValue: String,
    defaultValue: String,
    readOnly: Boolean,
    label: String,
    plugins: Array as PropType<readonly EditorPlugin[]>,
  },
  emits: { 'update:modelValue': (html: string) => typeof html === 'string' },
  setup(props, { emit }) {
    const host = ref<HTMLElement>()
    let editor: Editor | undefined
    onMounted(() => {
      editor = createEditor(host.value!, {
        html: props.modelValue ?? props.defaultValue,
        readOnly: props.readOnly,
        label: props.label,
        plugins: props.plugins ?? minimal,
        onChange: html => emit('update:modelValue', html),
      })
    })
    watch(() => props.modelValue, value => {
      if (value !== undefined) editor?.setHTML(value)
    })
    watch(() => props.readOnly, value => editor?.setReadOnly(value))
    onBeforeUnmount(() => editor?.destroy())
    return () => h('div', { ref: host })
  },
})

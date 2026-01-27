import { nextTick, ref } from 'vue'
import type { DocFile, SlashCommand } from './types'

export function useAutocomplete(
  inputMessage: Ref<string>,
  textareaRef: Ref<HTMLTextAreaElement | null>,
) {
  const docs = ref<DocFile[]>([])
  const commands = ref<SlashCommand[]>([])
  const showDocsAutocomplete = ref(false)
  const showCommandsAutocomplete = ref(false)
  const cursorPosition = ref(0)

  function checkDocsAutocomplete() {
    const textarea = textareaRef.value
    if (!textarea) return

    cursorPosition.value = textarea.selectionStart || 0
    const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)

    const match = textBeforeCursor.match(/@docs\/\S*$/)
    showDocsAutocomplete.value = !!match

    if (showDocsAutocomplete.value) {
      showCommandsAutocomplete.value = false
    }
  }

  function checkCommandsAutocomplete() {
    const textarea = textareaRef.value
    if (!textarea) return

    if (showDocsAutocomplete.value) return

    cursorPosition.value = textarea.selectionStart || 0
    const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)

    const match = textBeforeCursor.match(/(?:^|\s)\/\S*$/)
    showCommandsAutocomplete.value = !!match
  }

  function handleDocsSelect(docPath: string) {
    const textarea = textareaRef.value
    if (!textarea) return

    const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)
    const textAfterCursor = inputMessage.value.slice(cursorPosition.value)

    const match = textBeforeCursor.match(/@docs\/\S*$/)
    if (match) {
      const startIndex = textBeforeCursor.lastIndexOf('@docs/')
      const newText = textBeforeCursor.slice(0, startIndex) + `@docs/${docPath}` + textAfterCursor
      inputMessage.value = newText

      nextTick(() => {
        const newCursorPos = startIndex + `@docs/${docPath}`.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
    }

    showDocsAutocomplete.value = false
  }

  function handleCommandSelect(commandName: string) {
    const textarea = textareaRef.value
    if (!textarea) return

    const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)
    const textAfterCursor = inputMessage.value.slice(cursorPosition.value)

    const match = textBeforeCursor.match(/(?:^|\s)(\/\S*)$/)
    if (match && match[1]) {
      const slashIndex = textBeforeCursor.length - match[1].length
      const newText = textBeforeCursor.slice(0, slashIndex) + `/${commandName} ` + textAfterCursor
      inputMessage.value = newText

      nextTick(() => {
        const newCursorPos = slashIndex + `/${commandName} `.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
    }

    showCommandsAutocomplete.value = false
  }

  function closeDocsAutocomplete() {
    showDocsAutocomplete.value = false
  }

  function closeCommandsAutocomplete() {
    showCommandsAutocomplete.value = false
  }

  function setDocs(newDocs: DocFile[]) {
    docs.value = newDocs
  }

  function setCommands(newCommands: SlashCommand[]) {
    commands.value = newCommands
  }

  return {
    docs,
    commands,
    showDocsAutocomplete,
    showCommandsAutocomplete,
    cursorPosition,
    checkDocsAutocomplete,
    checkCommandsAutocomplete,
    handleDocsSelect,
    handleCommandSelect,
    closeDocsAutocomplete,
    closeCommandsAutocomplete,
    setDocs,
    setCommands,
  }
}

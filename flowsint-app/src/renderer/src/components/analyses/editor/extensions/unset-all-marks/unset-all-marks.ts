import { Extension } from '@tiptap/react'

export const UnsetAllMarks = Extension.create({
  addKeyboardShortcuts() {
    return {
      'Mod-\\': () => this.editor.commands.unsetAllMarks()
    }
  }
})

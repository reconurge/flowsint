import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { MarkdownManager } from '@tiptap/markdown'

function looksLikeMarkdown(text: string): boolean {
  return (
    /^#{1,6}\s/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /\[.+\]\(.+\)/.test(text) ||
    /^[-*+]\s/m.test(text) ||
    /^\d+\.\s/m.test(text) ||
    /^>\s/m.test(text) ||
    /^```/m.test(text) ||
    /^---$/m.test(text) ||
    /!\[.*\]\(.*\)/.test(text) ||
    /^- \[[ x]\]/m.test(text)
  )
}

export const PasteMarkdown = Extension.create({
  name: 'pasteMarkdown',

  addStorage() {
    return {
      markdownManager: null as MarkdownManager | null
    }
  },

  onCreate() {
    this.storage.markdownManager = new MarkdownManager({
      extensions: this.editor.extensionManager.baseExtensions
    })
  },

  addProseMirrorPlugins() {
    const { editor } = this
    const storage = this.storage

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const text = event.clipboardData?.getData('text/plain')
            if (!text) return false

            if (storage.markdownManager && looksLikeMarkdown(text)) {
              try {
                const json = storage.markdownManager.parse(text)
                editor.chain().focus().insertContent(json).run()
                return true
              } catch (e) {
                console.error('[PasteMarkdown]', e)
                return false
              }
            }
            return false
          }
        }
      })
    ]
  }
})

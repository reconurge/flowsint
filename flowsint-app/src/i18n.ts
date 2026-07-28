import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const locales = import.meta.glob('./locales/*.json', { eager: true })

const resources: Record<string, any> = {}

Object.keys(locales).forEach((path) => {
  const match = path.match(/\/([^/]+)\.json$/)
  if (match) {
    const lng = match[1]
    resources[lng] = {
      translation: (locales[path] as any).default || locales[path]
    }
  }
})

export const availableLanguages = Object.keys(resources).sort()

const STORAGE_KEY = 'vite-ui-language'
const savedLanguage = localStorage.getItem(STORAGE_KEY) || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  })

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
})

export default i18n

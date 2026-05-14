import { create } from 'zustand'
import id from './id'
import en from './en'
import type { Translation } from './id'

type Language = 'id' | 'en'

const translations: Record<Language, Translation> = { id, en }

function getInitialLanguage(): Language {
  const stored = localStorage.getItem('app-language')
  if (stored === 'id' || stored === 'en') return stored
  return 'id'
}

function resolveNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useI18nStore = create<I18nState>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang) => {
    localStorage.setItem('app-language', lang)
    set({ language: lang })
  },
}))

export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const language = useI18nStore((s) => s.language)
  return (key: string, params?: Record<string, string | number>) => {
    let text = resolveNested(translations[language] as unknown as Record<string, unknown>, key)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }
}

export function getCurrentLanguage(): Language {
  return useI18nStore.getState().language
}

export function setAppLanguage(lang: Language) {
  useI18nStore.getState().setLanguage(lang)
}

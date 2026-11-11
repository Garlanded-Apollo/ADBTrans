import { useSyncExternalStore } from 'react'

export type Language = 'zh' | 'en'

const STORAGE_KEY = 'adbtrans.language'

function detectLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

let language: Language = detectLanguage()
const listeners = new Set<() => void>()

export function getLanguage(): Language {
  return language
}

export function setLanguage(next: Language): void {
  if (next === language) return
  language = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // localStorage 不可用时仅在当前会话生效
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage)
}

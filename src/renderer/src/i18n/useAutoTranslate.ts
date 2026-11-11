import { useLayoutEffect } from 'react'
import { getLanguage, useLanguage } from './index'
import { translateAttribute, translateText } from './translations'

const ATTRIBUTES = ['title', 'placeholder', 'aria-label'] as const
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'])
const CJK = /[\u4e00-\u9fff]/

const textOriginals = new WeakMap<Text, string>()
const translatedTexts = new Set<Text>()
const attributeOriginals = new WeakMap<Element, Map<string, string>>()
const translatedElements = new Set<Element>()

let observer: MutationObserver | null = null
let queued = new Set<Node>()
let scheduled = false

function isIgnored(element: Element | null): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute('data-i18n-ignore')) return true
  }
  return false
}

function translateTextNode(node: Text): void {
  if (getLanguage() !== 'en') return
  const parent = node.parentElement
  if (!parent || SKIP_TAGS.has(parent.tagName) || isIgnored(parent)) return

  const current = node.nodeValue
  if (!current || !CJK.test(current)) return

  textOriginals.set(node, current)
  translatedTexts.add(node)
  const next = translateText(current)
  if (next !== current) node.nodeValue = next
}

function translateElementAttributes(element: Element): void {
  if (getLanguage() !== 'en' || isIgnored(element)) return

  for (const attribute of ATTRIBUTES) {
    const current = element.getAttribute(attribute)
    if (!current || !CJK.test(current)) continue

    let originals = attributeOriginals.get(element)
    if (!originals) {
      originals = new Map()
      attributeOriginals.set(element, originals)
    }
    originals.set(attribute, current)
    translatedElements.add(element)

    const next = translateAttribute(current)
    if (next !== current) element.setAttribute(attribute, next)
  }
}

function translateNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text)
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const element = node as Element
  if (isIgnored(element) || SKIP_TAGS.has(element.tagName)) return

  translateElementAttributes(element)
  for (const child of Array.from(element.childNodes)) translateNode(child)
}

function flush(): void {
  scheduled = false
  const nodes = Array.from(queued)
  queued = new Set()
  if (getLanguage() !== 'en') return
  for (const node of nodes) {
    if (node.isConnected) translateNode(node)
  }
}

function schedule(node: Node): void {
  queued.add(node)
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(flush)
}

function restoreAll(): void {
  queued.clear()
  scheduled = false
  for (const node of translatedTexts) {
    const original = textOriginals.get(node)
    if (original !== undefined && node.isConnected) node.nodeValue = original
  }
  translatedTexts.clear()

  for (const element of translatedElements) {
    const originals = attributeOriginals.get(element)
    if (!originals || !element.isConnected) continue
    for (const [attribute, value] of originals) element.setAttribute(attribute, value)
  }
  translatedElements.clear()
}

export function useAutoTranslate(): void {
  const language = useLanguage()

  useLayoutEffect(() => {
    if (language !== 'en') {
      observer?.disconnect()
      observer = null
      restoreAll()
      return
    }

    translateNode(document.body)

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) schedule(node)
          })
        } else {
          schedule(mutation.target)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES]
    })

    return () => {
      observer?.disconnect()
      observer = null
    }
  }, [language])
}

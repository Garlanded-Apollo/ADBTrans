import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${d.getHours()}:${pad(d.getMinutes())}`
}

export function normalizePath(path: string): string {
  // 先处理斜杠问题
  let normalized = path
    .replace(/\/+/g, '/')        // 合并重复斜杠
    .replace(/\/\.\//g, '/')     // 移除 ./
    .replace(/\/\.$/, '')        // 移除尾部 .
    .replace(/\/+$/, '') || '/'  // 移除尾部斜杠

  // 处理 .. （简单实现，不处理跨根目录）
  const parts = normalized.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') {
      resolved.pop()
    } else if (part !== '.') {
      resolved.push(part)
    }
  }
  normalized = resolved.join('/') || '/'

  // /sdcard 等价于 /storage/emulated/0，统一为 /storage/emulated/0
  if (normalized === '/sdcard' || normalized.startsWith('/sdcard/')) {
    normalized = normalized === '/sdcard'
      ? '/storage/emulated/0'
      : '/storage/emulated/0' + normalized.slice('/sdcard'.length)
  }

  return normalized
}

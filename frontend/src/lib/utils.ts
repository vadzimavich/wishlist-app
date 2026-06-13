import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединяет Tailwind-классы без конфликтов */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽',
  BYN: 'Br',
  USD: '$',
}

/** Форматирует цену с разделителями и символом валюты */
export function formatPrice(price: number, currency = 'RUB'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${price.toLocaleString('ru-RU')} ${symbol}`
}

/** Сокращает текст */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

/** Генерирует инициалы из имени */
export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
}

/** Относительная дата (через N дней / сегодня / вчера) */
export function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Завтра'
  if (diffDays === -1) return 'Вчера'
  if (diffDays > 0) return `Через ${diffDays} дн.`
  return `${Math.abs(diffDays)} дн. назад`
}

/** Копирует текст в буфер */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Проверяет, является ли строка валидным URL */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

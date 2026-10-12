import type { OrderCurrency } from '@/lib/currencies'

const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']

function belowHundred(n: number): string {
  if (n < 20) return n < 10 ? ONES[n] : TEENS[n - 10]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${TEENS[u]}`
  if (t === 9) return `quatre-vingt-${TEENS[u]}`
  const tens = TENS[t]
  if (u === 0) return t === 8 ? 'quatre-vingts' : tens
  if (u === 1 && t !== 8) return `${tens} et un`
  return `${tens}-${ONES[u]}`
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (h === 1) parts.push('cent')
  else if (h > 1) parts.push(`${ONES[h]} cent`)
  if (rest > 0) parts.push(belowHundred(rest))
  else if (h > 1) parts[parts.length - 1] += 's'
  return parts.join(' ')
}

export function numberToFrenchWords(n: number): string {
  if (!Number.isFinite(n)) return ''
  if (n === 0) return 'zéro'
  if (n < 0) return `moins ${numberToFrenchWords(-n)}`
  let result = ''
  let rest = Math.floor(n)

  const appendScale = (scale: number, singular: string, plural: string) => {
    if (rest >= scale) {
      const count = Math.floor(rest / scale)
      rest %= scale
      result += count === 1 ? `un ${singular} ` : `${belowThousand(count)} ${plural} `
    }
  }

  appendScale(1_000_000_000, 'milliard', 'milliards')
  appendScale(1_000_000, 'million', 'millions')

  if (rest >= 1000) {
    const count = Math.floor(rest / 1000)
    rest %= 1000
    result += count === 1 ? 'mille ' : `${belowThousand(count)} mille `
  }

  if (rest > 0) result += belowThousand(rest)

  return result.trim()
}

const CURRENCY_WORDS: Record<
  OrderCurrency,
  { singular: string; plural: string; centsSingular: string; centsPlural: string }
> = {
  MAD: { singular: 'dirham', plural: 'dirhams', centsSingular: 'centime', centsPlural: 'centimes' },
  EUR: { singular: 'euro', plural: 'euros', centsSingular: 'centime', centsPlural: 'centimes' },
  USD: { singular: 'dollar américain', plural: 'dollars américains', centsSingular: 'cent', centsPlural: 'cents' },
  GBP: { singular: 'livre sterling', plural: 'livres sterling', centsSingular: 'penny', centsPlural: 'pence' },
}

export function formatAmountInWords(amount: number, currency: OrderCurrency): string {
  const rounded = Math.round(amount * 100) / 100
  const whole = Math.floor(rounded)
  const cents = Math.round((rounded - whole) * 100)
  const words = CURRENCY_WORDS[currency]
  const currencyLabel = whole === 1 ? words.singular : words.plural
  let result = `${numberToFrenchWords(whole)} ${currencyLabel}`
  if (cents > 0) {
    const centsLabel = cents === 1 ? words.centsSingular : words.centsPlural
    result += ` et ${numberToFrenchWords(cents)} ${centsLabel}`
  }
  return result
}

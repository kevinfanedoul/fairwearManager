import type { ClientType, OrderType } from '@prisma/client'

export type SizeKey = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'TU'

export interface ParsedClient {
  type: ClientType
  company?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  ice?: string
  notes?: string
}

export interface ParsedOrderItem {
  designation: string
  sizes: Partial<Record<SizeKey, number>>
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
  kind: 'BREAKDOWN' | 'FLAT'
}

export interface ParsedOrder {
  type: OrderType
  orderDate: string | null
  currency: string
  totalHT: number | null
  totalTTC: number | null
  items: ParsedOrderItem[]
  notes?: string
}

export interface ParsedSheet {
  sheetName: string
  client: ParsedClient | null
  orders: ParsedOrder[]
  warnings: string[]
}

const SIZE_HEADERS: Record<string, SizeKey> = {
  xs: 'XS',
  s: 'S',
  m: 'M',
  l: 'L',
  xl: 'XL',
  xxl: 'XXL',
  '2xl': 'XXL',
  xxxl: 'XXXL',
  '3xl': 'XXXL',
  tu: 'TU',
}

type CoordField =
  | 'company'
  | 'lastName'
  | 'firstName'
  | 'email'
  | 'phone'
  | 'address'
  | 'postal'
  | 'city'
  | 'country'
  | 'ice'
  | 'mme'
  | 'extra'

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/gi, '€')
}

function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, ''))
    .replace(/\u2060/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u202f/g, ' ')
    .trim()
}

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function collapsed(value: string): string {
  return normalize(value).replace(/\s+/g, '')
}

export function extractRows(html: string): string[][] {
  const rows: string[][] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = []
    const cellRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const attrs = cellMatch[1]
      const value = stripTags(cellMatch[2])
      const colspan = /colspan\s*=\s*["']?(\d+)/i.exec(attrs)
      const span = colspan ? Math.max(1, parseInt(colspan[1], 10)) : 1
      for (let i = 0; i < span; i++) cells.push(value)
    }
    rows.push(cells)
  }
  return rows
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.includes('/')) return null
  const withoutCurrency = trimmed.replace(/[€£$]|dhs|dh|mad|eur|usd|gbp/gi, '')
  if (/[a-zA-Z]/.test(withoutCurrency)) return null

  let s = trimmed.replace(/[^\d.,-]/g, '')
  if (!s) return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
      s = s.replace(/,/g, '')
    } else {
      s = s.replace(/\./g, '').replace(',', '.')
    }
  } else if (hasComma) {
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '')
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  const full = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (full) {
    const day = parseInt(full[1], 10)
    const month = parseInt(full[2], 10)
    let year = parseInt(full[3], 10)
    if (year < 100) year += 2000
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
  }

  return null
}

export function detectCurrency(html: string): string {
  if (/€/.test(html)) return 'EUR'
  if (/£/.test(html)) return 'GBP'
  if (/\$\s?\d|\d\s?\$/.test(html)) return 'USD'
  return 'MAD'
}

function coordField(label: string): CoordField | null {
  if (label.includes('societe') || label === 'ste') return 'company'
  if (label === 'nom') return 'lastName'
  if (label === 'prenom') return 'firstName'
  if (label.includes('mail')) return 'email'
  if (label.includes('telephone') || label.includes('tel')) return 'phone'
  if (label.includes('adresse')) return 'address'
  if (label.includes('code postal') || label.includes('codepostal')) return 'postal'
  if (label === 'ville') return 'city'
  if (label === 'pays') return 'country'
  if (label.includes('ice')) return 'ice'
  if (label.includes('siret') || label.includes('date de naissance')) return 'extra'
  if (label.includes('mme') || label === 'm') return 'mme'
  return null
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isSectionRow(row: string[]): boolean {
  const c = collapsed(row.filter(Boolean).join(' '))
  return (
    c.includes('commandeencours') ||
    c.includes('demandededevi') ||
    c.includes('facturation') ||
    c.includes('mensuration') ||
    c.includes('historique') ||
    c.includes('bondecommande')
  )
}

function parseClient(rows: string[][], sheetName: string): ParsedClient | null {
  let company: string | undefined
  let firstName: string | undefined
  let lastName: string | undefined
  let email: string | undefined
  let phone: string | undefined
  let city: string | undefined
  let country: string | undefined
  let ice: string | undefined
  let mme: string | undefined
  const addressParts: string[] = []
  const extra: string[] = []

  for (const row of rows) {
    if (isSectionRow(row)) break

    for (let i = 0; i < Math.min(row.length, 3); i++) {
      const label = normalize(row[i] ?? '')
      if (!label) continue

      const field = coordField(label)
      if (!field) continue

      const value = row.slice(i + 1).find((c) => c.trim() !== '')

      switch (field) {
        case 'company':
          company = value
          break
        case 'lastName':
          lastName = value
          break
        case 'firstName':
          firstName = value
          break
        case 'email':
          if (value && isEmailLike(value)) email = value
          else if (value) extra.push(`${row[i]}: ${value}`)
          break
        case 'phone':
          phone = value
          break
        case 'address':
          if (value) addressParts.push(value)
          break
        case 'postal':
          if (value) addressParts.push(value)
          break
        case 'city':
          city = value
          break
        case 'country':
          country = value
          break
        case 'ice':
          ice = value
          break
        case 'mme':
          mme = value
          break
        case 'extra':
          if (value) extra.push(`${row[i]}: ${value}`)
          break
      }
      break
    }
  }

  if (!company && !firstName && !lastName && mme) {
    const title = collapsed(mme)
    if (!['mme', 'm', 'mr', 'mmele'].includes(title) && !/\d{3,}/.test(title)) {
      if (/brand|studio|sarl|comp|hotel/.test(title) || mme.trim().split(/\s+/).length >= 3) {
        company = mme
      } else {
        firstName = mme
      }
    }
  }

  if (!company && !firstName && !lastName) {
    if (/sarl|comp|studio|brand|hotel|&/.test(collapsed(sheetName))) {
      company = sheetName
    } else {
      firstName = sheetName
    }
  }

  if (!company && !firstName && !lastName) return null

  let type: ClientType = 'INDIVIDUAL'
  if (company) {
    type = collapsed(company).includes('studio') ? 'STUDIO' : 'BRAND'
  }

  const parsed: ParsedClient = {
    type,
    company,
    firstName,
    lastName,
    email,
    phone,
    city,
    country: country ?? 'MA',
    ice,
  }
  if (addressParts.length > 0) parsed.address = addressParts.join(', ')
  if (extra.length > 0) parsed.notes = extra.join(' | ')

  return parsed
}

interface ColumnMap {
  date?: number
  designation: number
  quantity?: number
  unitPrice?: number
  totalPrice?: number
  sizes: Record<number, SizeKey>
}

function buildColumnMap(header: string[]): ColumnMap | null {
  const designation = header.findIndex((c) => collapsed(c).includes('designation'))
  if (designation === -1) return null

  const map: ColumnMap = { designation, sizes: {} }

  for (let i = 0; i < header.length; i++) {
    const norm = collapsed(header[i])
    if (!norm) continue
    if (i === designation) continue

    const size = SIZE_HEADERS[norm]
    if (size) {
      map.sizes[i] = size
      continue
    }

    if (norm === 'date' && map.date === undefined) {
      map.date = i
      continue
    }
    if (norm.includes('bon')) continue
    if (norm.includes('quantit') || norm.includes('qte') || norm.includes('piece')) {
      if (map.quantity === undefined) map.quantity = i
      continue
    }
    if (norm.includes('prix') || norm === 'pu') {
      if (map.unitPrice === undefined) map.unitPrice = i
      continue
    }
    if (norm.includes('total') || norm.includes('montant')) {
      if (map.totalPrice === undefined) map.totalPrice = i
      continue
    }
  }

  if (map.quantity === undefined && map.unitPrice === undefined && map.totalPrice === undefined) {
    return null
  }

  return map
}

function isSummaryRow(row: string[]): boolean {
  const c = collapsed(row.join(' '))
  return (
    c.includes('total') ||
    c.includes('tva') ||
    c.includes('resteapayer') ||
    c.includes('nombrede')
  )
}

function firstNumber(cells: string[]): number | null {
  for (const c of cells) {
    const n = parseAmount(c)
    if (n !== null) return n
  }
  return null
}

function parseOrders(rows: string[][]): ParsedOrder[] {
  const orders: ParsedOrder[] = []
  const start = rows.findIndex((row) => {
    const c = collapsed(row.filter(Boolean).join(' '))
    return c.includes('commandeencours') || c.includes('demandededevi')
  })

  if (start === -1) return orders

  const inRange = rows.slice(start)

  let currentMap: ColumnMap | null = null
  let currentItems: ParsedOrderItem[] = []
  let currentDate: string | null = null
  let currentTotalHT: number | null = null
  let currentTotalTTC: number | null = null

  const flush = () => {
    if (currentMap && currentItems.length > 0) {
      orders.push({
        type: 'PRODUCT',
        orderDate: currentDate,
        currency: 'MAD',
        totalHT: currentTotalHT,
        totalTTC: currentTotalTTC,
        items: currentItems,
      })
    }
    currentMap = null
    currentItems = []
    currentDate = null
    currentTotalHT = null
    currentTotalTTC = null
  }

  for (const row of inRange) {
    const c = collapsed(row.join(' '))

    if (c.includes('factur') || c.includes('mensuration') || c.includes('historique') || c.includes('avoir')) {
      flush()
      break
    }

    const headerMap = buildColumnMap(row)
    if (headerMap) {
      flush()
      currentMap = headerMap
      continue
    }

    if (!currentMap) continue

    if (row.every((cell) => cell.trim() === '')) continue

    if (isSummaryRow(row)) {
      const num = firstNumber(row)
      if (num !== null) {
        if (c.includes('ttc')) currentTotalTTC = currentTotalTTC ?? num
        else if (c.includes('ht')) currentTotalHT = currentTotalHT ?? num
        else currentTotalHT = currentTotalHT ?? num
      }
      continue
    }

    const designation = (row[currentMap.designation] ?? '').trim()
    const sizes: Partial<Record<SizeKey, number>> = {}
    for (const [idxStr, sizeKey] of Object.entries(currentMap.sizes)) {
      const cell = row[parseInt(idxStr, 10)]
      if (cell === undefined) continue
      const n = parseAmount(cell)
      if (n !== null && n > 0) sizes[sizeKey] = n
    }

    const quantity = currentMap.quantity !== undefined ? parseAmount(row[currentMap.quantity] ?? '') ?? 0 : 0
    const unitPrice = currentMap.unitPrice !== undefined ? parseAmount(row[currentMap.unitPrice] ?? '') : null
    const totalPrice = currentMap.totalPrice !== undefined ? parseAmount(row[currentMap.totalPrice] ?? '') : null

    if (!designation && quantity === 0 && Object.keys(sizes).length === 0 && unitPrice === null && totalPrice === null) {
      continue
    }

    if (!designation) continue

    if (currentMap.date !== undefined && currentDate === null) {
      currentDate = parseDate(row[currentMap.date] ?? '')
    }

    const hasSizes = Object.keys(sizes).length > 0
    const finalQuantity = hasSizes && quantity === 0 ? Object.values(sizes).reduce((a, b) => a + b, 0) : quantity

    currentItems.push({
      designation,
      sizes,
      quantity: finalQuantity,
      unitPrice,
      totalPrice,
      kind: hasSizes ? 'BREAKDOWN' : 'FLAT',
    })
  }

  flush()

  return orders
}

export function parseSheet(html: string, sheetName: string): ParsedSheet {
  const warnings: string[] = []
  const rows = extractRows(html)
  const client = parseClient(rows, sheetName)
  const orders = parseOrders(rows)

  if (!client) {
    warnings.push('aucune coordonnée client identifiable')
  }

  const currency = detectCurrency(html)

  for (const order of orders) {
    order.currency = currency
    if (!order.orderDate) {
      warnings.push(`commande sans date: ${order.items[0]?.designation ?? '?'}`)
    }
  }

  return { sheetName, client, orders, warnings }
}

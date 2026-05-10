import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber, parseInvoiceYear } from '../invoice-number'

describe('formatInvoiceNumber', () => {
  it('formats with PR prefix, sequence padded to 3, and year', () => {
    expect(formatInvoiceNumber(2026, 16)).toBe('PR-016/2026')
  })

  it('pads single digit to 3', () => {
    expect(formatInvoiceNumber(2026, 1)).toBe('PR-001/2026')
  })
})

describe('parseInvoiceYear', () => {
  it('extracts year from invoice number', () => {
    expect(parseInvoiceYear('PR-016/2026')).toBe(2026)
  })
})

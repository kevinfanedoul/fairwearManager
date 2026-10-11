import { describe, it, expect } from 'vitest'
import { formatOrderReference, orderReferencePrefix, parseOrderYear } from '../order-reference'

describe('orderReferencePrefix', () => {
  it('returns DEVIS for PRODUCT', () => {
    expect(orderReferencePrefix('PRODUCT')).toBe('DEVIS')
  })

  it('returns DEVIS-BE for STUDY', () => {
    expect(orderReferencePrefix('STUDY')).toBe('DEVIS-BE')
  })
})

describe('formatOrderReference', () => {
  it('formats reference with year and padded sequence', () => {
    expect(formatOrderReference('PRODUCT', 2026, 42)).toBe('DEVIS-2026-042')
  })

  it('pads to 3 digits', () => {
    expect(formatOrderReference('PRODUCT', 2026, 1)).toBe('DEVIS-2026-001')
  })

  it('formats bureau d\'études reference', () => {
    expect(formatOrderReference('STUDY', 2026, 7)).toBe('DEVIS-BE-2026-007')
  })
})

describe('parseOrderYear', () => {
  it('extracts year from product reference', () => {
    expect(parseOrderYear('DEVIS-2026-042')).toBe(2026)
  })

  it('extracts year from study reference', () => {
    expect(parseOrderYear('DEVIS-BE-2026-042')).toBe(2026)
  })
})

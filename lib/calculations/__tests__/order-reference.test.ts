import { describe, it, expect } from 'vitest'
import { formatOrderReference, parseOrderYear } from '../order-reference'

describe('formatOrderReference', () => {
  it('formats reference with year and padded sequence', () => {
    expect(formatOrderReference(2026, 42)).toBe('DEVIS-2026-042')
  })

  it('pads to 3 digits', () => {
    expect(formatOrderReference(2026, 1)).toBe('DEVIS-2026-001')
  })
})

describe('parseOrderYear', () => {
  it('extracts year from reference', () => {
    expect(parseOrderYear('DEVIS-2026-042')).toBe(2026)
  })
})

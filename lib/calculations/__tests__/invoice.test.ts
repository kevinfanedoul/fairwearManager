import { describe, it, expect } from 'vitest'
import { calculateTVA, calculateStampDuty, calculateOrderTotals } from '../invoice'

describe('calculateTVA', () => {
  it('calculates 20% TVA on HT amount', () => {
    expect(calculateTVA(1000)).toBe(200)
  })

  it('rounds to 2 decimals', () => {
    expect(calculateTVA(333.33)).toBe(66.67)
  })
})

describe('calculateStampDuty', () => {
  it('calculates 0.25% of TTC', () => {
    expect(calculateStampDuty(1200)).toBe(3)
  })

  it('caps at 10000 MAD', () => {
    expect(calculateStampDuty(8_000_000)).toBe(10000)
  })

  it('returns 0 for zero amount', () => {
    expect(calculateStampDuty(0)).toBe(0)
  })
})

describe('calculateOrderTotals', () => {
  it('sums line totals and computes HT, TVA, TTC', () => {
    const items = [
      { quantity: 10, unitPrice: 100 },
      { quantity: 5, unitPrice: 200 },
    ]
    const result = calculateOrderTotals(items)
    expect(result.totalHT).toBe(2000)
    expect(result.tvaAmount).toBe(400)
    expect(result.totalTTC).toBe(2400)
  })
})

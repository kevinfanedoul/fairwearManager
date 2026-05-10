import { describe, it, expect } from 'vitest'
import { clientSchema, measurementSchema } from '../client'

describe('clientSchema', () => {
  it('accepts a valid B2B client', () => {
    const result = clientSchema.safeParse({
      type: 'B2B',
      company: 'Hotel Atlas',
      email: 'contact@atlas.ma',
      phone: '0661234567',
      city: 'Agadir',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = clientSchema.safeParse({
      type: 'INDIVIDUAL',
      firstName: 'Zahra',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts client without email', () => {
    const result = clientSchema.safeParse({
      type: 'INDIVIDUAL',
      firstName: 'Zahra',
      lastName: 'Alaoui',
    })
    expect(result.success).toBe(true)
  })
})

describe('measurementSchema', () => {
  it('accepts partial measurements', () => {
    const result = measurementSchema.safeParse({ shoulder: 38, chest: 90 })
    expect(result.success).toBe(true)
  })

  it('rejects negative values', () => {
    const result = measurementSchema.safeParse({ shoulder: -5 })
    expect(result.success).toBe(false)
  })
})

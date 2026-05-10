import { describe, it, expect } from 'vitest'
import { orderItemSchema, orderSchema } from '../order'

describe('orderItemSchema', () => {
  it('accepts valid item with sizes', () => {
    const result = orderItemSchema.safeParse({
      designation: 'T-shirt blanc',
      sizeM: 10,
      sizeL: 5,
      quantity: 15,
      unitPrice: 85,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative unit price', () => {
    const result = orderItemSchema.safeParse({
      designation: 'Robe',
      quantity: 1,
      unitPrice: -50,
    })
    expect(result.success).toBe(false)
  })
})

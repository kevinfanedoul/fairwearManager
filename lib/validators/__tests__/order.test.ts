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

describe('orderSchema', () => {
  it('accepts browser date input for deadline', () => {
    const result = orderSchema.safeParse({
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      deadline: '2026-05-20',
      items: [
        {
          designation: 'T-shirt blanc',
          quantity: 10,
          unitPrice: 25,
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('accepts a STUDY order with bureau d\'études fields', () => {
    const result = orderSchema.safeParse({
      type: 'STUDY',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        {
          designation: 'Gradation modèle X',
          patronage: 200,
          proto: 150,
          gradationSizes: 4,
          gradationUnitPrice: 35,
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('accepts a STUDY order with a flat (tarif unique) line', () => {
    const result = orderSchema.safeParse({
      type: 'STUDY',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        {
          kind: 'FLAT',
          designation: 'Forfait prototypage',
          flatPrice: 500,
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('accepts and defaults fabricSupply for a PRODUCT order', () => {
    const result = orderSchema.safeParse({
      type: 'PRODUCT',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      fabricSupply: true,
      items: [
        {
          designation: 'T-shirt blanc',
          quantity: 10,
          unitPrice: 25,
        },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.fabricSupply).toBe(true)
  })

  it('rejects a PRODUCT order with a zero unit price', () => {
    const result = orderSchema.safeParse({
      type: 'PRODUCT',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        {
          designation: 'T-shirt blanc',
          quantity: 10,
          unitPrice: 0,
        },
      ],
    })

    expect(result.success).toBe(false)
  })
})

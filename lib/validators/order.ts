import { z } from 'zod'

export const orderItemSchema = z.object({
  designation: z.string().min(1, 'Désignation requise'),
  sizeS: z.number().int().min(0).default(0),
  sizeM: z.number().int().min(0).default(0),
  sizeL: z.number().int().min(0).default(0),
  sizeXL: z.number().int().min(0).default(0),
  sizeTU: z.number().int().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0).default(0),
  patronage: z.number().min(0).optional(),
  prototype: z.number().min(0).optional(),
  gradationSizes: z.number().int().min(0).optional(),
  gradationUnitPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export const orderSchema = z
  .object({
    type: z.enum(['PRODUCT', 'STUDY']).default('PRODUCT'),
    clientId: z.string().uuid('Client requis'),
    currency: z.enum(['MAD', 'EUR', 'GBP', 'USD']).default('MAD'),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').optional().or(z.literal('')),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1, 'Au moins une ligne requise'),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'PRODUCT') return

    data.items.forEach((item, index) => {
      if (item.unitPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'unitPrice'],
          message: 'Le prix doit être positif',
        })
      }
    })
  })

export type OrderItemInput = z.input<typeof orderItemSchema>
export type OrderItemData = z.output<typeof orderItemSchema>
export type OrderInput = z.input<typeof orderSchema>
export type OrderData = z.output<typeof orderSchema>

import { z } from 'zod'

export const createInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  applyStampDuty: z.boolean().default(false),
  notes: z.string().optional(),
})

export const paymentSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive('Le montant reçu doit être positif'),
  appliedAmount: z.number().positive('Le montant appliqué doit être positif'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_PAYMENT']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export const updateInvoiceSchema = z.object({
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
})

const creditNoteItemSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  designation: z.string().min(1, 'La désignation est requise'),
  sizeS: z.number().int().min(0).default(0),
  sizeM: z.number().int().min(0).default(0),
  sizeL: z.number().int().min(0).default(0),
  sizeXL: z.number().int().min(0).default(0),
  sizeTU: z.number().int().min(0).default(0),
  quantity: z.number().int().positive('La quantité retournée doit être positive'),
  unitPrice: z.number().nonnegative('Le prix unitaire doit être positif ou nul'),
  notes: z.string().optional(),
})

export const createCreditNoteSchema = z.object({
  mode: z.enum(['RETURN_ITEMS', 'FREE_AMOUNT']).default('RETURN_ITEMS'),
  issueDate: z.string().datetime(),
  reason: z.string().min(3, 'Le motif est requis'),
  applyStampDuty: z.boolean().default(false),
  notes: z.string().optional(),
  items: z.array(creditNoteItemSchema).default([]),
}).superRefine((value, ctx) => {
  if (value.items.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['items'],
      message: 'Ajoutez au moins une ligne.',
    })
    return
  }

  value.items.forEach((item, index) => {
    const quantityFromSizes = item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeTU
    if (value.mode === 'RETURN_ITEMS' && quantityFromSizes !== item.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'quantity'],
        message: 'La quantité doit correspondre au total des tailles.',
      })
    }

    if (value.mode === 'RETURN_ITEMS' && !item.orderItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'orderItemId'],
        message: 'La ligne source est requise pour un retour de marchandise.',
      })
    }

    if (value.mode === 'FREE_AMOUNT' && quantityFromSizes !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'quantity'],
        message: 'Un avoir libre ne doit pas utiliser les tailles.',
      })
    }
  })
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>

import { z } from 'zod'

export const createInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  applyStampDuty: z.boolean().default(false),
  notes: z.string().optional(),
})

export const paymentSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive('Le montant doit être positif'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_PAYMENT']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type PaymentInput = z.infer<typeof paymentSchema>

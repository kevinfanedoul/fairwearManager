import { z } from 'zod'

export const cashEntrySchema = z.object({
  date: z.string().datetime(),
  label: z.string().min(1, 'Libellé requis'),
  amount: z.number().positive('Le montant doit être positif'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().optional(),
  reference: z.string().optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  ice: z.string().optional(),
  notes: z.string().optional(),
})

export const supplierPurchaseSchema = z.object({
  date: z.string().datetime(),
  invoiceNumber: z.string().optional(),
  description: z.string().min(1, 'Description requise'),
  amountHT: z.number().positive(),
  tvaRate: z.number().min(0).max(1).default(0.20),
  stamps: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_PAYMENT']).optional(),
  paymentDate: z.string().datetime().optional().or(z.literal('')),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional(),
})

export type CashEntryInput = z.infer<typeof cashEntrySchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type SupplierPurchaseInput = z.infer<typeof supplierPurchaseSchema>

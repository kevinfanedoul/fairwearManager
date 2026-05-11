import { z } from 'zod'

export const orderItemSchema = z.object({
  designation: z.string().min(1, 'Désignation requise'),
  sizeS: z.number().int().min(0).default(0),
  sizeM: z.number().int().min(0).default(0),
  sizeL: z.number().int().min(0).default(0),
  sizeXL: z.number().int().min(0).default(0),
  sizeTU: z.number().int().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
  unitPrice: z.number().positive('Le prix doit être positif'),
  notes: z.string().optional(),
})

export const orderSchema = z.object({
  clientId: z.string().uuid('Client requis'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Au moins une ligne requise'),
})

export type OrderItemInput = z.infer<typeof orderItemSchema>
export type OrderInput = z.infer<typeof orderSchema>

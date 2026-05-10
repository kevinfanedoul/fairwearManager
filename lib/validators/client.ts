import { z } from 'zod'

export const clientSchema = z.object({
  type: z.enum(['BRAND', 'B2B', 'INDIVIDUAL', 'STUDIO']),
  company: z.string().min(1).optional().or(z.literal('')),
  firstName: z.string().min(1).optional().or(z.literal('')),
  lastName: z.string().min(1).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('MA'),
  ice: z.string().optional(),
  tvaNumber: z.string().optional(),
  notes: z.string().optional(),
})

export const measurementSchema = z.object({
  shoulder: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  length: z.number().positive().optional(),
  waistLength: z.number().positive().optional(),
  sleeves: z.number().positive().optional(),
  notes: z.string().optional(),
})

export type ClientInput = z.infer<typeof clientSchema>
export type MeasurementInput = z.infer<typeof measurementSchema>

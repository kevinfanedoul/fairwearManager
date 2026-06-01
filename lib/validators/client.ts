import { z } from 'zod'

const nullableTextField = z.preprocess(
  (value) => {
    if (value === '') return null
    return value
  },
  z.string().trim().min(1).nullable().optional()
)

const nullableEmailField = z.preprocess(
  (value) => {
    if (value === '') return null
    return value
  },
  z.string().trim().email().nullable().optional()
)

export const clientSchema = z.object({
  type: z.enum(['BRAND', 'B2B', 'INDIVIDUAL', 'STUDIO']),
  company: nullableTextField,
  firstName: nullableTextField,
  lastName: nullableTextField,
  email: nullableEmailField,
  phone: nullableTextField,
  address: nullableTextField,
  city: nullableTextField,
  country: z.string().default('MA'),
  ice: nullableTextField,
  tvaNumber: nullableTextField,
  notes: nullableTextField,
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

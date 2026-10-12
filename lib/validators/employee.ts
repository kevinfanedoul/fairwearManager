import { z } from 'zod'

export const employeeSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  role: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  active: z.boolean().optional(),
})

export type EmployeeInput = z.infer<typeof employeeSchema>

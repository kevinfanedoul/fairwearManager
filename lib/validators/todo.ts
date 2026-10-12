import { z } from 'zod'

export const todoSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).default('TODO'),
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
})

export type TodoInput = z.infer<typeof todoSchema>

import type { InvoiceStatus } from '@prisma/client'

export function deriveInvoiceStatus(
  totalTTC: number,
  totalApplied: number,
  totalCredited: number,
  dueDate?: Date | null
): InvoiceStatus {
  const balance = Math.round((totalTTC - totalApplied - totalCredited) * 100) / 100
  const appliedOrCredited = totalApplied + totalCredited

  if (balance <= 0) return 'PAID'
  if (appliedOrCredited > 0) return 'PARTIAL'
  if (dueDate && dueDate.getTime() < Date.now()) return 'OVERDUE'
  return 'PENDING'
}

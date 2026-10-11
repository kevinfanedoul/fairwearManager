import type { OrderType } from '@prisma/client'

export function orderReferencePrefix(type: OrderType): string {
  return type === 'STUDY' ? 'DEVIS-BE' : 'DEVIS'
}

export function formatOrderReference(type: OrderType, year: number, sequence: number): string {
  return `${orderReferencePrefix(type)}-${year}-${String(sequence).padStart(3, '0')}`
}

export function parseOrderYear(reference: string): number {
  const match = reference.match(/DEVIS-(?:BE-)?(\d{4})-/)
  return match ? parseInt(match[1]) : new Date().getFullYear()
}

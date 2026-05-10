export function formatOrderReference(year: number, sequence: number): string {
  return `DEVIS-${year}-${String(sequence).padStart(3, '0')}`
}

export function parseOrderYear(reference: string): number {
  const match = reference.match(/DEVIS-(\d{4})-/)
  return match ? parseInt(match[1]) : new Date().getFullYear()
}

export function formatCreditNoteNumber(year: number, sequence: number) {
  return `AV-${String(sequence).padStart(3, '0')}/${year}`
}

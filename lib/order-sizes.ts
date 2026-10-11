export const SIZE_COLUMNS = [
  { key: 'sizeXS', label: 'XS' },
  { key: 'sizeS', label: 'S' },
  { key: 'sizeM', label: 'M' },
  { key: 'sizeL', label: 'L' },
  { key: 'sizeXL', label: 'XL' },
  { key: 'sizeXXL', label: 'XXL' },
  { key: 'sizeXXXL', label: 'XXXL' },
  { key: 'sizeTU', label: 'TU' },
] as const

export type SizeKey = (typeof SIZE_COLUMNS)[number]['key']

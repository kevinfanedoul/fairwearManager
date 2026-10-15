'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

type NumericInputProps = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value?: number | null
  onChange: (value: number) => void
  integer?: boolean
}

export function NumericInput({ value, onChange, integer = false, ...props }: NumericInputProps) {
  const [text, setText] = useState(() => (value != null && value !== 0 ? String(value) : ''))

  function handleChange(next: string) {
    setText(next)
    if (next.trim() === '') {
      onChange(0)
      return
    }
    const parsed = integer ? parseInt(next, 10) : parseFloat(next)
    onChange(Number.isFinite(parsed) ? parsed : 0)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}

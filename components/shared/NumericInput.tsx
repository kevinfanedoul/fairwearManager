'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

type NumericInputProps = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value?: number | null
  onChange: (value: number) => void
  integer?: boolean
}

function toText(value: number | null | undefined) {
  return value != null && value !== 0 ? String(value) : ''
}

export function NumericInput({ value, onChange, integer = false, ...props }: NumericInputProps) {
  const [text, setText] = useState(() => toText(value))
  const lastEmittedRef = useRef(value ?? 0)

  function handleChange(next: string) {
    setText(next)
    if (next.trim() === '') {
      lastEmittedRef.current = 0
      onChange(0)
      return
    }
    const parsed = integer ? parseInt(next, 10) : parseFloat(next)
    const resolved = Number.isFinite(parsed) ? parsed : 0
    lastEmittedRef.current = resolved
    onChange(resolved)
  }

  useEffect(() => {
    const normalized = value ?? 0
    if (normalized === lastEmittedRef.current) return
    setText(toText(normalized))
  }, [value])

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

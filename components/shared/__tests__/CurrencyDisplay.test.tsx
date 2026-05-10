import { render, screen } from '@testing-library/react'
import { CurrencyDisplay } from '../CurrencyDisplay'
import { describe, it, expect } from 'vitest'

describe('CurrencyDisplay', () => {
  it('formats amount with MAD suffix', () => {
    render(<CurrencyDisplay amount={1500} />)
    expect(screen.getByText(/1[.\s]?500,00\s*MAD/)).toBeInTheDocument()
  })

  it('formats zero correctly', () => {
    render(<CurrencyDisplay amount={0} />)
    expect(screen.getByText(/0,00\s*MAD/)).toBeInTheDocument()
  })
})

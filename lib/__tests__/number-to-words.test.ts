import { describe, it, expect } from 'vitest'
import { numberToFrenchWords, formatAmountInWords } from '../number-to-words'

describe('numberToFrenchWords', () => {
  it('spells numbers from 0 to 19', () => {
    expect(numberToFrenchWords(0)).toBe('zéro')
    expect(numberToFrenchWords(1)).toBe('un')
    expect(numberToFrenchWords(11)).toBe('onze')
    expect(numberToFrenchWords(16)).toBe('seize')
    expect(numberToFrenchWords(19)).toBe('dix-neuf')
  })

  it('spells tens', () => {
    expect(numberToFrenchWords(21)).toBe('vingt et un')
    expect(numberToFrenchWords(62)).toBe('soixante-deux')
    expect(numberToFrenchWords(71)).toBe('soixante et onze')
    expect(numberToFrenchWords(80)).toBe('quatre-vingts')
    expect(numberToFrenchWords(81)).toBe('quatre-vingt-un')
    expect(numberToFrenchWords(99)).toBe('quatre-vingt-dix-neuf')
  })

  it('spells hundreds', () => {
    expect(numberToFrenchWords(100)).toBe('cent')
    expect(numberToFrenchWords(200)).toBe('deux cents')
    expect(numberToFrenchWords(201)).toBe('deux cent un')
    expect(numberToFrenchWords(999)).toBe('neuf cent quatre-vingt-dix-neuf')
  })

  it('spells thousands and millions', () => {
    expect(numberToFrenchWords(1000)).toBe('mille')
    expect(numberToFrenchWords(2000)).toBe('deux mille')
    expect(numberToFrenchWords(1_000_000)).toBe('un million')
    expect(numberToFrenchWords(2_000_000)).toBe('deux millions')
    expect(numberToFrenchWords(1_234_567)).toBe(
      'un million deux cent trente-quatre mille cinq cent soixante-sept'
    )
  })
})

describe('formatAmountInWords', () => {
  it('formats a MAD amount with centimes', () => {
    expect(formatAmountInWords(1234.56, 'MAD')).toBe(
      'mille deux cent trente-quatre dirhams et cinquante-six centimes'
    )
  })

  it('handles singular currency', () => {
    expect(formatAmountInWords(1, 'MAD')).toBe('un dirham')
  })

  it('omits centimes for whole amounts', () => {
    expect(formatAmountInWords(5000, 'MAD')).toBe('cinq mille dirhams')
  })

  it('handles EUR currency', () => {
    expect(formatAmountInWords(2.05, 'EUR')).toBe('deux euros et cinq centimes')
  })
})

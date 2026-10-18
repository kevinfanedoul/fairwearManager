import { describe, it, expect } from 'vitest'
import {
  parseSheet,
  parseAmount,
  parseDate,
  extractRows,
  normalize,
} from '../parser'

function toHtml(rows: (string | string[])[][]): string {
  const body = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const value = Array.isArray(cell) ? cell[0] : cell
          const attrs = Array.isArray(cell) && cell[1] ? ` ${cell[1]}` : ''
          return `<td${attrs}>${value}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  return `<table>${body}</table>`
}

describe('normalize', () => {
  it('removes accents and punctuation', () => {
    expect(normalize('Numéro de Téléphone :')).toBe('numero de telephone')
    expect(normalize('Sociètè')).toBe('societe')
    expect(normalize('I.C.E :')).toBe('ice')
  })
})

describe('parseAmount', () => {
  it('parses comma decimals', () => {
    expect(parseAmount('815,00€')).toBe(815)
    expect(parseAmount('17,00')).toBe(17)
    expect(parseAmount('0,00dh')).toBe(0)
  })

  it('parses space thousands', () => {
    expect(parseAmount('8 050,00')).toBe(8050)
    expect(parseAmount('1 500,00 DH')).toBe(1500)
  })

  it('parses dot thousands with comma decimals', () => {
    expect(parseAmount('10.790,30 Dhs')).toBe(10790.3)
  })

  it('parses negative values', () => {
    expect(parseAmount('-6 500,00 DH')).toBe(-6500)
  })

  it('returns null for non-numbers', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })

  it('rejects strings containing letters (invoice references)', () => {
    expect(parseAmount('PR 028/2024 Le 12/06/2024')).toBeNull()
  })

  it('rejects dates', () => {
    expect(parseAmount('12/06/2024')).toBeNull()
  })
})

describe('parseDate', () => {
  it('parses dd/mm/yyyy', () => {
    expect(parseDate('24/07/2025')).toBe('2025-07-24')
    expect(parseDate('9/5/2025')).toBe('2025-05-09')
  })

  it('parses two-digit years', () => {
    expect(parseDate('15/09/25')).toBe('2025-09-15')
  })

  it('returns null for invalid dates', () => {
    expect(parseDate('21/07')).toBeNull()
    expect(parseDate('not a date')).toBeNull()
  })
})

describe('extractRows', () => {
  it('expands colspan', () => {
    const html = toHtml([[['COORDONNEES', 'colspan="3"']]])
    expect(extractRows(html)).toEqual([['COORDONNEES', 'COORDONNEES', 'COORDONNEES']])
  })
})

describe('parseSheet - individual client with order', () => {
  const html = toHtml([
    [['COORDONNEES', 'colspan="3"']],
    ['Société :', '', ''],
    ['Nom :', '', ''],
    ['Prénom :', '', 'TIGUI'],
    ['Code Postal :', '', '80000'],
    ['Ville :', '', 'AGADIR'],
    ['Numéro de Téléphone :', '', '0603632661'],
    ['E-mail :', '', ''],
    [['COMMANDE EN COURS', 'colspan="3"']],
    ['DATE', 'N° BON', 'DESIGNATION', 'S', 'M', 'L', 'XL', 'TU', 'Quantité', 'Prix Unitaire', 'Total', 'Etat'],
    ['24/07/2025', '', 'Patronage', '', '', '', '', '', '1', '70,00€', '70,00€', ''],
    ['', '', 'Veste Prod', '10', '', '10', '', '', '20', '17,00€', '340,00€', ''],
    ['', '', '', '', '', '', '', '', 'Total H.T', '', '815,00€', ''],
  ])

  const result = parseSheet(html, 'TIGUI')

  it('extracts client coordinates', () => {
    expect(result.client).toMatchObject({
      type: 'INDIVIDUAL',
      firstName: 'TIGUI',
      city: 'AGADIR',
      phone: '0603632661',
    })
    expect(result.client?.address).toBe('80000')
  })

  it('extracts order items', () => {
    expect(result.orders).toHaveLength(1)
    const order = result.orders[0]
    expect(order.currency).toBe('EUR')
    expect(order.orderDate).toBe('2025-07-24')
    expect(order.totalHT).toBe(815)
    expect(order.items).toHaveLength(2)

    const patronage = order.items[0]
    expect(patronage.designation).toBe('Patronage')
    expect(patronage.quantity).toBe(1)
    expect(patronage.unitPrice).toBe(70)
    expect(patronage.kind).toBe('FLAT')

    const veste = order.items[1]
    expect(veste.sizes).toEqual({ S: 10, L: 10 })
    expect(veste.quantity).toBe(20)
    expect(veste.kind).toBe('BREAKDOWN')
  })
})

describe('parseSheet - company with label in second column', () => {
  const html = toHtml([
    ['', ['COORDONNEES', 'colspan="2"']],
    ['', 'SOCIETE', 'ASHLEY BALACE'],
    ['', 'Nom :', 'BALACE'],
    ['', 'Prénom :', 'ASHLEY'],
    ['', 'Ville :', '75002 PARIS'],
    ['', ['COMMANDE EN COURS', 'colspan="2"']],
    ['', 'Désignation', 'Quantité', 'Prix', 'Montant', 'Situation'],
    ['', 'Kimono biege', '1', '120,00', '120,00', 'Done'],
  ])

  const result = parseSheet(html, 'ASHLEY BALACE')

  it('detects label in second column', () => {
    expect(result.client).toMatchObject({
      type: 'BRAND',
      company: 'ASHLEY BALACE',
      lastName: 'BALACE',
      firstName: 'ASHLEY',
      city: '75002 PARIS',
    })
  })

  it('parses order with price/montant columns', () => {
    expect(result.orders).toHaveLength(1)
    expect(result.orders[0].items[0]).toMatchObject({
      designation: 'Kimono biege',
      quantity: 1,
      unitPrice: 120,
      totalPrice: 120,
    })
  })
})

describe('parseSheet - name fallback from filename', () => {
  const html = toHtml([
    ['Numéro de Téléphone :', '', '0638970211'],
    ['E-mail :', '', 'LEA2095@HOTMAIL.FR'],
  ])

  it('falls back to sheet name', () => {
    const result = parseSheet(html, 'CELSI LEA')
    expect(result.client).toMatchObject({
      firstName: 'CELSI LEA',
      phone: '0638970211',
      email: 'LEA2095@HOTMAIL.FR',
    })
  })
})

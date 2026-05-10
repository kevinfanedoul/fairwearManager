# FairwairManager CRM — Plan 3 : Facturation + Trésorerie + Dashboard (S4-S5-S6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prérequis :** Plans 1 et 2 complétés (fondations, clients, commandes en place).

**Goal:** Implémenter la facturation PDF avec suivi des paiements, le journal de caisse, le registre fournisseurs, le gestionnaire de tâches et le dashboard KPIs.

**Architecture:** Même pattern que Plan 2. PDF généré server-side via @react-pdf/renderer dans une API Route. Dashboard KPIs agrégés en une seule API Route.

**Tech Stack:** @react-pdf/renderer, Prisma, Zod, TanStack Query, shadcn/ui

---

## Fichiers créés dans ce plan

```
app/
  (dashboard)/
    invoices/
      page.tsx
      [id]/page.tsx
    treasury/
      page.tsx
    todos/
      page.tsx
    page.tsx                         # Dashboard KPIs (remplace placeholder)
app/api/
  invoices/
    route.ts
    [id]/
      route.ts
      pdf/route.ts
      payments/route.ts
  treasury/
    cash/route.ts
  suppliers/
    route.ts
    [id]/purchases/route.ts
  todos/
    route.ts
    [id]/route.ts
  dashboard/
    kpis/route.ts
components/
  invoices/
    InvoiceList.tsx
    InvoiceDetail.tsx
    PaymentForm.tsx
    InvoicePDF.tsx                   # Template @react-pdf
  treasury/
    CashJournal.tsx
    CashEntryForm.tsx
    SuppliersTable.tsx
  todos/
    TodoList.tsx
    TodoForm.tsx
  dashboard/
    KpiCard.tsx
    DashboardKpis.tsx
    DeadlinesWidget.tsx
    UnpaidWidget.tsx
lib/
  validators/
    invoice.ts
    cash.ts
    todo.ts
  calculations/
    invoice-number.ts                # Numérotation PR-NNN/YYYY
```

---

## Task 1 : Numérotation factures + validateurs

**Files:**
- Create: `lib/calculations/invoice-number.ts`, `lib/validators/invoice.ts`, `lib/validators/cash.ts`, `lib/validators/todo.ts`

- [ ] **Écrire les tests**

```typescript
// lib/calculations/__tests__/invoice-number.test.ts
import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber, parseInvoiceYear } from '../invoice-number'

describe('formatInvoiceNumber', () => {
  it('formats with PR prefix, sequence padded to 3, and year', () => {
    expect(formatInvoiceNumber(2026, 16)).toBe('PR-016/2026')
  })

  it('pads single digit to 3', () => {
    expect(formatInvoiceNumber(2026, 1)).toBe('PR-001/2026')
  })
})

describe('parseInvoiceYear', () => {
  it('extracts year from invoice number', () => {
    expect(parseInvoiceYear('PR-016/2026')).toBe(2026)
  })
})
```

- [ ] **Lancer les tests — doivent échouer**

```bash
npx vitest run lib/calculations/__tests__/invoice-number.test.ts
```

- [ ] **Implémenter `lib/calculations/invoice-number.ts`**

```typescript
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `PR-${String(sequence).padStart(3, '0')}/${year}`
}

export function parseInvoiceYear(number: string): number {
  const match = number.match(/\/(\d{4})$/)
  return match ? parseInt(match[1]) : new Date().getFullYear()
}
```

- [ ] **Relancer les tests**

```bash
npx vitest run lib/calculations/__tests__/invoice-number.test.ts
```

Attendu : 3/3 PASS

- [ ] **Implémenter `lib/validators/invoice.ts`**

```typescript
import { z } from 'zod'

export const createInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  applyStampDuty: z.boolean().default(false),
  notes: z.string().optional(),
})

export const paymentSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive('Le montant doit être positif'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_PAYMENT']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
```

- [ ] **Implémenter `lib/validators/cash.ts`**

```typescript
import { z } from 'zod'

export const cashEntrySchema = z.object({
  date: z.string().datetime(),
  label: z.string().min(1, 'Libellé requis'),
  amount: z.number().positive('Le montant doit être positif'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().optional(),
  reference: z.string().optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  ice: z.string().optional(),
  notes: z.string().optional(),
})

export const supplierPurchaseSchema = z.object({
  date: z.string().datetime(),
  invoiceNumber: z.string().optional(),
  description: z.string().min(1, 'Description requise'),
  amountHT: z.number().positive(),
  tvaRate: z.number().min(0).max(1).default(0.20),
  stamps: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_PAYMENT']).optional(),
  paymentDate: z.string().datetime().optional().or(z.literal('')),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional(),
})

export type CashEntryInput = z.infer<typeof cashEntrySchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type SupplierPurchaseInput = z.infer<typeof supplierPurchaseSchema>
```

- [ ] **Implémenter `lib/validators/todo.ts`**

```typescript
import { z } from 'zod'

export const todoSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).default('TODO'),
  ownerId: z.string().uuid().optional().or(z.literal('')),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
})

export type TodoInput = z.infer<typeof todoSchema>
```

- [ ] **Commit**

```bash
git add lib/calculations/invoice-number.ts lib/calculations/__tests__/invoice-number.test.ts lib/validators/invoice.ts lib/validators/cash.ts lib/validators/todo.ts
git commit -m "feat: add invoice numbering, and validators for invoices, cash, todos"
```

---

## Task 2 : Template PDF facture

**Files:**
- Create: `components/invoices/InvoicePDF.tsx`

- [ ] **Créer `components/invoices/InvoicePDF.tsx`**

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  companyInfo: { fontSize: 9, color: '#64748b', marginTop: 4, lineHeight: 1.5 },
  invoiceTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  invoiceNumber: { fontSize: 11, color: '#64748b', textAlign: 'right', marginTop: 4 },
  invoiceDate: { fontSize: 9, color: '#64748b', textAlign: 'right', marginTop: 2 },
  clientSection: { marginBottom: 24, padding: 12, backgroundColor: '#f8fafc' },
  clientLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  clientInfo: { fontSize: 9, color: '#475569', marginTop: 2, lineHeight: 1.5 },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', padding: '6 8', borderRadius: 2 },
  tableHeaderText: { color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowAlt: { flexDirection: 'row', padding: '6 8', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  colDesignation: { flex: 4 },
  colSizes: { flex: 2, textAlign: 'center' },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalsBox: { width: 200 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { color: '#64748b', fontSize: 9 },
  totalsValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalsTTCRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1.5, borderTopColor: '#0f172a', marginTop: 4 },
  totalsTTCLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalsTTCValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  paymentSection: { marginTop: 24, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 4 },
  paymentLabel: { fontSize: 9, color: '#166534', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  paymentInfo: { fontSize: 9, color: '#15803d' },
})

function formatMAD(amount: number) {
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' MAD'
}

interface InvoicePDFProps {
  invoice: {
    number: string
    issueDate: string
    dueDate?: string | null
    totalHT: number
    tvaRate: number
    tvaAmount: number
    stampDuty: number
    totalTTC: number
    notes?: string | null
    client: {
      company?: string | null
      firstName?: string | null
      lastName?: string | null
      address?: string | null
      city?: string | null
      ice?: string | null
      tvaNumber?: string | null
    }
    order?: {
      items: {
        designation: string
        sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeTU: number
        quantity: number
        unitPrice: number
        totalPrice: number
      }[]
    } | null
  }
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const clientName = invoice.client.company ||
    [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(' ')

  const sizes = (item: InvoicePDFProps['invoice']['order']['items'][0]) => {
    const parts = []
    if (item.sizeS) parts.push(`S:${item.sizeS}`)
    if (item.sizeM) parts.push(`M:${item.sizeM}`)
    if (item.sizeL) parts.push(`L:${item.sizeL}`)
    if (item.sizeXL) parts.push(`XL:${item.sizeXL}`)
    if (item.sizeTU) parts.push(`TU:${item.sizeTU}`)
    return parts.join(' ') || '—'
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>FAIRWEAR MANUFACTURE</Text>
            <Text style={styles.companyInfo}>
              Atelier de confection{'\n'}
              Agadir, Maroc{'\n'}
              contact@fairwear.ma
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
            <Text style={styles.invoiceDate}>
              Le {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}
            </Text>
            {invoice.dueDate && (
              <Text style={styles.invoiceDate}>
                Échéance : {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}
              </Text>
            )}
          </View>
        </View>

        {/* Client */}
        <View style={styles.clientSection}>
          <Text style={styles.clientLabel}>Facturé à</Text>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.clientInfo}>
            {[invoice.client.address, invoice.client.city].filter(Boolean).join(', ')}
            {invoice.client.ice ? `\nICE : ${invoice.client.ice}` : ''}
          </Text>
        </View>

        {/* Tableau des lignes */}
        {invoice.order?.items && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDesignation]}>Désignation</Text>
              <Text style={[styles.tableHeaderText, styles.colSizes]}>Tailles</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Prix unit.</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
            </View>
            {invoice.order.items.map((item, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.colDesignation}>{item.designation}</Text>
                <Text style={[styles.colSizes, { fontSize: 8 }]}>{sizes(item)}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatMAD(item.unitPrice)}</Text>
                <Text style={styles.colTotal}>{formatMAD(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Totaux */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total HT</Text>
              <Text style={styles.totalsValue}>{formatMAD(invoice.totalHT)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA {Math.round(Number(invoice.tvaRate) * 100)}%</Text>
              <Text style={styles.totalsValue}>{formatMAD(invoice.tvaAmount)}</Text>
            </View>
            {Number(invoice.stampDuty) > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Timbre fiscal</Text>
                <Text style={styles.totalsValue}>{formatMAD(invoice.stampDuty)}</Text>
              </View>
            )}
            <View style={styles.totalsTTCRow}>
              <Text style={styles.totalsTTCLabel}>Total TTC</Text>
              <Text style={styles.totalsTTCValue}>{formatMAD(invoice.totalTTC)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 9, color: '#475569' }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Pied de page */}
        <Text style={styles.footer}>
          Fairwear Manufacture — Agadir, Maroc — Merci pour votre confiance
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Commit**

```bash
git add components/invoices/InvoicePDF.tsx
git commit -m "feat: add invoice PDF template with react-pdf"
```

---

## Task 3 : API Routes facturation

**Files:**
- Create: `app/api/invoices/route.ts`, `app/api/invoices/[id]/route.ts`, `app/api/invoices/[id]/pdf/route.ts`, `app/api/invoices/[id]/payments/route.ts`

- [ ] **Créer `app/api/invoices/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoiceSchema } from '@/lib/validators/invoice'
import { calculateTVA, calculateStampDuty } from '@/lib/calculations/invoice'
import { formatInvoiceNumber } from '@/lib/calculations/invoice-number'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined

  const invoices = await prisma.invoice.findMany({
    where: { ...(status && { status: status as any }) },
    orderBy: { issueDate: 'desc' },
    include: {
      client: { select: { id: true, company: true, firstName: true, lastName: true } },
      payments: true,
    },
  })

  return NextResponse.json(invoices)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orderId, dueDate, applyStampDuty, notes } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { client: true },
  })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.invoice) return NextResponse.json({ error: 'Une facture existe déjà pour cette commande' }, { status: 400 })

  const totalHT = Number(order.totalHT)
  const tvaRate = 0.20
  const tvaAmount = calculateTVA(totalHT, tvaRate)
  const totalTTCBeforeStamp = totalHT + tvaAmount
  const stampDuty = applyStampDuty ? calculateStampDuty(totalTTCBeforeStamp) : 0
  const totalTTC = Math.round((totalTTCBeforeStamp + stampDuty) * 100) / 100

  // Numérotation séquentielle par année
  const year = new Date().getFullYear()
  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { endsWith: `/${year}` } },
    orderBy: { number: 'desc' },
  })
  const lastSeq = lastInvoice
    ? parseInt(lastInvoice.number.replace(`PR-`, '').split('/')[0])
    : 0
  const number = formatInvoiceNumber(year, lastSeq + 1)

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        number,
        clientId: order.clientId,
        orderId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        totalHT,
        tvaRate,
        tvaAmount,
        stampDuty,
        totalTTC,
        notes,
      },
    })
    await tx.order.update({ where: { id: orderId }, data: { status: 'INVOICED' } })
    return inv
  })

  return NextResponse.json(invoice, { status: 201 })
}
```

- [ ] **Créer `app/api/invoices/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      order: { include: { items: true } },
      payments: { orderBy: { date: 'asc' } },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Seul le marquage comptable est modifiable ici
  if (typeof body.accountingExported === 'boolean') {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        accountingExported: body.accountingExported,
        accountingExportedAt: body.accountingExported ? new Date() : null,
      },
    })
    return NextResponse.json(invoice)
  }

  return NextResponse.json({ error: 'Modification non autorisée' }, { status: 400 })
}
```

- [ ] **Créer `app/api/invoices/[id]/payments/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { paymentSchema } from '@/lib/validators/invoice'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  })
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const payment = await prisma.payment.create({
    data: {
      invoiceId: id,
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
    },
  })

  // Recalculer le statut de la facture
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + parsed.data.amount
  const totalTTC = Number(invoice.totalTTC)
  const newStatus = totalPaid >= totalTTC ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING'

  await prisma.$transaction([
    prisma.invoice.update({ where: { id }, data: { status: newStatus } }),
    ...(newStatus === 'PAID'
      ? [prisma.order.updateMany({ where: { id: invoice.orderId ?? '' }, data: { status: 'PAID' } })]
      : []),
  ])

  return NextResponse.json(payment, { status: 201 })
}
```

- [ ] **Créer `app/api/invoices/[id]/pdf/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/components/invoices/InvoicePDF'
import React from 'react'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      order: { include: { items: true } },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const buffer = await renderToBuffer(
    React.createElement(InvoicePDF, {
      invoice: {
        ...invoice,
        totalHT: Number(invoice.totalHT),
        tvaRate: Number(invoice.tvaRate),
        tvaAmount: Number(invoice.tvaAmount),
        stampDuty: Number(invoice.stampDuty),
        totalTTC: Number(invoice.totalTTC),
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        order: invoice.order
          ? {
              items: invoice.order.items.map((item) => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
              })),
            }
          : null,
      },
    })
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number.replace('/', '-')}.pdf"`,
    },
  })
}
```

- [ ] **Commit**

```bash
git add app/api/invoices/
git commit -m "feat: add invoices API routes with PDF generation and payment tracking"
```

---

## Task 4 : Pages facturation (UI)

**Files:**
- Create: `components/invoices/InvoiceList.tsx`, `components/invoices/InvoiceDetail.tsx`, `components/invoices/PaymentForm.tsx`, `app/(dashboard)/invoices/page.tsx`, `app/(dashboard)/invoices/[id]/page.tsx`

- [ ] **Créer `components/invoices/PaymentForm.tsx`**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { paymentSchema, type PaymentInput } from '@/lib/validators/invoice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PAYMENT_METHOD_LABELS } from '@/types'

interface PaymentFormProps {
  invoiceId: string
  remainingAmount: number
  onSuccess?: () => void
}

export function PaymentForm({ invoiceId, remainingAmount, onSuccess }: PaymentFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString(),
      amount: remainingAmount,
      method: 'CASH',
    },
  })

  async function onSubmit(data: PaymentInput) {
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      form.setError('root', { message: 'Erreur lors de l\'enregistrement' })
      return
    }
    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    form.reset()
    onSuccess?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem>
              <FormLabel>Date du règlement</FormLabel>
              <FormControl>
                <Input type="date" value={field.value ? field.value.split('T')[0] : ''}
                  onChange={e => field.onChange(new Date(e.target.value).toISOString())} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant (MAD)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="method" render={({ field }) => (
            <FormItem>
              <FormLabel>Mode de règlement</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="reference" render={({ field }) => (
            <FormItem>
              <FormLabel>Référence (virement…)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer le paiement'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Créer `app/(dashboard)/invoices/page.tsx`**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { INVOICE_STATUS_LABELS } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CheckCircle } from 'lucide-react'

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'info'> = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'info',
  OVERDUE: 'danger',
  DRAFT: 'muted',
  CANCELLED: 'muted',
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const exportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountingExported: true }),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  function totalPaid(invoice: any) {
    return invoice.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) ?? 0
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Factures</h1>
      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead className="text-right">Réglé</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.map((invoice: any) => {
                const paid = totalPaid(invoice)
                const remaining = Number(invoice.totalTTC) - paid
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {invoice.client?.company || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(' ')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]}
                        variant={statusVariants[invoice.status] ?? 'muted'}
                      />
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right"><CurrencyDisplay amount={invoice.totalTTC} /></TableCell>
                    <TableCell className="text-right text-green-700"><CurrencyDisplay amount={paid} /></TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {remaining > 0 ? <CurrencyDisplay amount={remaining} /> : '—'}
                    </TableCell>
                    <TableCell>
                      {!invoice.accountingExported && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportMutation.mutate(invoice.id)}
                          title="Marquer transmis comptable"
                        >
                          <CheckCircle size={16} />
                        </Button>
                      )}
                      {invoice.accountingExported && (
                        <span className="text-xs text-green-600">✓ Comptable</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Créer `app/(dashboard)/invoices/[id]/page.tsx`**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { PaymentForm } from '@/components/invoices/PaymentForm'
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Plus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`)
      if (!res.ok) throw new Error('Facture introuvable')
      return res.json()
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!invoice) return <div className="text-red-600">Facture introuvable</div>

  const totalPaid = invoice.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) ?? 0
  const remaining = Number(invoice.totalTTC) - totalPaid
  const clientName = invoice.client?.company || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <p className="text-slate-500">{clientName}</p>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge label={INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]} variant="info" />
          <Button variant="outline" asChild>
            <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download size={16} className="mr-2" />Télécharger PDF
            </a>
          </Button>
          {remaining > 0 && (
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button><Plus size={16} className="mr-2" />Enregistrer un paiement</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
                <PaymentForm invoiceId={id} remainingAmount={remaining} onSuccess={() => setPaymentOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Récapitulatif</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Total HT</span><CurrencyDisplay amount={invoice.totalHT} /></div>
            <div className="flex justify-between"><span className="text-slate-500">TVA {Math.round(Number(invoice.tvaRate) * 100)}%</span><CurrencyDisplay amount={invoice.tvaAmount} /></div>
            {Number(invoice.stampDuty) > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Timbre</span><CurrencyDisplay amount={invoice.stampDuty} /></div>
            )}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total TTC</span><CurrencyDisplay amount={invoice.totalTTC} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Règlements</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between text-green-700"><span>Réglé</span><CurrencyDisplay amount={totalPaid} /></div>
            <div className="flex justify-between font-bold text-red-600 border-t pt-2"><span>Reste à payer</span><CurrencyDisplay amount={Math.max(0, remaining)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Dates</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-slate-500">Émise le</span><p>{format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}</p></div>
            {invoice.dueDate && <div><span className="text-slate-500">Échéance</span><p>{format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}</p></div>}
          </CardContent>
        </Card>
      </div>

      {invoice.payments?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historique des paiements</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Date</th><th className="text-left pb-2">Mode</th><th className="text-left pb-2">Référence</th><th className="text-right pb-2">Montant</th></tr></thead>
              <tbody>
                {invoice.payments.map((payment: any) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="py-2">{format(new Date(payment.date), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td>{PAYMENT_METHOD_LABELS[payment.method as keyof typeof PAYMENT_METHOD_LABELS]}</td>
                    <td className="text-slate-500">{payment.reference || '—'}</td>
                    <td className="text-right font-medium"><CurrencyDisplay amount={payment.amount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Tester manuellement**

Créer une facture depuis une commande confirmée → télécharger le PDF → enregistrer un paiement partiel → vérifier le statut PARTIAL → enregistrer le solde → vérifier PAID.

- [ ] **Commit**

```bash
git add components/invoices/ app/\(dashboard\)/invoices/
git commit -m "feat: complete S4 - invoices with PDF generation and payment tracking"
```

---

## Task 5 : API Routes trésorerie

**Files:**
- Create: `app/api/treasury/cash/route.ts`, `app/api/suppliers/route.ts`, `app/api/suppliers/[id]/purchases/route.ts`

- [ ] **Créer `app/api/treasury/cash/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cashEntrySchema } from '@/lib/validators/cash'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const entries = await prisma.cashEntry.findMany({
    where: {
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = cashEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  // Calculer le nouveau solde
  const lastEntry = await prisma.cashEntry.findFirst({ orderBy: { date: 'desc' } })
  const previousBalance = lastEntry ? Number(lastEntry.balance) : 0
  const delta = parsed.data.type === 'INCOME' ? parsed.data.amount : -parsed.data.amount
  const balance = Math.round((previousBalance + delta) * 100) / 100

  const entry = await prisma.cashEntry.create({
    data: {
      date: new Date(parsed.data.date),
      label: parsed.data.label,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      reference: parsed.data.reference,
      balance,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
```

- [ ] **Créer `app/api/suppliers/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supplierSchema } from '@/lib/validators/cash'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchases: true } } },
  })
  return NextResponse.json(suppliers)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = supplierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }
  const supplier = await prisma.supplier.create({ data: parsed.data })
  return NextResponse.json(supplier, { status: 201 })
}
```

- [ ] **Créer `app/api/suppliers/[id]/purchases/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supplierPurchaseSchema } from '@/lib/validators/cash'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const purchases = await prisma.supplierPurchase.findMany({
    where: { supplierId: id },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(purchases)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = supplierPurchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tvaRate, amountHT, stamps } = parsed.data
  const tvaAmount = Math.round(amountHT * tvaRate * 100) / 100
  const totalTTC = Math.round((amountHT + tvaAmount + (stamps ?? 0)) * 100) / 100

  const purchase = await prisma.supplierPurchase.create({
    data: {
      supplierId: id,
      date: new Date(parsed.data.date),
      invoiceNumber: parsed.data.invoiceNumber,
      description: parsed.data.description,
      amountHT,
      tvaRate,
      tvaAmount,
      totalTTC,
      stamps: stamps ?? 0,
      paymentMethod: parsed.data.paymentMethod,
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : undefined,
      amountPaid: parsed.data.amountPaid ?? 0,
      notes: parsed.data.notes,
    },
  })

  return NextResponse.json(purchase, { status: 201 })
}
```

- [ ] **Commit**

```bash
git add app/api/treasury/ app/api/suppliers/
git commit -m "feat: add treasury cash journal and suppliers API routes"
```

---

## Task 6 : Page Trésorerie (UI)

**Files:**
- Create: `app/(dashboard)/treasury/page.tsx`

- [ ] **Créer `app/(dashboard)/treasury/page.tsx`**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cashEntrySchema, type CashEntryInput } from '@/lib/validators/cash'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'

export default function TreasuryPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: entries, isLoading } = useQuery({
    queryKey: ['cash'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/cash')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const form = useForm<CashEntryInput>({
    resolver: zodResolver(cashEntrySchema),
    defaultValues: {
      date: new Date().toISOString(),
      type: 'INCOME',
      amount: 0,
      label: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CashEntryInput) => {
      const res = await fetch('/api/treasury/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash'] })
      form.reset()
      setOpen(false)
    },
  })

  const currentBalance = entries?.length > 0 ? Number(entries[entries.length - 1].balance) : 0
  const totalIncome = entries?.filter((e: any) => e.type === 'INCOME').reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0
  const totalExpense = entries?.filter((e: any) => e.type === 'EXPENSE').reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trésorerie</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-2" />Nouvelle opération</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle opération de caisse</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value?.split('T')[0]}
                        onChange={e => field.onChange(new Date(e.target.value).toISOString())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="INCOME">Recette</SelectItem>
                        <SelectItem value="EXPENSE">Dépense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl><Input {...field} placeholder="Règlement facture PR-001/2026" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (MAD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie (optionnel)</FormLabel>
                    <FormControl><Input {...field} placeholder="Loyer, Fournitures…" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Solde actuel</p>
            <p className={`text-2xl font-bold mt-1 ${currentBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              <CurrencyDisplay amount={currentBalance} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 flex items-center gap-1"><TrendingUp size={14} className="text-green-600" />Total recettes</p>
            <p className="text-2xl font-bold mt-1 text-green-700"><CurrencyDisplay amount={totalIncome} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 flex items-center gap-1"><TrendingDown size={14} className="text-red-500" />Total dépenses</p>
            <p className="text-2xl font-bold mt-1 text-red-600"><CurrencyDisplay amount={totalExpense} /></p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Recette</TableHead>
                <TableHead className="text-right">Dépense</TableHead>
                <TableHead className="text-right">Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...entries].reverse().map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-slate-500">{format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell>{entry.label}</TableCell>
                  <TableCell className="text-slate-500">{entry.category || '—'}</TableCell>
                  <TableCell className="text-right text-green-700">
                    {entry.type === 'INCOME' ? <CurrencyDisplay amount={entry.amount} /> : '—'}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {entry.type === 'EXPENSE' ? <CurrencyDisplay amount={entry.amount} /> : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <CurrencyDisplay amount={entry.balance} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Tester manuellement**

Naviguer vers /treasury → ajouter une recette → ajouter une dépense → vérifier le solde calculé correctement.

- [ ] **Commit**

```bash
git add app/\(dashboard\)/treasury/
git commit -m "feat: complete S5 - cash journal with real-time balance"
```

---

## Task 7 : API Routes todos + dashboard KPIs

**Files:**
- Create: `app/api/todos/route.ts`, `app/api/todos/[id]/route.ts`, `app/api/dashboard/kpis/route.ts`

- [ ] **Créer `app/api/todos/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todoSchema } from '@/lib/validators/todo'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const todos = await prisma.todo.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { owner: { select: { id: true, name: true } } },
  })
  return NextResponse.json(todos)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = todoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const todo = await prisma.todo.create({
    data: {
      title: parsed.data.title,
      status: parsed.data.status,
      ownerId: parsed.data.ownerId || undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      notes: parsed.data.notes,
    },
  })
  return NextResponse.json(todo, { status: 201 })
}
```

- [ ] **Créer `app/api/todos/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todoSchema } from '@/lib/validators/todo'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = todoSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const todo = await prisma.todo.update({
    where: { id },
    data: {
      ...(parsed.data.title && { title: parsed.data.title }),
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
    },
  })
  return NextResponse.json(todo)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  await prisma.todo.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Créer `app/api/dashboard/kpis/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const overdueThreshold = subDays(now, 30)

  const [
    monthPayments,
    pendingInvoices,
    activeOrders,
    upcomingDeadlines,
    overdueInvoices,
    recentOrders,
    activeTodos,
  ] = await Promise.all([
    // CA du mois (paiements reçus)
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    // Factures en attente
    prisma.invoice.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL'] } },
      include: { payments: true },
    }),
    // Commandes actives en production
    prisma.order.count({
      where: { status: { in: ['CONFIRMED', 'SOURCING', 'STUDY', 'PRODUCTION', 'READY'] } },
    }),
    // Deadlines dans 7 jours
    prisma.order.findMany({
      where: {
        deadline: { gte: now, lte: in7Days },
        status: { notIn: ['DELIVERED', 'INVOICED', 'PAID', 'CANCELLED'] },
      },
      include: { client: { select: { company: true, firstName: true, lastName: true } } },
      orderBy: { deadline: 'asc' },
    }),
    // Factures impayées depuis +30 jours
    prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        issueDate: { lte: overdueThreshold },
      },
      include: {
        client: { select: { company: true, firstName: true, lastName: true } },
        payments: true,
      },
    }),
    // 5 dernières commandes
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { company: true, firstName: true, lastName: true } } },
    }),
    // Tâches actives
    prisma.todo.count({
      where: { status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } },
    }),
  ])

  const caMonth = Number(monthPayments._sum.amount ?? 0)

  const pendingTotal = pendingInvoices.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
    return sum + Number(inv.totalTTC) - paid
  }, 0)

  return NextResponse.json({
    caMonth,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoicesTotal: pendingTotal,
    activeOrdersCount: activeOrders,
    activeTodosCount: activeTodos,
    upcomingDeadlines,
    overdueInvoices,
    recentOrders,
  })
}
```

- [ ] **Commit**

```bash
git add app/api/todos/ app/api/dashboard/
git commit -m "feat: add todos API and dashboard KPIs aggregation route"
```

---

## Task 8 : Page Tâches + Dashboard (UI)

**Files:**
- Create: `app/(dashboard)/todos/page.tsx`, `app/(dashboard)/page.tsx` (remplace placeholder)

- [ ] **Créer `app/(dashboard)/todos/page.tsx`**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { todoSchema, type TodoInput } from '@/lib/validators/todo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { TODO_STATUS_LABELS } from '@/types'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const statusVariants: Record<string, 'info' | 'warning' | 'danger' | 'success' | 'muted'> = {
  TODO: 'muted',
  IN_PROGRESS: 'info',
  BLOCKED: 'danger',
  DONE: 'success',
}

export default function TodosPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const form = useForm<TodoInput>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', status: 'TODO' },
  })

  const createMutation = useMutation({
    mutationFn: async (data: TodoInput) => {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      form.reset()
      setOpen(false)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  const statusOrder = ['BLOCKED', 'IN_PROGRESS', 'TODO', 'DONE']
  const sorted = todos ? [...todos].sort((a: any, b: any) =>
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  ) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tâches</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-2" />Nouvelle tâche</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl><Input {...field} placeholder="Relancer le client Paradoxal" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(TODO_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date limite (optionnel)</FormLabel>
                    <FormControl>
                      <Input type="date"
                        value={field.value ? field.value.split('T')[0] : ''}
                        onChange={e => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Création…' : 'Créer'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="space-y-2">
          {sorted.map((todo: any) => (
            <Card key={todo.id} className={todo.status === 'DONE' ? 'opacity-60' : ''}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge label={TODO_STATUS_LABELS[todo.status as keyof typeof TODO_STATUS_LABELS]} variant={statusVariants[todo.status]} />
                  <div>
                    <p className={`font-medium ${todo.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>{todo.title}</p>
                    {todo.dueDate && (
                      <p className="text-xs text-slate-400">
                        Échéance : {format(new Date(todo.dueDate), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
                <Select
                  value={todo.status}
                  onValueChange={(status) => updateStatusMutation.mutate({ id: todo.id, status })}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TODO_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
          {sorted.length === 0 && (
            <p className="text-slate-400 text-center py-8">Aucune tâche</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Remplacer `app/(dashboard)/page.tsx`** par le dashboard complet

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ORDER_STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TrendingUp, Clock, AlertTriangle, CheckSquare, ShoppingBag, FileText } from 'lucide-react'

export default function DashboardPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  if (isLoading) return <div className="text-slate-500">Chargement du tableau de bord…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp size={14} className="text-green-600" />CA du mois
            </div>
            <p className="text-2xl font-bold"><CurrencyDisplay amount={kpis?.caMonth ?? 0} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <FileText size={14} className="text-orange-500" />Factures en attente
            </div>
            <p className="text-2xl font-bold">{kpis?.pendingInvoicesCount ?? 0}</p>
            <p className="text-sm text-slate-500 mt-1">
              <CurrencyDisplay amount={kpis?.pendingInvoicesTotal ?? 0} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <ShoppingBag size={14} className="text-blue-500" />Commandes actives
            </div>
            <p className="text-2xl font-bold">{kpis?.activeOrdersCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <CheckSquare size={14} className="text-purple-500" />Tâches en cours
            </div>
            <p className="text-2xl font-bold">{kpis?.activeTodosCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Deadlines proches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />Deadlines dans 7 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis?.upcomingDeadlines?.length === 0 && (
              <p className="text-slate-400 text-sm">Aucune deadline imminente</p>
            )}
            {kpis?.upcomingDeadlines?.map((order: any) => {
              const daysLeft = differenceInDays(new Date(order.deadline), new Date())
              const clientName = order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')
              return (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-medium text-sm hover:underline">{order.reference}</Link>
                    <p className="text-xs text-slate-500">{clientName}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    J-{daysLeft}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Impayés +30 jours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />Impayés +30 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis?.overdueInvoices?.length === 0 && (
              <p className="text-slate-400 text-sm">Aucun impayé en retard</p>
            )}
            {kpis?.overdueInvoices?.map((invoice: any) => {
              const paid = invoice.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0
              const remaining = Number(invoice.totalTTC) - paid
              const clientName = invoice.client?.company || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(' ')
              return (
                <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link href={`/invoices/${invoice.id}`} className="font-medium text-sm hover:underline">{invoice.number}</Link>
                    <p className="text-xs text-slate-500">{clientName}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600"><CurrencyDisplay amount={remaining} /></span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Dernières commandes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dernières commandes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Référence</th><th className="text-left pb-2">Client</th><th className="text-left pb-2">Statut</th><th className="text-left pb-2">Date</th><th className="text-right pb-2">Total TTC</th></tr></thead>
            <tbody>
              {kpis?.recentOrders?.map((order: any) => {
                const clientName = order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')
                return (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2"><Link href={`/orders/${order.id}`} className="hover:underline font-medium">{order.reference}</Link></td>
                    <td className="text-slate-600">{clientName}</td>
                    <td><StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="muted" /></td>
                    <td className="text-slate-500">{format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td className="text-right"><CurrencyDisplay amount={order.totalTTC} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Tester manuellement**

Naviguer vers / → vérifier les 4 KPI cards → vérifier les widgets deadlines et impayés → naviguer vers /todos → créer une tâche → changer son statut.

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```

Attendu : tous les tests passent.

- [ ] **Commit**

```bash
git add app/\(dashboard\)/todos/ app/\(dashboard\)/page.tsx
git commit -m "feat: complete S6 - todos and dashboard KPIs"
```

---

## Task 9 : Build final et vérification

- [ ] **Vérifier le build TypeScript sans erreur**

```bash
npm run build
```

Attendu : compilation réussie, aucune erreur TypeScript.

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```

Attendu : tous les tests passent.

- [ ] **Vérifier le déploiement Vercel**

```bash
# Si Vercel CLI installé
vercel --prod
```

Ou pousser sur la branche main et vérifier le déploiement automatique.

- [ ] **Checklist finale Phase 1**

```
□ Login sécurisé (Supabase Auth) fonctionnel
□ CRUD clients complet + mensurations
□ Création devis → numérotation DEVIS-2026-001
□ Confirmation devis → plan de production créé automatiquement
□ Génération facture PDF → numérotation PR-001/2026
□ Paiements partiels → reste à payer calculé automatiquement
□ Statut facture : PENDING → PARTIAL → PAID automatiquement
□ Journal de caisse avec solde en temps réel
□ Gestionnaire de tâches avec changement de statut en 1 clic
□ Dashboard : 4 KPIs + deadlines 7j + impayés +30j + 5 dernières commandes
□ npm run build sans erreur
□ npx vitest run : tous les tests passent
□ Déployé sur Vercel en HTTPS
```

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: Phase 1 MVP complete - all 6 modules implemented and tested"
```

---

**Phase 1 MVP terminée. Les prochaines étapes sont le Plan de Phase 2 (Production + RH) selon la roadmap du spec.**

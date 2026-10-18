import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { roundCurrencyAmount, roundExchangeRate } from '@/lib/exchange-rates'
import { paymentSchema } from '@/lib/validators/invoice'
import { createClient } from '@/lib/supabase/server'
import { deriveInvoiceStatus } from '@/lib/calculations/invoice-status'

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
    include: { payments: true, creditNotes: true, order: { select: { id: true } } },
  })
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const amount = roundCurrencyAmount(parsed.data.amount)
  const appliedAmount = roundCurrencyAmount(parsed.data.appliedAmount)
  const exchangeRate = roundExchangeRate(amount / appliedAmount)
  const totalPaid = invoice.payments.reduce((sum: number, p: { appliedAmount: unknown; amount: unknown }) => {
    const paidAmount = p.appliedAmount == null ? Number(p.amount) : Number(p.appliedAmount)
    return sum + paidAmount
  }, 0) + appliedAmount
  const totalCredited = invoice.creditNotes.reduce((sum, creditNote) => sum + Number(creditNote.totalTTC), 0)
  const totalTTC = Number(invoice.totalTTC)
  const roundedTotalPaid = roundCurrencyAmount(totalPaid)
  const newStatus = deriveInvoiceStatus(totalTTC, roundedTotalPaid, totalCredited, invoice.dueDate)

  const payment = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const createdPayment = await tx.payment.create({
      data: {
        invoiceId: id,
        date: new Date(parsed.data.date),
        amount,
        appliedAmount,
        currency: 'MAD',
        exchangeRate,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
      },
    })

    await tx.invoice.update({ where: { id }, data: { status: newStatus } })

    if (invoice.order?.id) {
      await tx.order.update({
        where: { id: invoice.order.id },
        data: { status: newStatus === 'PAID' ? 'PAID' : 'INVOICED' },
      })
    }

    return createdPayment
  })

  return NextResponse.json(payment, { status: 201 })
}

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

  const totalPaid = invoice.payments.reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0) + parsed.data.amount
  const totalTTC = Number(invoice.totalTTC)
  const newStatus = totalPaid >= totalTTC ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING'

  await prisma.$transaction([
    prisma.invoice.update({ where: { id }, data: { status: newStatus as any } }),
    ...(newStatus === 'PAID' && invoice.orderId
      ? [prisma.order.update({ where: { id: invoice.orderId }, data: { status: 'PAID' } })]
      : []),
  ])

  return NextResponse.json(payment, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { deriveInvoiceStatus } from '@/lib/calculations/invoice-status'
import { updateInvoiceSchema } from '@/lib/validators/invoice'

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
      creditNotes: {
        orderBy: { issueDate: 'asc' },
        include: { items: { orderBy: { designation: 'asc' } } },
      },
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

  const parsed = updateInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const currentInvoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      payments: true,
      creditNotes: true,
    },
  })

  if (!currentInvoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

  const totalApplied = currentInvoice.payments.reduce((sum, payment) => {
    return sum + Number(payment.appliedAmount ?? payment.amount)
  }, 0)
  const totalCredited = currentInvoice.creditNotes.reduce((sum, creditNote) => {
    return sum + Number(creditNote.totalTTC)
  }, 0)
  const nextDueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
  const nextStatus = currentInvoice.status === 'CANCELLED'
    ? 'CANCELLED'
    : deriveInvoiceStatus(Number(currentInvoice.totalTTC), totalApplied, totalCredited, nextDueDate)

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      issueDate: new Date(parsed.data.issueDate),
      dueDate: nextDueDate,
      notes: parsed.data.notes,
      status: nextStatus,
    },
  })

  return NextResponse.json(invoice)
}

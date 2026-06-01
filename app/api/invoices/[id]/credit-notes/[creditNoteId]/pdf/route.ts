import { NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { CreditNotePDF } from '@/components/invoices/CreditNotePDF'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; creditNoteId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, creditNoteId } = await params
  const creditNote = await prisma.creditNote.findFirst({
    where: {
      id: creditNoteId,
      invoiceId: id,
    },
    include: {
      items: true,
      invoice: {
        include: {
          client: true,
          order: { select: { currency: true } },
        },
      },
    },
  })

  if (!creditNote) return NextResponse.json({ error: 'Avoir introuvable' }, { status: 404 })

  const document = React.createElement(CreditNotePDF, {
    creditNote: {
      number: creditNote.number,
      issueDate: creditNote.issueDate.toISOString(),
      reason: creditNote.reason,
      notes: creditNote.notes,
      totalHT: Number(creditNote.totalHT),
      tvaRate: Number(creditNote.tvaRate),
      tvaAmount: Number(creditNote.tvaAmount),
      stampDuty: Number(creditNote.stampDuty),
      totalTTC: Number(creditNote.totalTTC),
      currency: (creditNote.invoice.order?.currency ?? 'MAD') as 'MAD' | 'EUR' | 'GBP' | 'USD',
      invoiceNumber: creditNote.invoice.number,
      client: {
        company: creditNote.invoice.client.company,
        firstName: creditNote.invoice.client.firstName,
        lastName: creditNote.invoice.client.lastName,
        address: creditNote.invoice.client.address,
        city: creditNote.invoice.client.city,
        ice: creditNote.invoice.client.ice,
      },
      items: creditNote.items.map((item) => ({
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    },
  })

  const buffer = await renderToBuffer(document as React.ReactElement<DocumentProps>)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${creditNote.number.replace('/', '-')}.pdf"`,
    },
  })
}

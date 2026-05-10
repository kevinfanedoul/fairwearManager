import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/components/invoices/InvoicePDF'
import React from 'react'

export const dynamic = 'force-dynamic'

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

  const buffer = await (renderToBuffer as any)(
    React.createElement(InvoicePDF as any, {
      invoice: {
        number: invoice.number,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        totalHT: Number(invoice.totalHT),
        tvaRate: Number(invoice.tvaRate),
        tvaAmount: Number(invoice.tvaAmount),
        stampDuty: Number(invoice.stampDuty),
        totalTTC: Number(invoice.totalTTC),
        notes: invoice.notes,
        client: {
          company: invoice.client.company,
          firstName: invoice.client.firstName,
          lastName: invoice.client.lastName,
          address: invoice.client.address,
          city: invoice.client.city,
          ice: invoice.client.ice,
        },
        order: invoice.order
          ? {
              items: invoice.order.items.map((item) => ({
                designation: item.designation,
                sizeS: item.sizeS,
                sizeM: item.sizeM,
                sizeL: item.sizeL,
                sizeXL: item.sizeXL,
                sizeTU: item.sizeTU,
                quantity: item.quantity,
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

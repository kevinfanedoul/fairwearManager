import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
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

  const document = React.createElement(InvoicePDF, {
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
      currency: (invoice.order?.currency ?? 'MAD') as 'MAD' | 'EUR' | 'GBP' | 'USD',
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
            type: invoice.order.type,
            currency: invoice.order.currency as 'MAD' | 'EUR' | 'GBP' | 'USD',
            items: invoice.order.items.map((item: { designation: string; sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeTU: number; quantity: number; unitPrice: unknown; totalPrice: unknown; patronage: unknown; proto: unknown; gradationSizes: unknown; gradationUnitPrice: unknown; gradationTotal: unknown; kind: 'BREAKDOWN' | 'FLAT'; flatPrice: unknown }) => ({
              designation: item.designation,
              sizeS: item.sizeS,
              sizeM: item.sizeM,
              sizeL: item.sizeL,
              sizeXL: item.sizeXL,
              sizeTU: item.sizeTU,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              patronage: item.patronage ? Number(item.patronage) : null,
              proto: item.proto ? Number(item.proto) : null,
              gradationSizes: item.gradationSizes ? Number(item.gradationSizes) : null,
              gradationUnitPrice: item.gradationUnitPrice ? Number(item.gradationUnitPrice) : null,
              gradationTotal: item.gradationTotal ? Number(item.gradationTotal) : null,
              kind: item.kind,
              flatPrice: item.flatPrice ? Number(item.flatPrice) : null,
            })),
          }
        : null,
    },
  })

  const buffer = await renderToBuffer(document as React.ReactElement<DocumentProps>)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number.replace('/', '-')}.pdf"`,
    },
  })
}

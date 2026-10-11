import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { OrderPDF } from '@/components/orders/OrderPDF'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
    },
  })

  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const buffer = await (renderToBuffer as any)(
    React.createElement(OrderPDF as any, {
      order: {
        reference: order.reference,
        type: order.type,
        orderDate: order.orderDate.toISOString(),
        deadline: order.deadline?.toISOString() ?? null,
        notes: order.notes,
        totalHT: Number(order.totalHT),
        totalTTC: Number(order.totalTTC),
        currency: order.currency as 'MAD' | 'EUR' | 'GBP' | 'USD',
        client: {
          company: order.client.company,
          firstName: order.client.firstName,
          lastName: order.client.lastName,
          address: order.client.address,
          city: order.client.city,
          ice: order.client.ice,
        },
        items: order.items.map((item) => ({
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
          gradationSizes: item.gradationSizes,
          gradationUnitPrice: item.gradationUnitPrice ? Number(item.gradationUnitPrice) : null,
          gradationTotal: item.gradationTotal ? Number(item.gradationTotal) : null,
        })),
      },
    })
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${order.reference.replaceAll('/', '-')}.pdf"`,
    },
  })
}

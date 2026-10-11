'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { OrderForm } from '@/components/orders/OrderForm'
import type { OrderInput } from '@/lib/validators/order'

type EditableOrder = {
  id: string
  status: string
  type: 'PRODUCT' | 'STUDY'
  clientId: string
  currency: 'MAD' | 'EUR' | 'GBP' | 'USD'
  deadline: string | null
  notes: string | null
  items: Array<{
    designation: string
    sizeS: number
    sizeM: number
    sizeL: number
    sizeXL: number
    sizeTU: number
    quantity: number
    unitPrice: number
    patronage: number | null
    proto: number | null
    gradationSizes: number | null
    gradationUnitPrice: number | null
    gradationTotal: number | null
    kind: 'BREAKDOWN' | 'FLAT'
    flatPrice: number | null
    notes?: string | null
  }>
}

function toOrderInput(order: EditableOrder): OrderInput {
  return {
    type: order.type,
    clientId: order.clientId,
    currency: order.currency,
    deadline: order.deadline ? order.deadline.split('T')[0] : '',
    notes: order.notes ?? '',
    items: order.items.map((item) => ({
      designation: item.designation,
      sizeS: item.sizeS,
      sizeM: item.sizeM,
      sizeL: item.sizeL,
      sizeXL: item.sizeXL,
      sizeTU: item.sizeTU,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      patronage: item.patronage != null ? Number(item.patronage) : undefined,
      proto: item.proto != null ? Number(item.proto) : undefined,
      gradationSizes: item.gradationSizes ?? undefined,
      gradationUnitPrice: item.gradationUnitPrice != null ? Number(item.gradationUnitPrice) : undefined,
      kind: item.kind ?? 'BREAKDOWN',
      flatPrice: item.flatPrice != null ? Number(item.flatPrice) : undefined,
      notes: item.notes ?? undefined,
    })),
  }
}

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>()

  const { data: order, isLoading } = useQuery<EditableOrder>({
    queryKey: ['order-edit', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`)
      if (!res.ok) throw new Error('Commande introuvable')
      return res.json() as Promise<EditableOrder>
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!order) return <div className="text-red-600">Commande introuvable</div>
  if (order.status !== 'QUOTE') return <div className="text-red-600">Seul un devis non confirmé peut être modifié.</div>

  return <OrderForm mode="edit" orderId={id} initialData={toOrderInput(order)} />
}

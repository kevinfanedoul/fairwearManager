'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { InvoiceEditForm } from '@/components/invoices/InvoiceEditForm'

type EditableInvoice = {
  id: string
  issueDate: string
  dueDate: string | null
  notes: string | null
  status: string
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>()

  const { data: invoice, isLoading } = useQuery<EditableInvoice>({
    queryKey: ['invoice-edit', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`)
      if (!res.ok) throw new Error('Facture introuvable')
      return res.json() as Promise<EditableInvoice>
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!invoice) return <div className="text-red-600">Facture introuvable</div>
  if (invoice.status === 'CANCELLED') return <div className="text-red-600">Une facture annulée ne peut pas être modifiée.</div>

  return (
    <InvoiceEditForm
      invoiceId={id}
      initialData={{
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate ?? '',
        notes: invoice.notes ?? '',
      }}
    />
  )
}

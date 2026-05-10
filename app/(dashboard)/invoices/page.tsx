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
                      {!invoice.accountingExported ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportMutation.mutate(invoice.id)}
                          title="Marquer transmis comptable"
                        >
                          <CheckCircle size={16} />
                        </Button>
                      ) : (
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

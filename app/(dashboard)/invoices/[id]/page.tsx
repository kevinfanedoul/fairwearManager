'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { PaymentForm } from '@/components/invoices/PaymentForm'
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`)
      if (!res.ok) throw new Error('Facture introuvable')
      return res.json()
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!invoice) return <div className="text-red-600">Facture introuvable</div>

  const totalPaid = invoice.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) ?? 0
  const remaining = Number(invoice.totalTTC) - totalPaid
  const clientName = invoice.client?.company || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <p className="text-slate-500">{clientName}</p>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge label={INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]} variant="info" />
          <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <Download size={16} className="mr-2" />Télécharger PDF
            </Button>
          </a>
          {remaining > 0 && (
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger>
                <Button><Plus size={16} className="mr-2" />Enregistrer un paiement</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
                <PaymentForm invoiceId={id} remainingAmount={remaining} onSuccess={() => setPaymentOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Récapitulatif</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Total HT</span><CurrencyDisplay amount={invoice.totalHT} /></div>
            <div className="flex justify-between"><span className="text-slate-500">TVA {Math.round(Number(invoice.tvaRate) * 100)}%</span><CurrencyDisplay amount={invoice.tvaAmount} /></div>
            {Number(invoice.stampDuty) > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Timbre</span><CurrencyDisplay amount={invoice.stampDuty} /></div>
            )}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total TTC</span><CurrencyDisplay amount={invoice.totalTTC} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Règlements</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between text-green-700"><span>Réglé</span><CurrencyDisplay amount={totalPaid} /></div>
            <div className="flex justify-between font-bold text-red-600 border-t pt-2"><span>Reste à payer</span><CurrencyDisplay amount={Math.max(0, remaining)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Dates</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-slate-500">Émise le</span><p>{format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}</p></div>
            {invoice.dueDate && <div><span className="text-slate-500">Échéance</span><p>{format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}</p></div>}
          </CardContent>
        </Card>
      </div>

      {invoice.payments?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historique des paiements</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Date</th><th className="text-left pb-2">Mode</th><th className="text-left pb-2">Référence</th><th className="text-right pb-2">Montant</th></tr></thead>
              <tbody>
                {invoice.payments.map((payment: any) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="py-2">{format(new Date(payment.date), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td>{PAYMENT_METHOD_LABELS[payment.method as keyof typeof PAYMENT_METHOD_LABELS]}</td>
                    <td className="text-slate-500">{payment.reference || '—'}</td>
                    <td className="text-right font-medium"><CurrencyDisplay amount={payment.amount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

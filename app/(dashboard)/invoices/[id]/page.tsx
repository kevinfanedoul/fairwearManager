'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { PaymentForm } from '@/components/invoices/PaymentForm'
import { CreditNoteForm } from '@/components/invoices/CreditNoteForm'
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Pencil, Plus, ReceiptText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type PaymentView = {
  id: string
  date: string
  amount: number
  appliedAmount: number | null
  exchangeRate: number
  currency: string
  method: keyof typeof PAYMENT_METHOD_LABELS
  reference: string | null
}

type InvoiceCurrency = 'MAD' | 'EUR' | 'GBP' | 'USD'

type CreditNoteItemView = {
  id: string
  orderItemId: string | null
  designation: string
  sizeS: number
  sizeM: number
  sizeL: number
  sizeXL: number
  sizeTU: number
  quantity: number
  unitPrice: number
  totalPrice: number
}

type CreditNoteView = {
  id: string
  number: string
  issueDate: string
  reason: string
  totalHT: number
  tvaAmount: number
  stampDuty: number
  totalTTC: number
  notes: string | null
  items: CreditNoteItemView[]
}

type OrderItemView = {
  id: string
  designation: string
  sizeS: number
  sizeM: number
  sizeL: number
  sizeXL: number
  sizeTU: number
  quantity: number
  unitPrice: number
}

type CreditableItemView = {
  orderItemId: string
  designation: string
  unitPrice: number
  maxQuantity: number
  maxSizeS: number
  maxSizeM: number
  maxSizeL: number
  maxSizeXL: number
  maxSizeTU: number
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [creditNoteOpen, setCreditNoteOpen] = useState(false)

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

  const totalPaidMad = invoice.payments?.reduce((sum: number, payment: PaymentView) => sum + Number(payment.amount), 0) ?? 0
  const totalApplied = invoice.payments?.reduce((sum: number, payment: PaymentView) => {
    return sum + Number(payment.appliedAmount ?? payment.amount)
  }, 0) ?? 0
  const totalCredited = invoice.creditNotes?.reduce((sum: number, creditNote: CreditNoteView) => {
    return sum + Number(creditNote.totalTTC)
  }, 0) ?? 0
  const remaining = Number(invoice.totalTTC) - totalApplied - totalCredited
  const clientName = invoice.client?.company || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(' ')
  const currency: InvoiceCurrency = invoice.order?.currency ?? 'MAD'
  const creditedByOrderItemId = new Map<string, { quantity: number; sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeTU: number }>()

  invoice.creditNotes?.forEach((creditNote: CreditNoteView) => {
    creditNote.items.forEach((item) => {
      if (!item.orderItemId) return
      const current = creditedByOrderItemId.get(item.orderItemId) ?? { quantity: 0, sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0 }
      creditedByOrderItemId.set(item.orderItemId, {
        quantity: current.quantity + item.quantity,
        sizeS: current.sizeS + item.sizeS,
        sizeM: current.sizeM + item.sizeM,
        sizeL: current.sizeL + item.sizeL,
        sizeXL: current.sizeXL + item.sizeXL,
        sizeTU: current.sizeTU + item.sizeTU,
      })
    })
  })

  const creditableItems: CreditableItemView[] = (invoice.order?.items ?? [])
    .map((item: OrderItemView) => {
      const credited = creditedByOrderItemId.get(item.id) ?? { quantity: 0, sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0 }
      return {
        orderItemId: item.id,
        designation: item.designation,
        unitPrice: Number(item.unitPrice),
        maxQuantity: item.quantity - credited.quantity,
        maxSizeS: item.sizeS - credited.sizeS,
        maxSizeM: item.sizeM - credited.sizeM,
        maxSizeL: item.sizeL - credited.sizeL,
        maxSizeXL: item.sizeXL - credited.sizeXL,
        maxSizeTU: item.sizeTU - credited.sizeTU,
      }
    })
    .filter((item: CreditableItemView) => item.maxQuantity > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <p className="text-slate-500">{clientName}</p>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge label={INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]} variant="info" />
          <Link href={`/invoices/${id}/edit`} className={buttonVariants({ variant: 'outline' })}>
            <Pencil size={16} className="mr-2" />Modifier
          </Link>
          <a
            href={`/api/invoices/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <Download size={16} className="mr-2" />Télécharger PDF
          </a>
          {invoice.order?.type !== 'STUDY' && (
            <Dialog open={creditNoteOpen} onOpenChange={setCreditNoteOpen}>
              <DialogTrigger
                render={<button className={buttonVariants({ variant: 'outline' })} />}
              >
                <ReceiptText size={16} className="mr-2" />Créer un avoir
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,72rem)] max-w-[min(96vw,72rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader><DialogTitle>Créer un avoir client</DialogTitle></DialogHeader>
                <CreditNoteForm
                  invoiceId={id}
                  currency={currency}
                  items={creditableItems}
                  onSuccess={() => setCreditNoteOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
          {remaining > 0 && (
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger
                render={<button className={buttonVariants({ variant: 'default' })} />}
              >
                <Plus size={16} className="mr-2" />Enregistrer un paiement
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
                <PaymentForm invoiceId={id} remainingAmount={remaining} invoiceTotalTTC={Number(invoice.totalTTC)} invoiceCurrency={currency} onSuccess={() => setPaymentOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Récapitulatif</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Total HT</span><CurrencyDisplay amount={invoice.totalHT} currency={currency} /></div>
            <div className="flex justify-between"><span className="text-slate-500">TVA {Math.round(Number(invoice.tvaRate) * 100)}%</span><CurrencyDisplay amount={invoice.tvaAmount} currency={currency} /></div>
            {Number(invoice.stampDuty) > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Timbre</span><CurrencyDisplay amount={invoice.stampDuty} currency={currency} /></div>
            )}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total TTC</span><CurrencyDisplay amount={invoice.totalTTC} currency={currency} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Règlements</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between text-green-700"><span>Encaissements</span><CurrencyDisplay amount={totalPaidMad} currency="MAD" /></div>
            {currency !== 'MAD' && (
              <div className="flex justify-between text-slate-600"><span>Appliqué à la facture</span><CurrencyDisplay amount={totalApplied} currency={currency} /></div>
            )}
            <div className="flex justify-between text-amber-700"><span>Avoirs émis</span><CurrencyDisplay amount={totalCredited} currency={currency} /></div>
            <div className="flex justify-between font-bold text-red-600 border-t pt-2"><span>Reste facture</span><CurrencyDisplay amount={Math.max(0, remaining)} currency={currency} /></div>
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
              <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Date</th><th className="text-left pb-2">Mode</th><th className="text-left pb-2">Référence</th><th className="text-right pb-2">Montant (MAD)</th><th className="text-right pb-2">Appliqué</th><th className="text-right pb-2">Taux</th></tr></thead>
              <tbody>
                {invoice.payments.map((payment: PaymentView) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="py-2">{format(new Date(payment.date), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td>{PAYMENT_METHOD_LABELS[payment.method as keyof typeof PAYMENT_METHOD_LABELS]}</td>
                    <td className="text-slate-500">{payment.reference || '—'}</td>
                    <td className="text-right font-medium"><CurrencyDisplay amount={payment.amount} currency="MAD" /></td>
                    <td className="text-right font-medium"><CurrencyDisplay amount={payment.appliedAmount ?? payment.amount} currency={currency} /></td>
                    <td className="text-right text-slate-500">{Number(payment.exchangeRate).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {invoice.creditNotes?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Avoirs clients</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {invoice.creditNotes.map((creditNote: CreditNoteView) => (
              <div key={creditNote.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{creditNote.number}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(creditNote.issueDate), 'dd/MM/yyyy', { locale: fr })} · {creditNote.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <a
                      href={`/api/invoices/${id}/credit-notes/${creditNote.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: 'outline', className: 'mb-2' })}
                    >
                      <Download size={14} className="mr-2" />Télécharger PDF
                    </a>
                    <p className="text-sm text-slate-500">Montant TTC</p>
                    <p className="font-semibold text-amber-700">
                      <CurrencyDisplay amount={creditNote.totalTTC} currency={currency} />
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2 pr-2">Désignation</th>
                        <th className="px-2 pb-2 text-center">Qté</th>
                        <th className="px-2 pb-2 text-right">PU</th>
                        <th className="px-2 pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditNote.items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2 pr-2">{item.designation}</td>
                          <td className="px-2 py-2 text-center">{item.quantity}</td>
                          <td className="px-2 py-2 text-right"><CurrencyDisplay amount={item.unitPrice} currency={currency} /></td>
                          <td className="px-2 py-2 text-right font-medium"><CurrencyDisplay amount={item.totalPrice} currency={currency} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {creditNote.notes && <p className="mt-3 text-sm text-slate-600">{creditNote.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

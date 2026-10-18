'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { paymentSchema, type PaymentInput } from '@/lib/validators/invoice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PAYMENT_METHOD_LABELS } from '@/types'
import type { OrderCurrency } from '@/lib/currencies'
import { roundCurrencyAmount } from '@/lib/exchange-rates'
import { NumericInput } from '@/components/shared/NumericInput'

interface PaymentFormProps {
  invoiceId: string
  remainingAmount: number
  invoiceTotalTTC: number
  invoiceCurrency: OrderCurrency
  onSuccess?: () => void
}

const PERCENTAGE_PRESETS = [25, 50, 75, 100]

function buildDefaultValues(remainingAmount: number, invoiceCurrency: OrderCurrency): PaymentInput {
  const appliedAmount = roundCurrencyAmount(remainingAmount)
  return {
    date: new Date().toISOString(),
    amount: invoiceCurrency === 'MAD' ? appliedAmount : 0,
    appliedAmount,
    method: 'CASH',
    reference: '',
  }
}

export function PaymentForm({ invoiceId, remainingAmount, invoiceTotalTTC, invoiceCurrency, onSuccess }: PaymentFormProps) {
  const queryClient = useQueryClient()

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: buildDefaultValues(remainingAmount, invoiceCurrency),
  })

  const amount = Number(useWatch({ control: form.control, name: 'amount' }) ?? 0)
  const appliedAmount = Number(useWatch({ control: form.control, name: 'appliedAmount' }) ?? 0)
  const exchangeRate = appliedAmount > 0 ? amount / appliedAmount : 0

  async function onSubmit(data: PaymentInput) {
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      form.setError('root', { message: "Erreur lors de l'enregistrement" })
      return
    }
    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    form.reset(buildDefaultValues(remainingAmount, invoiceCurrency))
    onSuccess?.()
  }

  function applyPercentage(percent: number) {
    form.setValue('appliedAmount', roundCurrencyAmount((invoiceTotalTTC * percent) / 100), { shouldValidate: true })
  }

  function paymentMethodLabel(method: PaymentInput['method']) {
    return PAYMENT_METHOD_LABELS[method]
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem>
              <FormLabel>Date du règlement</FormLabel>
              <FormControl>
                <Input type="date" value={field.value ? field.value.split('T')[0] : ''}
                  onChange={e => field.onChange(new Date(e.target.value).toISOString())} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant reçu (MAD)</FormLabel>
              <FormControl>
                <NumericInput value={field.value} onChange={field.onChange} placeholder="0.00" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="appliedAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant appliqué à la facture ({invoiceCurrency})</FormLabel>
              <FormControl>
                <NumericInput value={field.value} onChange={field.onChange} placeholder="0.00" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="method" render={({ field }) => (
            <FormItem>
              <FormLabel>Mode de règlement</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? 'CASH'}>
                <FormControl>
                  <SelectTrigger>
                    {field.value ? paymentMethodLabel(field.value) : <SelectValue placeholder="Sélectionner un mode" />}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {invoiceCurrency !== 'MAD' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Appliquer un pourcentage de la facture :</span>
            {PERCENTAGE_PRESETS.map((percent) => (
              <Button
                key={percent}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPercentage(percent)}
              >
                {percent} %
              </Button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="reference" render={({ field }) => (
            <FormItem>
              <FormLabel>Référence (virement…)</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {invoiceCurrency === 'MAD' ? (
            <p>
              Facture en MAD : le montant reçu est appliqué tel quel (taux 1 MAD = 1 MAD).
            </p>
          ) : (
            <p>
              Taux de change : <span className="font-medium">1 {invoiceCurrency} = {exchangeRate.toFixed(4)} MAD</span>
            </p>
          )}
          <p className="mt-1">
            Montant appliqué à la facture : <span className="font-medium">{appliedAmount.toFixed(2)} {invoiceCurrency}</span>
          </p>
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer le paiement'}
        </Button>
      </form>
    </Form>
  )
}

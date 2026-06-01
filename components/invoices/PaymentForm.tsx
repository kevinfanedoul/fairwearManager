'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentSchema, type PaymentInput } from '@/lib/validators/invoice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PAYMENT_METHOD_LABELS } from '@/types'
import type { OrderCurrency } from '@/lib/currencies'
import { convertMadToInvoiceCurrency, roundCurrencyAmount } from '@/lib/exchange-rates'

interface PaymentFormProps {
  invoiceId: string
  remainingAmount: number
  invoiceCurrency: OrderCurrency
  onSuccess?: () => void
}

function buildDefaultValues(amount: number): PaymentInput {
  return {
    date: new Date().toISOString(),
    amount,
    method: 'CASH',
    reference: '',
  }
}

export function PaymentForm({ invoiceId, remainingAmount, invoiceCurrency, onSuccess }: PaymentFormProps) {
  const queryClient = useQueryClient()
  const { data: ratesData } = useQuery<{ rates: Record<OrderCurrency, number> }>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('/api/settings/exchange-rates')
      if (!res.ok) throw new Error('Erreur taux de change')
      return res.json() as Promise<{ rates: Record<OrderCurrency, number> }>
    },
  })

  const currentRate = ratesData?.rates?.[invoiceCurrency] ?? 1
  const suggestedMadAmount = roundCurrencyAmount(
    invoiceCurrency === 'MAD' ? remainingAmount : remainingAmount * currentRate
  )

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: buildDefaultValues(suggestedMadAmount),
  })

  useEffect(() => {
    form.setValue('amount', suggestedMadAmount, { shouldDirty: false, shouldValidate: true })
  }, [form, suggestedMadAmount])

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
    form.reset(buildDefaultValues(suggestedMadAmount))
    onSuccess?.()
  }

  function paymentMethodLabel(method: PaymentInput['method']) {
    return PAYMENT_METHOD_LABELS[method]
  }

  const enteredAmountMad = Number(useWatch({ control: form.control, name: 'amount' }) ?? 0)
  const appliedAmount = convertMadToInvoiceCurrency(enteredAmountMad, invoiceCurrency, currentRate)

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
              <FormLabel>Montant (MAD)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
          <FormField control={form.control} name="reference" render={({ field }) => (
            <FormItem>
              <FormLabel>Référence (virement…)</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>
            Taux appliqué: <span className="font-medium">1 {invoiceCurrency} = {currentRate.toFixed(4)} MAD</span>
          </p>
          <p className="mt-1">
            Montant appliqué à la facture: <span className="font-medium">{appliedAmount.toFixed(2)} {invoiceCurrency}</span>
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

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { paymentSchema, type PaymentInput } from '@/lib/validators/invoice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PAYMENT_METHOD_LABELS } from '@/types'

interface PaymentFormProps {
  invoiceId: string
  remainingAmount: number
  onSuccess?: () => void
}

export function PaymentForm({ invoiceId, remainingAmount, onSuccess }: PaymentFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      date: new Date().toISOString(),
      amount: remainingAmount,
      method: 'CASH',
    },
  })

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
    form.reset()
    onSuccess?.()
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
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

'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { updateInvoiceSchema, type UpdateInvoiceInput } from '@/lib/validators/invoice'

type InvoiceEditFormProps = {
  invoiceId: string
  initialData: {
    issueDate: string
    dueDate: string
    notes: string
  }
}

export function InvoiceEditForm({ invoiceId, initialData }: InvoiceEditFormProps) {
  const router = useRouter()
  const form = useForm<UpdateInvoiceInput>({
    resolver: zodResolver(updateInvoiceSchema),
    defaultValues: {
      issueDate: initialData.issueDate,
      dueDate: initialData.dueDate,
      notes: initialData.notes,
    },
  })

  async function onSubmit(data: UpdateInvoiceInput) {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      form.setError('root', { message: 'Erreur lors de la modification de la facture' })
      return
    }

    router.push(`/invoices/${invoiceId}`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Modifier la facture</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Informations de la facture</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d&apos;émission</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(value) => field.onChange(value ? new Date(value).toISOString() : '')}
                      placeholder="Choisir une date d&apos;émission"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d&apos;échéance</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(value) => field.onChange(value ? new Date(value).toISOString() : '')}
                      placeholder="Choisir une date d&apos;échéance"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {form.formState.errors.root && (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  )
}

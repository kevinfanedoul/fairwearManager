'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { measurementSchema, type MeasurementInput } from '@/lib/validators/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'

interface MeasurementsFormProps {
  clientId: string
  defaultValues?: Partial<MeasurementInput>
}

const fields: { name: keyof MeasurementInput; label: string }[] = [
  { name: 'shoulder', label: 'Épaule (cm)' },
  { name: 'chest', label: 'Poitrine (cm)' },
  { name: 'waist', label: 'Ceinture (cm)' },
  { name: 'hips', label: 'Bassin (cm)' },
  { name: 'length', label: 'Longueur (cm)' },
  { name: 'waistLength', label: 'Longueur de taille (cm)' },
  { name: 'sleeves', label: 'Manches (cm)' },
]

export function MeasurementsForm({ clientId, defaultValues }: MeasurementsFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<MeasurementInput>({
    resolver: zodResolver(measurementSchema),
    defaultValues: defaultValues ?? {},
  })

  async function onSubmit(data: MeasurementInput) {
    const res = await fetch(`/api/clients/${clientId}/measurements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      form.setError('root', { message: "Erreur lors de l'enregistrement" })
      return
    }
    queryClient.invalidateQueries({ queryKey: ['client', clientId] })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {fields.map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {form.formState.errors.root && (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer les mensurations'}
        </Button>
      </form>
    </Form>
  )
}

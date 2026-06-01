'use client'

import { useForm, useWatch } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import type { OrderCurrency } from '@/lib/currencies'

const sizeFields = ['sizeS', 'sizeM', 'sizeL', 'sizeXL', 'sizeTU'] as const
const maxSizeFieldBySize = {
  sizeS: 'maxSizeS',
  sizeM: 'maxSizeM',
  sizeL: 'maxSizeL',
  sizeXL: 'maxSizeXL',
  sizeTU: 'maxSizeTU',
} as const

type CreditableItem = {
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

type CreditNoteMode = 'RETURN_ITEMS' | 'FREE_AMOUNT'

type CreditNoteFormValues = {
  mode: CreditNoteMode
  issueDate: string
  reason: string
  notes: string
  applyStampDuty: boolean
  freeAmountDesignation: string
  freeAmount: number
  items: Array<{
    orderItemId: string
    designation: string
    unitPrice: number
    sizeS: number
    sizeM: number
    sizeL: number
    sizeXL: number
    sizeTU: number
    quantity: number
    notes: string
  }>
}

type CreditNoteFormProps = {
  invoiceId: string
  currency: OrderCurrency
  items: CreditableItem[]
  onSuccess?: () => void
}

type ApiValidationError = {
  error?: string
  details?: {
    formErrors?: string[]
    fieldErrors?: Record<string, string[] | undefined>
  }
}

function formatCreditNoteErrorMessage(error: ApiValidationError | null) {
  const fieldErrors = error?.details?.fieldErrors ?? {}
  const formErrors = error?.details?.formErrors ?? []

  if (fieldErrors.reason?.length) return 'Veuillez renseigner le motif de l’avoir.'
  if (fieldErrors.issueDate?.length) return "Veuillez renseigner une date d’avoir valide."
  if (fieldErrors.items?.length) return fieldErrors.items[0] ?? 'Ajoutez au moins une ligne à créditer.'

  const firstFieldError = Object.values(fieldErrors).flat().find(Boolean)
  if (firstFieldError) return firstFieldError
  if (formErrors.length > 0) return formErrors[0]
  if (error?.error === 'Données invalides') return "Certaines informations de l’avoir sont incomplètes ou invalides."
  return error?.error ?? "Erreur lors de la création de l'avoir"
}

export function CreditNoteForm({ invoiceId, currency, items, onSuccess }: CreditNoteFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<CreditNoteFormValues>({
    defaultValues: {
      mode: 'RETURN_ITEMS',
      issueDate: new Date().toISOString(),
      reason: '',
      notes: '',
      applyStampDuty: false,
      freeAmountDesignation: 'Avoir commercial',
      freeAmount: 0,
      items: items.map((item) => ({
        orderItemId: item.orderItemId,
        designation: item.designation,
        unitPrice: item.unitPrice,
        sizeS: 0,
        sizeM: 0,
        sizeL: 0,
        sizeXL: 0,
        sizeTU: 0,
        quantity: 0,
        notes: '',
      })),
    },
  })

  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? []
  const issueDate = useWatch({ control: form.control, name: 'issueDate' }) ?? ''
  const reason = useWatch({ control: form.control, name: 'reason' }) ?? ''
  const notes = useWatch({ control: form.control, name: 'notes' }) ?? ''
  const applyStampDuty = useWatch({ control: form.control, name: 'applyStampDuty' }) ?? false
  const mode = useWatch({ control: form.control, name: 'mode' }) ?? 'RETURN_ITEMS'
  const freeAmountDesignation = useWatch({ control: form.control, name: 'freeAmountDesignation' }) ?? ''
  const freeAmount = Number(useWatch({ control: form.control, name: 'freeAmount' }) ?? 0)

  function updateSize(index: number, sizeField: typeof sizeFields[number], nextValue: number) {
    form.setValue(`items.${index}.${sizeField}`, nextValue, { shouldDirty: true })
    const currentItem = form.getValues(`items.${index}`)
    const quantity = sizeFields.reduce((sum, field) => {
      const value = field === sizeField ? nextValue : currentItem[field]
      return sum + value
    }, 0)
    form.setValue(`items.${index}.quantity`, quantity, { shouldDirty: true })
  }

  const selectedItems = watchedItems.filter((item) => item.quantity > 0)
  const subtotal = mode === 'FREE_AMOUNT'
    ? freeAmount
    : selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  async function onSubmit(values: CreditNoteFormValues) {
    form.clearErrors('root')

    const payload = values.mode === 'FREE_AMOUNT'
      ? {
          mode: values.mode,
          issueDate: values.issueDate,
          reason: values.reason,
          notes: values.notes,
          applyStampDuty: values.applyStampDuty,
          items: [{
            designation: values.freeAmountDesignation.trim() || 'Avoir commercial',
            unitPrice: values.freeAmount,
            quantity: 1,
            sizeS: 0,
            sizeM: 0,
            sizeL: 0,
            sizeXL: 0,
            sizeTU: 0,
          }],
        }
      : {
          mode: values.mode,
          issueDate: values.issueDate,
          reason: values.reason,
          notes: values.notes,
          applyStampDuty: values.applyStampDuty,
          items: values.items
            .filter((item) => item.quantity > 0)
            .map((item) => ({
              orderItemId: item.orderItemId,
              designation: item.designation,
              unitPrice: item.unitPrice,
              sizeS: item.sizeS,
              sizeM: item.sizeM,
              sizeL: item.sizeL,
              sizeXL: item.sizeXL,
              sizeTU: item.sizeTU,
              quantity: item.quantity,
              notes: item.notes || undefined,
            })),
        }

    if (values.mode === 'RETURN_ITEMS' && payload.items.length === 0) {
      form.setError('root', { message: 'Sélectionnez au moins une ligne à créditer.' })
      return
    }

    if (values.mode === 'FREE_AMOUNT' && values.freeAmount <= 0) {
      form.setError('root', { message: 'Saisissez un montant libre supérieur à zéro.' })
      return
    }

    const res = await fetch(`/api/invoices/${invoiceId}/credit-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => null) as ApiValidationError | null
      form.setError('root', { message: formatCreditNoteErrorMessage(error) })
      return
    }

    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 overflow-x-hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type d’avoir</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => form.setValue('mode', 'RETURN_ITEMS', { shouldDirty: true })}
              className={`rounded-xl border px-3 py-2 text-sm ${mode === 'RETURN_ITEMS' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              Retour marchandise
            </button>
            <button
              type="button"
              onClick={() => form.setValue('mode', 'FREE_AMOUNT', { shouldDirty: true })}
              className={`rounded-xl border px-3 py-2 text-sm ${mode === 'FREE_AMOUNT' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              Montant libre
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date de l’avoir</label>
          <Input
            type="date"
            value={issueDate ? issueDate.split('T')[0] : ''}
            onChange={(event) => form.setValue('issueDate', new Date(event.target.value).toISOString(), { shouldDirty: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Motif</label>
          <Input
            value={reason}
            onChange={(event) => form.setValue('reason', event.target.value, { shouldDirty: true })}
            placeholder="Retour client, geste commercial, reprise partielle…"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 md:self-end">
          <input
            type="checkbox"
            checked={applyStampDuty}
            onChange={(event) => form.setValue('applyStampDuty', event.target.checked, { shouldDirty: true })}
          />
          Inclure le timbre fiscal sur cet avoir
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(event) => form.setValue('notes', event.target.value, { shouldDirty: true })}
        />
      </div>

      {mode === 'FREE_AMOUNT' ? (
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Libellé de l’avoir</label>
            <Input
              value={freeAmountDesignation}
              onChange={(event) => form.setValue('freeAmountDesignation', event.target.value, { shouldDirty: true })}
              placeholder="Avoir commercial"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Montant HT</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={Number.isFinite(freeAmount) ? freeAmount : 0}
              onChange={(event) => form.setValue('freeAmount', parseFloat(event.target.value || '0') || 0, { shouldDirty: true })}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[820px] w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-2">Désignation</th>
                <th className="px-2 pb-2 text-center">S</th>
                <th className="px-2 pb-2 text-center">M</th>
                <th className="px-2 pb-2 text-center">L</th>
                <th className="px-2 pb-2 text-center">XL</th>
                <th className="px-2 pb-2 text-center">TU</th>
                <th className="px-2 pb-2 text-center">Qté</th>
                <th className="px-2 pb-2 text-right">PU</th>
                <th className="px-2 pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const currentItem = watchedItems[index]

                return (
                  <tr key={item.orderItemId} className="border-b align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{item.designation}</div>
                      <div className="mt-1 text-xs text-slate-500">Restant: {item.maxQuantity} pcs</div>
                    </td>
                    {sizeFields.map((sizeField) => {
                      const maxSizeField = maxSizeFieldBySize[sizeField]

                      return (
                        <td key={sizeField} className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            max={item[maxSizeField]}
                            className="w-16 text-center"
                            value={currentItem?.[sizeField] ?? 0}
                            onChange={(event) => {
                              const nextValue = Math.max(0, Math.min(item[maxSizeField], parseInt(event.target.value || '0', 10) || 0))
                              updateSize(index, sizeField, nextValue)
                            }}
                          />
                          <div className="mt-1 text-center text-[11px] text-slate-400">{item[maxSizeField]} max</div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center">
                      <Input readOnly className="w-16 bg-slate-50 text-center text-slate-600" value={currentItem?.quantity ?? 0} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <CurrencyDisplay amount={item.unitPrice} currency={currency} />
                    </td>
                    <td className="px-2 py-2 text-right font-medium">
                      <CurrencyDisplay amount={(currentItem?.quantity ?? 0) * item.unitPrice} currency={currency} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="flex justify-between font-medium">
          <span>{mode === 'FREE_AMOUNT' ? 'Montant libre saisi' : 'Sous-total des retours'}</span>
          <CurrencyDisplay amount={subtotal} currency={currency} />
        </div>
      </div>

      {form.formState.errors.root && (
        <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Création…' : 'Créer l’avoir'}
      </Button>
    </form>
  )
}

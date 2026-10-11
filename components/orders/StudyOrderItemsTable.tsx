'use client'

import { useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Trash2, Plus } from 'lucide-react'
import type { OrderInput } from '@/lib/validators/order'
import { getVATRateForCurrency } from '@/lib/calculations/invoice'

const emptyStudyItem = {
  designation: '',
  patronage: 0,
  proto: 0,
  gradationSizes: 0,
  gradationUnitPrice: 0,
}

type NumericInputProps = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value?: number | null
  onChange: (value: number) => void
  integer?: boolean
}

function NumericInput({ value, onChange, integer = false, ...props }: NumericInputProps) {
  const [text, setText] = useState(() => (value != null && value !== 0 ? String(value) : ''))

  function handleChange(next: string) {
    setText(next)
    if (next.trim() === '') {
      onChange(0)
      return
    }
    const parsed = integer ? parseInt(next, 10) : parseFloat(next)
    onChange(Number.isFinite(parsed) ? parsed : 0)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}

export function StudyOrderItemsTable() {
  const { control, watch } = useFormContext<OrderInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items')
  const currency = watch('currency') ?? 'MAD'

  function gradationTotal(index: number) {
    const item = items[index]
    if (!item) return 0
    return Math.round((item.gradationSizes ?? 0) * (item.gradationUnitPrice ?? 0) * 100) / 100
  }

  function lineTotal(index: number) {
    const item = items[index]
    if (!item) return 0
    return Math.round(((item.patronage ?? 0) + (item.proto ?? 0) + gradationTotal(index)) * 100) / 100
  }

  const totalHT = items.reduce((sum, _item, i) => sum + lineTotal(i), 0)
  const vatRate = getVATRateForCurrency(currency)
  const tva = Math.round(totalHT * vatRate * 100) / 100
  const ttc = Math.round((totalHT + tva) * 100) / 100

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-slate-500 text-left">
              <th className="pb-2 pr-2">Désignation</th>
              <th className="pb-2 px-2 text-right">Patronage</th>
              <th className="pb-2 px-2 text-right">Prototype</th>
              <th className="pb-2 px-2 text-center">Gradation (tailles × prix)</th>
              <th className="pb-2 px-2 text-right">Total gradations</th>
              <th className="pb-2 px-2 text-right">Total</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b">
                <td className="py-2 pr-2">
                  <FormField control={control} name={`items.${index}.designation`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} placeholder="Gradation modèle X" /></FormControl><FormMessage /></FormItem>
                  )} />
                </td>
                <td className="py-2 px-2">
                  <FormField control={control} name={`items.${index}.patronage`} render={({ field }) => (
                    <FormItem><FormControl>
                      <NumericInput value={field.value} onChange={field.onChange} className="w-24 text-right" placeholder="0" />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                </td>
                <td className="py-2 px-2">
                  <FormField control={control} name={`items.${index}.proto`} render={({ field }) => (
                    <FormItem><FormControl>
                      <NumericInput value={field.value} onChange={field.onChange} className="w-24 text-right" placeholder="0" />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <FormField control={control} name={`items.${index}.gradationSizes`} render={({ field }) => (
                      <FormItem><FormControl>
                        <NumericInput integer value={field.value} onChange={field.onChange} className="w-14 text-center" placeholder="nb" />
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <span className="text-slate-400">×</span>
                    <FormField control={control} name={`items.${index}.gradationUnitPrice`} render={({ field }) => (
                      <FormItem><FormControl>
                        <NumericInput value={field.value} onChange={field.onChange} className="w-20 text-right" placeholder="prix" />
                      </FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-medium">
                  <CurrencyDisplay amount={gradationTotal(index)} currency={currency} />
                </td>
                <td className="py-2 px-2 text-right font-medium">
                  <CurrencyDisplay amount={lineTotal(index)} currency={currency} />
                </td>
                <td className="py-2 pl-2">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append(emptyStudyItem)}
      >
        <Plus size={14} className="mr-2" />Ajouter une ligne
      </Button>

      <div className="flex justify-end">
        <div className="text-sm space-y-1 min-w-48">
          <div className="flex justify-between text-slate-600"><span>Total HT</span><CurrencyDisplay amount={totalHT} currency={currency} /></div>
          <div className="flex justify-between text-slate-600"><span>TVA {Math.round(vatRate * 100)}%</span><CurrencyDisplay amount={tva} currency={currency} /></div>
          <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total TTC</span><CurrencyDisplay amount={ttc} currency={currency} /></div>
        </div>
      </div>
    </div>
  )
}

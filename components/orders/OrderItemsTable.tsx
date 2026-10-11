'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Trash2, Plus } from 'lucide-react'
import type { OrderInput } from '@/lib/validators/order'
import { SIZE_COLUMNS } from '@/lib/order-sizes'
import { getVATRateForCurrency } from '@/lib/calculations/invoice'

const emptyProductItem = {
  designation: '',
  sizeXS: 0,
  sizeS: 0,
  sizeM: 0,
  sizeL: 0,
  sizeXL: 0,
  sizeXXL: 0,
  sizeXXXL: 0,
  sizeTU: 0,
  quantity: 0,
  unitPrice: 0,
}

export function OrderItemsTable() {
  const { control, watch, setValue } = useFormContext<OrderInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items')
  const currency = watch('currency') ?? 'MAD'

  function quantityFromSizes(index: number) {
    const item = items[index]
    if (!item) return 0

    return SIZE_COLUMNS.reduce((sum, col) => sum + (item[col.key] ?? 0), 0)
  }

  function lineTotal(index: number) {
    const item = items[index]
    if (!item) return 0
    return Math.round((item.quantity ?? 0) * (item.unitPrice ?? 0) * 100) / 100
  }

  const totalHT = items.reduce((sum, item, i) => sum + lineTotal(i), 0)
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
              {SIZE_COLUMNS.map((col) => (
                <th key={col.key} className="pb-2 px-2 text-center">{col.label}</th>
              ))}
              <th className="pb-2 px-2 text-center">Qté</th>
              <th className="pb-2 px-2 text-right">Prix unit.</th>
              <th className="pb-2 px-2 text-right">Total</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b">
                <td className="py-2 pr-2">
                  <FormField control={control} name={`items.${index}.designation`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} placeholder="T-shirt blanc" /></FormControl><FormMessage /></FormItem>
                  )} />
                </td>
                {SIZE_COLUMNS.map((col) => (
                  <td key={col.key} className="py-2 px-2">
                    <FormField control={control} name={`items.${index}.${col.key}`} render={({ field }) => (
                      <FormItem><FormControl><Input {...field} type="number" min="0" className="w-12 text-center" onChange={e => {
                        const nextValue = parseInt(e.target.value) || 0
                        field.onChange(nextValue)

                        const nextQuantity = SIZE_COLUMNS.reduce((sum, currentCol) => {
                          const sizeValue = currentCol.key === col.key ? nextValue : (items[index]?.[currentCol.key] ?? 0)
                          return sum + sizeValue
                        }, 0)

                        setValue(`items.${index}.quantity`, nextQuantity, { shouldDirty: true, shouldValidate: true })
                      }} /></FormControl></FormItem>
                    )} />
                  </td>
                ))}
                <td className="py-2 px-2">
                  <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} value={quantityFromSizes(index)} type="number" min="0" readOnly className="w-16 text-center bg-slate-50 text-slate-600" /></FormControl></FormItem>
                  )} />
                </td>
                <td className="py-2 px-2">
                  <FormField control={control} name={`items.${index}.unitPrice`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} type="number" min="0" step="0.01" className="w-24 text-right" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl></FormItem>
                  )} />
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
        onClick={() => append(emptyProductItem)}
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

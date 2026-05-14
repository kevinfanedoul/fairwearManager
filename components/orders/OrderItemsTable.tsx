'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Trash2, Plus } from 'lucide-react'
import type { OrderInput } from '@/lib/validators/order'

const sizeFields = ['sizeS', 'sizeM', 'sizeL', 'sizeXL', 'sizeTU'] as const

export function OrderItemsTable() {
  const { control, watch, setValue } = useFormContext<OrderInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items')

  function quantityFromSizes(index: number) {
    const item = items[index]
    if (!item) return 0

    return sizeFields.reduce((sum, size) => sum + (item[size] ?? 0), 0)
  }

  function lineTotal(index: number) {
    const item = items[index]
    if (!item) return 0
    return Math.round((item.quantity ?? 0) * (item.unitPrice ?? 0) * 100) / 100
  }

  const totalHT = items.reduce((sum, item, i) => sum + lineTotal(i), 0)
  const tva = Math.round(totalHT * 0.2 * 100) / 100
  const ttc = Math.round((totalHT + tva) * 100) / 100

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-slate-500 text-left">
              <th className="pb-2 pr-2">Désignation</th>
              <th className="pb-2 px-2 text-center">S</th>
              <th className="pb-2 px-2 text-center">M</th>
              <th className="pb-2 px-2 text-center">L</th>
              <th className="pb-2 px-2 text-center">XL</th>
              <th className="pb-2 px-2 text-center">TU</th>
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
                {sizeFields.map((size) => (
                  <td key={size} className="py-2 px-2">
                    <FormField control={control} name={`items.${index}.${size}`} render={({ field }) => (
                      <FormItem><FormControl><Input {...field} type="number" min="0" className="w-14 text-center" onChange={e => {
                        const nextValue = parseInt(e.target.value) || 0
                        field.onChange(nextValue)

                        const nextQuantity = sizeFields.reduce((sum, currentSize) => {
                          const sizeValue = currentSize === size ? nextValue : (items[index]?.[currentSize] ?? 0)
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
                  <CurrencyDisplay amount={lineTotal(index)} />
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
        onClick={() => append({ designation: '', sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0, quantity: 0, unitPrice: 0 })}
      >
        <Plus size={14} className="mr-2" />Ajouter une ligne
      </Button>

      <div className="flex justify-end">
        <div className="text-sm space-y-1 min-w-48">
          <div className="flex justify-between text-slate-600"><span>Total HT</span><CurrencyDisplay amount={totalHT} /></div>
          <div className="flex justify-between text-slate-600"><span>TVA 20%</span><CurrencyDisplay amount={tva} /></div>
          <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total TTC</span><CurrencyDisplay amount={ttc} /></div>
        </div>
      </div>
    </div>
  )
}

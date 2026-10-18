'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { NumericInput } from '@/components/shared/NumericInput'
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

const emptyFlatItem = {
  kind: 'FLAT' as const,
  designation: '',
  flatPrice: 0,
}

const fieldLabel = 'mb-1 block text-xs font-medium text-slate-500'

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
    if (item.kind === 'FLAT') return item.flatPrice ?? 0
    return Math.round((item.quantity ?? 0) * (item.unitPrice ?? 0) * 100) / 100
  }

  const totalHT = items.reduce((sum, item, i) => sum + lineTotal(i), 0)
  const vatRate = getVATRateForCurrency(currency)
  const tva = Math.round(totalHT * vatRate * 100) / 100
  const ttc = Math.round((totalHT + tva) * 100) / 100

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400">Aucune ligne</p>
      )}

      {fields.map((field, index) => {
        const item = items[index]
        const isFlat = item?.kind === 'FLAT'

        return (
          <div key={field.id} className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <FormField control={control} name={`items.${index}.designation`} render={({ field }) => (
                  <FormItem>
                    <FormControl><Input {...field} placeholder="Désignation (ex. T-shirt blanc)" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(index)}>
                <Trash2 size={16} />
              </Button>
            </div>

            {isFlat ? (
              <div className="grid grid-cols-2 items-end gap-2">
                <div>
                  <label className={fieldLabel}>Tarif unique</label>
                  <FormField control={control} name={`items.${index}.flatPrice`} render={({ field }) => (
                    <FormItem>
                      <FormControl><NumericInput value={field.value} onChange={field.onChange} className="text-right" placeholder="Tarif unique" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div>
                  <label className={fieldLabel}>Total</label>
                  <div className="flex h-8 items-center justify-end rounded-lg border border-transparent px-2.5 text-sm font-medium">
                    <CurrencyDisplay amount={lineTotal(index)} currency={currency} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {SIZE_COLUMNS.map((col) => (
                    <div key={col.key}>
                      <label className={`${fieldLabel} text-center`}>{col.label}</label>
                      <FormField control={control} name={`items.${index}.${col.key}`} render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <NumericInput
                              integer
                              value={field.value}
                              onChange={(nextValue) => {
                                field.onChange(nextValue)

                                const nextQuantity = SIZE_COLUMNS.reduce((sum, currentCol) => {
                                  const sizeValue = currentCol.key === col.key ? nextValue : (items[index]?.[currentCol.key] ?? 0)
                                  return sum + sizeValue
                                }, 0)

                                setValue(`items.${index}.quantity`, nextQuantity, { shouldDirty: true, shouldValidate: true })
                              }}
                              className="w-full text-center"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 items-end gap-2">
                  <div>
                    <label className={fieldLabel}>Qté</label>
                    <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} value={quantityFromSizes(index)} readOnly className="w-full bg-slate-50 text-center text-slate-600" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Prix unit.</label>
                    <FormField control={control} name={`items.${index}.unitPrice`} render={({ field }) => (
                      <FormItem>
                        <FormControl><NumericInput value={field.value} onChange={field.onChange} className="w-full text-right" placeholder="0" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Total</label>
                    <div className="flex h-8 items-center justify-end rounded-lg border border-transparent px-2.5 text-sm font-medium">
                      <CurrencyDisplay amount={lineTotal(index)} currency={currency} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(emptyProductItem)}
        >
          <Plus size={14} className="mr-2" />Ajouter une ligne produit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(emptyFlatItem)}
        >
          <Plus size={14} className="mr-2" />Ajouter une ligne tarif unique
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="w-full space-y-1 text-sm sm:w-auto sm:min-w-48">
          <div className="flex justify-between text-slate-600"><span>Total HT</span><CurrencyDisplay amount={totalHT} currency={currency} /></div>
          <div className="flex justify-between text-slate-600"><span>TVA {Math.round(vatRate * 100)}%</span><CurrencyDisplay amount={tva} currency={currency} /></div>
          <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total TTC</span><CurrencyDisplay amount={ttc} currency={currency} /></div>
        </div>
      </div>
    </div>
  )
}

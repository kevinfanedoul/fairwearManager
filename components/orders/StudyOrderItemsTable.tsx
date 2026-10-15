'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { NumericInput } from '@/components/shared/NumericInput'
import { Trash2, Plus } from 'lucide-react'
import type { OrderInput } from '@/lib/validators/order'
import { getVATRateForCurrency } from '@/lib/calculations/invoice'

const emptyBreakdownItem = {
  kind: 'BREAKDOWN' as const,
  designation: '',
  patronage: 0,
  proto: 0,
  gradationSizes: 0,
  gradationUnitPrice: 0,
}

const emptyFlatItem = {
  kind: 'FLAT' as const,
  designation: '',
  flatPrice: 0,
}

const fieldLabel = 'mb-1 block text-xs font-medium text-slate-500'

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
    if (item.kind === 'FLAT') return item.flatPrice ?? 0
    return Math.round(((item.patronage ?? 0) + (item.proto ?? 0) + gradationTotal(index)) * 100) / 100
  }

  const totalHT = items.reduce((sum, _item, i) => sum + lineTotal(i), 0)
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
                    <FormControl><Input {...field} placeholder="Désignation (ex. Gradation modèle X)" /></FormControl>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={fieldLabel}>Patronage</label>
                    <FormField control={control} name={`items.${index}.patronage`} render={({ field }) => (
                      <FormItem>
                        <FormControl><NumericInput value={field.value} onChange={field.onChange} className="text-right" placeholder="0" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Prototype</label>
                    <FormField control={control} name={`items.${index}.proto`} render={({ field }) => (
                      <FormItem>
                        <FormControl><NumericInput value={field.value} onChange={field.onChange} className="text-right" placeholder="0" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div>
                  <label className={fieldLabel}>Gradation (tailles × prix)</label>
                  <div className="flex items-center gap-2">
                    <FormField control={control} name={`items.${index}.gradationSizes`} render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl><NumericInput integer value={field.value} onChange={field.onChange} className="text-center" placeholder="nb" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <span className="shrink-0 text-slate-400">×</span>
                    <FormField control={control} name={`items.${index}.gradationUnitPrice`} render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl><NumericInput value={field.value} onChange={field.onChange} className="text-right" placeholder="prix" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="grid grid-cols-2 items-end gap-2">
                  <div>
                    <label className={fieldLabel}>Total gradations</label>
                    <div className="flex h-8 items-center justify-end rounded-lg border border-transparent px-2.5 text-sm font-medium">
                      <CurrencyDisplay amount={gradationTotal(index)} currency={currency} />
                    </div>
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
          onClick={() => append(emptyBreakdownItem)}
        >
          <Plus size={14} className="mr-2" />Ajouter une ligne bureau étude
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

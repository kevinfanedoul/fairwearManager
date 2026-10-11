import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm, FormProvider, type UseFormReturn } from 'react-hook-form'
import { StudyOrderItemsTable } from '../StudyOrderItemsTable'

type FormValues = {
  currency: string
  items: { designation: string; patronage?: number; proto?: number; gradationSizes?: number; gradationUnitPrice?: number }[]
}

function Harness({ capture }: { capture: (m: UseFormReturn<FormValues>) => void }) {
  const methods = useForm<FormValues>({
    defaultValues: {
      currency: 'MAD',
      items: [{ designation: '', patronage: 0, proto: 0, gradationSizes: 0, gradationUnitPrice: 0 }],
    },
  })
  capture(methods)
  return (
    <FormProvider {...methods}>
      <StudyOrderItemsTable />
    </FormProvider>
  )
}

describe('StudyOrderItemsTable', () => {
  it('updates proto value in form state', () => {
    let methods: UseFormReturn<FormValues> | undefined
    render(<Harness capture={(m) => { methods = m }} />)

    const zeroInputs = screen.getAllByPlaceholderText('0')
    const patronageInput = zeroInputs[0]
    const protoInput = zeroInputs[1]
    fireEvent.change(patronageInput, { target: { value: '200' } })
    fireEvent.change(protoInput, { target: { value: '150' } })

    expect(methods!.getValues('items.0.patronage')).toBe(200)
    expect(methods!.getValues('items.0.proto')).toBe(150)
  })
})

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}

function parseDate(value?: string) {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function DatePicker({
  value = "",
  onChange,
  placeholder = "Choisir une date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = useMemo(() => parseDate(value), [value])
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate ?? new Date())
  )

  useEffect(() => {
    if (selectedDate) {
      const nextMonth = startOfMonth(selectedDate)
      setVisibleMonth((currentMonth) =>
        currentMonth.getTime() === nextMonth.getTime() ? currentMonth : nextMonth
      )
    }
  }, [value, selectedDate])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { locale: fr })
    const end = endOfWeek(endOfMonth(visibleMonth), { locale: fr })
    return eachDayOfInterval({ start, end })
  }, [visibleMonth])

  function selectDate(date: Date) {
    onChange(format(date, "yyyy-MM-dd"))
    setOpen(false)
  }

  function clearDate() {
    onChange("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between px-3 text-left font-normal text-slate-900"
          />
        }
      >
        <span className={cn("truncate", !selectedDate && "text-slate-400")}>
          {selectedDate
            ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
            : placeholder}
        </span>
        <CalendarDays className="text-slate-400" />
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
          >
            <ChevronLeft />
          </Button>
          <div className="text-sm font-semibold capitalize text-slate-900">
            {format(visibleMonth, "MMMM yyyy", { locale: fr })}
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-400">
          {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const selected = selectedDate ? isSameDay(day, selectedDate) : false

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => selectDate(day)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-xl text-sm transition-colors",
                  isSameMonth(day, visibleMonth)
                    ? "text-slate-700 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-slate-50",
                  isToday(day) && !selected && "font-semibold text-slate-950 ring-1 ring-slate-200",
                  selected && "bg-slate-900 font-semibold text-white hover:bg-slate-800"
                )}
              >
                {format(day, "d")}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => selectDate(new Date())}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => selectDate(addDays(new Date(), 7))}
          >
            Dans 7 jours
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearDate}
          >
            <X className="mr-1" />
            Effacer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

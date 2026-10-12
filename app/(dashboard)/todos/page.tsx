'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { todoSchema, type TodoInput } from '@/lib/validators/todo'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { TODO_STATUS_LABELS, type TodoStatus } from '@/types'
import { Plus, UserRound } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type TodoItem = {
  id: string
  title: string
  status: TodoStatus
  dueDate: string | null
  notes: string | null
  assigneeId: string | null
  assignee: { id: string; name: string; color: string | null } | null
}

type EmployeeItem = { id: string; name: string }

type ViewMode = 'kanban' | 'list'

const statusVariants: Record<string, 'info' | 'warning' | 'danger' | 'success' | 'muted'> = {
  TODO: 'muted',
  IN_PROGRESS: 'info',
  BLOCKED: 'danger',
  DONE: 'success',
}

const STATUS_ORDER: TodoStatus[] = ['BLOCKED', 'IN_PROGRESS', 'TODO', 'DONE']

const KANBAN_COLUMNS: {
  key: TodoStatus
  label: string
  headerClass: string
  dotClass: string
}[] = [
  { key: 'TODO', label: 'À faire', headerClass: 'bg-slate-100 text-slate-700', dotClass: 'bg-slate-400' },
  { key: 'IN_PROGRESS', label: 'En cours', headerClass: 'bg-blue-100 text-blue-700', dotClass: 'bg-blue-500' },
  { key: 'BLOCKED', label: 'Bloqué', headerClass: 'bg-red-100 text-red-700', dotClass: 'bg-red-500' },
  { key: 'DONE', label: 'Terminé', headerClass: 'bg-green-100 text-green-700', dotClass: 'bg-green-500' },
]

export default function TodosPage() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('kanban')
  const queryClient = useQueryClient()

  const { data: todos, isLoading } = useQuery<TodoItem[]>({
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const { data: employees } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const form = useForm<TodoInput>({
    resolver: zodResolver(todoSchema) as any,
    defaultValues: { title: '', status: 'TODO' },
  })

  const createMutation = useMutation({
    mutationFn: async (data: TodoInput) => {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      form.reset()
      setOpen(false)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  const assignMutation = useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  const assigneeItems = useMemo(() => {
    const map: Record<string, string> = { __none__: 'Non assigné' }
    for (const e of employees ?? []) {
      map[e.id] = e.name
    }
    return map
  }, [employees])

  const sorted = useMemo(
    () => (todos ? [...todos].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) : []),
    [todos]
  )

  const byStatus = useMemo(() => {
    const map: Record<TodoStatus, TodoItem[]> = { TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [] }
    for (const todo of todos ?? []) {
      map[todo.status].push(todo)
    }
    return map
  }, [todos])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Tâches</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={view === 'kanban' ? 'rounded-md bg-white px-3 py-1 text-sm font-medium shadow-sm' : 'rounded-md px-3 py-1 text-sm text-slate-500'}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={view === 'list' ? 'rounded-md bg-white px-3 py-1 text-sm font-medium shadow-sm' : 'rounded-md px-3 py-1 text-sm text-slate-500'}
            >
              Liste
            </button>
          </div>
          <Link href="/employees" className={buttonVariants({ variant: 'outline' })}>
            <UserRound size={16} className="mr-2" />Personnes
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button><Plus size={16} className="mr-2" />Nouvelle tâche</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl><Input {...field} placeholder="Relancer le client Paradoxal" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} items={TODO_STATUS_LABELS}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(TODO_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date limite (optionnel)</FormLabel>
                      <FormControl>
                        <Input type="date"
                          value={field.value ? field.value.split('T')[0] : ''}
                          onChange={e => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Création…' : 'Créer'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? <div className="text-slate-500">Chargement…</div> : view === 'kanban' ? (
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const items = byStatus[col.key]
            return (
              <div key={col.key} className="rounded-xl border border-slate-200 bg-slate-50">
                <div className={`flex items-center gap-2 rounded-t-xl border-b border-slate-200 px-3 py-2 ${col.headerClass}`}>
                  <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="ml-auto text-xs font-medium">{items.length}</span>
                </div>
                <div className="space-y-2 p-3">
                  {items.map((todo) => (
                    <Card
                      key={todo.id}
                      className={todo.status === 'DONE' ? 'opacity-60' : ''}
                      style={todo.assignee?.color ? { backgroundColor: todo.assignee.color } : undefined}
                    >
                      <CardContent className="py-3 space-y-2">
                        <p className={`font-medium ${todo.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>
                          {todo.title}
                        </p>
                        {todo.dueDate && (
                          <p className="text-xs text-slate-400">
                            Échéance : {format(new Date(todo.dueDate), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Select
                            value={todo.assigneeId ?? '__none__'}
                            onValueChange={(v) => assignMutation.mutate({ id: todo.id, assigneeId: !v || v === '__none__' ? '' : v })}
                            items={assigneeItems}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Non assigné</SelectItem>
                              {employees?.map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={todo.status}
                            onValueChange={(status) => { if (status) updateStatusMutation.mutate({ id: todo.id, status }) }}
                            items={TODO_STATUS_LABELS}
                          >
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TODO_STATUS_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">Aucune tâche</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((todo) => (
            <Card key={todo.id} className={todo.status === 'DONE' ? 'opacity-60' : ''}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge label={TODO_STATUS_LABELS[todo.status]} variant={statusVariants[todo.status]} />
                  <div>
                    <p className={`font-medium ${todo.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>{todo.title}</p>
                    {todo.dueDate && (
                      <p className="text-xs text-slate-400">
                        Échéance : {format(new Date(todo.dueDate), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    )}
                    {todo.assignee && (
                      <p className="text-xs text-slate-500">{todo.assignee.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={todo.assigneeId ?? '__none__'}
                    onValueChange={(v) => assignMutation.mutate({ id: todo.id, assigneeId: !v || v === '__none__' ? '' : v })}
                    items={assigneeItems}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Non assigné</SelectItem>
                      {employees?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={todo.status}
                    onValueChange={(status) => { if (status) updateStatusMutation.mutate({ id: todo.id, status }) }}
                    items={TODO_STATUS_LABELS}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TODO_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
          {sorted.length === 0 && (
            <p className="text-slate-400 text-center py-8">Aucune tâche</p>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
import { TODO_STATUS_LABELS } from '@/types'
import { Plus, UserRound } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const statusVariants: Record<string, 'info' | 'warning' | 'danger' | 'success' | 'muted'> = {
  TODO: 'muted',
  IN_PROGRESS: 'info',
  BLOCKED: 'danger',
  DONE: 'success',
}

export default function TodosPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const { data: employees } = useQuery({
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

  const statusOrder = ['BLOCKED', 'IN_PROGRESS', 'TODO', 'DONE']
  const sorted = todos ? [...todos].sort((a: any, b: any) =>
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  ) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tâches</h1>
        <div className="flex items-center gap-2">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="space-y-2">
          {sorted.map((todo: any) => (
            <Card key={todo.id} className={todo.status === 'DONE' ? 'opacity-60' : ''}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge label={TODO_STATUS_LABELS[todo.status as keyof typeof TODO_STATUS_LABELS]} variant={statusVariants[todo.status]} />
                  <div>
                    <p className={`font-medium ${todo.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>{todo.title}</p>
                    {todo.dueDate && (
                      <p className="text-xs text-slate-400">
                        Échéance : {format(new Date(todo.dueDate), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    )}
                    {todo.assignee && (
                      <p className="text-xs text-slate-500">
                        {todo.assignee.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={todo.assigneeId ?? '__none__'}
                    onValueChange={(v) => assignMutation.mutate({ id: todo.id, assigneeId: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Non assigné</SelectItem>
                      {employees?.map((e: { id: string; name: string }) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={todo.status}
                    onValueChange={(status) => updateStatusMutation.mutate({ id: todo.id, status })}
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

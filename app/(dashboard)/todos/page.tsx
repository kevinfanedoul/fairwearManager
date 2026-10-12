'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { todoSchema, todoEditSchema, type TodoInput, type TodoEditInput } from '@/lib/validators/todo'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TODO_STATUS_LABELS, type TodoStatus } from '@/types'
import { Plus, UserRound, MessageSquare, Pencil } from 'lucide-react'
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
  const [editing, setEditing] = useState<TodoItem | null>(null)
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
    resolver: zodResolver(todoSchema) as Resolver<TodoInput>,
    defaultValues: { title: '', status: 'TODO' },
  })

  const editForm = useForm<TodoEditInput>({
    resolver: zodResolver(todoEditSchema) as Resolver<TodoEditInput>,
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  const byStatus = useMemo(() => {
    const map: Record<TodoStatus, TodoItem[]> = { TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [] }
    for (const todo of todos ?? []) {
      map[todo.status].push(todo)
    }
    return map
  }, [todos])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const status = over.id as TodoStatus
    if (!TODO_STATUS_LABELS[status]) return
    updateMutation.mutate({ id: active.id as string, data: { status } })
  }

  const openEdit = (todo: TodoItem) => {
    editForm.reset({
      title: todo.title,
      assigneeId: todo.assigneeId ?? '__none__',
      dueDate: todo.dueDate ?? '',
      notes: todo.notes ?? '',
    })
    setEditing(todo)
  }

  const submitEdit = (data: TodoEditInput) => {
    if (!editing) return
    updateMutation.mutate(
      {
        id: editing.id,
        data: {
          title: data.title,
          assigneeId: data.assigneeId === '__none__' ? '' : data.assigneeId,
          dueDate: data.dueDate,
          notes: data.notes,
        },
      },
      { onSuccess: () => setEditing(null) }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Tâches</h1>
        <div className="flex flex-wrap items-center gap-2">
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
                      <FormLabel>Commentaire</FormLabel>
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

      {isLoading ? (
        <div className="text-slate-500">Chargement…</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn key={col.key} col={col} items={byStatus[col.key]} onEdit={openEdit} />
            ))}
          </div>
        </DndContext>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la tâche</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <FormField control={editForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="assigneeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Personne assignée</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? '__none__'} items={assigneeItems}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Non assigné</SelectItem>
                      {employees?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="dueDate" render={({ field }) => (
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
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Enregistrer</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KanbanColumn({ col, items, onEdit }: {
  col: (typeof KANBAN_COLUMNS)[number]
  items: TodoItem[]
  onEdit: (todo: TodoItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <div className={`flex items-center gap-2 rounded-t-xl border-b border-slate-200 px-3 py-2 ${col.headerClass}`}>
        <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
        <span className="text-sm font-semibold">{col.label}</span>
        <span className="ml-auto text-xs font-medium">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 p-3 min-h-[96px] transition-colors ${isOver ? 'bg-slate-100' : ''}`}
      >
        {items.map((todo) => (
          <TodoCard key={todo.id} todo={todo} onEdit={onEdit} />
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Aucune tâche</p>
        )}
      </div>
    </div>
  )
}

function TodoCard({ todo, onEdit }: { todo: TodoItem; onEdit: (todo: TodoItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      className={`cursor-grab rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10 active:cursor-grabbing ${todo.status === 'DONE' ? 'opacity-60' : ''}`}
    >
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium ${todo.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>
            {todo.title}
          </p>
          <button
            type="button"
            onClick={() => onEdit(todo)}
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Modifier la tâche"
          >
            <Pencil size={14} />
          </button>
        </div>
        {todo.assignee && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: todo.assignee.color ?? '#e2e8f0' }}
          >
            <UserRound size={12} />
            {todo.assignee.name}
          </span>
        )}
        {todo.dueDate && (
          <p className="text-xs text-slate-400">
            Échéance : {format(new Date(todo.dueDate), 'dd/MM/yyyy', { locale: fr })}
          </p>
        )}
        {todo.notes && (
          <p className="flex items-start gap-1 text-xs text-slate-500">
            <MessageSquare size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{todo.notes}</span>
          </p>
        )}
      </div>
    </div>
  )
}

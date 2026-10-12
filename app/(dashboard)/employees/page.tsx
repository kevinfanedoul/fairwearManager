'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { employeeSchema, type EmployeeInput } from '@/lib/validators/employee'
import { EMPLOYEE_COLORS } from '@/lib/employee-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Plus } from 'lucide-react'

type EmployeeView = {
  id: string
  name: string
  role: string | null
  color: string | null
  hourlyRate: number | string
  active: boolean
}

export default function EmployeesPage() {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: employees, isLoading } = useQuery<EmployeeView[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', role: '', color: '' },
  })

  function openCreate() {
    setEditingId(null)
    form.reset({ name: '', role: '', color: '', hourlyRate: undefined })
    setOpen(true)
  }

  function openEdit(e: EmployeeView) {
    setEditingId(e.id)
    form.reset({ name: e.name, role: e.role ?? '', color: e.color ?? '', hourlyRate: Number(e.hourlyRate) })
    setOpen(true)
  }

  const submitMutation = useMutation({
    mutationFn: async (data: EmployeeInput) => {
      const url = editingId ? `/api/employees/${editingId}` : '/api/employees'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setOpen(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personnes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gérez la liste des personnes pouvant être affectées aux tâches.
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={16} className="mr-2" />Nouvelle personne</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Modifier la personne' : 'Nouvelle personne'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => submitMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl><Input {...field} placeholder="Marie Dupont" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle (optionnel)</FormLabel>
                  <FormControl><Input {...field} placeholder="Modéliste, Couturière…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {EMPLOYEE_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          aria-label={c.label}
                          onClick={() => field.onChange(c.value)}
                          style={{ backgroundColor: c.value }}
                          className={`h-7 w-7 rounded-full ring-2 ring-offset-1 ${field.value === c.value ? 'ring-slate-900' : 'ring-transparent hover:ring-slate-300'}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hourlyRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux horaire (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead className="text-right">Taux horaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((e) => (
                  <TableRow key={e.id} className={e.active ? '' : 'opacity-60'}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.role || '—'}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-200"
                        style={{ backgroundColor: e.color || '#F1F5F9' }}
                      />
                    </TableCell>
                    <TableCell className="text-right">{Number(e.hourlyRate)}</TableCell>
                    <TableCell>
                      <StatusBadge label={e.active ? 'Actif' : 'Inactif'} variant={e.active ? 'success' : 'muted'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ id: e.id, active: !e.active })}
                        >
                          {e.active ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(e.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {employees?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                      Aucune personne
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

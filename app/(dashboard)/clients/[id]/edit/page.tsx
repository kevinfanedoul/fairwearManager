'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { ClientForm } from '@/components/clients/ClientForm'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`)
      if (!res.ok) throw new Error('Client introuvable')
      return res.json()
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!client) return <div className="text-red-600">Client introuvable</div>

  return <ClientForm clientId={id} defaultValues={client} />
}

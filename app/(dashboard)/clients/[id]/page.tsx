import { ClientTabs } from '@/components/clients/ClientTabs'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ClientTabs clientId={id} />
}

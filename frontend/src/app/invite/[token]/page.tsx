import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import axios from 'axios'
import { InvitePage } from '@/types'
import { InviteClientPage } from '@/components/invite/InviteClientPage'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

interface Props {
  params: { token: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { data } = await axios.get<{ data: InvitePage }>(
      `${API_URL}/api/guests/by-token/${params.token}`
    )
    const page = data.data
    return {
      title: `Приглашение на: ${page.eventTitle}`,
      description: `${page.hostName} приглашает тебя на ${page.eventTitle}. Посмотри вишлист и выбери подарок!`,
      openGraph: {
        title: `🎉 ${page.eventTitle}`,
        description: `Приглашение от ${page.hostName}`,
        images: page.coverImageUrl ? [page.coverImageUrl] : [],
      },
    }
  } catch {
    return { title: 'Приглашение' }
  }
}

export default async function InviteTokenPage({ params }: Props) {
  try {
    const { data } = await axios.get<{ data: InvitePage }>(
      `${API_URL}/api/guests/by-token/${params.token}`,
      { timeout: 8000 }
    )
    return <InviteClientPage initialData={data.data} token={params.token} />
  } catch (err: any) {
    if (err?.response?.status === 404) notFound()
    // Fallback: пусть клиент сам запросит
    return <InviteClientPage initialData={null} token={params.token} />
  }
}

import { NextResponse } from 'next/server'
import { getParticipants, cancelParticipant } from '@/services/dashboard.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || undefined
  const status = (searchParams.get('status') as any) || 'ALL'

  const list = await getParticipants({ search, status })
  return NextResponse.json(list)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { participant_id } = await req.json()
    if (!participant_id) {
      return NextResponse.json({ error: 'Participant ID wajib diisi.' }, { status: 400 })
    }

    const updated = await cancelParticipant(participant_id)
    return NextResponse.json({ success: true, participant: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

import { db } from '@/lib/db'

export type CheckInResultCode = 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID_TOKEN' | 'CANCELLED'

export async function processCheckInByToken(qrToken: string) {
  const participant = await db.participant.findUnique({
    where: { qr_token: qrToken },
  })

  if (!participant) {
    return {
      resultCode: 'INVALID_TOKEN' as CheckInResultCode,
      message: 'QR Code tidak valid atau tidak terdaftar.',
      participant: null,
    }
  }

  if (participant.status === 'CANCELLED') {
    return {
      resultCode: 'CANCELLED' as CheckInResultCode,
      message: 'Pendaftaran peserta ini telah dibatalkan (CANCELLED).',
      participant,
    }
  }

  if (participant.status === 'CHECKED_IN') {
    return {
      resultCode: 'ALREADY_CHECKED_IN' as CheckInResultCode,
      message: `Peserta sudah melakukan check-in sebelumnya.`,
      participant,
    }
  }

  const updated = await db.participant.update({
    where: { id: participant.id },
    data: {
      status: 'CHECKED_IN',
      checked_in_at: new Date(),
    },
  })

  return {
    resultCode: 'SUCCESS' as CheckInResultCode,
    message: 'Check-in berhasil!',
    participant: updated,
  }
}

export async function processManualCheckIn(participantId: string) {
  const participant = await db.participant.findUnique({
    where: { id: participantId },
  })

  if (!participant) {
    throw new Error('Peserta tidak ditemukan.')
  }

  if (participant.status === 'CANCELLED') {
    throw new Error('Peserta yang dibatalkan tidak dapat di-check-in.')
  }

  return await db.participant.update({
    where: { id: participantId },
    data: {
      status: 'CHECKED_IN',
      checked_in_at: new Date(),
    },
  })
}

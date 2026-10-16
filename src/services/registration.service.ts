import { db } from '@/lib/db'
import { ChurchStatus } from '@prisma/client'
import { sendWhatsAppTicketQr } from './whatsapp.service'
import crypto from 'crypto'

export interface SingleParticipantInput {
  full_name: string
  whatsapp_number: string
  church_status: ChurchStatus
  church_branch?: string
  is_child?: boolean
  is_wa_opt_in: boolean
}

export async function registerParticipant(input: SingleParticipantInput) {
  const result = await registerBatchParticipants([input])
  return result[0]
}

export async function registerBatchParticipants(inputs: SingleParticipantInput[]) {
  if (!inputs || inputs.length === 0) {
    throw new Error('Data peserta tidak boleh kosong.')
  }

  const primaryWA = inputs[0].whatsapp_number ? inputs[0].whatsapp_number.trim() : ''
  if (!primaryWA && !inputs[0].is_child) {
    throw new Error('Nomor WhatsApp pendaftar utama wajib diisi.')
  }

  // Assign primary WA to children and sanitize inputs
  const sanitizedInputs = inputs.map((item, idx) => {
    const isChild = Boolean(item.is_child)
    const targetWA = isChild ? primaryWA : (item.whatsapp_number ? item.whatsapp_number.trim() : '')

    if (!targetWA) {
      throw new Error(`Nomor WhatsApp untuk peserta ke-${idx + 1} (${item.full_name}) wajib diisi.`)
    }

    if (!item.is_wa_opt_in) {
      throw new Error(`Persetujuan WhatsApp wajib dicentang untuk peserta ${item.full_name}.`)
    }

    return {
      ...item,
      full_name: item.full_name.trim(),
      whatsapp_number: targetWA,
      is_child: isChild,
    }
  })

  // Check quota for the entire batch
  const maxQuotaConfig = await db.systemConfig.findUnique({
    where: { key: 'max_online_quota' },
  })
  const maxQuota = maxQuotaConfig ? parseInt(maxQuotaConfig.value, 10) : 400

  const currentCount = await db.participant.count({
    where: {
      registration_type: 'ONLINE',
      status: { in: ['REGISTERED', 'CHECKED_IN'] },
    },
  })

  if (currentCount + sanitizedInputs.length > maxQuota) {
    if (sanitizedInputs.length === 1) {
      throw new Error('Kuota pendaftaran online telah penuh.')
    }
    throw new Error('Kuota pendaftaran online tidak mencukupi untuk jumlah peserta ini.')
  }

  // Validate duplicate for each participant in batch
  for (const participantData of sanitizedInputs) {
    const existing = await db.participant.findFirst({
      where: {
        full_name: participantData.full_name,
        whatsapp_number: participantData.whatsapp_number,
        status: { in: ['REGISTERED', 'CHECKED_IN'] },
      },
    })

    if (existing) {
      throw new Error(`Peserta dengan Nama "${participantData.full_name}" dan Nomor WhatsApp tersebut sudah terdaftar.`)
    }
  }

  // Create participants
  const createdParticipants = []

  for (const item of sanitizedInputs) {
    const qr_token = crypto.randomUUID()
    const participant = await db.participant.create({
      data: {
        full_name: item.full_name,
        whatsapp_number: item.whatsapp_number,
        church_status: item.church_status,
        church_branch: item.church_branch?.trim() || null,
        is_child: item.is_child,
        is_wa_opt_in: item.is_wa_opt_in,
        qr_token,
        status: 'REGISTERED',
        registration_type: 'ONLINE',
      },
    })

    // Send Mock WA QR Media Message
    await sendWhatsAppTicketQr(
      participant.whatsapp_number,
      participant.full_name,
      qr_token
    )

    createdParticipants.push(participant)
  }

  return createdParticipants
}

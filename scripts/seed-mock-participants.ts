import { db } from '../src/lib/db'
import crypto from 'crypto'

const mockData = [
  {
    full_name: 'Budi Santoso',
    whatsapp_number: '081234567801',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Pusat',
    is_child: false,
    status: 'REGISTERED',
    registration_type: 'ONLINE',
  },
  {
    full_name: 'Maria Magdalena',
    whatsapp_number: '081234567802',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Pusat',
    is_child: false,
    status: 'CHECKED_IN',
    registration_type: 'ONLINE',
    checked_in_at: new Date(),
  },
  {
    full_name: 'Jonathan Kevin',
    whatsapp_number: '081234567803',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Barat',
    is_child: false,
    status: 'REGISTERED',
    registration_type: 'ONLINE',
  },
  {
    full_name: 'Daniel Wijaya',
    whatsapp_number: '081234567804',
    church_status: 'TIDAK_BERGEREJA',
    church_branch: null,
    is_child: false,
    status: 'REGISTERED',
    registration_type: 'ONLINE',
  },
  {
    full_name: 'Samuel Prasetyo',
    whatsapp_number: '081234567805',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Pusat',
    is_child: false,
    status: 'CHECKED_IN',
    registration_type: 'ON_SITE',
    checked_in_at: new Date(),
  },
  {
    full_name: 'Timothy Prasetyo',
    whatsapp_number: '081234567805',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Pusat',
    is_child: true,
    status: 'CHECKED_IN',
    registration_type: 'ON_SITE',
    checked_in_at: new Date(),
  },
  {
    full_name: 'Ruth Anggraini',
    whatsapp_number: '081234567807',
    church_status: 'BERGEREJA',
    church_branch: 'GBI Glow',
    is_child: false,
    status: 'REGISTERED',
    registration_type: 'ONLINE',
  },
  {
    full_name: 'Deborah Natalia',
    whatsapp_number: '081234567808',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Selatan',
    is_child: false,
    status: 'CANCELLED',
    registration_type: 'ONLINE',
  },
  {
    full_name: 'Andreas Surya',
    whatsapp_number: '081234567809',
    church_status: 'TIDAK_BERGEREJA',
    church_branch: null,
    is_child: false,
    status: 'CHECKED_IN',
    registration_type: 'ONLINE',
    checked_in_at: new Date(),
  },
  {
    full_name: 'Hanna Christiana',
    whatsapp_number: '081234567810',
    church_status: 'BERGEREJA',
    church_branch: 'JKI Shema Timur',
    is_child: false,
    status: 'REGISTERED',
    registration_type: 'ONLINE',
  },
]

async function insertMock() {
  console.log('Inserting 10 mock participants to database...')
  for (const item of mockData) {
    const existing = await db.participant.findFirst({
      where: {
        full_name: item.full_name,
        whatsapp_number: item.whatsapp_number,
      },
    })

    let res
    if (existing) {
      res = await db.participant.update({
        where: { id: existing.id },
        data: {
          status: item.status as any,
          checked_in_at: item.checked_in_at,
        },
      })
    } else {
      res = await db.participant.create({
        data: {
          ...item,
          church_status: item.church_status as any,
          status: item.status as any,
          registration_type: item.registration_type as any,
          qr_token: crypto.randomUUID(),
          is_wa_opt_in: true,
        },
      })
    }
    console.log(`Inserted: ${res.full_name} (${res.status}) [QR: ${res.qr_token.slice(0, 8)}]`)
  }

  const count = await db.participant.count()
  console.log(`\nDone! Total participants now: ${count}`)
}

insertMock()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect()
  })

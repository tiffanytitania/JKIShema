import { registerParticipant } from '@/services/registration.service'
import { db } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Registration Service (Single Participant)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should reject registration if duplicate Name + WA is found', async () => {
    (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
    (db.participant.count as jest.Mock).mockResolvedValue(10);
    (db.participant.findFirst as jest.Mock).mockResolvedValue({
      id: 'p1',
      full_name: 'Budi Santoso',
      whatsapp_number: '08123456789',
      status: 'REGISTERED',
    })

    await expect(
      registerParticipant({
        full_name: 'Budi Santoso',
        whatsapp_number: '08123456789',
        church_status: 'BERGEREJA',
        church_branch: 'JKI Shema Pusat',
        is_wa_opt_in: true,
      })
    ).rejects.toThrow('Peserta dengan Nama "Budi Santoso" dan Nomor WhatsApp tersebut sudah terdaftar.')
  })

  it('should allow re-registration if existing participant has status CANCELLED', async () => {
    (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
    (db.participant.count as jest.Mock).mockResolvedValue(10);
    (db.participant.findFirst as jest.Mock).mockResolvedValue(null);
    (db.participant.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({
      id: 'p-new-777',
      ...data,
      qr_token: 'new-qr-token-777',
      status: 'REGISTERED',
      registration_type: 'ONLINE',
      created_at: new Date(),
    }));

    const result = await registerParticipant({
      full_name: 'Budi Santoso',
      whatsapp_number: '08123456789',
      church_status: 'BERGEREJA',
      is_wa_opt_in: true,
    })

    expect(result.id).toBe('p-new-777')
    expect(result.qr_token).toBe('new-qr-token-777')
    expect(db.participant.findFirst).toHaveBeenCalledWith({
      where: {
        full_name: 'Budi Santoso',
        whatsapp_number: '08123456789',
        status: { in: ['REGISTERED', 'CHECKED_IN'] },
      },
    })
    expect(db.participant.create).toHaveBeenCalled()
  })

  it('should reject registration if max quota is reached', async () => {
    (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
    (db.participant.count as jest.Mock).mockResolvedValue(400)

    await expect(
      registerParticipant({
        full_name: 'Budi Santoso',
        whatsapp_number: '08123456789',
        church_status: 'BERGEREJA',
        is_wa_opt_in: true,
      })
    ).rejects.toThrow('Kuota pendaftaran online telah penuh.')
  })

  it('should successfully register participant and generate qr_token', async () => {
    (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
    (db.participant.count as jest.Mock).mockResolvedValue(10);
    (db.participant.findFirst as jest.Mock).mockResolvedValue(null);
    (db.participant.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({
      id: 'p123',
      ...data,
      qr_token: 'mock-qr-uuid-1234',
      status: 'REGISTERED',
      registration_type: 'ONLINE',
      created_at: new Date(),
    }))

    const result = await registerParticipant({
      full_name: 'Budi Santoso',
      whatsapp_number: '08123456789',
      church_status: 'BERGEREJA',
      church_branch: 'Cabang Utama',
      is_wa_opt_in: true,
    })

    expect(result.qr_token).toBeDefined()
    expect(result.full_name).toBe('Budi Santoso')
    expect(db.participant.create).toHaveBeenCalled()
  })
})

import { cancelParticipant } from '@/services/dashboard.service'
import { processCheckInByToken, processManualCheckIn } from '@/services/checkin.service'
import { registerParticipant } from '@/services/registration.service'
import { PATCH as participantsPatch } from '@/app/api/admin/participants/route'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'

jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('Cancel Participant Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Service Logic (cancelParticipant)', () => {
    it('cancels a REGISTERED participant and updates status to CANCELLED', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-1',
        full_name: 'Yohanes',
        status: 'REGISTERED',
      });
      (db.participant.update as jest.Mock).mockResolvedValue({
        id: 'part-1',
        full_name: 'Yohanes',
        status: 'CANCELLED',
      });

      const res = await cancelParticipant('part-1')

      expect(res.status).toBe('CANCELLED')
      expect(db.participant.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { status: 'CANCELLED' },
      })
    })

    it('rejects cancellation of a CHECKED_IN participant', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-2',
        full_name: 'Maria',
        status: 'CHECKED_IN',
      });

      await expect(cancelParticipant('part-2')).rejects.toThrow(
        'Peserta yang sudah Check-In tidak dapat dibatalkan.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })

    it('rejects cancellation if already CANCELLED', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-3',
        full_name: 'Markus',
        status: 'CANCELLED',
      });

      await expect(cancelParticipant('part-3')).rejects.toThrow(
        'Peserta ini sudah dibatalkan sebelumnya.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })

    it('rejects cancellation if participant does not exist', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(cancelParticipant('non-existent')).rejects.toThrow(
        'Peserta tidak ditemukan.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })
  })

  describe('Check-In Validation on Cancelled Tickets', () => {
    it('scanning a CANCELLED ticket returns CANCELLED and never updates status to CHECKED_IN', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-cancelled',
        full_name: 'Lukas',
        status: 'CANCELLED',
        qr_token: 'qr-lukas-cancelled',
      });

      const result = await processCheckInByToken('qr-lukas-cancelled')

      expect(result.resultCode).toBe('CANCELLED')
      expect(result.participant?.status).toBe('CANCELLED')
      expect(db.participant.update).not.toHaveBeenCalled()
    })

    it('manual check-in of a CANCELLED participant throws an error', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-cancelled',
        full_name: 'Lukas',
        status: 'CANCELLED',
      });

      await expect(processManualCheckIn('part-cancelled')).rejects.toThrow(
        'Peserta yang dibatalkan tidak dapat di-check-in.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })
  })

  describe('Re-Registration Flow', () => {
    it('allows a previously CANCELLED participant to register again with same Name and WA', async () => {
      (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
      (db.participant.count as jest.Mock).mockResolvedValue(20);
      // findFirst returns null because active query filters status: { in: ['REGISTERED', 'CHECKED_IN'] }
      (db.participant.findFirst as jest.Mock).mockResolvedValue(null);
      (db.participant.create as jest.Mock).mockResolvedValue({
        id: 'part-new',
        full_name: 'Lukas',
        whatsapp_number: '08123456789',
        qr_token: 'qr-new-token',
        status: 'REGISTERED',
      });

      const newRegistration = await registerParticipant({
        full_name: 'Lukas',
        whatsapp_number: '08123456789',
        church_status: 'BERGEREJA',
        is_wa_opt_in: true,
      })

      expect(newRegistration.id).toBe('part-new')
      expect(newRegistration.qr_token).toBe('qr-new-token')
      expect(db.participant.create).toHaveBeenCalled()
    })

    it('blocks duplicate registration if an active (REGISTERED/CHECKED_IN) participant already exists', async () => {
      (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
      (db.participant.count as jest.Mock).mockResolvedValue(20);
      (db.participant.findFirst as jest.Mock).mockResolvedValue({
        id: 'part-existing',
        full_name: 'Lukas',
        whatsapp_number: '08123456789',
        status: 'REGISTERED',
      });

      await expect(
        registerParticipant({
          full_name: 'Lukas',
          whatsapp_number: '08123456789',
          church_status: 'BERGEREJA',
          is_wa_opt_in: true,
        })
      ).rejects.toThrow('sudah terdaftar')

      expect(db.participant.create).not.toHaveBeenCalled()
    })
  })

  describe('API Endpoints (Authentication & Permissions)', () => {
    it('PATCH /api/admin/participants returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/participants', {
        method: 'PATCH',
        body: JSON.stringify({ participant_id: 'part-1' }),
      })

      const res = await participantsPatch(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('PATCH /api/admin/participants successfully cancels when authenticated as admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { name: 'admin', role: 'ADMIN' },
      });
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-1',
        full_name: 'Yohanes',
        status: 'REGISTERED',
      });
      (db.participant.update as jest.Mock).mockResolvedValue({
        id: 'part-1',
        full_name: 'Yohanes',
        status: 'CANCELLED',
      });

      const req = new Request('http://localhost/api/admin/participants', {
        method: 'PATCH',
        body: JSON.stringify({ participant_id: 'part-1' }),
      })

      const res = await participantsPatch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.participant.status).toBe('CANCELLED')
    })

    it('PATCH /api/admin/participants returns 400 when participant_id is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { name: 'admin', role: 'ADMIN' },
      });

      const req = new Request('http://localhost/api/admin/participants', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const res = await participantsPatch(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Participant ID wajib diisi.')
    })

    it('PATCH /api/admin/participants returns 400 when cancellation fails', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { name: 'admin', role: 'ADMIN' },
      });
      (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/participants', {
        method: 'PATCH',
        body: JSON.stringify({ participant_id: 'invalid-id' }),
      })

      const res = await participantsPatch(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Peserta tidak ditemukan.')
    })
  })
})

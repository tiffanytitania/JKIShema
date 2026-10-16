import { processCheckInByToken, processManualCheckIn } from '@/services/checkin.service'
import { db } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('Check-In Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully check-in a REGISTERED participant (Green)', async () => {
    const mockParticipant = {
      id: 'p123',
      full_name: 'Budi Santoso',
      status: 'REGISTERED',
      qr_token: 'valid-qr-123',
    };

    (db.participant.findUnique as jest.Mock).mockResolvedValue(mockParticipant);
    (db.participant.update as jest.Mock).mockResolvedValue({
      ...mockParticipant,
      status: 'CHECKED_IN',
      checked_in_at: new Date(),
    })

    const result = await processCheckInByToken('valid-qr-123')

    expect(result.resultCode).toBe('SUCCESS')
    expect(result.participant?.full_name).toBe('Budi Santoso')
    expect(db.participant.update).toHaveBeenCalledWith({
      where: { id: 'p123' },
      data: expect.objectContaining({ status: 'CHECKED_IN' }),
    })
  })

  it('should return ALREADY_CHECKED_IN warning if participant checked in previously (Yellow)', async () => {
    const mockParticipant = {
      id: 'p123',
      full_name: 'Budi Santoso',
      status: 'CHECKED_IN',
      qr_token: 'valid-qr-123',
      checked_in_at: new Date('2026-12-25T10:00:00Z'),
    };

    (db.participant.findUnique as jest.Mock).mockResolvedValue(mockParticipant)

    const result = await processCheckInByToken('valid-qr-123')

    expect(result.resultCode).toBe('ALREADY_CHECKED_IN')
    expect(result.participant?.full_name).toBe('Budi Santoso')
    expect(db.participant.update).not.toHaveBeenCalled()
  })

  it('should return INVALID_TOKEN error if qr_token does not exist (Red)', async () => {
    (db.participant.findUnique as jest.Mock).mockResolvedValue(null)

    const result = await processCheckInByToken('invalid-qr-xyz')

    expect(result.resultCode).toBe('INVALID_TOKEN')
    expect(result.participant).toBeNull()
  })

  it('should process manual check-in by participant ID', async () => {
    const mockParticipant = {
      id: 'p999',
      full_name: 'Siti Rahma',
      status: 'REGISTERED',
    };

    (db.participant.findUnique as jest.Mock).mockResolvedValue(mockParticipant);
    (db.participant.update as jest.Mock).mockResolvedValue({
      ...mockParticipant,
      status: 'CHECKED_IN',
    })

    const result = await processManualCheckIn('p999')

    expect(result.status).toBe('CHECKED_IN')
    expect(db.participant.update).toHaveBeenCalledWith({
      where: { id: 'p999' },
      data: expect.objectContaining({ status: 'CHECKED_IN' }),
    })
  })

  it('should return CANCELLED result and not update status when scanning a CANCELLED participant QR code', async () => {
    const mockCancelledParticipant = {
      id: 'p777',
      full_name: 'Budi Batal',
      status: 'CANCELLED',
      qr_token: 'cancelled-qr-777',
    };

    (db.participant.findUnique as jest.Mock).mockResolvedValue(mockCancelledParticipant)

    const result = await processCheckInByToken('cancelled-qr-777')

    expect(result.resultCode).toBe('CANCELLED')
    expect(result.message).toContain('dibatalkan')
    expect(result.participant?.status).toBe('CANCELLED')
    expect(db.participant.update).not.toHaveBeenCalled()
  })

  it('should reject manual check-in if participant has status CANCELLED', async () => {
    const mockCancelledParticipant = {
      id: 'p777',
      full_name: 'Budi Batal',
      status: 'CANCELLED',
    };

    (db.participant.findUnique as jest.Mock).mockResolvedValue(mockCancelledParticipant)

    await expect(processManualCheckIn('p777')).rejects.toThrow(
      'Peserta yang dibatalkan tidak dapat di-check-in.'
    )
    expect(db.participant.update).not.toHaveBeenCalled()
  })
})

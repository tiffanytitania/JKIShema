import { getDashboardStats, getParticipants, cancelParticipant } from '@/services/dashboard.service'
import { db } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Admin Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should compute real-time quota and attendance statistics correctly', async () => {
    (db.systemConfig.findUnique as jest.Mock).mockResolvedValue({ value: '400' });
    
    // Mocking counts for totalRegistered, onlineCount, onSiteCount, checkedInCount, cancelledCount
    (db.participant.count as jest.Mock)
      .mockResolvedValueOnce(250) // total registered
      .mockResolvedValueOnce(230) // online count
      .mockResolvedValueOnce(20)  // on-site count
      .mockResolvedValueOnce(150) // checked-in count
      .mockResolvedValueOnce(5)   // cancelled count

    const stats = await getDashboardStats()

    expect(stats.totalCapacity).toBe(440)
    expect(stats.totalRegistered).toBe(250)
    expect(stats.onlineCount).toBe(230)
    expect(stats.onSiteCount).toBe(20)
    expect(stats.checkedInCount).toBe(150)
    expect(stats.cancelledCount).toBe(5)
    expect(stats.remainingOnlineQuota).toBe(170) // 400 - 230
  })

  it('should query participants with search and status filtering', async () => {
    const mockList = [
      {
        id: '1',
        full_name: 'Budi Santoso',
        whatsapp_number: '08123456789',
        status: 'REGISTERED',
      },
    ];

    (db.participant.findMany as jest.Mock).mockResolvedValue(mockList)

    const result = await getParticipants({ search: 'Budi', status: 'REGISTERED' })

    expect(result).toHaveLength(1)
    expect(db.participant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'REGISTERED',
          OR: expect.arrayContaining([
            { full_name: { contains: 'Budi', mode: 'insensitive' } },
            { whatsapp_number: { contains: 'Budi' } },
          ]),
        }),
      })
    )
  })

  describe('cancelParticipant', () => {
    it('should successfully cancel a REGISTERED participant', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        full_name: 'Budi Santoso',
        status: 'REGISTERED',
      });
      (db.participant.update as jest.Mock).mockResolvedValue({
        id: 'p1',
        full_name: 'Budi Santoso',
        status: 'CANCELLED',
      });

      const result = await cancelParticipant('p1')

      expect(result.status).toBe('CANCELLED')
      expect(db.participant.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'CANCELLED' },
      })
    })

    it('should throw error when cancelling a CHECKED_IN participant', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'p2',
        full_name: 'Ani',
        status: 'CHECKED_IN',
      });

      await expect(cancelParticipant('p2')).rejects.toThrow(
        'Peserta yang sudah Check-In tidak dapat dibatalkan.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })

    it('should throw error when participant is already CANCELLED', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'p3',
        full_name: 'Candra',
        status: 'CANCELLED',
      });

      await expect(cancelParticipant('p3')).rejects.toThrow(
        'Peserta ini sudah dibatalkan sebelumnya.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })

    it('should throw error when participant is not found', async () => {
      (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(cancelParticipant('p404')).rejects.toThrow(
        'Peserta tidak ditemukan.'
      )
      expect(db.participant.update).not.toHaveBeenCalled()
    })
  })
})


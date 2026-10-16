import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminConfirmModal from '@/components/AdminConfirmModal'
import AdminDashboardPage from '@/app/admin/page'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  useSession: jest.fn(() => ({ data: { user: { name: 'Admin' } }, status: 'authenticated' })),
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>
})

describe('AdminConfirmModal Component', () => {
  const mockParticipant = {
    id: 'part-1',
    full_name: 'Budi Santoso',
    whatsapp_number: '08123456789',
  }

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AdminConfirmModal
        isOpen={false}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={false}
        errorMessage={null}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders Cancel Participant modal with participant details, explanation, and buttons', () => {
    render(
      <AdminConfirmModal
        isOpen={true}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={false}
        errorMessage={null}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    )

    // Check dialog semantics
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    // Check participant details
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    expect(screen.getByText('08123456789')).toBeInTheDocument()

    // Check explanation of quota restoration and QR invalidation
    expect(screen.getByText(/otomatis dipulihkan/i)).toBeInTheDocument()
    expect(screen.getByText(/dinonaktifkan/i)).toBeInTheDocument()

    // Check buttons
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm Cancellation/i })).toBeInTheDocument()
  })

  it('renders Manual Check-In modal with participant details, explanation, and buttons', () => {
    render(
      <AdminConfirmModal
        isOpen={true}
        action="CHECK_IN"
        participant={mockParticipant}
        isLoading={false}
        errorMessage={null}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    )

    // Check participant details
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    expect(screen.getByText('08123456789')).toBeInTheDocument()

    // Check explanation
    expect(screen.getByText(/Sudah Check-In/i)).toBeInTheDocument()

    // Check buttons
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm Check-In/i })).toBeInTheDocument()
  })

  it('triggers onClose when Back button is clicked', () => {
    const onClose = jest.fn()
    render(
      <AdminConfirmModal
        isOpen={true}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={false}
        errorMessage={null}
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Back/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('triggers onClose when Escape key is pressed', () => {
    const onClose = jest.fn()
    render(
      <AdminConfirmModal
        isOpen={true}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={false}
        errorMessage={null}
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('triggers onConfirm when Confirm button is clicked', () => {
    const onConfirm = jest.fn()
    render(
      <AdminConfirmModal
        isOpen={true}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={false}
        errorMessage={null}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Confirm Cancellation/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables buttons and prevents closing while isLoading is true', () => {
    const onClose = jest.fn()
    const onConfirm = jest.fn()

    render(
      <AdminConfirmModal
        isOpen={true}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={true}
        errorMessage={null}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    )

    const backButton = screen.getByRole('button', { name: /Back/i })
    const confirmButton = screen.getByRole('button', { name: /Processing/i })

    expect(backButton).toBeDisabled()
    expect(confirmButton).toBeDisabled()
    expect(screen.getByText('Memproses...')).toBeInTheDocument()

    // Escape does not close when loading
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('displays error message inside modal when errorMessage is present', () => {
    render(
      <AdminConfirmModal
        isOpen={true}
        action="CANCEL"
        participant={mockParticipant}
        isLoading={false}
        errorMessage="Peserta tidak ditemukan."
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    )

    const alertBox = screen.getByRole('alert')
    expect(alertBox).toHaveTextContent('Peserta tidak ditemukan.')
  })
})

describe('Admin Dashboard Modal Flow Integration', () => {
  const originalFetch = global.fetch
  const mockFetch = jest.fn()

  const mockStats = {
    totalCapacity: 440,
    maxOnlineQuota: 400,
    totalRegistered: 10,
    onlineCount: 8,
    onSiteCount: 2,
    checkedInCount: 3,
    cancelledCount: 1,
    remainingOnlineQuota: 392,
  }

  const mockParticipants = [
    {
      id: 'part-registered-1',
      full_name: 'Yohanes Prasetyo',
      whatsapp_number: '08123456789',
      church_status: 'BERGEREJA',
      church_branch: 'JKI Shema',
      is_child: false,
      qr_token: 'token-registered-1',
      status: 'REGISTERED',
      registration_type: 'ONLINE',
      created_at: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockStats,
        })
      }
      if (url.includes('/api/admin/participants')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockParticipants,
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('opens Cancel modal on Batalkan click, cancels request when Back is clicked', async () => {
    render(<AdminDashboardPage />)

    // Wait for participants to load
    await waitFor(() => {
      expect(screen.getByText('Yohanes Prasetyo')).toBeInTheDocument()
    })

    // Click Batalkan in table
    const batalkanBtn = screen.getByRole('button', { name: 'Batalkan' })
    fireEvent.click(batalkanBtn)

    // Verify modal is open with details
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Informasi Pembatalan/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm Cancellation/i })).toBeInTheDocument()

    // Click Back
    const backBtn = screen.getByRole('button', { name: /Back/i })
    fireEvent.click(backBtn)

    // Verify modal is closed and PATCH was NOT called
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalledWith('/api/admin/participants', expect.objectContaining({ method: 'PATCH' }))
  })

  it('completes Cancel Participant flow via PATCH on Confirm Cancellation', async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/admin/dashboard')) {
        return Promise.resolve({ ok: true, json: async () => mockStats })
      }
      if (url.includes('/api/admin/participants') && opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, participant: { id: 'part-registered-1', status: 'CANCELLED' } }),
        })
      }
      if (url.includes('/api/admin/participants')) {
        return Promise.resolve({ ok: true, json: async () => mockParticipants })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Yohanes Prasetyo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Click Confirm Cancellation
    fireEvent.click(screen.getByRole('button', { name: /Confirm Cancellation/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/participants',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_id: 'part-registered-1' }),
        })
      )
    })

    // Modal closes and success banner appears
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/berhasil dibatalkan! Kuota telah dipulihkan/i)).toBeInTheDocument()
  })

  it('shows error inside modal on Cancel Participant failure without closing modal', async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/admin/dashboard')) {
        return Promise.resolve({ ok: true, json: async () => mockStats })
      }
      if (url.includes('/api/admin/participants') && opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Gagal membatalkan: peserta sudah check-in.' }),
        })
      }
      if (url.includes('/api/admin/participants')) {
        return Promise.resolve({ ok: true, json: async () => mockParticipants })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Yohanes Prasetyo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm Cancellation/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Gagal membatalkan: peserta sudah check-in.')
    })
    // Modal stays open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('completes Manual Check-In flow via PUT on Confirm Check-In', async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/admin/dashboard')) {
        return Promise.resolve({ ok: true, json: async () => mockStats })
      }
      if (url.includes('/api/admin/checkin') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, participant: { id: 'part-registered-1', status: 'CHECKED_IN' } }),
        })
      }
      if (url.includes('/api/admin/participants')) {
        return Promise.resolve({ ok: true, json: async () => mockParticipants })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Yohanes Prasetyo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Check-In Manual' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Informasi Check-In/i)).toBeInTheDocument()

    // Click Confirm Check-In
    fireEvent.click(screen.getByRole('button', { name: /Confirm Check-In/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/checkin',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_id: 'part-registered-1' }),
        })
      )
    })

    // Modal closes and success banner appears
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/Manual Check-in berhasil untuk Yohanes Prasetyo/i)).toBeInTheDocument()
  })
})

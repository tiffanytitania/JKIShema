import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegisterPage from '@/app/register/page'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('RegisterPage End-to-End Registration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders registration form, submits participant data, and renders visual QR code with download button', async () => {
    const mockReturnedParticipant = {
      id: 'participant-uuid-1',
      full_name: 'Tiffany Titania',
      whatsapp_number: '081234567890',
      church_status: 'BERGEREJA',
      church_branch: 'JKI Shema Pusat',
      is_child: false,
      is_wa_opt_in: true,
      qr_token: '11112222-3333-4444-5555-666677778888',
      status: 'REGISTERED',
      registration_type: 'ONLINE',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [mockReturnedParticipant],
      }),
    })

    render(<RegisterPage />)

    // Form inputs
    const nameInput = screen.getByPlaceholderText('Masukkan nama lengkap')
    const waInput = screen.getByPlaceholderText('Contoh: 081234567890')
    const optInCheckbox = screen.getByLabelText(/Menyetujui pengiriman pesan konfirmasi/i)
    const submitBtn = screen.getByRole('button', { name: /Kirim Pendaftaran/i })

    // Fill form
    fireEvent.change(nameInput, { target: { value: 'Tiffany Titania' } })
    fireEvent.change(waInput, { target: { value: '081234567890' } })
    // optIn is checked by default, verify it
    expect(optInCheckbox).toBeChecked()

    // Submit form
    fireEvent.click(submitBtn)

    // Verify loading or API call
    expect(mockFetch).toHaveBeenCalledWith('/api/register', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))

    // Wait for success screen
    await waitFor(() => {
      expect(screen.getByText('Pendaftaran Berhasil!')).toBeInTheDocument()
    })

    // Verify ticket details
    expect(screen.getByText('Tiffany Titania')).toBeInTheDocument()
    expect(screen.getByTestId('ticket-code-text')).toHaveTextContent(
      '11112222-3333-4444-5555-666677778888'
    )

    // Verify visual QR Code is generated
    await waitFor(
      () => {
        const qrImage = screen.getByTestId('qr-image')
        expect(qrImage).toBeInTheDocument()
        expect(qrImage.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
      },
      { timeout: 4000 }
    )

    // Verify Download QR Code button
    const downloadBtn = screen.getByTestId('download-qr-btn')
    expect(downloadBtn).toBeInTheDocument()
    expect(downloadBtn.getAttribute('download')).toBe(
      'tiket-jki-shema-11112222-3333-4444-5555-666677778888.png'
    )
    expect(downloadBtn.getAttribute('href')).toMatch(/^data:image\/png;base64,/)
  })
})

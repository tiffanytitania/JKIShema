import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import TicketCard from '@/components/TicketCard'

describe('TicketCard Component', () => {
  const mockParticipant = {
    id: 'p-1',
    full_name: 'Tiffany Titania',
    whatsapp_number: '081234567890',
    qr_token: '550e8400-e29b-41d4-a716-446655440000',
    is_child: false,
  }

  it('renders participant details and readable ticket code', async () => {
    render(<TicketCard participant={mockParticipant} />)

    expect(screen.getByText('Tiffany Titania')).toBeInTheDocument()
    expect(screen.getByText(/081234567890/)).toBeInTheDocument()
    expect(screen.getByTestId('ticket-code-text')).toHaveTextContent(mockParticipant.qr_token)
  })

  it('renders child badge if participant is a child', () => {
    render(
      <TicketCard
        participant={{
          ...mockParticipant,
          full_name: 'Anak Tiffany',
          is_child: true,
        }}
      />
    )

    expect(screen.getByText('Anak')).toBeInTheDocument()
  })

  it('generates scannable QR Code image and download button with correct filename', async () => {
    render(<TicketCard participant={mockParticipant} />)

    // Wait for QR Code image to be generated and rendered
    await waitFor(
      () => {
        const img = screen.getByTestId('qr-image')
        expect(img).toBeInTheDocument()
        expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
      },
      { timeout: 4000 }
    )

    // Check download button
    const downloadBtn = screen.getByTestId('download-qr-btn')
    expect(downloadBtn).toBeInTheDocument()
    expect(downloadBtn.getAttribute('download')).toBe(
      `tiket-jki-shema-${mockParticipant.qr_token}.png`
    )
    expect(downloadBtn.getAttribute('href')).toMatch(/^data:image\/png;base64,/)
  })

  it('handles empty qr_token gracefully with error message', async () => {
    render(
      <TicketCard
        participant={{
          ...mockParticipant,
          qr_token: '',
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('qr-error')).toBeInTheDocument()
      expect(screen.getByText('Kode tiket tidak ditemukan.')).toBeInTheDocument()
    })
  })
})

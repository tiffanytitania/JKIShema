import {
  getTicketQrPayload,
  generateTicketQrBuffer,
  generateTicketQrDataUrl,
} from '@/services/qrcode.service'

describe('QR Code Service', () => {
  const sampleToken = '550e8400-e29b-41d4-a716-446655440000'

  it('should return the trimmed raw token as canonical payload', () => {
    expect(getTicketQrPayload(sampleToken)).toBe(sampleToken)
    expect(getTicketQrPayload(`  ${sampleToken}  `)).toBe(sampleToken)
  })

  it('should throw an error for empty or invalid token', () => {
    expect(() => getTicketQrPayload('')).toThrow('QR Token must be a non-empty string.')
    // @ts-expect-error testing invalid input
    expect(() => getTicketQrPayload(null)).toThrow('QR Token must be a non-empty string.')
  })

  it('should generate a valid PNG Buffer for WhatsApp Cloud API upload', async () => {
    const buffer = await generateTicketQrBuffer(sampleToken)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(100)
    // Check PNG signature: 0x89 0x50 0x4E 0x47 (\x89PNG)
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50)
    expect(buffer[2]).toBe(0x4e)
    expect(buffer[3]).toBe(0x47)
  })

  it('should generate a valid data URL containing base64 PNG', async () => {
    const dataUrl = await generateTicketQrDataUrl(sampleToken)
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    expect(dataUrl.length).toBeGreaterThan(200)
  })
})

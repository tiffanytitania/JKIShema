import QRCode from 'qrcode'

export interface QrCodeOptions {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  darkColor?: string
  lightColor?: string
}

export const DEFAULT_QR_OPTIONS: QrCodeOptions = {
  width: 600,
  margin: 2,
  errorCorrectionLevel: 'M',
  darkColor: '#000000',
  lightColor: '#ffffff',
}

/**
 * Returns the canonical QR code payload for a ticket.
 * The payload is the raw qr_token string (UUID), matching the existing
 * scanner parser in src/app/admin/scanner/page.tsx.
 */
export function getTicketQrPayload(qrToken: string): string {
  if (!qrToken || typeof qrToken !== 'string') {
    throw new Error('QR Token must be a non-empty string.')
  }
  return qrToken.trim()
}

/**
 * Generates a PNG Buffer of the QR code on the server side.
 * Suitable for WhatsApp Cloud API media upload (POST /media multipart/form-data)
 * without requiring permanent public storage.
 */
export async function generateTicketQrBuffer(
  qrToken: string,
  options?: QrCodeOptions
): Promise<Buffer> {
  const payload = getTicketQrPayload(qrToken)
  const opts = { ...DEFAULT_QR_OPTIONS, ...options }

  return QRCode.toBuffer(payload, {
    type: 'png',
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: {
      dark: opts.darkColor,
      light: opts.lightColor,
    },
  })
}

/**
 * Generates a PNG Data URL of the QR code (data:image/png;base64,...).
 * Can be used for server-side rendering or direct API responses.
 */
export async function generateTicketQrDataUrl(
  qrToken: string,
  options?: QrCodeOptions
): Promise<string> {
  const payload = getTicketQrPayload(qrToken)
  const opts = { ...DEFAULT_QR_OPTIONS, ...options }

  return QRCode.toDataURL(payload, {
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: {
      dark: opts.darkColor,
      light: opts.lightColor,
    },
  })
}

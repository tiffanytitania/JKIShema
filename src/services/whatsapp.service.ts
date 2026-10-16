import { generateTicketQrBuffer } from './qrcode.service'

export interface WhatsAppMessageResult {
  success: boolean
  to: string
  message: string
  media?: {
    filename: string
    mimeType: string
    sizeBytes: number
    buffer?: Buffer
  }
  timestamp: string
}

/**
 * Standard text messaging helper (mocked for Meta WhatsApp Cloud API).
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<WhatsAppMessageResult> {
  console.log(`[MOCK WA SERVICE] Sending to ${to}: "${text}"`)
  return {
    success: true,
    to,
    message: text,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Reusable utility preparing WhatsApp Cloud API delivery of the ticket QR code.
 *
 * Generates an in-memory PNG buffer of the QR code using the same canonical
 * ticket token payload used by the success screen and scanner.
 *
 * In production with real Meta WhatsApp Cloud API credentials, the returned
 * buffer will be uploaded via `POST /v19.0/{phone-number-id}/media`
 * and referenced in the media message payload.
 */
export async function prepareTicketQrMediaForWhatsApp(
  qrToken: string
): Promise<{ filename: string; mimeType: string; buffer: Buffer }> {
  const buffer = await generateTicketQrBuffer(qrToken)
  return {
    filename: `tiket-jki-shema-${qrToken.trim()}.png`,
    mimeType: 'image/png',
    buffer,
  }
}

/**
 * Mock sender simulating sending a ticket QR Code image directly to the participant.
 */
export async function sendWhatsAppTicketQr(
  to: string,
  participantName: string,
  qrToken: string
): Promise<WhatsAppMessageResult> {
  const { filename, mimeType, buffer } = await prepareTicketQrMediaForWhatsApp(qrToken)
  const caption = `Halo ${participantName}, berikut adalah QR Code tiket masuk Christmas Celebration JKI Shema Anda (Kode Tiket: ${qrToken.trim()}). Tunjukkan QR Code ini pada panitia saat tiba di lokasi acara.`

  console.log(
    `[MOCK WA SERVICE] Media message prepared for ${to} | Filename: ${filename} | Size: ${buffer.length} bytes | Caption: "${caption}"`
  )

  return {
    success: true,
    to,
    message: caption,
    media: {
      filename,
      mimeType,
      sizeBytes: buffer.length,
      buffer,
    },
    timestamp: new Date().toISOString(),
  }
}

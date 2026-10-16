'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export interface ParticipantTicketData {
  id?: string
  full_name: string
  whatsapp_number: string
  church_status?: string
  church_branch?: string | null
  is_child?: boolean
  qr_token: string
}

interface TicketCardProps {
  participant: ParticipantTicketData
}

export default function TicketCard({ participant }: TicketCardProps) {
  const payload = participant.qr_token ? participant.qr_token.trim() : ''
  const filename = `tiket-jki-shema-${payload || 'invalid'}.png`

  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(Boolean(payload))
  const [error, setError] = useState<string>(payload ? '' : 'Kode tiket tidak ditemukan.')

  useEffect(() => {
    let isMounted = true

    if (!payload) {
      return
    }

    QRCode.toDataURL(payload, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to generate QR code:', err)
          setError('Gagal membuat QR Code.')
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [payload])

  return (
    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 transition hover:border-slate-300">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base">{participant.full_name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">WA: {participant.whatsapp_number}</p>
        </div>
        {participant.is_child && (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Anak
          </span>
        )}
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
        {loading ? (
          <div
            data-testid="qr-loading"
            className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 gap-2"
          >
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Membuat QR Code...</span>
          </div>
        ) : error ? (
          <div
            data-testid="qr-error"
            className="w-48 h-48 flex flex-col items-center justify-center text-red-500 p-4 text-center gap-2"
          >
            <span className="text-2xl">⚠️</span>
            <span className="text-xs font-semibold">{error}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* White quiet-zone wrapper */}
            <div className="p-2 bg-white rounded-lg inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code Tiket ${participant.full_name}`}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-md"
                data-testid="qr-image"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tunjukkan QR ini saat check-in di lokasi</p>
          </div>
        )}
      </div>

      {/* Readable Ticket Code */}
      <div className="space-y-1 text-center">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Kode Tiket
        </span>
        <div
          data-testid="ticket-code-text"
          className="font-mono text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-blue-900 break-all select-all font-bold shadow-inner"
        >
          {payload || '-'}
        </div>
      </div>

      {/* Download Button */}
      {qrDataUrl && !loading && (
        <a
          href={qrDataUrl}
          download={filename}
          data-testid="download-qr-btn"
          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Unduh QR Code Tiket (PNG)
        </a>
      )}
    </div>
  )
}

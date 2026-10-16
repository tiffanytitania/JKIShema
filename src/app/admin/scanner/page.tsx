'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'

interface ScanResult {
  resultCode: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID_TOKEN' | 'CANCELLED'
  message: string
  participant: any
}

export default function QRScannerPage() {
  const [isMobile, setIsMobile] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const isProcessingRef = useRef(false)
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startPromiseRef = useRef<Promise<any> | null>(null)
  const isCleaningUpRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(false)

  // Device check (smartphone check)
  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileUA = /mobile|android|iphone|ipad|phone/i.test(userAgent)
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileUA || isSmallScreen)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Initialize QR Scanner
  useEffect(() => {
    if (!isMobile) return

    isMountedRef.current = true
    let isCancelled = false

    // Intercept HTMLVideoElement.prototype.play to handle AbortError when interrupted by cleanup
    const originalPlay = HTMLVideoElement.prototype.play
    HTMLVideoElement.prototype.play = function (...args) {
      const playPromise = originalPlay.apply(this, args)
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          // Playback was aborted because tracks were stopped or element was removed during cleanup
          if (err?.name === 'AbortError') {
            return
          }
          throw err
        })
      }
      return playPromise
    }

    // Scoped unhandled rejection listener specifically for intentional cleanup AbortErrors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const isAbort =
        reason?.name === 'AbortError' ||
        reason?.message?.includes('The operation was aborted') ||
        reason?.message?.includes('The play() request was interrupted') ||
        String(reason).includes('AbortError')

      if (isAbort && isCleaningUpRef.current) {
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    const cleanupPreviousScanner = async () => {
      isCleaningUpRef.current = true
      try {
        if (startPromiseRef.current) {
          try {
            await startPromiseRef.current
          } catch (_) {}
          startPromiseRef.current = null
        }

        const scanner = html5QrcodeRef.current
        if (scanner) {
          html5QrcodeRef.current = null
          try {
            const state = scanner.getState()
            if (
              state === Html5QrcodeScannerState.SCANNING ||
              state === Html5QrcodeScannerState.PAUSED
            ) {
              await scanner.stop()
            }
          } catch (e) {
            console.warn('Error stopping scanner during cleanup:', e)
          } finally {
            try {
              scanner.clear()
            } catch (_) {}
          }
        }
      } finally {
        isCleaningUpRef.current = false
      }
    }

    const startScanner = async () => {
      // Synchronize: Wait for any previous scanner instance to completely finish shutting down
      await cleanupPreviousScanner()

      if (isCancelled || !isMountedRef.current) return

      const qrCodeId = 'qr-reader'
      const html5Qrcode = new Html5Qrcode(qrCodeId)
      html5QrcodeRef.current = html5Qrcode

      try {
        setScanning(true)
        setScannerError('')

        // 1. Check for Secure Context (HTTPS or localhost)
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          if (!isCancelled && isMountedRef.current) {
            setScannerError('Kamera memerlukan koneksi aman (HTTPS). Akses website menggunakan URL HTTPS (https://) agar browser mengizinkan akses kamera.')
            setScanning(false)
          }
          return
        }

        // 2. Check for getUserMedia API support
        if (!navigator.mediaDevices?.getUserMedia) {
          if (!isCancelled && isMountedRef.current) {
            setScannerError('Browser ini tidak mendukung akses kamera atau fitur kamera diblokir karena koneksi belum aman (HTTPS).')
            setScanning(false)
          }
          return
        }

        const startPromise = html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          onScanFailure
        )

        startPromiseRef.current = startPromise

        await startPromise

        // If component was unmounted or cancelled while start() was pending
        if (isCancelled || !isMountedRef.current) {
          isCleaningUpRef.current = true
          try {
            const state = html5Qrcode.getState()
            if (
              state === Html5QrcodeScannerState.SCANNING ||
              state === Html5QrcodeScannerState.PAUSED
            ) {
              await html5Qrcode.stop()
            }
          } catch (e) {
            console.warn('Error stopping scanner after cancelled start:', e)
          } finally {
            try {
              html5Qrcode.clear()
            } catch (_) {}
            isCleaningUpRef.current = false
          }
        }
      } catch (err: any) {
        const isAbort =
          err?.name === 'AbortError' ||
          err?.message?.includes('The operation was aborted') ||
          err?.message?.includes('AbortError') ||
          String(err).includes('AbortError')

        // If cancelled by intentional cleanup, treat AbortError as expected cancellation
        if (isCancelled || !isMountedRef.current) {
          if (isAbort) return
          return
        }

        setScanning(false)
        const errMsg = err?.message || String(err)
        const errName = err?.name || ''

        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.includes('Permission denied') ||
          errMsg.includes('NotAllowedError')
        ) {
          setScannerError('Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser/HP Anda lalu coba lagi.')
        } else if (
          errName === 'NotFoundError' ||
          errName === 'DevicesNotFoundError' ||
          errMsg.includes('NotFoundError')
        ) {
          setScannerError('Tidak ada kamera belakang yang terdeteksi pada perangkat ini.')
        } else if (
          errName === 'NotReadableError' ||
          errName === 'TrackStartError' ||
          errMsg.includes('NotReadableError')
        ) {
          setScannerError('Kamera sedang digunakan oleh aplikasi lain atau sistem kamera sedang sibuk.')
        } else {
          setScannerError(`Gagal mengakses kamera: ${errMsg || 'Pastikan izin kamera telah diberikan.'}`)
        }
      } finally {
        startPromiseRef.current = null
      }
    }

    startScanner()

    return () => {
      isCancelled = true
      isMountedRef.current = false

      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
      isProcessingRef.current = false

      // Restore original play function and remove listener
      HTMLVideoElement.prototype.play = originalPlay
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)

      cleanupPreviousScanner()
    }
  }, [isMobile])

  const onScanSuccess = async (decodedText: string) => {
    // Prevent duplicate handling if already processing or paused
    if (isProcessingRef.current) {
      return
    }
    isProcessingRef.current = true

    // Pause scanning safely only when strictly in SCANNING state
    const scanner = html5QrcodeRef.current
    if (scanner) {
      try {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          scanner.pause()
        }
      } catch (err) {
        console.warn('Unable to pause scanner:', err)
      }
    }

    try {
      // Extract token if it's a URL or raw string
      let token = decodedText.trim()
      if (token.includes('/ticket/')) {
        token = token.split('/ticket/').pop()?.split('?')[0]?.split('#')[0]?.replace(/\/$/, '') || token
      }

      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      })
      const data = await res.json()
      setScanResult(data)
    } catch (err: any) {
      setScanResult({
        resultCode: 'INVALID_TOKEN',
        message: 'Gagal menghubungi server.',
        participant: null,
      })
    } finally {
      // Auto resume scanner after 3.2 seconds
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
      }

      resumeTimerRef.current = setTimeout(() => {
        setScanResult(null)
        const currentScanner = html5QrcodeRef.current
        if (currentScanner) {
          try {
            if (currentScanner.getState() === Html5QrcodeScannerState.PAUSED) {
              currentScanner.resume()
            }
          } catch (e) {
            console.warn('Unable to resume scanner:', e)
          } finally {
            isProcessingRef.current = false
          }
        } else {
          isProcessingRef.current = false
        }
      }, 3200)
    }
  }

  const onScanFailure = () => {
    // Ignore frame failure
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md space-y-4">
          <div className="text-4xl">📱</div>
          <h1 className="text-xl font-bold text-amber-400">Akses Dibatasi</h1>
          <p className="text-sm text-slate-300">
            Fitur QR Code Scanner ini <strong>hanya dapat dibuka melalui Smartphone panitia</strong> untuk memudahkan proses pemindaian langsung di lokasi acara.
          </p>
          <Link
            href="/admin"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition"
          >
            Kembali ke Dashboard Utama
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative">
      {/* Top Bar */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between z-10">
        <span className="text-xs font-bold text-emerald-400">📷 QR Scanner HP</span>
        <Link href="/admin" className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg">
          ← Dashboard
        </Link>
      </div>

      {/* Main Scanner Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {scannerError ? (
          <div className="bg-red-900/40 border border-red-500/50 p-6 rounded-2xl text-center space-y-4 max-w-sm">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-red-200 font-medium">{scannerError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
            >
              🔄 Coba Akses Kamera Lagi
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-emerald-500/50 shadow-2xl bg-black relative">
            <div id="qr-reader" className="w-full"></div>
            <p className="text-[11px] text-center text-slate-400 py-3 bg-slate-900/80">
              Arahkan kamera HP ke QR Code milik peserta
            </p>
          </div>
        )}
      </div>

      {/* Scan Result Overlay (Green/Yellow/Red Flash) */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all animate-in fade-in">
          {scanResult.resultCode === 'SUCCESS' && (
            <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full space-y-4 border-4 border-emerald-400 animate-bounce">
              <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto font-black">
                ✓
              </div>
              <h2 className="text-2xl font-black">CHECK-IN BERHASIL!</h2>
              {scanResult.participant && (
                <div className="bg-emerald-700/60 p-4 rounded-xl space-y-1 text-sm">
                  <p className="font-extrabold text-lg text-white">{scanResult.participant.full_name}</p>
                  <p className="text-xs text-emerald-100">WA: {scanResult.participant.whatsapp_number}</p>
                  <p className="text-xs text-emerald-200">
                    {scanResult.participant.church_status === 'BERGEREJA'
                      ? scanResult.participant.church_branch || 'Bergereja'
                      : 'Tidak Bergereja'}
                  </p>
                </div>
              )}
            </div>
          )}

          {scanResult.resultCode === 'ALREADY_CHECKED_IN' && (
            <div className="bg-amber-500 text-slate-950 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full space-y-4 border-4 border-amber-300">
              <div className="w-16 h-16 bg-slate-950 text-amber-400 rounded-full flex items-center justify-center text-4xl mx-auto font-black">
                ⚠️
              </div>
              <h2 className="text-2xl font-black">SUDAH CHECK-IN!</h2>
              <p className="text-xs font-semibold">{scanResult.message}</p>
              {scanResult.participant && (
                <div className="bg-amber-600/40 p-4 rounded-xl space-y-1 text-sm text-slate-900 font-bold">
                  <p className="text-base">{scanResult.participant.full_name}</p>
                  <p className="text-xs">WA: {scanResult.participant.whatsapp_number}</p>
                </div>
              )}
            </div>
          )}

          {(scanResult.resultCode === 'INVALID_TOKEN' || scanResult.resultCode === 'CANCELLED') && (
            <div className="bg-rose-600 text-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full space-y-4 border-4 border-rose-400">
              <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto font-black">
                ✕
              </div>
              <h2 className="text-2xl font-black">TIDAK VALID!</h2>
              <p className="text-sm font-semibold">{scanResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

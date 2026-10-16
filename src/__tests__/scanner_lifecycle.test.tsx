import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import QRScannerPage from '@/app/admin/scanner/page'
import { Html5QrcodeScannerState } from 'html5-qrcode'

// Mock html5-qrcode
const mockStart = jest.fn()
const mockStop = jest.fn()
const mockPause = jest.fn()
const mockResume = jest.fn()
const mockClear = jest.fn()
const mockGetState = jest.fn()

let capturedOnScanSuccess: ((text: string) => Promise<void>) | null = null
let capturedOnScanFailure: (() => void) | null = null

jest.mock('html5-qrcode', () => {
  return {
    Html5QrcodeScannerState: {
      UNKNOWN: 0,
      NOT_STARTED: 1,
      SCANNING: 2,
      PAUSED: 3,
    },
    Html5Qrcode: jest.fn().mockImplementation(() => {
      return {
        start: mockStart.mockImplementation(
          (_cameraConfig: any, _scanConfig: any, successCb: any, failureCb: any) => {
            capturedOnScanSuccess = successCb
            capturedOnScanFailure = failureCb
            mockGetState.mockReturnValue(2) // SCANNING
            return Promise.resolve()
          }
        ),
        stop: mockStop.mockImplementation(() => {
          mockGetState.mockReturnValue(1) // NOT_STARTED
          return Promise.resolve()
        }),
        pause: mockPause.mockImplementation(() => {
          if (mockGetState() !== 2) {
            throw new Error('Cannot pause, scanner is not scanning.')
          }
          mockGetState.mockReturnValue(3) // PAUSED
        }),
        resume: mockResume.mockImplementation(() => {
          if (mockGetState() !== 3) {
            throw new Error('Cannot resume, scanner is not paused.')
          }
          mockGetState.mockReturnValue(2) // SCANNING
        }),
        clear: mockClear.mockImplementation(() => {}),
        getState: mockGetState.mockImplementation(() => 2),
      }
    }),
  }
})

describe('QR Scanner Mobile Lifecycle & Safe State Management', () => {
  const originalFetch = global.fetch
  const mockFetch = jest.fn()

  beforeAll(() => {
    // Mock navigator.mediaDevices.getUserMedia and isSecureContext
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({}),
      },
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile/15E148',
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    global.fetch = mockFetch
    mockGetState.mockReturnValue(2) // Default SCANNING
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCode: 'SUCCESS',
        message: 'Check-in berhasil',
        participant: { full_name: 'Budi Santoso', whatsapp_number: '08123456789' },
      }),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('initializes Html5Qrcode and starts scanning in mobile view', async () => {
    render(<QRScannerPage />)

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        { facingMode: 'environment' },
        expect.objectContaining({ fps: 10, qrbox: { width: 250, height: 250 } }),
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  it('pauses scanner safely when in SCANNING state upon detecting a QR code', async () => {
    render(<QRScannerPage />)

    await waitFor(() => {
      expect(capturedOnScanSuccess).not.toBeNull()
    })

    mockGetState.mockReturnValue(Html5QrcodeScannerState.SCANNING)

    await act(async () => {
      await capturedOnScanSuccess!('token-123')
    })

    expect(mockPause).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/checkin',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ qr_token: 'token-123' }),
      })
    )
  })

  it('does NOT call pause and does not throw when scanner is not in SCANNING state', async () => {
    render(<QRScannerPage />)

    await waitFor(() => {
      expect(capturedOnScanSuccess).not.toBeNull()
    })

    // Simulate scanner already in PAUSED state (e.g. state transition or race condition)
    mockGetState.mockReturnValue(Html5QrcodeScannerState.PAUSED)

    await act(async () => {
      // Must not throw "Cannot pause, scanner is not scanning."
      await expect(capturedOnScanSuccess!('token-456')).resolves.not.toThrow()
    })

    expect(mockPause).not.toHaveBeenCalled()
  })

  it('prevents duplicate scans and duplicate pause calls when multiple frames arrive rapidly', async () => {
    render(<QRScannerPage />)

    await waitFor(() => {
      expect(capturedOnScanSuccess).not.toBeNull()
    })

    mockGetState.mockReturnValue(Html5QrcodeScannerState.SCANNING)

    // Fire two consecutive frames in rapid succession (simulating 10fps stream)
    await act(async () => {
      const p1 = capturedOnScanSuccess!('token-rapid-1')
      const p2 = capturedOnScanSuccess!('token-rapid-2')
      await Promise.all([p1, p2])
    })

    // Only one scan should have been processed
    expect(mockPause).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('auto-resumes scanner only when in PAUSED state after timeout', async () => {
    render(<QRScannerPage />)

    await waitFor(() => {
      expect(capturedOnScanSuccess).not.toBeNull()
    })

    mockGetState.mockReturnValue(Html5QrcodeScannerState.SCANNING)

    await act(async () => {
      await capturedOnScanSuccess!('token-resume-test')
    })

    // After pause, state becomes PAUSED
    mockGetState.mockReturnValue(Html5QrcodeScannerState.PAUSED)

    // Advance timers by 3200ms
    act(() => {
      jest.advanceTimersByTime(3200)
    })

    expect(mockResume).toHaveBeenCalledTimes(1)
  })

  it('does NOT call resume if scanner was stopped before timer fired', async () => {
    render(<QRScannerPage />)

    await waitFor(() => {
      expect(capturedOnScanSuccess).not.toBeNull()
    })

    mockGetState.mockReturnValue(Html5QrcodeScannerState.SCANNING)

    await act(async () => {
      await capturedOnScanSuccess!('token-unmount-test')
    })

    // Suppose scanner is now NOT_STARTED (stopped)
    mockGetState.mockReturnValue(Html5QrcodeScannerState.NOT_STARTED)

    act(() => {
      jest.advanceTimersByTime(3200)
    })

    expect(mockResume).not.toHaveBeenCalled()
  })

  it('stops and clears scanner on unmount to release camera', async () => {
    const { unmount } = render(<QRScannerPage />)

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled()
    })

    mockGetState.mockReturnValue(Html5QrcodeScannerState.SCANNING)

    unmount()

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled()
      expect(mockClear).toHaveBeenCalled()
    })
  })

  it('handles component unmount while start() is still pending without leaking camera', async () => {
    let resolveStart: () => void = () => {}
    mockStart.mockImplementationOnce(() => {
      return new Promise<void>((resolve) => {
        resolveStart = () => {
          mockGetState.mockReturnValue(Html5QrcodeScannerState.SCANNING)
          resolve()
        }
      })
    })

    const { unmount } = render(<QRScannerPage />)

    // Ensure start() has begun and is pending
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled()
    })

    // Unmount before start resolves
    unmount()

    // Now start resolves
    await act(async () => {
      resolveStart()
    })

    // Should detect isCancelled and cleanly stop & clear
    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled()
      expect(mockClear).toHaveBeenCalled()
    })
  })
})

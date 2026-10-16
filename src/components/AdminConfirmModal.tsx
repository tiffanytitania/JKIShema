'use client'

import React, { useEffect, useRef } from 'react'

export type ConfirmModalAction = 'CANCEL' | 'CHECK_IN'

export interface ConfirmModalParticipant {
  id: string
  full_name: string
  whatsapp_number: string
}

export interface AdminConfirmModalProps {
  isOpen: boolean
  action: ConfirmModalAction | null
  participant: ConfirmModalParticipant | null
  isLoading: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: () => void
}

export default function AdminConfirmModal({
  isOpen,
  action,
  participant,
  isLoading,
  errorMessage,
  onClose,
  onConfirm,
}: AdminConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isLoading) {
          onClose()
        }
        return
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements || focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Auto-focus back button when opened
    const timer = setTimeout(() => {
      backButtonRef.current?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen, isLoading, onClose])

  if (!isOpen || !action || !participant) return null

  const isCancel = action === 'CANCEL'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              isCancel
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isCancel ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          <div className="space-y-1">
            <h3 id="confirm-modal-title" className="text-lg font-bold text-white tracking-tight">
              {isCancel ? 'Batalkan Pendaftaran' : 'Check-In Manual'}
            </h3>
            <p id="confirm-modal-description" className="text-xs text-slate-400 leading-relaxed">
              {isCancel
                ? 'Konfirmasi pembatalan pendaftaran peserta Christmas Celebration.'
                : 'Konfirmasi kehadiran peserta secara manual tanpa scan QR code.'}
            </p>
          </div>
        </div>

        {/* Participant Details */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Nama Lengkap
            </span>
            <p className="text-sm font-bold text-white mt-0.5">{participant.full_name}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              No. WhatsApp
            </span>
            <p className="text-xs font-mono font-medium text-slate-200 mt-0.5">
              {participant.whatsapp_number}
            </p>
          </div>
        </div>

        {/* Explanatory Info Notice */}
        {isCancel ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-200 space-y-1.5">
            <div className="font-semibold text-rose-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Informasi Pembatalan:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-rose-200/90 pl-1 text-[11px] leading-relaxed">
              <li>
                Kuota pendaftaran online akan <strong>otomatis dipulihkan (+1)</strong>.
              </li>
              <li>
                Tiket QR code lama peserta ini akan <strong>dinonaktifkan</strong> dan tidak dapat digunakan lagi untuk check-in.
              </li>
            </ul>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-emerald-200 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <span>ℹ️</span>
              <span>Informasi Check-In:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-emerald-200/90 pl-1 text-[11px] leading-relaxed">
              <li>
                Status peserta akan langsung diperbarui menjadi <strong>Sudah Check-In</strong> (Hadir).
              </li>
              <li>
                Tindakan ini akan tercatat dalam sistem dan laporan kehadiran acara.
              </li>
            </ul>
          </div>
        )}

        {/* In-Modal Error Message */}
        {errorMessage && (
          <div
            role="alert"
            className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-2xl text-xs font-semibold flex items-start gap-2"
          >
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            ref={backButtonRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Back"
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
          >
            Back
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            aria-label={
              isLoading
                ? 'Processing...'
                : isCancel
                ? 'Confirm Cancellation'
                : 'Confirm Check-In'
            }
            className={`text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
              isCancel
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
            }`}
          >
            {isLoading && (
              <svg
                className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading
              ? 'Memproses...'
              : isCancel
              ? 'Confirm Cancellation'
              : 'Confirm Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import TicketCard from '@/components/TicketCard'

interface ParticipantFormItem {
  full_name: string
  whatsapp_number: string
  church_status: 'BERGEREJA' | 'TIDAK_BERGEREJA'
  church_branch: string
  is_child: boolean
  is_wa_opt_in: boolean
}

export default function RegisterPage() {
  const [participants, setParticipants] = useState<ParticipantFormItem[]>([
    {
      full_name: '',
      whatsapp_number: '',
      church_status: 'BERGEREJA',
      church_branch: '',
      is_child: false,
      is_wa_opt_in: true,
    },
  ])

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successData, setSuccessData] = useState<any[] | null>(null)

  const handleAddParticipant = () => {
    setParticipants([
      ...participants,
      {
        full_name: '',
        whatsapp_number: '',
        church_status: 'BERGEREJA',
        church_branch: '',
        is_child: false,
        is_wa_opt_in: true,
      },
    ])
  }

  const handleRemoveParticipant = (index: number) => {
    if (participants.length === 1) return
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (index: number, field: keyof ParticipantFormItem, value: any) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], [field]: value }
    setParticipants(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // Validation
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i]
      if (!p.full_name.trim()) {
        setErrorMsg(`Nama lengkap untuk Peserta #${i + 1} wajib diisi.`)
        return
      }
      if (i === 0 && !p.whatsapp_number.trim()) {
        setErrorMsg('Nomor WhatsApp Pendaftar Utama wajib diisi.')
        return
      }
      if (!p.is_child && !p.whatsapp_number.trim()) {
        setErrorMsg(`Nomor WhatsApp untuk Peserta #${i + 1} (${p.full_name}) wajib diisi.`)
        return
      }
      if (!p.is_wa_opt_in) {
        setErrorMsg(`Persetujuan WhatsApp wajib dicentang untuk Peserta #${i + 1}.`)
        return
      }
    }

    setLoading(true)

    try {
      const payload = participants.map((p, i) => ({
        full_name: p.full_name,
        whatsapp_number: i > 0 && p.is_child ? participants[0].whatsapp_number : p.whatsapp_number,
        church_status: p.church_status,
        church_branch: p.church_status === 'BERGEREJA' ? p.church_branch : undefined,
        is_child: i > 0 ? p.is_child : false,
        is_wa_opt_in: p.is_wa_opt_in,
      }))

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan pendaftaran.')
      }

      setSuccessData(data.data)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="bg-white max-w-xl w-full p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
            ✓
          </div>
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Christmas Celebration JKI Shema
            </span>
            <h1 className="text-2xl font-black text-slate-900">Pendaftaran Berhasil!</h1>
            <p className="text-sm text-slate-600">
              Sebanyak <strong className="text-slate-900">{successData.length} orang</strong> telah terdaftar. Simpan atau unduh QR Code tiket Anda di bawah ini untuk ditunjukkan kepada panitia saat kedatangan di lokasi acara.
            </p>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {successData.map((item, idx) => (
              <TicketCard key={item.id || item.qr_token || idx} participant={item} />
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 rounded-xl transition shadow-md"
            >
              Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="bg-white max-w-2xl w-full p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-100 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Christmas Celebration</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Form Pendaftaran</h1>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg transition"
          >
            ← Kembali
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {participants.map((participant, index) => (
            <div key={index} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-5 relative">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="font-bold text-slate-800 text-sm">
                  {index === 0 ? '👤 Pendaftar Utama' : `👥 Peserta Tambahan #${index + 1}`}
                </span>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(index)}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 px-2.5 py-1 rounded-lg transition"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Tickbox Anak (Only for participant #2 and onwards) */}
              {index > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`child-${index}`}
                    checked={participant.is_child}
                    onChange={(e) => updateParticipant(index, 'is_child', e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <label htmlFor={`child-${index}`} className="text-xs font-bold text-amber-900 cursor-pointer">
                    Peserta ini adalah Anak (Nomor WA disamakan dengan Pendaftar Utama)
                  </label>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={participant.full_name}
                  onChange={(e) => updateParticipant(index, 'full_name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition"
                />
              </div>

              {/* WA Number (Hidden if child) */}
              {(!participant.is_child || index === 0) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required={!participant.is_child}
                    value={participant.whatsapp_number}
                    onChange={(e) => updateParticipant(index, 'whatsapp_number', e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition"
                  />
                </div>
              )}

              {/* Church Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status Bergereja <span className="text-red-500">*</span>
                </label>
                <select
                  value={participant.church_status}
                  onChange={(e) => updateParticipant(index, 'church_status', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition"
                >
                  <option value="BERGEREJA">Bergereja</option>
                  <option value="TIDAK_BERGEREJA">Tidak Bergereja</option>
                </select>
              </div>

              {/* Church Branch */}
              {participant.church_status === 'BERGEREJA' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nama Gereja / Cabang <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={participant.church_branch}
                    onChange={(e) => updateParticipant(index, 'church_branch', e.target.value)}
                    placeholder="Misal: JKI Shema Pusat / Gereja Lain"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition"
                  />
                </div>
              )}

              {/* WA Opt-in Consent */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`optin-${index}`}
                  checked={participant.is_wa_opt_in}
                  onChange={(e) => updateParticipant(index, 'is_wa_opt_in', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor={`optin-${index}`} className="text-xs text-slate-600 cursor-pointer">
                  Menyetujui pengiriman pesan konfirmasi & tiket QR via WhatsApp. <span className="text-red-500 font-bold">*Wajib</span>
                </label>
              </div>
            </div>
          ))}

          {/* Add Participant Button */}
          <button
            type="button"
            onClick={handleAddParticipant}
            className="w-full py-3 border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-700 font-bold text-sm rounded-2xl bg-blue-50/50 hover:bg-blue-50 transition flex items-center justify-center gap-2"
          >
            ➕ Tambah Peserta Lain (Keluarga / Kerabat)
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-4 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Memproses Pendaftaran...' : `Kirim Pendaftaran (${participants.length} Peserta)`}
          </button>
        </form>

        {/* Contact Us Redirect */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">Punya pertanyaan seputar acara?</p>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20ingin%20bertanya%20seputar%20pendaftaran%20Christmas%20Celebration"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg transition"
          >
            💬 Contact Us via WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

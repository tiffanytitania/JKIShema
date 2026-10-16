'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import AdminConfirmModal, { ConfirmModalAction } from '@/components/AdminConfirmModal'

interface Stats {
  totalCapacity: number
  maxOnlineQuota: number
  totalRegistered: number
  onlineCount: number
  onSiteCount: number
  checkedInCount: number
  cancelledCount: number
  remainingOnlineQuota: number
}

interface Participant {
  id: string
  full_name: string
  whatsapp_number: string
  church_status: string
  church_branch?: string
  is_child: boolean
  qr_token: string
  status: 'REGISTERED' | 'CHECKED_IN' | 'CANCELLED'
  registration_type: 'ONLINE' | 'ON_SITE'
  checked_in_at?: string
  created_at: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchParticipants = useCallback(async () => {
    try {
      const query = new URLSearchParams()
      if (search) query.set('search', search)
      if (statusFilter) query.set('status', statusFilter)

      const res = await fetch(`/api/admin/participants?${query.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setParticipants(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchStats()
    fetchParticipants()
  }, [fetchStats, fetchParticipants])

  const [activeModal, setActiveModal] = useState<{
    action: ConfirmModalAction
    participant: Participant
  } | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const handleOpenCheckInModal = (participant: Participant) => {
    setModalError(null)
    setActiveModal({ action: 'CHECK_IN', participant })
  }

  const handleOpenCancelModal = (participant: Participant) => {
    setModalError(null)
    setActiveModal({ action: 'CANCEL', participant })
  }

  const handleCloseModal = () => {
    if (modalLoading) return
    setActiveModal(null)
    setModalError(null)
  }

  const handleConfirmModalAction = async () => {
    if (!activeModal || modalLoading) return
    const { action, participant } = activeModal

    setModalLoading(true)
    setModalError(null)

    if (action === 'CHECK_IN') {
      try {
        const res = await fetch('/api/admin/checkin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_id: participant.id }),
        })

        if (res.ok) {
          setActiveModal(null)
          setActionMsg(`✓ Manual Check-in berhasil untuk ${participant.full_name}!`)
          fetchStats()
          fetchParticipants()
          setTimeout(() => setActionMsg(''), 4000)
        } else {
          const data = await res.json()
          setModalError(data.error || 'Gagal melakukan check-in manual.')
        }
      } catch (err: any) {
        setModalError(err.message || 'Terjadi kesalahan sistem saat check-in manual.')
      } finally {
        setModalLoading(false)
      }
    } else if (action === 'CANCEL') {
      try {
        const res = await fetch('/api/admin/participants', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_id: participant.id }),
        })

        if (res.ok) {
          setActiveModal(null)
          setActionMsg(`✓ Pendaftaran "${participant.full_name}" berhasil dibatalkan! Kuota telah dipulihkan.`)
          fetchStats()
          fetchParticipants()
          setTimeout(() => setActionMsg(''), 4000)
        } else {
          const data = await res.json()
          setModalError(data.error || 'Gagal membatalkan pendaftaran peserta.')
        }
      } catch (err: any) {
        setModalError(err.message || 'Terjadi kesalahan sistem saat membatalkan pendaftaran.')
      } finally {
        setModalLoading(false)
      }
    }
  }

  const handleExportCSV = () => {
    window.open('/api/admin/export', '_blank')
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })

      const data = await res.json()
      if (res.ok) {
        setActionMsg(`✓ Import Berhasil! ${data.importedCount} peserta diimpor, ${data.skippedCount} duplikat dilewati.`)
        fetchStats()
        fetchParticipants()
        setTimeout(() => setActionMsg(''), 5000)
      } else {
        alert(`Gagal Import: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-800/90 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-white tracking-tight">JKI SHEMA</span>
            <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-400/30">
              Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/admin/scanner"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition flex items-center gap-2 shadow-lg"
            >
              📷 <span className="hidden sm:inline">QR Scanner (HP)</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Action Message Banner */}
        {actionMsg && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-sm font-semibold animate-in fade-in">
            {actionMsg}
          </div>
        )}

        {/* Overview Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Kapasitas</span>
              <p className="text-2xl font-black text-white">{stats.totalCapacity}</p>
              <p className="text-[10px] text-slate-500">Hard Limit Acara</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-blue-400 font-semibold uppercase">Terdaftar</span>
              <p className="text-2xl font-black text-blue-400">{stats.totalRegistered}</p>
              <p className="text-[10px] text-slate-500">Online: {stats.onlineCount} | On-site: {stats.onSiteCount}</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-emerald-400 font-semibold uppercase">Sudah Check-In</span>
              <p className="text-2xl font-black text-emerald-400">{stats.checkedInCount}</p>
              <p className="text-[10px] text-slate-500">Hadir di Lokasi</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-amber-400 font-semibold uppercase">Belum Check-In</span>
              <p className="text-2xl font-black text-amber-400">{stats.totalRegistered - stats.checkedInCount}</p>
              <p className="text-[10px] text-slate-500">Dalam Pendaftaran</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-indigo-400 font-semibold uppercase">Sisa Kuota Web</span>
              <p className="text-2xl font-black text-indigo-400">{stats.remainingOnlineQuota}</p>
              <p className="text-[10px] text-slate-500">Dari {stats.maxOnlineQuota} online</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-rose-400 font-semibold uppercase">Batal (RSVP)</span>
              <p className="text-2xl font-black text-rose-400">{stats.cancelledCount}</p>
              <p className="text-[10px] text-slate-500">Kuota Terbebas</p>
            </div>
          </div>
        )}

        {/* Data Table Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Daftar Seluruh Peserta</h2>
              <p className="text-xs text-slate-400 mt-0.5">Kelola data, pencarian, import/export CSV</p>
            </div>

            {/* Controls / Actions / Filter */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                📥 Export CSV
              </button>

              {/* Import Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                📤 Import CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />

              {/* Search Bar */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Nama / No. WA..."
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition"
              />

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition"
              >
                <option value="ALL">Semua Status</option>
                <option value="REGISTERED">Terdaftar (Belum Check-In)</option>
                <option value="CHECKED_IN">Sudah Check-In</option>
                <option value="CANCELLED">Batal / Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">No. WhatsApp</th>
                  <th className="py-3 px-4">Gereja / Cabang</th>
                  <th className="py-3 px-4">Status Acara</th>
                  <th className="py-3 px-4">Tipe Daftar</th>
                  <th className="py-3 px-4 text-right">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Memuat data peserta...
                    </td>
                  </tr>
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Tidak ada data peserta ditemukan.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {p.full_name}
                        {p.is_child && (
                          <span className="ml-2 bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                            Anak
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{p.whatsapp_number}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {p.church_status === 'BERGEREJA' ? p.church_branch || 'Bergereja' : 'Tidak Bergereja'}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.status === 'CHECKED_IN' && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                            ✓ Checked In
                          </span>
                        )}
                        {p.status === 'REGISTERED' && (
                          <span className="bg-blue-500/20 text-blue-300 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-blue-500/30">
                            Terdaftar
                          </span>
                        )}
                        {p.status === 'CANCELLED' && (
                          <span className="bg-rose-500/20 text-rose-300 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-rose-500/30">
                            Batal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {p.registration_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'REGISTERED' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenCheckInModal(p)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow transition cursor-pointer"
                            >
                              Check-In Manual
                            </button>
                            <button
                              onClick={() => handleOpenCancelModal(p)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow transition cursor-pointer"
                            >
                              Batalkan
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      <AdminConfirmModal
        isOpen={activeModal !== null}
        action={activeModal?.action || null}
        participant={activeModal?.participant || null}
        isLoading={modalLoading}
        errorMessage={modalError}
        onClose={handleCloseModal}
        onConfirm={handleConfirmModalAction}
      />
    </div>
  )
}

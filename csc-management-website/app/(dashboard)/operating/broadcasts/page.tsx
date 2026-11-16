'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { Megaphone, Plus, X, Search, Clock, Calendar, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

const TIME_SLOTS = ["9:00-9:30", "13:00-13:30", "16:00-16:30", "21:00-22:00"]
const CHANNELS = ["Instagram Story", "WhatsApp Group", "Discord", "Line Square"]
const AUDIENCES = ["Seluruh Mahasiswa", "Internal CSC", "Partner Luar"]
const STATUSES = ["Scheduled", "Sent", "Cancelled"]

export default function BroadcastsPage() {
    const { currentUser } = useCurrentUser()
    const [broadcasts, setBroadcasts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ 
        broadcast_date: new Date().toISOString().split('T')[0], 
        broadcast_time: TIME_SLOTS[0], 
        title: '', 
        channel: CHANNELS[1], 
        audience: AUDIENCES[0], 
        status: 'Scheduled',
        bidang: currentUser?.department || ''
    })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/operating/broadcasts', 'create')
    const canDelete = canPerformAction(currentUser, '/operating/broadcasts', 'delete')

    useEffect(() => { loadData() }, [])
    useEffect(() => {
        if (currentUser && !editId) {
            setForm(prev => ({ ...prev, bidang: currentUser.department }))
        }
    }, [currentUser, editId])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('broadcast_schedules').select('*').order('broadcast_date', { ascending: false }).order('broadcast_time', { ascending: true })
        setBroadcasts(data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        
        // Validation: Max 3 broadcasts per slot on that date
        if (!editId) {
            const count = broadcasts.filter(b => b.broadcast_date === form.broadcast_date && b.broadcast_time === form.broadcast_time).length
            if (count >= 3) {
                alert(`Slot waktu ${form.broadcast_time} pada tanggal ${form.broadcast_date} sudah penuh (maksimal 3 broadcast).`)
                return
            }
        }

        if (editId) {
            await supabase.from('broadcast_schedules').update(form).eq('id', editId)
        } else {
            await supabase.from('broadcast_schedules').insert(form)
        }
        setShowModal(false); setEditId(null); loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus jadwal broadcast ini?')) {
            await supabase.from('broadcast_schedules').delete().eq('id', id)
            loadData()
        }
    }

    const filtered = broadcasts.filter(b => b.title.toLowerCase().includes(search.toLowerCase()))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Penjadwalan Broadcast</div></div>
            <div className="page-container">
                <h1 className="page-title">Log Penjadwalan Broadcast</h1>
                <p className="page-subtitle">Kelola jadwal publikasi konten di berbagai channel media</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <Search size={18} />
                            <input className="form-input" placeholder="Cari judul broadcast..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ broadcast_date: new Date().toISOString().split('T')[0], broadcast_time: TIME_SLOTS[0], title: '', channel: CHANNELS[1], audience: AUDIENCES[0], status: 'Scheduled', bidang: currentUser?.department || '' }); setShowModal(true) }}>
                                <Plus size={18} /> Tambah Jadwal
                            </button>
                        )}
                    </div>
                </div>

                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tanggal & Waktu</th>
                                <th>Judul Broadcast</th>
                                <th>Channel</th>
                                <th>Audience</th>
                                <th>Bidang</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Belum ada jadwal broadcast.</td></tr>
                            ) : (
                                filtered.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{formatDateShort(b.broadcast_date)}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} /> {b.broadcast_time}
                                            </div>
                                        </td>
                                        <td><div style={{ fontWeight: 500 }}>{b.title}</div></td>
                                        <td>
                                            <span style={{ fontSize: '0.8125rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: 4, fontWeight: 500 }}>
                                                {b.channel}
                                            </span>
                                        </td>
                                        <td><span style={{ fontSize: '0.8125rem' }}>{b.audience}</span></td>
                                        <td><span style={{ fontSize: '0.8125rem' }}>{b.bidang || '-'}</span></td>
                                        <td>
                                            <span className={`badge badge-${b.status === 'Sent' ? 'success' : b.status === 'Scheduled' ? 'warning' : 'danger'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(b.id); setForm({ ...b }); setShowModal(true) }}>Edit</button>
                                                {canDelete && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(b.id)}><Trash2 size={14} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Form */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                            <div className="modal-header">
                                <h2>{editId ? 'Edit' : 'Tambah'} Jadwal Broadcast</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="form-label">Tanggal</label>
                                            <input type="date" className="form-input" required value={form.broadcast_date} onChange={e => setForm({ ...form, broadcast_date: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Slot Waktu</label>
                                            <select className="form-select" value={form.broadcast_time} onChange={e => setForm({ ...form, broadcast_time: e.target.value })}>
                                                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Judul Broadcast</label>
                                        <input className="form-input" required placeholder="Masukkan judul..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="form-label">Channel</label>
                                            <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                                                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Audience</label>
                                            <select className="form-select" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
                                                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="form-label">Status</label>
                                            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Bidang</label>
                                            <input className="form-input" value={form.bidang} onChange={e => setForm({ ...form, bidang: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    <div style={{ padding: '0.75rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: 8, color: '#92400e', fontSize: '0.75rem', fontWeight: 600 }}>
                                            <AlertCircle size={14} /> Ketentuan Waktu Broadcast:
                                        </div>
                                        <ul style={{ margin: '4px 0 0 20px', fontSize: '0.75rem', color: '#b45309' }}>
                                            <li>Maksimal 3 broadcast per slot waktu per hari.</li>
                                            <li>Setiap proker hanya boleh memilih 1 rentang waktu dalam 1 hari.</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

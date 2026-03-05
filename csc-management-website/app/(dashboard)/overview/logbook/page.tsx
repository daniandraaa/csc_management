'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import { BookOpen, Plus, X, Search } from 'lucide-react'

export default function OverviewLogbookPage() {
    const { currentUser } = useCurrentUser()
    const [entries, setEntries] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [viewAll, setViewAll] = useState(false)
    const [selectedMember, setSelectedMember] = useState('')
    const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', description: '', category: '', hours_spent: '' })
    const [editId, setEditId] = useState<string | null>(null)

    const isHR = currentUser?.department === 'Human Resource' || currentUser?.role === 'BOE'

    useEffect(() => { if (currentUser) loadData() }, [currentUser, viewAll, selectedMember])

    async function loadData() {
        setLoading(true)
        let query = supabase.from('logbook_entries').select('*, member:members(id,full_name,department)').order('date', { ascending: false })

        if (viewAll && isHR) {
            if (selectedMember) query = query.eq('member_id', selectedMember)
        } else {
            query = query.eq('member_id', currentUser?.id)
        }

        const { data } = await query
        setEntries(data || [])

        if (isHR && members.length === 0) {
            const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
            setMembers(m || [])
        }
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, member_id: currentUser?.id, hours_spent: form.hours_spent ? parseFloat(form.hours_spent) : null }
        if (editId) {
            await supabase.from('logbook_entries').update(payload).eq('id', editId)
        } else {
            await supabase.from('logbook_entries').insert(payload)
        }
        setShowModal(false); setEditId(null)
        setForm({ date: new Date().toISOString().split('T')[0], title: '', description: '', category: '', hours_spent: '' })
        loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus entri logbook ini?')) {
            await supabase.from('logbook_entries').delete().eq('id', id)
            loadData()
        }
    }

    const filtered = entries.filter((e: any) =>
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase())
    )

    // Stats
    const totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours_spent || 0), 0)
    const totalEntries = entries.length

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Logbook</div></div>
            <div className="page-container">
                <h1 className="page-title">Logbook Kegiatan</h1>
                <p className="page-subtitle">{viewAll && isHR ? 'Semua logbook anggota' : 'Catatan kegiatan harian Anda'}</p>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-brand-500)' }}>{totalEntries}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Total Entri</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{totalHours.toFixed(1)}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Total Jam</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a855f7' }}>{totalEntries > 0 ? (totalHours / totalEntries).toFixed(1) : '0'}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Rata-rata Jam/Entri</div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <Search size={16} />
                            <input className="form-input" placeholder="Cari logbook..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
                        </div>
                        {isHR && (
                            <>
                                <button className={`btn ${viewAll ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setViewAll(!viewAll)}>
                                    {viewAll ? 'Semua Logbook' : 'Logbook Saya'}
                                </button>
                                {viewAll && (
                                    <select className="form-select" style={{ width: 'auto' }} value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                                        <option value="">Semua Anggota</option>
                                        {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                    </select>
                                )}
                            </>
                        )}
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ date: new Date().toISOString().split('T')[0], title: '', description: '', category: '', hours_spent: '' }); setShowModal(true) }}>
                            <Plus size={16} /> Tambah Logbook
                        </button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Tanggal</th>{viewAll && isHR && <th>Anggota</th>}<th>Judul</th><th>Deskripsi</th><th>Kategori</th><th>Jam</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={viewAll ? 7 : 6} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={viewAll ? 7 : 6}><div className="empty-state"><BookOpen size={48} /><h3>Belum ada logbook</h3><p>Mulai catat kegiatan harian Anda.</p></div></td></tr>
                            ) : filtered.map((e: any) => (
                                <tr key={e.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateShort(e.date)}</td>
                                    {viewAll && isHR && <td style={{ fontWeight: 500 }}>{e.member?.full_name || '-'}</td>}
                                    <td style={{ fontWeight: 500 }}>{e.title}</td>
                                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{e.description}</td>
                                    <td>{e.category ? <span className="badge badge-info">{e.category}</span> : '-'}</td>
                                    <td style={{ fontWeight: 600 }}>{e.hours_spent ? `${e.hours_spent}h` : '-'}</td>
                                    <td>
                                        {e.member_id === currentUser?.id && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ date: e.date, title: e.title, description: e.description, category: e.category || '', hours_spent: e.hours_spent?.toString() || '' }); setEditId(e.id); setShowModal(true) }}>Edit</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(e.id)}>Hapus</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Logbook</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Tanggal *</label><input className="form-input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Kategori</label><input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Meeting, Development" /></div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Deskripsi *</label><textarea className="form-textarea" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Durasi (jam)</label><input className="form-input" type="number" step="0.5" min="0" value={form.hours_spent} onChange={e => setForm({ ...form, hours_spent: e.target.value })} /></div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

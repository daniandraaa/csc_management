'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { PenTool, Plus, X, Search, User, Calendar, Trash2 } from 'lucide-react'
import { formatDateShort, getInitials } from '@/lib/utils'

const PLATFORMS = ["Instagram Feed", "Tiktok", "Reels", "LinkedIn"]
const CONTENT_TYPES = ["Promo Proker", "Edukasi", "Partnership", "Behind The Scenes"]
const STATUSES = ["Ready to Post", "Filming", "Scripting", "Editing"]

export default function EditorialPage() {
    const { currentUser } = useCurrentUser()
    const [plans, setPlans] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ 
        publish_date: new Date().toISOString().split('T')[0], 
        title: '', 
        platform: PLATFORMS[0], 
        content_type: CONTENT_TYPES[0], 
        status: 'Scripting',
        pic_id: ''
    })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/operating/editorial', 'create')
    const canDelete = canPerformAction(currentUser, '/operating/editorial', 'delete')

    useEffect(() => { 
        loadData()
        loadMembers()
    }, [])
    useEffect(() => {
        if (currentUser && !editId) {
            setForm(prev => ({ ...prev, pic_id: currentUser.id }))
        }
    }, [currentUser, editId])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('editorial_plans')
            .select('*, pic:members(full_name)')
            .order('publish_date', { ascending: false })
        setPlans(data || [])
        setLoading(false)
    }

    async function loadMembers() {
        const { data } = await supabase.from('members').select('id, full_name').order('full_name')
        setMembers(data || [])
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, pic_id: form.pic_id || null }
        if (editId) {
            await supabase.from('editorial_plans').update(payload).eq('id', editId)
        } else {
            await supabase.from('editorial_plans').insert(payload)
        }
        setShowModal(false); setEditId(null); loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus rencana editorial ini?')) {
            await supabase.from('editorial_plans').delete().eq('id', id)
            loadData()
        }
    }

    const filtered = plans.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Editorial Plan</div></div>
            <div className="page-container">
                <h1 className="page-title">Editorial Plan & Publication Queue</h1>
                <p className="page-subtitle">Kelola rencana publikasi konten media sosial CSC</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <Search size={18} />
                            <input className="form-input" placeholder="Cari judul konten..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ publish_date: new Date().toISOString().split('T')[0], title: '', platform: PLATFORMS[0], content_type: CONTENT_TYPES[0], status: 'Scripting', pic_id: currentUser?.id || '' }); setShowModal(true) }}>
                                <Plus size={18} /> Tambah Rencana
                            </button>
                        )}
                    </div>
                </div>

                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tanggal Posting</th>
                                <th>Judul Konten</th>
                                <th>Platform</th>
                                <th>Tipe Konten</th>
                                <th>PIC</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Belum ada rencana editorial.</td></tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{formatDateShort(p.publish_date)}</div>
                                        </td>
                                        <td><div style={{ fontWeight: 500 }}>{p.title}</div></td>
                                        <td>
                                            <span style={{ fontSize: '0.8125rem', padding: '0.2rem 0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontWeight: 600, color: '#334155' }}>
                                                {p.platform}
                                            </span>
                                        </td>
                                        <td><span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{p.content_type}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#475569' }}>
                                                    {getInitials(p.pic?.full_name)}
                                                </div>
                                                <span style={{ fontSize: '0.8125rem' }}>{p.pic?.full_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${
                                                p.status === 'Ready to Post' ? 'success' : 
                                                p.status === 'Editing' ? 'info' : 
                                                p.status === 'Filming' ? 'warning' : 'secondary'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(p.id); setForm({ ...p, pic_id: p.pic_id || '' }); setShowModal(true) }}>Edit</button>
                                                {canDelete && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>}
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
                                <h2>{editId ? 'Edit' : 'Tambah'} Rencana Konten</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Tanggal Posting</label>
                                        <input type="date" className="form-input" required value={form.publish_date} onChange={e => setForm({ ...form, publish_date: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Judul Konten</label>
                                        <input className="form-input" required placeholder="Masukkan judul konten..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="form-label">Platform</label>
                                            <select className="form-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                                                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tipe Konten</label>
                                            <select className="form-select" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
                                                {CONTENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
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
                                            <label className="form-label">PIC</label>
                                            <select className="form-select" value={form.pic_id} onChange={e => setForm({ ...form, pic_id: e.target.value })}>
                                                <option value="">Pilih Anggota</option>
                                                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                            </select>
                                        </div>
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

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort, getStatusColor, getStatusLabel } from '@/lib/utils'
import { ClipboardList, Plus, X, Search, User, Calendar, Activity, Clock, CheckCircle2 } from 'lucide-react'
import { canManageModule } from '@/lib/rbac'

const CATEGORIES = ['Penyebaran Undangan', 'Penyampaian Informasi', 'Pengerjaan Konten', 'Lainnya']

export default function PRJobdeskPage() {
    const { currentUser } = useCurrentUser()
    const canManage = canManageModule(currentUser, 'content')
    const [tasks, setTasks] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ title: '', category: 'Penyebaran Undangan', description: '', pic_id: '', deadline: '', status: 'pending', notes: '' })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data, error } = await supabase.from('pr_jobdesk').select('*, pic:members(full_name)').order('created_at', { ascending: false })
        if (error) {
            console.error('PR Jobdesk Error:', error)
            setTasks([])
        } else {
            setTasks(data || [])
        }
        
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setMembers(m || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, pic_id: form.pic_id || null, deadline: form.deadline || null }
        if (editId) { await supabase.from('pr_jobdesk').update(payload).eq('id', editId) } else { await supabase.from('pr_jobdesk').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ title: '', category: 'Penyebaran Undangan', description: '', pic_id: '', deadline: '', status: 'pending', notes: '' }); loadData()
    }

    async function handleDelete(id: string) { if (confirm('Hapus jobdesk?')) { await supabase.from('pr_jobdesk').delete().eq('id', id); loadData() } }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
            case 'on_going': return <Activity size={16} style={{ color: 'var(--color-brand-600)' }} />
            default: return <Clock size={16} style={{ color: 'var(--color-warning)' }} />
        }
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Jobdesk PR</div></div>
            <div className="page-container">
                <h1 className="page-title">Jobdesk PR</h1>
                <p className="page-subtitle">Manajemen pembagian tugas Public Relations (PR)</p>

                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}><ClipboardList size={20} /></div>
                        <div><div className="stat-value">{tasks.length}</div><div className="stat-label">Total Tugas</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><Activity size={20} /></div>
                        <div><div className="stat-value">{tasks.filter(t => t.status === 'on_going').length}</div><div className="stat-label">Sedang Jalan</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Activity size={20} /></div>
                        <div><div className="stat-value">{tasks.filter(t => t.status === 'done').length}</div><div className="stat-label">Selesai</div></div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        {canManage && <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', category: 'Penyebaran Undangan', description: '', pic_id: '', deadline: '', status: 'pending', notes: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Tugas</button>}
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : tasks.length === 0 ? <div className="card"><div className="empty-state"><ClipboardList size={48} /><h3>Belum ada pembagian jobdesk</h3></div></div> :
                        tasks.map((t: any) => (
                            <div key={t.id} className="card hover-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span className="badge badge-info">{t.category}</span>
                                    <span className={`badge badge-${t.status === 'done' ? 'success' : t.status === 'on_going' ? 'brand' : 'warning'}`} style={{ textTransform: 'capitalize' }}>{t.status.replace('_', ' ')}</span>
                                </div>
                                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 8 }}>{t.title}</h3>
                                {t.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>{t.description}</p>}
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={14} /> PIC: {t.pic?.full_name || '-'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={14} /> Deadline: {t.deadline ? formatDateShort(t.deadline) : '-'}</div>
                                </div>

                                {canManage && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border-primary)' }}>
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setForm({ title: t.title, category: t.category, description: t.description || '', pic_id: t.pic_id || '', deadline: t.deadline || '', status: t.status, notes: t.notes || '' }); setEditId(t.id); setShowModal(true) }}>Edit</button>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(t.id)}>Hapus</button>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Jobdesk PR</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Judul Tugas *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Kategori</label><select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="on_going">On Going</option><option value="done">Done</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">PIC</label><select className="form-select" value={form.pic_id} onChange={e => setForm({ ...form, pic_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Catatan Tambahan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

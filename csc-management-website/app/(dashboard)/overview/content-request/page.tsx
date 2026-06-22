'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort, getStatusColor, getStatusLabel } from '@/lib/utils'
import { Send, Plus, X, Package, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { canManageModule } from '@/lib/rbac'

export default function OverviewContentRequestPage() {
    const { currentUser } = useCurrentUser()
    const canManage = canManageModule(currentUser, 'content')
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', platform: '', content_type: 'post', deadline: '', category: 'Event' })

    useEffect(() => { if (currentUser) loadData() }, [currentUser])

    async function loadData() {
        setLoading(true)
        let query = supabase.from('content_requests')
            .select('*, requester:members!content_requests_requester_id_fkey(full_name, department), handler:members!content_requests_handled_by_fkey(full_name)')
        
        if (!canManage) {
            query = query.eq('requester_id', currentUser?.id)
        }
        
        const { data } = await query.order('created_at', { ascending: false })
        setRequests(data || [])
        setLoading(false)
    }

    async function updateRequestStatus(id: string, status: string, notes?: string) {
        const { error } = await supabase.from('content_requests').update({
            status,
            marketing_notes: notes || null,
            handled_by: currentUser?.id,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        
        if (error) {
            alert(`Gagal update: ${error.message}`)
            return
        }
        loadData()
    }

    async function convertToContentPlan(req: any) {
        await supabase.from('content_plans').insert({
            title: req.title,
            platform: req.platform || 'Instagram',
            content_type: req.content_type || 'post',
            description: req.description || null,
            scheduled_date: req.deadline || null,
            status: 'draft',
        })
        await updateRequestStatus(req.id, 'in_progress', 'Dikonversi menjadi content plan')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        await supabase.from('content_requests').insert({
            title: form.title,
            description: `[Kategori: ${form.category}]\n\n${form.description}`,
            platform: form.platform,
            content_type: form.content_type,
            requester_id: currentUser?.id,
            deadline: form.deadline || null,
        })
        setShowModal(false)
        setForm({ title: '', description: '', platform: '', content_type: 'post', deadline: '', category: 'Event' })
        setSubmitted(true)
        loadData()
        setTimeout(() => setSubmitted(false), 3000)
    }

    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' },
        in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'Diproses' },
        completed: { bg: '#dcfce7', text: '#166534', label: 'Selesai' },
        rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Ditolak' },
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Ajukan Konten</div></div>
            <div className="page-container">
                <h1 className="page-title">Ajukan Permintaan Konten</h1>
                <p className="page-subtitle">Ajukan permintaan konten ke tim Marketing</p>

                {submitted && (
                    <div style={{
                        padding: '1rem', borderRadius: 12,
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        border: '1px solid #86efac',
                        marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}>
                        <span style={{ fontSize: '1.25rem' }}>✅</span>
                        <span style={{ fontWeight: 600, color: '#166534' }}>Permintaan konten berhasil dikirim!</span>
                    </div>
                )}

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '1.25rem'
                    }}>
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Clock size={20} /></div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Pending</div>
                            <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 700 }}>{requests.filter(r => r.status === 'pending').length}</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '1.25rem'
                    }}>
                        <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}><Package size={20} /></div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Diproses</div>
                            <div className="stat-value" style={{ color: '#2563eb', fontSize: '1.25rem', fontWeight: 700 }}>{requests.filter(r => r.status === 'in_progress').length}</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '1.25rem'
                    }}>
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><CheckCircle2 size={20} /></div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Selesai</div>
                            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 700 }}>{requests.filter(r => r.status === 'completed').length}</div>
                        </div>
                    </div>
                </div>

                <div className="toolbar" style={{ 
                    marginBottom: '1.5rem', 
                    background: 'var(--bg-secondary)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '1rem',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', background: 'var(--bg-primary)', fontSize: '0.8125rem', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                            {requests.length} Permintaan
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-primary" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }} onClick={() => setShowModal(true)}>
                            <Plus size={18} /> Ajukan Konten
                        </button>
                    </div>
                </div>

                {/* Requests List */}
                <div className="data-table-container" style={{ borderRadius: '1.25rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                    <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ padding: '1.25rem 1rem' }}>Judul / Konten</th>
                                {canManage && <th>Pengaju</th>}
                                <th>Platform</th>
                                <th>Tipe</th>
                                <th>Deadline</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>{canManage ? 'Aksi' : 'Catatan Marketing'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={canManage ? 7 : 6}><div className="empty-state"><Package size={48} /><h3>Belum ada permintaan</h3><p>Ajukan permintaan konten baru ke tim Marketing.</p></div></td></tr>
                            ) : requests.map((r: any) => {
                                const st = statusStyles[r.status] || statusStyles.pending
                                return (
                                    <tr key={r.id} className="table-row-hover">
                                        <td data-label="Judul" style={{ padding: '1.25rem 1rem', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                                            {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 400, marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{r.description}</div>}
                                        </td>
                                        {canManage && (
                                            <td data-label="Pengaju">
                                                <div style={{ fontWeight: 500 }}>{r.requester?.full_name || '-'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.requester?.department}</div>
                                            </td>
                                        )}
                                        <td data-label="Platform">
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{r.platform || '-'}</span>
                                        </td>
                                        <td data-label="Tipe">
                                            <span className="badge badge-info" style={{ borderRadius: '0.5rem', fontSize: '0.7rem', textTransform: 'capitalize' }}>{r.content_type}</span>
                                        </td>
                                        <td data-label="Deadline" style={{ fontSize: '0.8125rem' }}>{r.deadline ? formatDateShort(r.deadline) : <span style={{ color: 'var(--text-tertiary)' }}>-</span>}</td>
                                        <td data-label="Status">
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '0.5rem',
                                                fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.text,
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.text }}></div>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                            {canManage ? (
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" style={{ borderRadius: '0.5rem' }} onClick={() => convertToContentPlan(r)}><CheckCircle2 size={14} /> Terima</button>
                                                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderRadius: '0.5rem' }} onClick={() => updateRequestStatus(r.id, 'rejected')}><XCircle size={14} /></button>
                                                        </>
                                                    )}
                                                    {r.status === 'in_progress' && (
                                                        <button className="btn btn-secondary btn-sm" style={{ borderRadius: '0.5rem' }} onClick={() => updateRequestStatus(r.id, 'completed')}>Selesai</button>
                                                    )}
                                                    {['completed', 'rejected'].includes(r.status) && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Tuntas</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                    {r.marketing_notes || 'Belum ada catatan'}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Submit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                            <div className="modal-header"><h2>Ajukan Konten Baru</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Judul Konten *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Judul konten yang diinginkan" /></div>
                                    <div className="form-group">
                                        <label className="form-label">Kategori Order</label>
                                        <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            <option value="Event">Event</option>
                                            <option value="Business">Business</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Deskripsi *</label><textarea className="form-textarea" required style={{ minHeight: 100 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan detail konten yang diinginkan..." /></div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                            <input type="checkbox" checked={form.platform === 'Instagram CSC'} onChange={e => setForm({ ...form, platform: e.target.checked ? 'Instagram CSC' : '' })} />
                                            Hanya Upload di Instagram CSC
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Tipe Konten</label>
                                            <select className="form-select" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
                                                <option value="post">Post</option><option value="story">Story</option><option value="reel">Reel</option>
                                                <option value="article">Artikel</option><option value="video">Video</option><option value="other">Lainnya</option>
                                            </select>
                                        </div>
                                        <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
                                    </div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary"><Send size={16} /> Kirim</button></div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

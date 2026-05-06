'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort, getStatusColor, getStatusLabel } from '@/lib/utils'
import { Send, Plus, X, Package, CheckCircle2, XCircle } from 'lucide-react'
import { canManageModule } from '@/lib/rbac'

export default function OverviewContentRequestPage() {
    const { currentUser } = useCurrentUser()
    const canManage = canManageModule(currentUser, 'content')
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', platform: '', content_type: 'post', deadline: '' })

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
            ...form,
            requester_id: currentUser?.id,
            deadline: form.deadline || null,
        })
        setShowModal(false)
        setForm({ title: '', description: '', platform: '', content_type: 'post', deadline: '' })
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

                <div className="toolbar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="toolbar-left">
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {requests.length} permintaan
                        </span>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowModal(true)}>
                            <Plus size={16} /> <span className="hidden sm:inline">Ajukan Konten Baru</span><span className="sm:hidden">Ajukan</span>
                        </button>
                    </div>
                </div>

                {/* Requests List */}
                <div className="data-table-container">
                    <table className="data-table">
                        <thead><tr><th>Judul</th>{canManage && <th>Pengaju</th>}<th>Platform</th><th>Tipe</th><th>Deadline</th><th>Status</th><th>{canManage ? 'Aksi' : 'Catatan'}</th></tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={canManage ? 7 : 6}><div className="empty-state"><Package size={48} /><h3>Belum ada permintaan</h3><p>Ajukan permintaan konten baru ke tim Marketing.</p></div></td></tr>
                            ) : requests.map((r: any) => {
                                const st = statusStyles[r.status] || statusStyles.pending
                                return (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{r.title}</div>
                                            {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                                        </td>
                                        {canManage && (
                                            <td style={{ fontSize: '0.8125rem' }}>
                                                {r.requester?.full_name || '-'}<br />
                                                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{r.requester?.department}</span>
                                            </td>
                                        )}
                                        <td>{r.platform || '-'}</td>
                                        <td><span className="badge badge-info">{r.content_type}</span></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{r.deadline ? formatDateShort(r.deadline) : '-'}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 6,
                                                fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.text,
                                            }}>{st.label}</span>
                                        </td>
                                        <td>
                                            {canManage ? (
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" onClick={() => convertToContentPlan(r)}><CheckCircle2 size={14} /> Terima</button>
                                                            <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => updateRequestStatus(r.id, 'rejected')}><XCircle size={14} /></button>
                                                        </>
                                                    )}
                                                    {r.status === 'in_progress' && (
                                                        <button className="btn btn-secondary btn-sm" onClick={() => updateRequestStatus(r.id, 'completed')}>Selesai</button>
                                                    )}
                                                    {['completed', 'rejected'].includes(r.status) && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Tuntas</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                                                    {r.marketing_notes || '-'}
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

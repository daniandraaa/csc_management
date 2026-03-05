'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction, isSecretary, isAdministration, isBOE } from '@/lib/rbac'
import { getStatusColor, getStatusLabel, formatDateShort, getInitials } from '@/lib/utils'
import { ShieldCheck, Plus, X, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function AdminReviewPage() {
    const { currentUser } = useCurrentUser()
    const [reviews, setReviews] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showReview, setShowReview] = useState<any>(null)
    const [form, setForm] = useState({ title: '', description: '', submitted_by: '', file_url: '', link_url: '', change_description: '' })
    const [reviewForm, setReviewForm] = useState({ secretary_status: '', secretary_notes: '', admin_status: '', admin_notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/admin-review', 'create')
    const canReview = canPerformAction(currentUser, '/admin-review', 'approve')
    const userIsSecretary = isSecretary(currentUser)
    const userIsAdmin = isAdministration(currentUser)
    const userIsBOE = isBOE(currentUser)
    const isBusinessPartner = currentUser?.role === 'Business Partner'

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('admin_reviews').select('*, submitter:members!admin_reviews_submitted_by_fkey(full_name,department,role)').order('created_at', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name')

        let filtered = data || []
        // Business Partners only see their own submissions
        if (isBusinessPartner && currentUser) {
            filtered = filtered.filter(r => r.submitted_by === currentUser.id)
        }
        // Staff only see their own submissions
        if (currentUser?.role === 'Staff') {
            filtered = filtered.filter(r => r.submitted_by === currentUser.id)
        }

        setReviews(filtered); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, submitted_by: form.submitted_by || currentUser?.id }
        if (editId) { await supabase.from('admin_reviews').update(payload).eq('id', editId) } else { await supabase.from('admin_reviews').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ title: '', description: '', submitted_by: '', file_url: '', link_url: '', change_description: '' }); loadData()
    }

    async function handleReview(id: string) {
        const update: any = {}
        // Secretary can only update secretary fields
        if (userIsSecretary) {
            update.secretary_status = reviewForm.secretary_status
            update.secretary_notes = reviewForm.secretary_notes
            update.secretary_reviewed_by = currentUser?.id
            update.secretary_reviewed_at = new Date().toISOString()
        }
        // Admin can only update admin fields (but BOE can update both)
        if (userIsAdmin || userIsBOE) {
            update.admin_status = reviewForm.admin_status
            update.admin_notes = reviewForm.admin_notes
            update.admin_reviewed_by = currentUser?.id
            update.admin_reviewed_at = new Date().toISOString()
        }
        // BOE can update both
        if (userIsBOE) {
            update.secretary_status = reviewForm.secretary_status
            update.secretary_notes = reviewForm.secretary_notes
        }

        await supabase.from('admin_reviews').update(update).eq('id', id)
        setShowReview(null); loadData()
    }

    function openReview(r: any) {
        setReviewForm({ secretary_status: r.secretary_status, secretary_notes: r.secretary_notes || '', admin_status: r.admin_status, admin_notes: r.admin_notes || '' })
        setShowReview(r)
    }

    const statusIcon = (status: string) => {
        if (status === 'approved') return <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
        if (status === 'rejected') return <XCircle size={16} style={{ color: 'var(--color-danger)' }} />
        if (status === 'revision_needed') return <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />
        return <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-border-secondary)' }} />
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Review Administrasi</div></div>
            <div className="page-container">
                <h1 className="page-title">Review Administrasi</h1>
                <p className="page-subtitle">
                    {isBusinessPartner ? 'Lihat status pengajuan review Anda' : '2-tier review: Sekretaris → Administrasi'}
                </p>

                {/* Role info banner */}
                {canReview && (
                    <div style={{
                        padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem',
                        background: userIsSecretary && !userIsBOE ? '#eff6ff' : userIsAdmin && !userIsBOE ? '#f5f3ff' : '#fef2f2',
                        border: `1px solid ${userIsSecretary && !userIsBOE ? '#bfdbfe' : userIsAdmin && !userIsBOE ? '#ddd6fe' : '#fecaca'}`,
                        fontSize: '0.8125rem',
                    }}>
                        🛡️ Anda login sebagai <strong>{currentUser?.role}</strong> —
                        {userIsBOE ? ' dapat mereview kedua tier' :
                            userIsSecretary ? ' dapat mereview Tier 1 (Sekretaris)' :
                                ' dapat mereview Tier 2 (Administrasi)'}
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><ShieldCheck size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{reviews.filter(r => r.secretary_status === 'pending' || r.admin_status === 'pending').length}</div><div className="stat-label">Perlu Review</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><ShieldCheck size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{reviews.filter(r => r.secretary_status === 'approved' && r.admin_status === 'approved').length}</div><div className="stat-label">Fully Approved</div></div></div>
                </div>

                <div className="toolbar"><div />
                    <div className="toolbar-right">
                        {canCreate && !isBusinessPartner && (
                            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', description: '', submitted_by: currentUser?.id || '', file_url: '', link_url: '', change_description: '' }); setShowModal(true) }}><Plus size={16} /> Ajukan Review</button>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Judul</th><th>Pengaju</th><th>File/Link</th><th style={{ textAlign: 'center' }}>Sekretaris</th><th style={{ textAlign: 'center' }}>Administrasi</th><th>Revisi</th><th>Tanggal</th>{canReview && <th>Aksi</th>}</tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                reviews.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><ShieldCheck size={48} /><h3>Belum ada review</h3></div></td></tr> :
                                    reviews.map((r: any) => (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{r.title}</div>
                                                {r.change_description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Perubahan: {r.change_description}</div>}
                                            </td>
                                            <td>{r.submitter?.full_name}</td>
                                            <td>
                                                {r.file_url && <a href={r.file_url} target="_blank" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-600)' }}>📄 File</a>}
                                                {r.link_url && <a href={r.link_url} target="_blank" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-600)' }}>🔗 Link</a>}
                                                {!r.file_url && !r.link_url && '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                    {statusIcon(r.secretary_status)}
                                                    <span className={`badge badge-${getStatusColor(r.secretary_status)}`} style={{ fontSize: '0.6875rem' }}>{getStatusLabel(r.secretary_status)}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                    {statusIcon(r.admin_status)}
                                                    <span className={`badge badge-${getStatusColor(r.admin_status)}`} style={{ fontSize: '0.6875rem' }}>{getStatusLabel(r.admin_status)}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{r.revision_count}</td>
                                            <td style={{ fontSize: '0.8125rem' }}>{formatDateShort(r.created_at)}</td>
                                            {canReview && <td><button className="btn btn-secondary btn-sm" onClick={() => openReview(r)}>Review</button></td>}
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {/* Submit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>Ajukan Review</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Pengaju</label>
                                    {userIsBOE || userIsSecretary ? (
                                        <select className="form-select" value={form.submitted_by} onChange={e => setForm({ ...form, submitted_by: e.target.value })}>
                                            <option value="">Pilih</option>
                                            {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                        </select>
                                    ) : (
                                        <input className="form-input" value={currentUser?.full_name || ''} disabled />
                                    )}
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Link File (PDF)</label><input className="form-input" placeholder="https://..." value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Link Dokumen</label><input className="form-input" placeholder="https://..." value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi Perubahan</label><textarea className="form-textarea" placeholder="Jelaskan perubahan yang dilakukan..." value={form.change_description} onChange={e => setForm({ ...form, change_description: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">Ajukan</button></div></form>
                        </div>
                    </div>
                )}

                {/* Review Modal (2-tier with role restrictions) */}
                {showReview && (
                    <div className="modal-overlay" onClick={() => setShowReview(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>Review: {showReview.title}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowReview(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                {showReview.description && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-surface-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{showReview.description}</div>}
                                {showReview.change_description && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}><strong>Perubahan:</strong> {showReview.change_description}</div>}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    {showReview.file_url && <a href={showReview.file_url} target="_blank" className="btn btn-secondary btn-sm">📄 Buka File</a>}
                                    {showReview.link_url && <a href={showReview.link_url} target="_blank" className="btn btn-secondary btn-sm">🔗 Buka Link</a>}
                                </div>

                                {/* Sekretaris Review — can edit only if Secretary or BOE */}
                                <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem', opacity: (userIsSecretary || userIsBOE) ? 1 : 0.6 }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>📋 Review Sekretaris {!(userIsSecretary || userIsBOE) && <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 400 }}>(Hanya Sekretaris/BOE)</span>}</h4>
                                    <div className="form-group"><label className="form-label">Status</label>
                                        <select className="form-select" value={reviewForm.secretary_status} onChange={e => setReviewForm({ ...reviewForm, secretary_status: e.target.value })} disabled={!(userIsSecretary || userIsBOE)}>
                                            <option value="pending">Pending</option><option value="approved">Approved</option><option value="revision_needed">Perlu Revisi</option><option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Catatan Sekretaris</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={reviewForm.secretary_notes} onChange={e => setReviewForm({ ...reviewForm, secretary_notes: e.target.value })} disabled={!(userIsSecretary || userIsBOE)} /></div>
                                </div>

                                {/* Admin Review — can edit only if Administration or BOE */}
                                <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', opacity: (userIsAdmin || userIsBOE) ? 1 : 0.6 }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>🛡️ Review Administrasi {!(userIsAdmin || userIsBOE) && <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 400 }}>(Hanya Administrasi/BOE)</span>}</h4>
                                    <div className="form-group"><label className="form-label">Status</label>
                                        <select className="form-select" value={reviewForm.admin_status} onChange={e => setReviewForm({ ...reviewForm, admin_status: e.target.value })} disabled={!(userIsAdmin || userIsBOE)}>
                                            <option value="pending">Pending</option><option value="approved">Approved</option><option value="revision_needed">Perlu Revisi</option><option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Catatan Administrasi</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={reviewForm.admin_notes} onChange={e => setReviewForm({ ...reviewForm, admin_notes: e.target.value })} disabled={!(userIsAdmin || userIsBOE)} /></div>
                                </div>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowReview(null)}>Batal</button><button className="btn btn-primary" onClick={() => handleReview(showReview.id)}>Simpan Review</button></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

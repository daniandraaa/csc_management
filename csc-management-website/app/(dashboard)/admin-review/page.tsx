'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { useSearchParams } from 'next/navigation'
import { canPerformAction, isSecretary, isAdministration, isBOE } from '@/lib/rbac'
import { getStatusColor, getStatusLabel, formatDateShort, getInitials } from '@/lib/utils'
import { ShieldCheck, Plus, X, Search, CheckCircle2, XCircle, AlertCircle, Trash2, Edit, RotateCcw, History } from 'lucide-react'

export default function AdminReviewPage() {
    const { currentUser } = useCurrentUser()
    const searchParams = useSearchParams()
    const docId = searchParams.get('docId')
    const [reviews, setReviews] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showReview, setShowReview] = useState<any>(null)
    const [form, setForm] = useState({ title: '', description: '', submitted_by: '', file_url: '', link_url: '', change_description: '', document_id: '' })
    const [reviewForm, setReviewForm] = useState({ secretary_status: '', secretary_notes: '', admin_status: '', admin_notes: '' })
    const [showHistory, setShowHistory] = useState<any>(null)
    const [revisionLogs, setRevisionLogs] = useState<any[]>([])
    const [revisionNote, setRevisionNote] = useState('')
    const [showRevisionModal, setShowRevisionModal] = useState<any>(null)

    const canCreate = canPerformAction(currentUser, '/admin-review', 'create')
    const canReview = canPerformAction(currentUser, '/admin-review', 'approve')
    const canDelete = canPerformAction(currentUser, '/admin-review', 'delete')
    const userIsSecretary = isSecretary(currentUser)
    const userIsAdmin = isAdministration(currentUser)
    const userIsExecutive = isBOE(currentUser)
    const isBusinessPartner = currentUser?.role === 'Business Partner'

    useEffect(() => { loadData() }, [])
    
    useEffect(() => {
        if (docId && documents.length > 0) {
            const doc = documents.find(d => d.id === docId)
            if (doc) {
                setForm(prev => ({
                    ...prev,
                    title: `Review: ${doc.title}`,
                    document_id: docId,
                    file_url: doc.file_url || ''
                }))
                setShowModal(true)
            }
        }
    }, [docId, documents])

    async function loadData() {
        setLoading(true)
        const { data, error } = await supabase.from('admin_reviews').select('*, submitter:members!admin_reviews_submitted_by_fkey(full_name,department,role)').order('created_at', { ascending: false })
        
        // Coba fetch document relasi secara terpisah jika kolom document_id sudah ada
        let reviewsData = data || []
        const { data: withDocs, error: testErr } = await supabase.from('admin_reviews').select('id, document_id, document:documents(title, document_number, file_url)').limit(1)
        
        if (!testErr && withDocs) {
            const { data: fullDocs } = await supabase.from('admin_reviews').select('*, submitter:members!admin_reviews_submitted_by_fkey(full_name,department,role), document:documents(title, document_number, file_url)').order('created_at', { ascending: false })
            if (fullDocs) reviewsData = fullDocs
        }
        const { data: m } = await supabase.from('members').select('id,full_name')
        const { data: d } = await supabase.from('documents').select('id,title,document_number,file_url').order('document_date', { ascending: false })

        let filtered = reviewsData
        // Business Partners only see their own submissions
        if (isBusinessPartner && currentUser) {
            filtered = filtered.filter(r => r.submitted_by === currentUser.id)
        }
        // Staff only see their own submissions, unless they are Administration
        if (currentUser?.role === 'Staff' && !userIsAdmin) {
            filtered = filtered.filter(r => r.submitted_by === currentUser.id)
        }

        setReviews(filtered); setMembers(m || []); setDocuments(d || []); setLoading(false)
    }

    const [editId, setEditId] = useState<string | null>(null)

    async function loadRevisionLogs(reviewId: string) {
        const { data } = await supabase.from('admin_revision_logs').select('*, reviewer:members!admin_revision_logs_revised_by_fkey(full_name,role)').eq('review_id', reviewId).order('revision_number', { ascending: true })
        setRevisionLogs(data || [])
    }

    async function openHistory(review: any) {
        setShowHistory(review)
        await loadRevisionLogs(review.id)
    }

    async function addRevision(reviewId: string) {
        if (!revisionNote.trim()) { alert('Masukkan catatan revisi'); return }
        const currentReview = reviews.find(r => r.id === reviewId)
        const nextNum = (currentReview?.revision_count || 0) + 1
        const { error } = await supabase.from('admin_revision_logs').insert({
            review_id: reviewId, revision_number: nextNum,
            revised_by: currentUser?.id || null, revision_notes: revisionNote,
            status_before: currentReview?.admin_status || 'pending', status_after: 'revision_needed'
        })
        if (error) { alert('Error: ' + error.message); return }
        await supabase.from('admin_reviews').update({ revision_count: nextNum, admin_status: 'revision_needed' }).eq('id', reviewId)
        setRevisionNote(''); setShowRevisionModal(null); loadData()
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload: any = { title: form.title, description: form.description, file_url: form.file_url, link_url: form.link_url, change_description: form.change_description, submitted_by: form.submitted_by || currentUser?.id }
        
        // Hanya kirim document_id jika user memilihnya (mencegah error jika kolom belum ada dan user tidak memilih)
        if (form.document_id) {
            payload.document_id = form.document_id
        }

        let res;
        if (editId) { 
            res = await supabase.from('admin_reviews').update(payload).eq('id', editId) 
        } else { 
            res = await supabase.from('admin_reviews').insert(payload) 
        }

        if (res.error) {
            alert("Error menyimpan: " + res.error.message + "\n\nPastikan Anda sudah menjalankan query ALTER TABLE di Supabase jika error berkaitan dengan document_id!")
            return
        }

        setShowModal(false); setEditId(null); setForm({ title: '', description: '', submitted_by: '', file_url: '', link_url: '', change_description: '', document_id: '' }); loadData()
    }

    async function handleReview(id: string) {
        const update: any = {}
        // Secretary section can now be updated by Admin or Executive (BOE)
        if (userIsAdmin || userIsExecutive) {
            update.secretary_status = reviewForm.secretary_status
            update.secretary_notes = reviewForm.secretary_notes
            update.secretary_reviewed_by = currentUser?.id
            update.secretary_reviewed_at = new Date().toISOString()
        }
        // Admin section can only update admin fields
        if (userIsAdmin || userIsExecutive) {
            update.admin_status = reviewForm.admin_status
            update.admin_notes = reviewForm.admin_notes
            update.admin_reviewed_by = currentUser?.id
            update.admin_reviewed_at = new Date().toISOString()
        }

        await supabase.from('admin_reviews').update(update).eq('id', id)
        setShowReview(null); loadData()
    }

    function openReview(r: any) {
        setReviewForm({ secretary_status: r.secretary_status, secretary_notes: r.secretary_notes || '', admin_status: r.admin_status, admin_notes: r.admin_notes || '' })
        setShowReview(r)
    }

    function openEdit(r: any) {
        setEditId(r.id)
        setForm({
            title: r.title,
            description: r.description || '',
            submitted_by: r.submitted_by,
            file_url: r.file_url || '',
            link_url: r.link_url || '',
            change_description: r.change_description || '',
            document_id: r.document_id || ''
        })
        setShowModal(true)
    }

    async function handleDelete(id: string) {
        if (!confirm('Yakin ingin menghapus review ini?')) return
        const { error } = await supabase.from('admin_reviews').delete().eq('id', id)
        if (error) {
            console.error('Delete error:', error)
            alert('Gagal menghapus review: ' + error.message)
        } else {
            loadData()
        }
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
                        background: userIsSecretary && !userIsExecutive ? '#eff6ff' : userIsAdmin && !userIsExecutive ? '#f5f3ff' : '#fef2f2',
                        border: `1px solid ${userIsSecretary && !userIsExecutive ? '#bfdbfe' : userIsAdmin && !userIsExecutive ? '#ddd6fe' : '#fecaca'}`,
                        fontSize: '0.8125rem',
                    }}>
                        🛡️ Anda login sebagai <strong>{currentUser?.role}</strong> —
                        {userIsExecutive ? ' memiliki akses BOE (Full Access)' :
                                ' Anda dapat melakukan Review Administrasi'}
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><ShieldCheck size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{reviews.filter(r => r.secretary_status === 'pending' || r.admin_status === 'pending').length}</div><div className="stat-label">Perlu Review</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><ShieldCheck size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{reviews.filter(r => r.secretary_status === 'approved' && r.admin_status === 'approved').length}</div><div className="stat-label">Fully Approved</div></div></div>
                </div>

                <div className="toolbar"><div />
                    <div className="toolbar-right">
                        {canCreate && !isBusinessPartner && (
                            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', description: '', submitted_by: currentUser?.id || '', file_url: '', link_url: '', change_description: '', document_id: '' }); setShowModal(true) }}><Plus size={16} /> Ajukan Review</button>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Judul</th><th>Pengaju</th><th>File/Link</th><th style={{ textAlign: 'center' }}>Sekretaris</th><th style={{ textAlign: 'center' }}>Administrasi</th><th style={{ textAlign: 'center' }}>Revisi</th><th>Tanggal</th>{canReview && <th>Aksi</th>}</tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                reviews.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><ShieldCheck size={48} /><h3>Belum ada review</h3></div></td></tr> :
                                    reviews.map((r: any) => (
                                        <tr key={r.id}>
                                            <td data-label="Judul">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                                                    {r.change_description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Perubahan: {r.change_description}</div>}
                                                </div>
                                            </td>
                                            <td data-label="Pengaju">{r.submitter?.full_name}</td>
                                            <td data-label="File/Link">
                                                {r.document && (
                                                    <div style={{ fontSize: '0.8125rem', marginBottom: 4, padding: '4px 8px', background: 'var(--color-surface-secondary)', borderRadius: 4 }}>
                                                        <strong>Dokumen:</strong> {r.document.title}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {(r.file_url || r.link_url || r.document?.file_url) ? (
                                                        <a href={r.file_url || r.link_url || r.document?.file_url} target="_blank" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-600)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Search size={14} /> Buka Link
                                                        </a>
                                                    ) : '-'}
                                                </div>
                                            </td>
                                            <td data-label="Sekretaris" style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                    {statusIcon(r.secretary_status)}
                                                    <span className={`badge badge-${getStatusColor(r.secretary_status)}`} style={{ fontSize: '0.6875rem' }}>{getStatusLabel(r.secretary_status)}</span>
                                                </div>
                                            </td>
                                            <td data-label="Administrasi" style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                    {statusIcon(r.admin_status)}
                                                    <span className={`badge badge-${getStatusColor(r.admin_status)}`} style={{ fontSize: '0.6875rem' }}>{getStatusLabel(r.admin_status)}</span>
                                                </div>
                                            </td>
                                            <td data-label="Revisi" style={{ textAlign: 'center' }}>{r.revision_count}</td>
                                            <td data-label="Tanggal" style={{ fontSize: '0.8125rem' }}>{formatDateShort(r.created_at)}</td>
                                            <td data-label="Aksi">
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {canReview && <button className="btn btn-secondary btn-sm" onClick={() => openReview(r)}>Review</button>}
                                                    {canReview && <button className="btn btn-sm" style={{ background: '#fef3c7', color: '#d97706', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, padding: '4px 10px', fontWeight: 600, fontSize: '0.75rem' }} onClick={() => setShowRevisionModal(r)} title="Ajukan Revisi"><RotateCcw size={13} /> Revisi</button>}
                                                    <button className="btn btn-ghost btn-sm btn-icon" title="Riwayat Log" onClick={() => openHistory(r)}><History size={14} /></button>
                                                    {(canCreate && r.submitted_by === currentUser?.id || userIsAdmin || userIsExecutive) && (
                                                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(r)}><Edit size={14} /></button>
                                                    )}
                                                    {canDelete && (
                                                        <button className="btn btn-ghost btn-sm btn-icon" title="Hapus" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                                                    )}
                                                </div>
                                            </td>
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
                                    {userIsExecutive || userIsSecretary ? (
                                        <select className="form-select" value={form.submitted_by} onChange={e => setForm({ ...form, submitted_by: e.target.value })}>
                                            <option value="">Pilih</option>
                                            {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                        </select>
                                    ) : (
                                        <input className="form-input" value={currentUser?.full_name || ''} disabled />
                                    )}
                                </div>
                                <div className="form-group"><label className="form-label">Dokumen Terkait (Opsional)</label>
                                    <select className="form-select" value={form.document_id} onChange={e => {
                                        const selectedDocId = e.target.value;
                                        const doc = documents.find(d => d.id === selectedDocId);
                                        setForm({ 
                                            ...form, 
                                            document_id: selectedDocId,
                                            file_url: doc?.file_url || form.file_url 
                                        });
                                    }}>
                                        <option value="">-- Pilih Dokumen --</option>
                                        {documents.map((d: any) => <option key={d.id} value={d.id}>{d.document_number ? `[${d.document_number}] ` : ''}{d.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Link File (PDF)</label><input className="form-input" placeholder="https://..." value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} /></div>
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
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    {showReview.document && (
                                        <div style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.875rem' }}>
                                            <strong>Dokumen Terkait:</strong> {showReview.document.title} {showReview.document.document_number && `(${showReview.document.document_number})`}
                                        </div>
                                    )}
                                    {(showReview.file_url || showReview.link_url || showReview.document?.file_url) && (
                                        <a href={showReview.file_url || showReview.link_url || showReview.document?.file_url} target="_blank" className="btn btn-secondary btn-sm">
                                            <Search size={14} /> Buka Link
                                        </a>
                                    )}
                                </div>

                                {/* Sekretaris Review — can edit only if Admin or Executive */}
                                <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem', opacity: (userIsAdmin || userIsExecutive) ? 1 : 0.6 }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>📋 Review Sekretaris {!(userIsAdmin || userIsExecutive) && <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 400 }}>(Hanya Admin/Executive)</span>}</h4>
                                    <div className="form-group"><label className="form-label">Status</label>
                                        <select className="form-select" value={reviewForm.secretary_status} onChange={e => setReviewForm({ ...reviewForm, secretary_status: e.target.value })} disabled={!(userIsAdmin || userIsExecutive)}>
                                            <option value="pending">Pending</option><option value="approved">Approved</option><option value="revision_needed">Perlu Revisi</option><option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Catatan Sekretaris</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={reviewForm.secretary_notes} onChange={e => setReviewForm({ ...reviewForm, secretary_notes: e.target.value })} disabled={!(userIsAdmin || userIsExecutive)} /></div>
                                </div>

                                {/* Admin Review — can edit only if Administration or Executive */}
                                <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', opacity: (userIsAdmin || userIsExecutive) ? 1 : 0.6 }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>🛡️ Review Administrasi {!(userIsAdmin || userIsExecutive) && <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 400 }}>(Hanya Administrasi/Executive)</span>}</h4>
                                    <div className="form-group"><label className="form-label">Status</label>
                                        <select className="form-select" value={reviewForm.admin_status} onChange={e => setReviewForm({ ...reviewForm, admin_status: e.target.value })} disabled={!(userIsAdmin || userIsExecutive)}>
                                            <option value="pending">Pending</option><option value="approved">Approved</option><option value="revision_needed">Perlu Revisi</option><option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Catatan Administrasi</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={reviewForm.admin_notes} onChange={e => setReviewForm({ ...reviewForm, admin_notes: e.target.value })} disabled={!(userIsAdmin || userIsExecutive)} /></div>
                                </div>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowReview(null)}>Batal</button><button className="btn btn-primary" onClick={() => handleReview(showReview.id)}>Simpan Review</button></div>
                        </div>
                    </div>
                )}

                {/* Revision Modal */}
                {showRevisionModal && (
                    <div className="modal-overlay" onClick={() => setShowRevisionModal(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className="modal-header"><h2>Ajukan Revisi</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowRevisionModal(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8125rem' }}>
                                    <strong>{showRevisionModal.title}</strong><br/>
                                    <span style={{ color: '#92400e' }}>Revisi ke-{(showRevisionModal.revision_count || 0) + 1}</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Catatan Revisi *</label>
                                    <textarea className="form-textarea" placeholder="Jelaskan apa yang perlu direvisi..." value={revisionNote} onChange={e => setRevisionNote(e.target.value)} style={{ minHeight: 100 }} />
                                </div>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowRevisionModal(null)}>Batal</button><button className="btn btn-primary" onClick={() => addRevision(showRevisionModal.id)}>Submit Revisi</button></div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {showHistory && (
                    <div className="modal-overlay" onClick={() => setShowHistory(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                            <div className="modal-header"><h2>Riwayat Revisi</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowHistory(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 8, marginBottom: '1rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{showHistory.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Total revisi: {showHistory.revision_count || 0}x • Pengaju: {showHistory.submitter?.full_name || '-'}</div>
                                </div>
                                {revisionLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>Belum ada log revisi</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        {revisionLogs.map((log, idx) => (
                                            <div key={log.id} style={{ display: 'flex', gap: 12, position: 'relative', paddingLeft: 24, paddingBottom: idx < revisionLogs.length - 1 ? 16 : 0 }}>
                                                {idx < revisionLogs.length - 1 && <div style={{ position: 'absolute', left: 7, top: 18, bottom: 0, width: 2, background: '#e2e8f0' }} />}
                                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fef3c7', border: '2px solid #f59e0b', flexShrink: 0, position: 'absolute', left: 0, top: 2 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#d97706' }}>Revisi #{log.revision_number}</span>
                                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Oleh: <strong>{(log.reviewer as any)?.full_name || '-'}</strong></div>
                                                    {log.revision_notes && <div style={{ fontSize: '0.8125rem', marginTop: 6, padding: '0.5rem 0.75rem', background: '#fffbeb', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>{log.revision_notes}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer"><button className="btn btn-primary" onClick={() => setShowHistory(null)}>Tutup</button></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

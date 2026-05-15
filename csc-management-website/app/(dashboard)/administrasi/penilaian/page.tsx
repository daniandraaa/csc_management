'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Search, Plus, X, Star, TrendingUp, Award, BarChart3, FileText, CheckCircle2, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import '../admin-responsive.css'

export default function PenilaianPage() {
    const { currentUser } = useCurrentUser()
    const [programs, setPrograms] = useState<any[]>([])
    const [adminDocs, setAdminDocs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
    // Inline review state
    const [reviewingDoc, setReviewingDoc] = useState<any>(null)
    const [reviewForm, setReviewForm] = useState({ admin_status: 'approved', admin_notes: '', doc_score: 80, score_notes: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: progs } = await supabase.from('programs').select('id, name, department:departments(name), start_date, end_date, program_type').order('name')
        const { data: docs } = await supabase.from('admin_reviews').select('id, title, admin_status, admin_notes, revision_count, doc_type, doc_source, program_id, deadline, created_at, doc_score, score_notes, scored_at, submitter:members!admin_reviews_submitted_by_fkey(full_name), scorer:members!admin_reviews_scored_by_fkey(full_name)').order('created_at', { ascending: false })
        setPrograms(progs || [])
        setAdminDocs(docs || [])
        setLoading(false)
    }

    function openReview(doc: any) {
        setReviewForm({
            admin_status: doc.admin_status || 'pending',
            admin_notes: doc.admin_notes || '',
            doc_score: doc.doc_score || 80,
            score_notes: doc.score_notes || ''
        })
        setReviewingDoc(doc)
    }

    async function handleSaveReview() {
        if (!reviewingDoc) return
        setSaving(true)
        const update: any = {
            admin_status: reviewForm.admin_status,
            admin_notes: reviewForm.admin_notes,
            doc_score: reviewForm.doc_score,
            score_notes: reviewForm.score_notes,
            scored_by: currentUser?.id || null,
            scored_at: new Date().toISOString()
        }
        if (reviewForm.admin_status === 'approved' || reviewForm.admin_status === 'rejected') {
            update.admin_reviewed_by = currentUser?.id
            update.admin_reviewed_at = new Date().toISOString()
        }
        const { error } = await supabase.from('admin_reviews').update(update).eq('id', reviewingDoc.id)
        setSaving(false)
        if (error) { alert('Error: ' + error.message); return }
        setReviewingDoc(null); loadData()
    }

    async function quickScore(docId: string, status: string) {
        await supabase.from('admin_reviews').update({
            admin_status: status,
            admin_reviewed_by: currentUser?.id,
            admin_reviewed_at: new Date().toISOString()
        }).eq('id', docId)
        loadData()
    }

    // Build per-program view with average scores
    const programsWithDocs = programs.map(p => {
        const docs = adminDocs.filter(d => d.program_id === p.id)
        const scoredDocs = docs.filter(d => d.doc_score != null)
        const avgScore = scoredDocs.length > 0 ? Math.round(scoredDocs.reduce((a, d) => a + d.doc_score, 0) / scoredDocs.length) : null
        const approved = docs.filter(d => d.admin_status === 'approved').length
        return { ...p, docs, avgScore, scoredCount: scoredDocs.length, approved, total: docs.length, dept: (p.department as any)?.name || '-' }
    }).filter(p => p.total > 0)

    const standaloneDocs = adminDocs.filter(d => !d.program_id)

    const filtered = programsWithDocs.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.dept.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Global stats
    const allScored = adminDocs.filter(d => d.doc_score != null)
    const globalAvg = allScored.length > 0 ? Math.round(allScored.reduce((a, d) => a + d.doc_score, 0) / allScored.length) : 0
    const pendingReview = adminDocs.filter(d => d.admin_status === 'pending').length

    const scoreColor = (s: number) => s >= 90 ? '#10b981' : s >= 80 ? '#3b82f6' : s >= 70 ? '#f59e0b' : '#ef4444'
    const scoreLabel = (s: number) => s >= 90 ? 'Sangat Baik' : s >= 80 ? 'Baik' : s >= 70 ? 'Cukup' : 'Perlu Perbaikan'

    const statusCfg: Record<string, { l: string, c: string, bg: string }> = {
        pending: { l: 'Pending', c: '#f59e0b', bg: '#fffbeb' },
        approved: { l: 'Approved', c: '#10b981', bg: '#ecfdf5' },
        revision_needed: { l: 'Revisi', c: '#3b82f6', bg: '#eff6ff' },
        rejected: { l: 'Ditolak', c: '#ef4444', bg: '#fef2f2' },
    }

    function DocRow({ doc }: { doc: any }) {
        const st = statusCfg[doc.admin_status] || statusCfg.pending
        const hasScore = doc.doc_score != null
        return (
            <div style={{ padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 160 }}>
                    <FileText size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{doc.title}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <span>{doc.doc_type}</span>
                            <span>•</span>
                            <span>{(doc.submitter as any)?.full_name || '-'}</span>
                            {doc.revision_count > 0 && <><span>•</span><span>{doc.revision_count}x revisi</span></>}
                            {doc.deadline && <><span>•</span><span>📅 {formatDateShort(doc.deadline)}</span></>}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {/* Score badge */}
                    {hasScore ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: `${scoreColor(doc.doc_score)}12`, border: `1px solid ${scoreColor(doc.doc_score)}30` }}>
                            <Star size={11} style={{ color: scoreColor(doc.doc_score) }} />
                            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: scoreColor(doc.doc_score) }}>{doc.doc_score}</span>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>—</span>
                    )}
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: st.bg, color: st.c }}>{st.l}</span>
                    {/* Actions restricted to BOE */}
                    {currentUser?.role === 'BOE' && (
                        <>
                            {doc.admin_status === 'pending' && (
                                <div style={{ display: 'flex', gap: 3 }}>
                                    <button title="Approve" onClick={() => quickScore(doc.id, 'approved')} style={{ background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>✓</button>
                                    <button title="Revisi" onClick={() => quickScore(doc.id, 'revision_needed')} style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>↩</button>
                                </div>
                            )}
                            <button onClick={() => openReview(doc)} style={{ background: '#f5f3ff', color: '#8b5cf6', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ClipboardCheck size={11} /> Review
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Penilaian Administrasi per Program Kerja</div></div>
            <div className="page-container">
                <div className="admin-page-header">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ClipboardCheck size={20} /></div>
                            Penilaian per Program Kerja
                        </h1>
                        <p className="page-subtitle">Review dan beri nilai administrasi per dokumen. Skor proker = rata-rata nilai dokumen.</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="admin-penilaian-stats">
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#8b5cf6' }}>{adminDocs.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Total Dokumen</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#10b981' }}>{globalAvg}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/100</span></div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Rata-rata Skor</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#dbeafe', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#3b82f6' }}>{allScored.length}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/{adminDocs.length}</span></div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Sudah Dinilai</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f59e0b' }}>{pendingReview}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Belum Direview</div></div>
                    </div>
                </div>

                {/* Search */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        <input className="form-input" placeholder="Cari program kerja..." style={{ paddingLeft: '2.5rem', borderRadius: 12 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Per-Program Cards */}
                {loading ? <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>Memuat data...</div> :
                filtered.length === 0 && standaloneDocs.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <ClipboardCheck size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 12 }} />
                        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Belum ada dokumen administrasi</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filtered.map(prog => {
                            const isExpanded = expandedProgram === prog.id
                            const sc = prog.avgScore
                            return (
                                <div key={prog.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div onClick={() => setExpandedProgram(isExpanded ? null : prog.id)} style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: isExpanded ? '#faf5ff' : 'white', transition: 'background 0.2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                                            <div style={{ width: 42, height: 42, borderRadius: 10, background: sc != null ? `${scoreColor(sc)}12` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9375rem', color: sc != null ? scoreColor(sc) : '#94a3b8', border: sc != null ? `2px solid ${scoreColor(sc)}30` : '2px solid #e2e8f0' }}>{sc ?? '—'}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{prog.name}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <span>{prog.dept}</span>
                                                    <span>•</span>
                                                    <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{prog.scoredCount}/{prog.total} dinilai</span>
                                                    <span>•</span>
                                                    <span style={{ color: prog.approved === prog.total ? '#10b981' : '#f59e0b', fontWeight: 500 }}>{prog.approved}/{prog.total} approved</span>
                                                    {prog.program_type === 'collaboration' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '0 4px', borderRadius: 4, fontWeight: 500 }}>Kolaborasi</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {sc != null && <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: `${scoreColor(sc)}12`, color: scoreColor(sc) }}>{scoreLabel(sc)}</span>}
                                            {isExpanded ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                                            {/* Score summary bar */}
                                            {sc != null && (
                                                <div style={{ padding: '8px 1.25rem', background: `${scoreColor(sc)}06`, display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8125rem' }}>
                                                    <span style={{ fontWeight: 600, color: scoreColor(sc) }}>Rata-rata: {sc}/100</span>
                                                    <div style={{ height: 6, flex: 1, maxWidth: 200, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${sc}%`, background: scoreColor(sc), borderRadius: 3 }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>dari {prog.scoredCount} dokumen</span>
                                                </div>
                                            )}
                                            {prog.docs.length === 0 ? (
                                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>Belum ada dokumen</div>
                                            ) : prog.docs.map((doc: any) => <DocRow key={doc.id} doc={doc} />)}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Standalone */}
                        {standaloneDocs.length > 0 && (
                            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
                                <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>📝 Dokumen Mandiri</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{standaloneDocs.length} dokumen • {standaloneDocs.filter(d => d.doc_score != null).length} dinilai</div>
                                    </div>
                                </div>
                                {standaloneDocs.map(doc => <DocRow key={doc.id} doc={doc} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Inline Review Modal */}
            {reviewingDoc && (
                <div className="modal-overlay" onClick={() => setReviewingDoc(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1rem' }}>Review & Penilaian Dokumen</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setReviewingDoc(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Doc info */}
                            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 10 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{reviewingDoc.title}</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                                    {reviewingDoc.doc_type} • {(reviewingDoc.submitter as any)?.full_name || '-'} • {formatDateShort(reviewingDoc.created_at)}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="form-group">
                                <label className="form-label">Status Review</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {Object.entries(statusCfg).map(([key, cfg]) => (
                                        <button key={key} onClick={() => setReviewForm({ ...reviewForm, admin_status: key })} style={{ padding: '6px 14px', borderRadius: 8, border: `2px solid ${reviewForm.admin_status === key ? cfg.c : 'transparent'}`, background: reviewForm.admin_status === key ? cfg.bg : '#f8fafc', color: reviewForm.admin_status === key ? cfg.c : 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>{cfg.l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Score */}
                            <div className="form-group">
                                <label className="form-label">Nilai Dokumen (0-100)</label>
                                <div style={{ background: `${scoreColor(reviewForm.doc_score)}08`, border: `1px solid ${scoreColor(reviewForm.doc_score)}30`, borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: scoreColor(reviewForm.doc_score), lineHeight: 1 }}>{reviewForm.doc_score}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: scoreColor(reviewForm.doc_score), marginBottom: 8 }}>{scoreLabel(reviewForm.doc_score)}</div>
                                    <input type="range" min="0" max="100" style={{ width: '100%', accentColor: scoreColor(reviewForm.doc_score) }} value={reviewForm.doc_score} onChange={e => setReviewForm({ ...reviewForm, doc_score: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Catatan Review</label>
                                <textarea className="form-textarea" value={reviewForm.admin_notes} onChange={e => setReviewForm({ ...reviewForm, admin_notes: e.target.value })} placeholder="Catatan status review..." style={{ minHeight: 50 }} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Catatan Penilaian</label>
                                <textarea className="form-textarea" value={reviewForm.score_notes} onChange={e => setReviewForm({ ...reviewForm, score_notes: e.target.value })} placeholder="Evaluasi kualitas dokumen..." style={{ minHeight: 50 }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setReviewingDoc(null)}>Batal</button>
                            <button className="btn btn-primary" onClick={handleSaveReview} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Review & Nilai'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

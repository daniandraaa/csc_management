'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Search, MessageSquare, Plus, X, Star, TrendingUp, Award, BarChart3, FileText, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import '../admin-responsive.css'

export default function PenilaianPage() {
    const [evaluations, setEvaluations] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [adminDocs, setAdminDocs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({ program_id: '', score: 80, comments: '' })
    const [isEditing, setIsEditing] = useState(false)
    const [expandedProgram, setExpandedProgram] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: evals } = await supabase.from('admin_evaluations').select('id, score, comments, program_id, program:programs(id, name, department:departments(name)), evaluator:members!admin_evaluations_evaluated_by_fkey(full_name)').order('created_at', { ascending: false })
        const { data: progs } = await supabase.from('programs').select('id, name, department:departments(name), start_date, end_date, program_type').order('name')
        const { data: docs } = await supabase.from('admin_reviews').select('id, title, admin_status, revision_count, doc_type, doc_source, program_id, deadline, created_at, submitter:members!admin_reviews_submitted_by_fkey(full_name)').order('created_at', { ascending: false })

        if (evals) setEvaluations(evals.map(d => ({ id: d.id, program_id: d.program_id, proker: (d.program as any)?.name || '-', bidang: (d.program as any)?.department?.name || '-', score: d.score, comments: d.comments, reviewer: (d.evaluator as any)?.full_name || 'Admin' })))
        setPrograms(progs || [])
        setAdminDocs(docs || [])
        setLoading(false)
    }

    function openAddModal(programId?: string) { setFormData({ program_id: programId || programs[0]?.id || '', score: 80, comments: '' }); setIsEditing(false); setShowModal(true) }
    function openEditModal(ev: any) { setFormData({ program_id: ev.program_id, score: ev.score, comments: ev.comments || '' }); setIsEditing(true); setShowModal(true) }

    async function handleSaveEvaluation(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.program_id) return alert('Silakan pilih Program Kerja')
        setSaving(true)
        let evaluatorId = null
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) { const { data: member } = await supabase.from('members').select('id').eq('auth_user_id', session.user.id).single(); if (member) evaluatorId = member.id }
        const payload = { program_id: formData.program_id, score: formData.score, comments: formData.comments, ...(evaluatorId && { evaluated_by: evaluatorId }), updated_at: new Date().toISOString() }
        const { error } = await supabase.from('admin_evaluations').upsert(payload, { onConflict: 'program_id' })
        setSaving(false)
        if (!error) { setShowModal(false); loadData() }
        else alert('Gagal: ' + error.message)
    }

    async function quickStatusUpdate(reviewId: string, newStatus: string) {
        await supabase.from('admin_reviews').update({ admin_status: newStatus }).eq('id', reviewId)
        loadData()
    }

    // Build per-program view
    const programsWithDocs = programs.map(p => {
        const docs = adminDocs.filter(d => d.program_id === p.id)
        const eval_ = evaluations.find(e => e.program_id === p.id)
        const approved = docs.filter(d => d.admin_status === 'approved').length
        const total = docs.length
        return { ...p, docs, eval: eval_, approved, total, dept: (p.department as any)?.name || '-' }
    }).filter(p => p.total > 0 || p.eval)

    // Also standalone docs
    const standaloneDocs = adminDocs.filter(d => !d.program_id)

    const filtered = programsWithDocs.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.dept.toLowerCase().includes(searchTerm.toLowerCase()))

    const avgScore = evaluations.length > 0 ? Math.round(evaluations.reduce((a, b) => a + b.score, 0) / evaluations.length) : 0
    const scoreColor = (s: number) => s >= 90 ? '#10b981' : s >= 80 ? '#3b82f6' : s >= 70 ? '#f59e0b' : '#ef4444'
    const scoreLabel = (s: number) => s >= 90 ? 'Sangat Baik' : s >= 80 ? 'Baik' : s >= 70 ? 'Cukup' : 'Perlu Perbaikan'

    const statusCfg: Record<string, { l: string, c: string, bg: string }> = {
        pending: { l: 'Pending', c: '#f59e0b', bg: '#fffbeb' },
        approved: { l: 'Approved', c: '#10b981', bg: '#ecfdf5' },
        revision_needed: { l: 'Revisi', c: '#3b82f6', bg: '#eff6ff' },
        rejected: { l: 'Ditolak', c: '#ef4444', bg: '#fef2f2' },
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
                        <p className="page-subtitle">Review dan beri nilai administrasi untuk setiap program kerja</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openAddModal()} style={{ gap: 6 }}><Plus size={16} /> Beri Penilaian</button>
                </div>

                {/* Stats */}
                <div className="admin-penilaian-stats">
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#8b5cf6' }}>{programsWithDocs.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Proker dengan Dokumen</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#10b981' }}>{avgScore}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/100</span></div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Rata-rata Skor</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#dbeafe', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#3b82f6' }}>{evaluations.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Total Dinilai</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f59e0b' }}>{adminDocs.filter(d => d.admin_status === 'pending').length}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Belum Direview</div></div>
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
                        <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Belum ada dokumen administrasi</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filtered.map(prog => {
                            const isExpanded = expandedProgram === prog.id
                            const sc = prog.eval?.score
                            return (
                                <div key={prog.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    {/* Program Header */}
                                    <div onClick={() => setExpandedProgram(isExpanded ? null : prog.id)} style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: isExpanded ? '#faf5ff' : 'white', transition: 'background 0.2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: sc ? `${scoreColor(sc)}15` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: sc ? scoreColor(sc) : '#94a3b8' }}>{sc || '—'}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{prog.name}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <span>{prog.dept}</span>
                                                    <span>•</span>
                                                    <span style={{ color: prog.approved === prog.total && prog.total > 0 ? '#10b981' : '#f59e0b', fontWeight: 500 }}>{prog.approved}/{prog.total} dokumen selesai</span>
                                                    {prog.program_type === 'collaboration' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '0 4px', borderRadius: 4, fontWeight: 500 }}>Kolaborasi</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {sc && <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: `${scoreColor(sc)}15`, color: scoreColor(sc) }}>{scoreLabel(sc)}</span>}
                                            {!prog.eval && <button className="btn btn-sm" style={{ background: '#f5f3ff', color: '#8b5cf6', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, fontSize: '0.6875rem', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); openAddModal(prog.id) }}>Beri Nilai</button>}
                                            {isExpanded ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
                                        </div>
                                    </div>

                                    {/* Expanded: Document List */}
                                    {isExpanded && (
                                        <div style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                                            {/* Score bar if evaluated */}
                                            {prog.eval && (
                                                <div style={{ padding: '0.75rem 1.25rem', background: `${scoreColor(prog.eval.score)}08`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontWeight: 700, fontSize: '1.25rem', color: scoreColor(prog.eval.score) }}>{prog.eval.score}</span>
                                                        <div style={{ height: 6, width: 120, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${prog.eval.score}%`, background: scoreColor(prog.eval.score), borderRadius: 3 }} />
                                                        </div>
                                                    </div>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => openEditModal(prog.eval)}>Edit Nilai</button>
                                                </div>
                                            )}
                                            {prog.eval?.comments && (
                                                <div style={{ padding: '0.5rem 1.25rem', background: '#f8fafc', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 6 }}>
                                                    <MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0, color: '#94a3b8' }} />
                                                    <span>{prog.eval.comments} — <em>{prog.eval.reviewer}</em></span>
                                                </div>
                                            )}
                                            {/* Documents */}
                                            <div style={{ padding: '0.5rem 0' }}>
                                                {prog.docs.length === 0 ? (
                                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>Belum ada dokumen untuk proker ini</div>
                                                ) : prog.docs.map((doc: any) => {
                                                    const st = statusCfg[doc.admin_status] || statusCfg.pending
                                                    return (
                                                        <div key={doc.id} style={{ padding: '8px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: '1px solid #f8fafc', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
                                                                <FileText size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                                <div>
                                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{doc.title}</div>
                                                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{doc.doc_type} • {(doc.submitter as any)?.full_name || '-'} {doc.revision_count > 0 && `• ${doc.revision_count}x revisi`}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: st.bg, color: st.c }}>{st.l}</span>
                                                                {doc.admin_status === 'pending' && (
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => quickStatusUpdate(doc.id, 'approved')}>✓</button>
                                                                        <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => quickStatusUpdate(doc.id, 'revision_needed')}>↩</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Standalone documents */}
                        {standaloneDocs.length > 0 && (
                            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
                                <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid var(--color-border-primary)' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>📝 Dokumen Mandiri (Tanpa Proker)</div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{standaloneDocs.length} dokumen</div>
                                </div>
                                <div style={{ padding: '0.5rem 0' }}>
                                    {standaloneDocs.map(doc => {
                                        const st = statusCfg[doc.admin_status] || statusCfg.pending
                                        return (
                                            <div key={doc.id} style={{ padding: '8px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: '1px solid #f8fafc', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
                                                    <FileText size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{doc.title}</div>
                                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{doc.doc_type} • {(doc.submitter as any)?.full_name || '-'}</div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: st.bg, color: st.c }}>{st.l}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h2>{isEditing ? 'Edit' : 'Beri'} Penilaian</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                        <form onSubmit={handleSaveEvaluation}><div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group"><label className="form-label">Program Kerja</label>
                                <select className="form-select" value={formData.program_id} onChange={e => setFormData({...formData, program_id: e.target.value})} disabled={isEditing} required>
                                    {programs.length === 0 && <option value="">Belum ada program</option>}
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Compliance Score</label>
                                <div style={{ background: `${scoreColor(formData.score)}08`, border: `1px solid ${scoreColor(formData.score)}30`, borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: scoreColor(formData.score), lineHeight: 1 }}>{formData.score}</div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: scoreColor(formData.score), marginBottom: 12 }}>{scoreLabel(formData.score)}</div>
                                    <input type="range" min="0" max="100" style={{ width: '100%', accentColor: scoreColor(formData.score) }} value={formData.score} onChange={e => setFormData({...formData, score: parseInt(e.target.value)})} />
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Komentar</label><textarea className="form-textarea" rows={3} value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} placeholder="Evaluasi kelengkapan administrasi..." /></div>
                        </div>
                        <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import { FileStack, Plus, X, Search, Eye, Clock, CheckCircle2, AlertCircle, FileText, Link2 } from 'lucide-react'
import '../admin-responsive.css'

export default function DokumenAdministrasiPage() {
    const { currentUser } = useCurrentUser()
    const [docs, setDocs] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDetail, setShowDetail] = useState<any>(null)
    const [filterSource, setFilterSource] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({
        title: '', description: '', doc_type: 'Proposal', doc_source: 'program_kerja',
        program_id: '', file_url: '', link_url: '', deadline: '', submitted_by: ''
    })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('admin_reviews').select('*, submitter:members!admin_reviews_submitted_by_fkey(full_name,department,role), program:programs(name, start_date, end_date, department:departments(name))').order('created_at', { ascending: false })
        const { data: p } = await supabase.from('programs').select('id,name,start_date,end_date').order('name')
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setDocs((data || []) as any[]); setPrograms(p || []); setMembers(m || []); setLoading(false)
    }

    function calcDeadline(programId: string, docType: string) {
        const prog = programs.find(p => p.id === programId)
        if (!prog) return ''
        if (docType === 'Proposal' && prog.start_date) {
            const d = new Date(prog.start_date); d.setDate(d.getDate() - 14)
            return d.toISOString().split('T')[0]
        }
        if (docType === 'LPJ' && prog.end_date) {
            const d = new Date(prog.end_date); d.setDate(d.getDate() + 14)
            return d.toISOString().split('T')[0]
        }
        return ''
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const deadline = form.doc_source === 'program_kerja' && form.program_id
            ? calcDeadline(form.program_id, form.doc_type) : form.deadline
        const payload: any = {
            title: form.title, description: form.description, doc_type: form.doc_type,
            doc_source: form.doc_source, file_url: form.file_url || null, link_url: form.link_url || null,
            deadline: deadline || null, submitted_by: form.submitted_by || currentUser?.id || null,
            program_id: form.doc_source === 'program_kerja' ? (form.program_id || null) : null,
            admin_status: 'pending'
        }
        let res
        if (editId) { res = await supabase.from('admin_reviews').update(payload).eq('id', editId) }
        else { res = await supabase.from('admin_reviews').insert(payload) }

        if (res.error) { alert('Error: ' + res.error.message); return }

        // Create timeline entry for deadline
        if (!editId && deadline) {
            await supabase.from('timeline_entries').insert({
                title: `📄 Deadline: ${form.doc_type} - ${form.title}`,
                type: 'activity', event_date: deadline, is_full_day: true,
                description: `Deadline administrasi ${form.doc_type} untuk "${form.title}"`,
                created_by: currentUser?.id || null
            })
        }

        setShowModal(false); setEditId(null)
        setForm({ title: '', description: '', doc_type: 'Proposal', doc_source: 'program_kerja', program_id: '', file_url: '', link_url: '', deadline: '', submitted_by: '' })
        loadData()
    }

    const filtered = docs.filter(d => {
        if (filterSource && (d.doc_source || 'standalone') !== filterSource) return false
        if (filterStatus && d.admin_status !== filterStatus) return false
        if (search && !d.title?.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const statusCfg: Record<string, { label: string, color: string, bg: string }> = {
        pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
        approved: { label: 'Approved', color: '#10b981', bg: '#ecfdf5' },
        revision_needed: { label: 'Revisi', color: '#3b82f6', bg: '#eff6ff' },
        rejected: { label: 'Ditolak', color: '#ef4444', bg: '#fef2f2' },
    }

    const stats = {
        total: docs.length,
        pending: docs.filter(d => d.admin_status === 'pending').length,
        approved: docs.filter(d => d.admin_status === 'approved').length,
        revisi: docs.filter(d => d.admin_status === 'revision_needed').length,
        proker: docs.filter(d => d.doc_source === 'program_kerja').length,
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Dokumen Administrasi</div></div>
            <div className="page-container">
                {/* Header */}
                <div className="admin-page-header">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><FileStack size={20} /></div>
                            Dokumen Administrasi
                        </h1>
                        <p className="page-subtitle">Kelola dokumen administrasi program kerja dan drafting mandiri</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', description: '', doc_type: 'Proposal', doc_source: 'program_kerja', program_id: '', file_url: '', link_url: '', deadline: '', submitted_by: '' }); setShowModal(true) }} style={{ gap: 6 }}><Plus size={16} /> Tambah Dokumen</button>
                </div>

                {/* Stats */}
                <div className="admin-stats-row">
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileStack size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#8b5cf6' }}>{stats.total}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Total</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Pending</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#10b981' }}>{stats.approved}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Approved</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Link2 size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#3b82f6' }}>{stats.proker}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Link Proker</div></div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="search-input" style={{ flex: '1 1 200px', maxWidth: 300 }}><Search /><input className="form-input" placeholder="Cari dokumen..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div>
                    <select className="form-select" style={{ width: 'auto' }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                        <option value="">Semua Sumber</option>
                        <option value="program_kerja">Program Kerja</option>
                        <option value="standalone">Mandiri</option>
                    </select>
                    <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Semua Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="revision_needed">Revisi</option>
                    </select>
                </div>

                {/* Document List */}
                {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</div> :
                filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <FileStack size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Belum ada dokumen</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Klik "Tambah Dokumen" untuk memulai</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filtered.map(doc => {
                            const st = statusCfg[doc.admin_status] || statusCfg.pending
                            const isOverdue = doc.deadline && new Date(doc.deadline) < new Date() && doc.admin_status !== 'approved'
                            return (
                                <div key={doc.id} className="card" style={{ padding: '1rem 1.25rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                                    onClick={() => setShowDetail(doc)}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: doc.doc_source === 'program_kerja' ? '#eff6ff' : '#f5f3ff', color: doc.doc_source === 'program_kerja' ? '#3b82f6' : '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={18} /></div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <span>{doc.doc_type || 'Dokumen'}</span>
                                                    {(doc.program as any)?.name && <span>• {(doc.program as any).name}</span>}
                                                    <span>• {(doc.submitter as any)?.full_name || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {doc.deadline && (
                                                <span style={{ fontSize: '0.6875rem', color: isOverdue ? '#ef4444' : 'var(--color-text-tertiary)', fontWeight: 500 }}>
                                                    {isOverdue ? '⚠️' : '📅'} {formatDateShort(doc.deadline)}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: doc.doc_source === 'program_kerja' ? '#dbeafe' : '#f3e8ff', color: doc.doc_source === 'program_kerja' ? '#2563eb' : '#7c3aed' }}>
                                                {doc.doc_source === 'program_kerja' ? 'Proker' : 'Mandiri'}
                                            </span>
                                            {doc.revision_count > 0 && <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>{doc.revision_count}x revisi</span>}
                                            <span style={{ fontSize: '0.6875rem', padding: '3px 10px', borderRadius: 6, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Dokumen Administrasi</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                {/* Source selection */}
                                <div className="form-group">
                                    <label className="form-label">Sumber Dokumen *</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {[{ v: 'program_kerja', l: '📋 Program Kerja', d: 'Administrasi proker yang sudah ada' }, { v: 'standalone', l: '📝 Dokumen Mandiri', d: 'Drafting/dokumen tersendiri' }].map(opt => (
                                            <div key={opt.v} onClick={() => setForm({ ...form, doc_source: opt.v, program_id: '' })}
                                                style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: `2px solid ${form.doc_source === opt.v ? '#8b5cf6' : 'var(--color-border-primary)'}`, background: form.doc_source === opt.v ? '#faf5ff' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{opt.l}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{opt.d}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {form.doc_source === 'program_kerja' && (
                                    <div className="form-group"><label className="form-label">Pilih Program Kerja *</label>
                                        <select className="form-select" required value={form.program_id} onChange={e => { const pid = e.target.value; const dl = calcDeadline(pid, form.doc_type); setForm({ ...form, program_id: pid, deadline: dl }) }}>
                                            <option value="">-- Pilih Proker --</option>
                                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="form-group"><label className="form-label">Judul Dokumen *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="cth: Proposal Workshop AI 2026" /></div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Jenis Dokumen *</label>
                                        <select className="form-select" value={form.doc_type} onChange={e => { const dt = e.target.value; const dl = form.program_id ? calcDeadline(form.program_id, dt) : form.deadline; setForm({ ...form, doc_type: dt, deadline: dl }) }}>
                                            <option value="Proposal">Proposal</option><option value="LPJ">LPJ</option><option value="TOR">TOR</option>
                                            <option value="Surat Peminjaman">Surat Peminjaman</option><option value="MoM">MoM</option><option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Deadline</label>
                                        <input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                                        {form.doc_source === 'program_kerja' && form.program_id && <p style={{ fontSize: '0.6875rem', color: '#8b5cf6', marginTop: 2 }}>Auto-calculated dari jadwal proker</p>}
                                    </div>
                                </div>

                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 60 }} /></div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Link File</label><input className="form-input" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="URL Google Drive, dll" /></div>
                                    <div className="form-group"><label className="form-label">PIC / Pengaju</label>
                                        <select className="form-select" value={form.submitted_by} onChange={e => setForm({ ...form, submitted_by: e.target.value })}>
                                            <option value="">Pilih</option>{members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {showDetail && (
                    <div className="modal-overlay" onClick={() => setShowDetail(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <div className="modal-header"><h2>Detail Dokumen</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button></div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{showDetail.title}</h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>{showDetail.doc_type || 'Dokumen'} • {formatDateShort(showDetail.created_at)}</p>
                                    </div>
                                    <span style={{ padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', background: (statusCfg[showDetail.admin_status] || statusCfg.pending).bg, color: (statusCfg[showDetail.admin_status] || statusCfg.pending).color }}>
                                        {(statusCfg[showDetail.admin_status] || statusCfg.pending).label}
                                    </span>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div><div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Sumber</div><div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{showDetail.doc_source === 'program_kerja' ? '📋 Program Kerja' : '📝 Mandiri'}</div></div>
                                    <div><div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Program</div><div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{(showDetail.program as any)?.name || '-'}</div></div>
                                    <div><div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>PIC</div><div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{(showDetail.submitter as any)?.full_name || '-'}</div></div>
                                    <div><div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Deadline</div><div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{showDetail.deadline ? formatDateShort(showDetail.deadline) : '-'}</div></div>
                                    <div><div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Revisi</div><div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{showDetail.revision_count || 0}x</div></div>
                                </div>
                                {showDetail.description && <div><div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Deskripsi</div><p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{showDetail.description}</p></div>}
                            </div>
                            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {showDetail.file_url && <a href={showDetail.file_url} target="_blank" className="btn btn-secondary btn-sm"><FileText size={14} /> File</a>}
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ title: showDetail.title, description: showDetail.description || '', doc_type: showDetail.doc_type || 'Proposal', doc_source: showDetail.doc_source || 'standalone', program_id: showDetail.program_id || '', file_url: showDetail.file_url || '', link_url: showDetail.link_url || '', deadline: showDetail.deadline || '', submitted_by: showDetail.submitted_by || '' }); setEditId(showDetail.id); setShowDetail(null); setShowModal(true) }}>Edit</button>
                                </div>
                                <button className="btn btn-primary" onClick={() => setShowDetail(null)}>Tutup</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { canPerformAction } from '@/lib/rbac'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { FileStack, Plus, X, ArrowUpRight, ArrowDownLeft, Upload, FileText, Download, Eye, AlertCircle } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'
import { Suspense } from 'react'

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'document_number', label: 'No. Surat' },
    { key: 'type', label: 'Tipe (incoming/outgoing)' },
    { key: 'sender', label: 'Pengirim' },
    { key: 'recipient', label: 'Penerima' },
    { key: 'document_date', label: 'Tanggal' },
    { key: 'category', label: 'Kategori' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'No. Surat', key: 'document_number' },
    { header: 'Judul', key: 'title' },
    { header: 'Tipe', key: 'type' },
    { header: 'Pengirim/Penerima', key: '_contact' },
    { header: 'Tanggal', key: 'document_date' },
    { header: 'Status', key: 'status' },
]

function DocumentsContent() {
    const [docs, setDocs] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [filterType, setFilterType] = useState('')
    const [form, setForm] = useState({ document_number: '', title: '', type: 'incoming', category: '', description: '', file_url: '', sender: '', recipient: '', document_date: '', status: 'draft', handled_by: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [showDetail, setShowDetail] = useState<any>(null)
    const { currentUser } = useCurrentUser()
    const router = useRouter()
    const searchParams = useSearchParams()
    const paramCategory = searchParams.get('category')
    const paramType = searchParams.get('type')
    const isPr = searchParams.get('is_pr') === 'true'
    const canCreate = canPerformAction(currentUser, '/documents', 'create')

    useEffect(() => { loadData() }, [paramCategory, paramType, isPr])

    async function loadData() {
        setLoading(true)
        let query = supabase.from('documents').select('*, handler:members!documents_handled_by_fkey(full_name)')
        
        if (isPr) {
            // Include old categories for compatibility
            query = query.in('category', ['Surat Masuk', 'Surat Keluar', 'Undangan', 'Marketing', 'Invitation'])
        } else {
            if (paramCategory) {
                query = query.eq('category', paramCategory)
            }
            if (paramType) {
                query = query.eq('type', paramType)
            }
        }

        const { data } = await query.order('document_date', { ascending: false })
        
        let membersQuery = supabase.from('members').select('id, full_name, department')
        if (isPr) {
            membersQuery = membersQuery.eq('department', 'Marketing')
        }
        const { data: m } = await membersQuery.order('full_name')

        setDocs(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, handled_by: form.handled_by || null, document_date: form.document_date || new Date().toISOString().split('T')[0] }
        if (editId) { await supabase.from('documents').update(payload).eq('id', editId) } else { await supabase.from('documents').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ document_number: '', title: '', type: 'incoming', category: '', description: '', file_url: '', sender: '', recipient: '', document_date: '', status: 'draft', handled_by: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, document_number: r.document_number || null, type: r.type || 'incoming', sender: r.sender || null, recipient: r.recipient || null, document_date: r.document_date || new Date().toISOString().split('T')[0], category: r.category || null, status: r.status || 'draft' }))
        await supabase.from('documents').insert(payload)
    }

    const filtered = docs.filter(d => !filterType || d.type === filterType)
    const incoming = docs.filter(d => d.type === 'incoming').length
    const outgoing = docs.filter(d => d.type === 'outgoing').length
    const exportData = filtered.map((d: any) => ({ ...d, _contact: d.type === 'incoming' ? d.sender : d.recipient || '-' }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">
                {isPr ? 'Database PR' : paramCategory ? `${paramCategory} - ` : ''}Dokumen & Surat
            </div></div>
            <div className="page-container">
                <h1 className="page-title">
                    {isPr ? 'Database PR' : 
                     paramCategory === 'Marketing' ? 'Surat Masuk Marketing' : 
                     paramCategory === 'Invitation' ? 'Undangan' : 
                     'Dokumen & Surat'}
                </h1>
                <p className="page-subtitle">
                    {isPr ? 'Kumpulan data surat masuk dan undangan PR' : 
                     `Pendataan dokumen dan surat ${paramCategory ? paramCategory : 'masuk/keluar'}`}
                </p>

                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card" style={{ borderLeft: '3px solid var(--color-info)' }}><div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><ArrowDownLeft size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-info)' }}>{incoming}</div><div className="stat-label">Surat Masuk</div></div></div>
                    <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><ArrowUpRight size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{outgoing}</div><div className="stat-label">Surat Keluar</div></div></div>
                    <div className="stat-card" style={{ borderLeft: '3px solid var(--color-warning)' }}><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><FileStack size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{docs.length}</div><div className="stat-label">Total Dokumen</div></div></div>
                </div>

                <div className="toolbar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="toolbar-left">
                        <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Semua Tipe</option><option value="incoming">Masuk</option><option value="outgoing">Keluar</option>
                        </select>
                    </div>
                    <div className="toolbar-right" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                        {canCreate && <button className="btn btn-secondary btn-sm hidden md:flex" onClick={() => setShowCsvImport(true)}><Upload size={14} /> <span className="hidden lg:inline">Import CSV</span></button>}
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Dokumen_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> <span className="hidden sm:inline">CSV</span></button>
                        <button className="btn btn-secondary btn-sm hidden sm:flex" onClick={() => exportToPdf({ title: 'Dokumen & Surat CSC', subtitle: `Masuk: ${incoming} | Keluar: ${outgoing}`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> <span className="hidden lg:inline">PDF</span></button>
                        {canCreate && <button className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }} onClick={() => { setEditId(null); setForm({ document_number: '', title: '', type: 'incoming', category: '', description: '', file_url: '', sender: '', recipient: '', document_date: new Date().toISOString().split('T')[0], status: 'draft', handled_by: '' }); setShowModal(true) }}><Plus size={16} /> <span className="hidden sm:inline">Tambah Dokumen</span><span className="sm:hidden">Tambah</span></button>}
                    </div>
                </div>

                <div className="data-table-container">
                    <table className="data-table">
                        <thead><tr><th>No. Surat</th><th>Judul</th><th>Tipe</th><th>Pengirim/Penerima</th><th>Tanggal</th><th>Handler</th><th>Status</th>{canCreate && <th>Aksi</th>}</tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><FileStack size={48} /><h3>Belum ada dokumen</h3></div></td></tr> :
                                    filtered.map((d: any) => (
                                        <tr key={d.id}>
                                            <td data-label="No. Surat" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{d.document_number || '-'}</td>
                                            <td data-label="Judul" style={{ fontWeight: 500 }}>{d.title}</td>
                                            <td data-label="Tipe"><span className={`badge ${d.type === 'incoming' ? 'badge-info' : 'badge-success'}`}>{d.type === 'incoming' ? '↓ Masuk' : '↑ Keluar'}</span></td>
                                            <td data-label="Pengirim/Penerima">{d.type === 'incoming' ? d.sender : d.recipient || '-'}</td>
                                            <td data-label="Tanggal">{formatDateShort(d.document_date)}</td>
                                            <td data-label="Handler">{d.handler?.full_name || '-'}</td>
                                            <td data-label="Status"><span className={`badge badge-${getStatusColor(d.status)}`}>{getStatusLabel(d.status)}</span></td>
                                            <td data-label="Aksi">
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" title="Lihat Detail" onClick={() => setShowDetail(d)}><Eye size={16} /></button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }} onClick={() => router.push(`/admin-review?docId=${d.id}`)}>Review</button>
                                                    {canCreate && <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ document_number: d.document_number || '', title: d.title, type: d.type, category: d.category || '', description: d.description || '', file_url: d.file_url || '', sender: d.sender || '', recipient: d.recipient || '', document_date: d.document_date, status: d.status, handled_by: d.handled_by || '' }); setEditId(d.id); setShowModal(true) }}>Edit</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={docs} matchFields={['title', 'document_number']} title="Import Dokumen" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Dokumen</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">No. Surat</label><input className="form-input" value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tipe *</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="incoming">Masuk</option><option value="outgoing">Keluar</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Pengirim</label><input className="form-input" value={form.sender} onChange={e => setForm({ ...form, sender: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Penerima</label><input className="form-input" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Tanggal</label><input className="form-input" type="date" value={form.document_date} onChange={e => setForm({ ...form, document_date: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="sent">Sent</option><option value="received">Received</option><option value="archived">Archived</option></select></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Kategori</label>
                                        <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            {isPr ? (
                                                <>
                                                    <option value="Surat Masuk">Surat Masuk</option>
                                                    <option value="Surat Keluar">Surat Keluar</option>
                                                    <option value="Undangan">Undangan</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="">Lainnya</option>
                                                    <option value="Proposal">Proposal</option>
                                                    <option value="LPJ">LPJ</option>
                                                    <option value="Undangan">Undangan</option>
                                                    <option value="Surat Masuk">Surat Masuk</option>
                                                    <option value="Surat Keluar">Surat Keluar</option>
                                                    <option value="Peminjaman">Peminjaman</option>
                                                    <option value="Surat Justifikasi">Surat Justifikasi</option>
                                                    <option value="MoM">MoM</option>
                                                    <option value="TAK Kolektif">TAK Kolektif</option>
                                                    <option value="MoU">MoU</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Handler</label><select className="form-select" value={form.handled_by} onChange={e => setForm({ ...form, handled_by: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Link File</label><input className="form-input" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {showDetail && (
                    <div className="modal-overlay" onClick={() => setShowDetail(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header">
                                <h2>Detail Dokumen</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{showDetail.title}</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', fontFamily: 'monospace', marginTop: 4 }}>
                                            {showDetail.document_number || 'Tanpa Nomor Surat'}
                                        </p>
                                    </div>
                                    <span className={`badge ${showDetail.type === 'incoming' ? 'badge-info' : 'badge-success'}`}>
                                        {showDetail.type === 'incoming' ? '↓ Surat Masuk' : '↑ Surat Keluar'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ background: 'var(--color-surface-secondary)', padding: '1rem', borderRadius: 8 }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Pengirim</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{showDetail.sender || '-'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Penerima</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{showDetail.recipient || '-'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Tanggal</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{formatDateShort(showDetail.document_date)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Status</div>
                                        <span className={`badge badge-${getStatusColor(showDetail.status)}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}>{getStatusLabel(showDetail.status)}</span>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Kategori</div>
                                    <div style={{ fontSize: '0.875rem' }}>{showDetail.category || '-'}</div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Deskripsi</div>
                                    <div style={{ fontSize: '0.875rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 8, minHeight: 60 }}>
                                        {showDetail.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada deskripsi</span>}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--color-border-primary)', paddingTop: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Handler / PIC</div>
                                        <div style={{ fontSize: '0.875rem' }}>{showDetail.handler?.full_name || '-'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ justifyContent: showDetail.file_url ? 'space-between' : 'flex-end' }}>
                                {showDetail.file_url && (
                                    <a href={showDetail.file_url} target="_blank" className="btn btn-secondary">
                                        <FileStack size={16} /> Buka File Dokumen
                                    </a>
                                )}
                                <button className="btn btn-primary" onClick={() => setShowDetail(null)}>Tutup</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function DocumentsPage() {
    return (
        <Suspense fallback={<div className="page-container"><p>Memuat...</p></div>}>
            <DocumentsContent />
        </Suspense>
    )
}

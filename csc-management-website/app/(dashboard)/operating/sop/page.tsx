'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText as FileTextIcon, Plus, X, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'content', label: 'Isi SOP', required: true },
    { key: 'version', label: 'Versi' },
]
const PDF_COLUMNS = [
    { header: 'Judul', key: 'title' },
    { header: 'Bidang', key: '_dept' },
    { header: 'Versi', key: 'version' },
]

export default function SOPPage() {
    const [sops, setSops] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [filterDept, setFilterDept] = useState('')
    const [selectedSop, setSelectedSop] = useState<any>(null)
    const [form, setForm] = useState({ department_id: '', title: '', content: '', version: '1.0' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('sop_guides').select('*, department:departments(name)').eq('is_active', true).order('title')
        const { data: d } = await supabase.from('departments').select('id,name')
        setSops(data || []); setDepartments(d || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editId) { await supabase.from('sop_guides').update(form).eq('id', editId) } else { await supabase.from('sop_guides').insert(form) }
        setShowModal(false); setEditId(null); setForm({ department_id: '', title: '', content: '', version: '1.0' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, content: r.content, version: r.version || '1.0', department_id: departments[0]?.id || null }))
        await supabase.from('sop_guides').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus SOP?')) { await supabase.from('sop_guides').delete().eq('id', id); loadData() } }

    const filtered = sops.filter((s: any) => !filterDept || s.department_id === filterDept)
    const exportData = filtered.map((s: any) => ({ ...s, _dept: s.department?.name || '-' }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">SOP Guide</div></div>
            <div className="page-container">
                <h1 className="page-title">Panduan SOP</h1>
                <p className="page-subtitle">Standard Operating Procedure untuk setiap bidang</p>
                <div className="toolbar">
                    <div className="toolbar-left">
                        <select className="form-select" style={{ width: 'auto' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                            <option value="">Semua Bidang</option>
                            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_SOP_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar SOP CSC', subtitle: `Total: ${filtered.length} SOP`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ department_id: '', title: '', content: '', version: '1.0' }); setShowModal(true) }}><Plus size={16} /> Tambah SOP</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}>
                    <div className="card" style={{ padding: '0.5rem', maxHeight: 600, overflowY: 'auto' }}>
                        {loading ? <p style={{ padding: '1rem' }}>Memuat...</p> : filtered.length === 0 ? <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Belum ada SOP</p> :
                            filtered.map((s: any) => (
                                <div key={s.id} onClick={() => setSelectedSop(s)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: 'var(--radius-md)', background: selectedSop?.id === s.id ? 'var(--color-brand-50)' : 'transparent', borderLeft: selectedSop?.id === s.id ? '3px solid var(--color-brand-500)' : '3px solid transparent', marginBottom: 2 }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{s.department?.name} · v{s.version}</div>
                                </div>
                            ))}
                    </div>
                    <div className="card">
                        {selectedSop ? (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div><h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedSop.title}</h2><p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>{selectedSop.department?.name} · Versi {selectedSop.version}</p></div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ department_id: selectedSop.department_id, title: selectedSop.title, content: selectedSop.content, version: selectedSop.version }); setEditId(selectedSop.id); setShowModal(true) }}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedSop.id)}>Hapus</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.9375rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selectedSop.content}</div>
                            </div>
                        ) : (
                            <div className="empty-state"><FileTextIcon size={48} /><h3>Pilih SOP</h3><p>Pilih SOP dari daftar di samping untuk melihat detailnya.</p></div>
                        )}
                    </div>
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={sops} matchFields={['title']} title="Import SOP" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} SOP</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Bidang *</label><select className="form-select" required value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}><option value="">Pilih</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Versi</label><input className="form-input" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Isi SOP *</label><textarea className="form-textarea" required style={{ minHeight: 200 }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

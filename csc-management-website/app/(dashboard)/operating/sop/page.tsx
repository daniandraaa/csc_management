'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText as FileTextIcon, Plus, X, Upload, FileText, Download, MessageSquare } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import SopChatbot from '@/components/SopChatbot'
import { exportToPdf, exportToCsv } from '@/lib/export'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

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
    const [showChatbot, setShowChatbot] = useState(false)
    const [form, setForm] = useState({ department_id: '', title: '', content: '', version: '1.0', file_url: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [uploadingPdf, setUploadingPdf] = useState(false)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('sop_guides').select('*, department:departments(name)').eq('is_active', true).order('title')
        const { data: d } = await supabase.from('departments').select('id,name')
        setSops(data || []); setDepartments(d || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        let error
        if (editId) { 
            const { error: err } = await supabase.from('sop_guides').update(form).eq('id', editId) 
            error = err
        } else { 
            const { error: err } = await supabase.from('sop_guides').insert(form) 
            error = err
        }

        if (error) {
            alert("Gagal menyimpan SOP: " + error.message)
            return
        }

        setShowModal(false); setEditId(null); setForm({ department_id: '', title: '', content: '', version: '1.0', file_url: '' }); loadData()
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingPdf(true)
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
            let extractedText = ''
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const content = await page.getTextContent()
                const strings = content.items.map((item: any) => item.str)
                extractedText += strings.join(' ') + '\n'
            }
            
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
            const { data, error } = await supabase.storage.from('sops').upload(fileName, file)
            
            let fileUrl = form.file_url
            if (error) {
                console.error("Storage upload error:", error)
                alert("Gagal mengunggah file PDF utuh ke database. Pastikan Anda sudah menjalankan script setup_storage.sql! Error: " + error.message)
            } else if (data) {
                const { data: publicUrlData } = supabase.storage.from('sops').getPublicUrl(data.path)
                fileUrl = publicUrlData.publicUrl
            }

            setForm(prev => ({ 
                ...prev, 
                content: extractedText.trim() ? extractedText.replace(/\u0000/g, '') : prev.content,
                file_url: fileUrl 
            }))
        } catch (err) {
            console.error('Failed to parse PDF', err)
            alert('Gagal membaca PDF')
        } finally {
            setUploadingPdf(false)
        }
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
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ department_id: '', title: '', content: '', version: '1.0', file_url: '' }); setShowModal(true) }}><Plus size={16} /> Tambah SOP</button>
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
                                        <button className="btn btn-primary btn-sm" onClick={() => setShowChatbot(true)} style={{ background: 'var(--color-brand-600)' }}><MessageSquare size={14} /> Tanya AI</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ department_id: selectedSop.department_id, title: selectedSop.title, content: selectedSop.content, version: selectedSop.version, file_url: selectedSop.file_url || '' }); setEditId(selectedSop.id); setShowModal(true) }}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedSop.id)}>Hapus</button>
                                    </div>
                                </div>
                                {selectedSop.file_url ? (
                                    <div style={{ marginTop: '1.5rem', marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                        <div style={{ background: 'var(--color-bg-tertiary)', padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FileTextIcon size={14} /> Dokumen Asli PDF</span>
                                            <a href={selectedSop.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Buka di Tab Baru</a>
                                        </div>
                                        <iframe src={selectedSop.file_url} width="100%" height="600px" style={{ border: 'none', display: 'block' }} title="SOP PDF"></iframe>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '1.5rem', padding: '2rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                        <FileTextIcon size={32} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
                                        <p style={{ fontSize: '0.875rem' }}>Tidak ada file PDF terlampir pada SOP ini.</p>
                                    </div>
                                )}
                                <div style={{ fontSize: '0.9375rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Teks Terekstrak:</h3>
                                    {selectedSop.content}
                                </div>
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
                                <div className="form-group"><label className="form-label">File PDF (Auto-extract isi)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="file" accept=".pdf" className="form-input" onChange={handleFileUpload} disabled={uploadingPdf} />
                                        {uploadingPdf && <span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>Memproses...</span>}
                                    </div>
                                    {form.file_url && <a href={form.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-brand-600)', marginTop: 4, display: 'inline-block' }}>Lihat File Terlampir</a>}
                                </div>
                                <div className="form-group"><label className="form-label">Isi SOP *</label><textarea className="form-textarea" required style={{ minHeight: 200 }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
                {showChatbot && selectedSop && (
                    <SopChatbot sop={selectedSop} onClose={() => setShowChatbot(false)} />
                )}
            </div>
        </div>
    )
}

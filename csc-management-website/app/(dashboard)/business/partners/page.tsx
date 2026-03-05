'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { Handshake, Plus, X, Search, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'company_name', label: 'Nama Perusahaan', required: true },
    { key: 'partnership_type', label: 'Tipe Partnership' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'contact_email', label: 'Email' },
    { key: 'contact_phone', label: 'Telepon' },
    { key: 'website', label: 'Website' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Perusahaan', key: 'company_name' },
    { header: 'Tipe', key: 'partnership_type' },
    { header: 'Contact Person', key: 'contact_person' },
    { header: 'Email', key: 'contact_email' },
    { header: 'Website', key: 'website' },
    { header: 'Status', key: 'status' },
]

export default function PartnersPage() {
    const [partners, setPartners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ company_name: '', description: '', contact_person: '', contact_email: '', contact_phone: '', website: '', partnership_type: '', status: 'active', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('business_partners').select('*').order('company_name')
        setPartners(data || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editId) { await supabase.from('business_partners').update(form).eq('id', editId) } else { await supabase.from('business_partners').insert(form) }
        setShowModal(false); setEditId(null); setForm({ company_name: '', description: '', contact_person: '', contact_email: '', contact_phone: '', website: '', partnership_type: '', status: 'active', notes: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ company_name: r.company_name, partnership_type: r.partnership_type || null, contact_person: r.contact_person || null, contact_email: r.contact_email || null, contact_phone: r.contact_phone || null, website: r.website || null, status: r.status || 'active' }))
        await supabase.from('business_partners').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus?')) { await supabase.from('business_partners').delete().eq('id', id); loadData() } }

    const filtered = partners.filter(p => p.company_name?.toLowerCase().includes(search.toLowerCase()))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Mitra Bisnis</div></div>
            <div className="page-container">
                <h1 className="page-title">Mitra Bisnis</h1>
                <p className="page-subtitle">Pengelolaan mitra bisnis CSC</p>
                <div className="toolbar">
                    <div className="toolbar-left"><div className="search-input"><Search /><input className="form-input" placeholder="Cari mitra..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div></div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, filtered, `CSC_Mitra_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Mitra Bisnis CSC', subtitle: `Total: ${filtered.length} mitra`, columns: PDF_COLUMNS, data: filtered })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ company_name: '', description: '', contact_person: '', contact_email: '', contact_phone: '', website: '', partnership_type: '', status: 'active', notes: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Mitra</button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : filtered.length === 0 ? <div className="card"><div className="empty-state"><Handshake size={48} /><h3>Belum ada mitra</h3></div></div> :
                        filtered.map((p: any) => (
                            <div key={p.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <h3 style={{ fontWeight: 600 }}>{p.company_name}</h3>
                                    <span className={`badge badge-${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                                </div>
                                {p.partnership_type && <span className="badge badge-info" style={{ marginBottom: 8 }}>{p.partnership_type}</span>}
                                {p.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>{p.description}</p>}
                                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {p.contact_person && <span>👤 {p.contact_person}</span>}
                                    {p.contact_email && <span>✉️ {p.contact_email}</span>}
                                    {p.website && <span>🌐 {p.website}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 12, borderTop: '1px solid var(--color-border-primary)', paddingTop: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ company_name: p.company_name, description: p.description || '', contact_person: p.contact_person || '', contact_email: p.contact_email || '', contact_phone: p.contact_phone || '', website: p.website || '', partnership_type: p.partnership_type || '', status: p.status, notes: p.notes || '' }); setEditId(p.id); setShowModal(true) }}>Edit</button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}>Hapus</button>
                                </div>
                            </div>
                        ))}
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={partners} matchFields={['company_name']} title="Import Mitra Bisnis" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Mitra</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Nama Perusahaan *</label><input className="form-input" required value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Tipe Partnership</label><input className="form-input" value={form.partnership_type} onChange={e => setForm({ ...form, partnership_type: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="prospective">Prospective</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
                                </div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { Megaphone, Plus, X, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'name', label: 'Nama', required: true },
    { key: 'type', label: 'Tipe' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'contact_email', label: 'Email' },
    { key: 'contact_phone', label: 'Telepon' },
    { key: 'social_media', label: 'Social Media' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Nama', key: 'name' },
    { header: 'Tipe', key: 'type' },
    { header: 'Contact Person', key: 'contact_person' },
    { header: 'Email', key: 'contact_email' },
    { header: 'Social Media', key: 'social_media' },
    { header: 'Status', key: 'status' },
]

export default function MediaPartnersPage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ name: '', type: '', contact_person: '', contact_email: '', contact_phone: '', social_media: '', status: 'active', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('media_partners').select('*').order('name')
        setItems(data || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editId) { await supabase.from('media_partners').update(form).eq('id', editId) } else { await supabase.from('media_partners').insert(form) }
        setShowModal(false); setEditId(null); setForm({ name: '', type: '', contact_person: '', contact_email: '', contact_phone: '', social_media: '', status: 'active', notes: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ name: r.name, type: r.type || null, contact_person: r.contact_person || null, contact_email: r.contact_email || null, contact_phone: r.contact_phone || null, social_media: r.social_media || null, status: r.status || 'active' }))
        await supabase.from('media_partners').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus?')) { await supabase.from('media_partners').delete().eq('id', id); loadData() } }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Media Partner</div></div>
            <div className="page-container">
                <h1 className="page-title">Media Partner</h1>
                <p className="page-subtitle">Kelola media partner CSC</p>
                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, items, `CSC_MediaPartner_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Media Partner CSC', subtitle: `Total: ${items.length} media partner`, columns: PDF_COLUMNS, data: items })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', type: '', contact_person: '', contact_email: '', contact_phone: '', social_media: '', status: 'active', notes: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Media Partner</button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : items.length === 0 ? <div className="card"><div className="empty-state"><Megaphone size={48} /><h3>Belum ada media partner</h3></div></div> :
                        items.map((mp: any) => (
                            <div key={mp.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <h3 style={{ fontWeight: 600 }}>{mp.name}</h3>
                                    <span className={`badge badge-${getStatusColor(mp.status)}`}>{getStatusLabel(mp.status)}</span>
                                </div>
                                {mp.type && <span className="badge badge-default" style={{ marginBottom: 8 }}>{mp.type}</span>}
                                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {mp.contact_person && <span>👤 {mp.contact_person}</span>}
                                    {mp.contact_email && <span>✉️ {mp.contact_email}</span>}
                                    {mp.social_media && <span>📱 {mp.social_media}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 12, borderTop: '1px solid var(--color-border-primary)', paddingTop: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name: mp.name, type: mp.type || '', contact_person: mp.contact_person || '', contact_email: mp.contact_email || '', contact_phone: mp.contact_phone || '', social_media: mp.social_media || '', status: mp.status, notes: mp.notes || '' }); setEditId(mp.id); setShowModal(true) }}>Edit</button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(mp.id)}>Hapus</button>
                                </div>
                            </div>
                        ))}
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={items} matchFields={['name']} title="Import Media Partner" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Media Partner</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Nama *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Tipe</label><input className="form-input" placeholder="Pers, Radio..." value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Social Media</label><input className="form-input" value={form.social_media} onChange={e => setForm({ ...form, social_media: e.target.value })} /></div>
                                </div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

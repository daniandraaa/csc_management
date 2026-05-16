'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { Megaphone, Plus, X, Upload, FileText, Download, Globe, Mail, Phone, User, ExternalLink, Activity } from 'lucide-react'
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
    { key: 'mou_link', label: 'Link MoU' },
]
const PDF_COLUMNS = [
    { header: 'Nama', key: 'name' },
    { header: 'Tipe', key: 'type' },
    { header: 'Contact Person', key: 'contact_person' },
    { header: 'Email', key: 'contact_email' },
    { header: 'Social Media', key: 'social_media' },
    { header: 'Status', key: 'status' },
    { header: 'Link MoU', key: 'mou_link' },
]

export default function MediaPartnersPage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ name: '', type: '', contact_person: '', contact_email: '', contact_phone: '', social_media: '', status: 'active', notes: '', mou_link: '' })
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
        setShowModal(false); setEditId(null); setForm({ name: '', type: '', contact_person: '', contact_email: '', contact_phone: '', social_media: '', status: 'active', notes: '', mou_link: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ name: r.name, type: r.type || null, contact_person: r.contact_person || null, contact_email: r.contact_email || null, contact_phone: r.contact_phone || null, social_media: r.social_media || null, status: r.status || 'active', mou_link: r.mou_link || null }))
        await supabase.from('media_partners').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus?')) { await supabase.from('media_partners').delete().eq('id', id); loadData() } }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Media Partner</div></div>
            <div className="page-container">
                <h1 className="page-title">Media Partner</h1>
                <p className="page-subtitle">Kelola mitra media dan publikasi CSC</p>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}><Activity size={20} /></div>
                        <div><div className="stat-value">{items.length}</div><div className="stat-label">Total Partner</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Activity size={20} /></div>
                        <div><div className="stat-value">{items.filter(i => i.status === 'active').length}</div><div className="stat-label">Aktif</div></div>
                    </div>
                </div>
                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, items, `CSC_MediaPartner_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Media Partner CSC', subtitle: `Total: ${items.length} media partner`, columns: PDF_COLUMNS, data: items })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', type: '', contact_person: '', contact_email: '', contact_phone: '', social_media: '', status: 'active', notes: '', mou_link: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Media Partner</button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : items.length === 0 ? <div className="card"><div className="empty-state"><Megaphone size={48} /><h3>Belum ada media partner</h3></div></div> :
                        items.map((mp: any) => (
                            <div key={mp.id} className="card hover-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-brand-50)', color: 'var(--color-brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{mp.name}</h3>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{mp.type || 'Media Partner'}</span>
                                        </div>
                                    </div>
                                    <span className={`badge badge-${getStatusColor(mp.status)}`} style={{ textTransform: 'capitalize' }}>{getStatusLabel(mp.status)}</span>
                                </div>
                                
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                                    {mp.contact_person && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                                            <User size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                                            <span>{mp.contact_person}</span>
                                        </div>
                                    )}
                                    {mp.contact_email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                                            <Mail size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                                            <a href={`mailto:${mp.contact_email}`} className="link-hover">{mp.contact_email}</a>
                                        </div>
                                    )}
                                    {mp.social_media && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                                            <ExternalLink size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                                            <span style={{ color: 'var(--color-brand-600)', fontWeight: 500 }}>{mp.social_media}</span>
                                        </div>
                                    )}
                                    {mp.mou_link && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                                            <FileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                                            <a href={mp.mou_link} target="_blank" rel="noopener noreferrer" className="link-hover" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Lihat MoU</a>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--color-border-primary)' }}>
                                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setForm({ name: mp.name, type: mp.type || '', contact_person: mp.contact_person || '', contact_email: mp.contact_email || '', contact_phone: mp.contact_phone || '', social_media: mp.social_media || '', status: mp.status, notes: mp.notes || '', mou_link: mp.mou_link || '' }); setEditId(mp.id); setShowModal(true) }}>Edit</button>
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
                                    <div className="form-group"><label className="form-label">Telepon</label><input className="form-input" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Social Media</label><input className="form-input" value={form.social_media} onChange={e => setForm({ ...form, social_media: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Link MoU (Google Drive/URL)</label><input className="form-input" placeholder="https://..." value={form.mou_link} onChange={e => setForm({ ...form, mou_link: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

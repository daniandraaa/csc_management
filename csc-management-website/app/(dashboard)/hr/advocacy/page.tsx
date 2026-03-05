'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { Heart, Plus, Search, X, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'description', label: 'Deskripsi', required: true },
    { key: 'category', label: 'Kategori (advocacy/aspiration)' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Judul', key: 'title' },
    { header: 'Kategori', key: 'category' },
    { header: 'Anggota', key: '_member' },
    { header: 'Status', key: 'status' },
    { header: 'Tanggal', key: 'created_at' },
]

export default function AdvocacyPage() {
    const [items, setItems] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [form, setForm] = useState({ member_id: '', title: '', description: '', category: 'advocacy', status: 'pending', response: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('advocacy_aspirations').select('*, member:members(id,full_name)').order('created_at', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setItems(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editId) { await supabase.from('advocacy_aspirations').update(form).eq('id', editId) }
        else { await supabase.from('advocacy_aspirations').insert(form) }
        setShowModal(false); setEditId(null); setForm({ member_id: '', title: '', description: '', category: 'advocacy', status: 'pending', response: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, description: r.description, category: r.category || 'advocacy', status: r.status || 'pending', member_id: members[0]?.id || null }))
        await supabase.from('advocacy_aspirations').insert(payload)
    }

    const filtered = items.filter((i: any) =>
        (i.title?.toLowerCase().includes(search.toLowerCase()) || i.member?.full_name?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterCategory || i.category === filterCategory) &&
        (!filterStatus || i.status === filterStatus)
    )
    const exportData = filtered.map((i: any) => ({ ...i, _member: i.member?.full_name || '-' }))

    const advocacyCount = items.filter(i => i.category === 'advocacy').length
    const aspirationCount = items.filter(i => i.category === 'aspiration').length
    const pendingCount = items.filter(i => i.status === 'pending').length

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Advokasi & Aspirasi</div></div>
            <div className="page-container">
                <h1 className="page-title">Advokasi & Aspirasi</h1>
                <p className="page-subtitle">Kelola advokasi dan aspirasi dari anggota CSC</p>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><Heart size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-info)' }}>{advocacyCount}</div><div className="stat-label">Advokasi</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: '#faf5ff', color: '#a855f7' }}><Heart size={20} /></div><div><div className="stat-value" style={{ color: '#a855f7' }}>{aspirationCount}</div><div className="stat-label">Aspirasi</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><Heart size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{pendingCount}</div><div className="stat-label">Pending</div></div></div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input"><Search /><input className="form-input" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div>
                        <select className="form-select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="">Semua Kategori</option><option value="advocacy">Advokasi</option><option value="aspiration">Aspirasi</option></select>
                        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Semua Status</option><option value="pending">Pending</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="resolved">Resolved</option></select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Advokasi_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Advokasi & Aspirasi CSC', subtitle: `Advokasi: ${advocacyCount} | Aspirasi: ${aspirationCount}`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ member_id: '', title: '', description: '', category: 'advocacy', status: 'pending', response: '' }); setShowModal(true) }}><Plus size={16} /> Tambah</button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Memuat...</p> :
                        filtered.length === 0 ? <div className="card"><div className="empty-state"><Heart size={48} /><h3>Belum ada data</h3><p>Tambahkan advokasi atau aspirasi baru.</p></div></div> :
                            filtered.map((item: any) => (
                                <div key={item.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setForm({ member_id: item.member_id, title: item.title, description: item.description, category: item.category, status: item.status, response: item.response || '' }); setEditId(item.id); setShowModal(true) }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <span className={`badge badge-${item.category === 'advocacy' ? 'info' : 'default'}`} style={{ background: item.category === 'aspiration' ? '#faf5ff' : undefined, color: item.category === 'aspiration' ? '#a855f7' : undefined }}>{item.category === 'advocacy' ? 'Advokasi' : 'Aspirasi'}</span>
                                        <span className={`badge badge-${getStatusColor(item.status)}`}>{getStatusLabel(item.status)}</span>
                                    </div>
                                    <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{item.title}</h3>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{item.description}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                        <span>Oleh: {item.member?.full_name}</span>
                                        <span>{formatDateShort(item.created_at)}</span>
                                    </div>
                                    {item.response && <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-surface-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}><strong>Respon:</strong> {item.response}</div>}
                                </div>
                            ))}
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={items} matchFields={['title']} title="Import Advokasi/Aspirasi" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah Advokasi/Aspirasi'}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Anggota *</label><select className="form-select" required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Kategori *</label><select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="advocacy">Advokasi</option><option value="aspiration">Aspirasi</option></select></div>
                                    <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Deskripsi *</label><textarea className="form-textarea" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    {editId && <><div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="resolved">Resolved</option></select></div>
                                        <div className="form-group"><label className="form-label">Respon</label><textarea className="form-textarea" value={form.response} onChange={e => setForm({ ...form, response: e.target.value })} /></div></>}
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

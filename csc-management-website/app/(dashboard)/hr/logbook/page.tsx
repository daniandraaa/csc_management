'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { BookOpen, Plus, X, Search, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'description', label: 'Deskripsi', required: true },
    { key: 'date', label: 'Tanggal' },
    { key: 'category', label: 'Kategori' },
    { key: 'hours_spent', label: 'Jam' },
]
const PDF_COLUMNS = [
    { header: 'Tanggal', key: 'date' },
    { header: 'Anggota', key: '_member' },
    { header: 'Judul', key: 'title' },
    { header: 'Kategori', key: 'category' },
    { header: 'Jam', key: 'hours_spent' },
]

export default function LogbookPage() {
    const [entries, setEntries] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')
    const [filterMember, setFilterMember] = useState('')
    const [form, setForm] = useState({ member_id: '', date: '', title: '', description: '', category: '', hours_spent: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('logbook_entries').select('*, member:members(id,full_name)').order('date', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setEntries(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, hours_spent: form.hours_spent ? parseFloat(form.hours_spent) : null }
        if (editId) { await supabase.from('logbook_entries').update(payload).eq('id', editId) }
        else { await supabase.from('logbook_entries').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ member_id: '', date: '', title: '', description: '', category: '', hours_spent: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, description: r.description, date: r.date || new Date().toISOString().split('T')[0], category: r.category || null, hours_spent: r.hours_spent ? parseFloat(r.hours_spent) : null, member_id: members[0]?.id || null }))
        await supabase.from('logbook_entries').insert(payload)
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus logbook ini?')) { await supabase.from('logbook_entries').delete().eq('id', id); loadData() }
    }

    const filtered = entries.filter((e: any) =>
        (e.title?.toLowerCase().includes(search.toLowerCase()) || e.member?.full_name?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterMember || e.member_id === filterMember)
    )
    const exportData = filtered.map((e: any) => ({ ...e, _member: e.member?.full_name || '-' }))

    const grouped = filtered.reduce((acc: Record<string, any[]>, entry: any) => {
        if (!acc[entry.date]) acc[entry.date] = []
        acc[entry.date].push(entry)
        return acc
    }, {})

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Logbook Kerja</div></div>
            <div className="page-container">
                <h1 className="page-title">Logbook Aktivitas</h1>
                <p className="page-subtitle">Catat aktivitas kerja harian setiap anggota</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input"><Search /><input className="form-input" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div>
                        <select className="form-select" style={{ width: 'auto' }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
                            <option value="">Semua Anggota</option>
                            {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Logbook_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Logbook Aktivitas CSC', subtitle: `Total: ${filtered.length} entri`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ member_id: '', date: new Date().toISOString().split('T')[0], title: '', description: '', category: '', hours_spent: '' }); setShowModal(true) }}>
                            <Plus size={16} /> Tambah Logbook
                        </button>
                    </div>
                </div>

                {loading ? <p style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</p> :
                    Object.keys(grouped).length === 0 ? (
                        <div className="card"><div className="empty-state"><BookOpen size={48} /><h3>Belum ada logbook</h3></div></div>
                    ) : Object.entries(grouped).map(([date, dateEntries]) => (
                        <div key={date} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>📅 {formatDateShort(date)}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem', borderLeft: '2px solid var(--color-border-primary)', paddingLeft: '1rem' }}>
                                {(dateEntries as any[]).map((entry: any) => (
                                    <div key={entry.id} className="card" style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{entry.title}
                                                    {entry.category && <span className="badge badge-info" style={{ marginLeft: 8 }}>{entry.category}</span>}
                                                    {entry.hours_spent && <span className="badge badge-default" style={{ marginLeft: 4 }}>{entry.hours_spent}h</span>}
                                                </div>
                                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{entry.description}</p>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{entry.member?.full_name}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ member_id: entry.member_id, date: entry.date, title: entry.title, description: entry.description, category: entry.category || '', hours_spent: entry.hours_spent?.toString() || '' }); setEditId(entry.id); setShowModal(true) }}>Edit</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(entry.id)}>Hapus</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={entries} matchFields={['title', 'date']} title="Import Logbook" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Logbook</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Anggota *</label><select className="form-select" required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Tanggal *</label><input className="form-input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Jam</label><input className="form-input" type="number" step="0.5" value={form.hours_spent} onChange={e => setForm({ ...form, hours_spent: e.target.value })} /></div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Deskripsi *</label><textarea className="form-textarea" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Kategori</label><input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
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

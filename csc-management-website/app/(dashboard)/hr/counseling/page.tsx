'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { CalendarClock, Plus, X, Search, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'subject', label: 'Subjek', required: true },
    { key: 'description', label: 'Deskripsi' },
    { key: 'preferred_date', label: 'Tanggal Preferred' },
    { key: 'preferred_time', label: 'Jam Preferred' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Anggota', key: '_member' },
    { header: 'Subjek', key: 'subject' },
    { header: 'Tanggal Preferred', key: 'preferred_date' },
    { header: 'Jadwal', key: 'scheduled_date' },
    { header: 'Konselor', key: '_counselor' },
    { header: 'Status', key: 'status' },
]

export default function CounselingPage() {
    const [requests, setRequests] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ member_id: '', subject: '', description: '', preferred_date: '', preferred_time: '', status: 'pending', scheduled_date: '', scheduled_time: '', counselor_id: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('counseling_requests').select('*, member:members!counseling_requests_member_id_fkey(id,full_name), counselor:members!counseling_requests_counselor_id_fkey(id,full_name)').order('created_at', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setRequests(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, preferred_date: form.preferred_date || null, preferred_time: form.preferred_time || null, scheduled_date: form.scheduled_date || null, scheduled_time: form.scheduled_time || null, counselor_id: form.counselor_id || null }
        if (editId) { await supabase.from('counseling_requests').update(payload).eq('id', editId) }
        else { await supabase.from('counseling_requests').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ member_id: '', subject: '', description: '', preferred_date: '', preferred_time: '', status: 'pending', scheduled_date: '', scheduled_time: '', counselor_id: '', notes: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ subject: r.subject, description: r.description || null, preferred_date: r.preferred_date || null, preferred_time: r.preferred_time || null, status: r.status || 'pending', member_id: members[0]?.id || null }))
        await supabase.from('counseling_requests').insert(payload)
    }

    const filtered = requests.filter((r: any) => r.subject?.toLowerCase().includes(search.toLowerCase()) || r.member?.full_name?.toLowerCase().includes(search.toLowerCase()))
    const exportData = filtered.map((r: any) => ({ ...r, _member: r.member?.full_name || '-', _counselor: r.counselor?.full_name || '-' }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Konseling</div></div>
            <div className="page-container">
                <h1 className="page-title">Request Jadwal Konseling</h1>
                <p className="page-subtitle">Kelola permintaan jadwal konseling anggota</p>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><CalendarClock size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{requests.filter(r => r.status === 'pending').length}</div><div className="stat-label">Pending</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><CalendarClock size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-info)' }}>{requests.filter(r => r.status === 'scheduled').length}</div><div className="stat-label">Terjadwal</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><CalendarClock size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{requests.filter(r => r.status === 'completed').length}</div><div className="stat-label">Selesai</div></div></div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left"><div className="search-input"><Search /><input className="form-input" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div></div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Konseling_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Konseling CSC', subtitle: `Total: ${filtered.length} request`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ member_id: '', subject: '', description: '', preferred_date: '', preferred_time: '', status: 'pending', scheduled_date: '', scheduled_time: '', counselor_id: '', notes: '' }); setShowModal(true) }}><Plus size={16} /> Request Konseling</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Anggota</th><th>Subjek</th><th>Tanggal Preferred</th><th>Jadwal</th><th>Konselor</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><CalendarClock size={48} /><h3>Belum ada request</h3><p>Buat request konseling baru.</p></div></td></tr> :
                                    filtered.map((r: any) => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 500 }}>{r.member?.full_name}</td>
                                            <td>{r.subject}</td>
                                            <td>{r.preferred_date ? formatDateShort(r.preferred_date) : '-'} {r.preferred_time ? r.preferred_time.slice(0, 5) : ''}</td>
                                            <td>{r.scheduled_date ? formatDateShort(r.scheduled_date) : '-'} {r.scheduled_time ? r.scheduled_time.slice(0, 5) : ''}</td>
                                            <td>{r.counselor?.full_name || '-'}</td>
                                            <td><span className={`badge badge-${getStatusColor(r.status)}`}>{getStatusLabel(r.status)}</span></td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => { setForm({ member_id: r.member_id, subject: r.subject, description: r.description || '', preferred_date: r.preferred_date || '', preferred_time: r.preferred_time || '', status: r.status, scheduled_date: r.scheduled_date || '', scheduled_time: r.scheduled_time || '', counselor_id: r.counselor_id || '', notes: r.notes || '' }); setEditId(r.id); setShowModal(true) }}>Edit</button></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={requests} matchFields={['subject']} title="Import Konseling" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit Konseling' : 'Request Konseling'}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Anggota *</label><select className="form-select" required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Subjek *</label><input className="form-input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Tanggal Preferred</label><input className="form-input" type="date" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Jam Preferred</label><input className="form-input" type="time" value={form.preferred_time} onChange={e => setForm({ ...form, preferred_time: e.target.value })} /></div>
                                    </div>
                                    {editId && <>
                                        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group"><label className="form-label">Jadwal Tanggal</label><input className="form-input" type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                            <div className="form-group"><label className="form-label">Jadwal Jam</label><input className="form-input" type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} /></div>
                                        </div>
                                        <div className="form-group"><label className="form-label">Konselor</label><select className="form-select" value={form.counselor_id} onChange={e => setForm({ ...form, counselor_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                        <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                                    </>}
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Request'}</button></div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

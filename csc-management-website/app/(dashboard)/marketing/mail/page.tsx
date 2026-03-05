'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { Newspaper, Plus, X, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'sender', label: 'Pengirim', required: true },
    { key: 'subject', label: 'Subjek', required: true },
    { key: 'description', label: 'Deskripsi' },
    { key: 'received_date', label: 'Tanggal' },
    { key: 'mail_type', label: 'Tipe' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Pengirim', key: 'sender' },
    { header: 'Subjek', key: 'subject' },
    { header: 'Tipe', key: 'mail_type' },
    { header: 'Tanggal', key: 'received_date' },
    { header: 'Status', key: 'status' },
]

export default function MailPage() {
    const [mails, setMails] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ sender: '', subject: '', description: '', received_date: '', mail_type: 'general', file_url: '', status: 'unread', handled_by: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('incoming_mails').select('*, handler:members!incoming_mails_handled_by_fkey(full_name)').order('received_date', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name')
        setMails(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, handled_by: form.handled_by || null, received_date: form.received_date || new Date().toISOString().split('T')[0] }
        if (editId) { await supabase.from('incoming_mails').update(payload).eq('id', editId) } else { await supabase.from('incoming_mails').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ sender: '', subject: '', description: '', received_date: '', mail_type: 'general', file_url: '', status: 'unread', handled_by: '', notes: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ sender: r.sender, subject: r.subject, description: r.description || null, received_date: r.received_date || new Date().toISOString().split('T')[0], mail_type: r.mail_type || 'general', status: r.status || 'unread' }))
        await supabase.from('incoming_mails').insert(payload)
    }

    const typeLabels: Record<string, string> = { general: 'Umum', invitation: 'Undangan', proposal: 'Proposal', official: 'Resmi', other: 'Lainnya' }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Surat Masuk</div></div>
            <div className="page-container">
                <h1 className="page-title">Surat Masuk</h1>
                <p className="page-subtitle">Kelola surat masuk ke CSC</p>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><Newspaper size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{mails.filter(m => m.status === 'unread').length}</div><div className="stat-label">Belum Dibaca</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Newspaper size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{mails.filter(m => m.status === 'responded').length}</div><div className="stat-label">Sudah Direspon</div></div></div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, mails, `CSC_SuratMasuk_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Surat Masuk CSC', subtitle: `Total: ${mails.length} surat`, columns: PDF_COLUMNS, data: mails })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ sender: '', subject: '', description: '', received_date: new Date().toISOString().split('T')[0], mail_type: 'general', file_url: '', status: 'unread', handled_by: '', notes: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Surat</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Pengirim</th><th>Subjek</th><th>Tipe</th><th>Tanggal</th><th>Handler</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                mails.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Newspaper size={48} /><h3>Belum ada surat masuk</h3></div></td></tr> :
                                    mails.map((m: any) => (
                                        <tr key={m.id} style={{ background: m.status === 'unread' ? 'var(--color-surface-tertiary)' : undefined, fontWeight: m.status === 'unread' ? 500 : 400 }}>
                                            <td>{m.sender}</td>
                                            <td>{m.subject}</td>
                                            <td><span className="badge badge-default">{typeLabels[m.mail_type]}</span></td>
                                            <td>{formatDateShort(m.received_date)}</td>
                                            <td>{m.handler?.full_name || '-'}</td>
                                            <td><span className={`badge badge-${getStatusColor(m.status)}`}>{getStatusLabel(m.status)}</span></td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => { setForm({ sender: m.sender, subject: m.subject, description: m.description || '', received_date: m.received_date, mail_type: m.mail_type, file_url: m.file_url || '', status: m.status, handled_by: m.handled_by || '', notes: m.notes || '' }); setEditId(m.id); setShowModal(true) }}>Edit</button></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={mails} matchFields={['sender', 'subject']} title="Import Surat Masuk" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Surat</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Pengirim *</label><input className="form-input" required value={form.sender} onChange={e => setForm({ ...form, sender: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Subjek *</label><input className="form-input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Tanggal</label><input className="form-input" type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tipe</label><select className="form-select" value={form.mail_type} onChange={e => setForm({ ...form, mail_type: e.target.value })}><option value="general">Umum</option><option value="invitation">Undangan</option><option value="proposal">Proposal</option><option value="official">Resmi</option><option value="other">Lainnya</option></select></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="unread">Unread</option><option value="read">Read</option><option value="responded">Responded</option><option value="archived">Archived</option></select></div>
                                    <div className="form-group"><label className="form-label">Handler</label><select className="form-select" value={form.handled_by} onChange={e => setForm({ ...form, handled_by: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Link File</label><input className="form-input" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

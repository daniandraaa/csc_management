'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { getStatusColor, getStatusLabel, formatDateShort, formatCurrency } from '@/lib/utils'
import { Receipt, Plus, X, Search, Upload, Download, FileText } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

export default function ReimbursementPage() {
    const { currentUser } = useCurrentUser()
    const [items, setItems] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ member_id: '', program_id: '', title: '', description: '', amount: '', receipt_url: '', status: 'pending', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    const canApprove = canPerformAction(currentUser, '/finance/reimbursement', 'approve')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('reimbursements').select('*, member:members!reimbursements_member_id_fkey(full_name), program:programs(name)').order('created_at', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name')
        const { data: p } = await supabase.from('programs').select('id,name')
        setItems(data || []); setMembers(m || []); setPrograms(p || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, amount: parseFloat(form.amount), program_id: form.program_id || null }
        if (editId) { await supabase.from('reimbursements').update(payload).eq('id', editId) } else { await supabase.from('reimbursements').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ member_id: '', program_id: '', title: '', description: '', amount: '', receipt_url: '', status: 'pending', notes: '' }); loadData()
    }

    const totalPending = items.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
    const totalApproved = items.filter(i => i.status === 'approved' || i.status === 'paid').reduce((s, i) => s + i.amount, 0)

    async function handleCsvImport(rows: Record<string, string>[]) {
        for (const row of rows) {
            const member = members.find((m: any) => m.full_name.toLowerCase() === (row.member_name || '').toLowerCase())
            if (member) await supabase.from('reimbursements').insert({ member_id: member.id, title: row.title || '', amount: parseFloat(row.amount) || 0, description: row.description || null, status: 'pending' })
        }
        loadData()
    }
    const reimbPdfCols = [{ header: 'Anggota', key: 'member_name' }, { header: 'Judul', key: 'title' }, { header: 'Jumlah', key: 'amount_str' }, { header: 'Status', key: 'status_label' }, { header: 'Tanggal', key: 'date' }]
    const reimbData = items.map((r: any) => ({ member_name: r.member?.full_name || '-', title: r.title, amount_str: formatCurrency(r.amount), status_label: getStatusLabel(r.status), date: formatDateShort(r.created_at) }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Reimbursement</div></div>
            <div className="page-container">
                <h1 className="page-title">Reimbursement</h1>
                <p className="page-subtitle">Proses pengajuan dan persetujuan reimbursement</p>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><Receipt size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{items.filter(i => i.status === 'pending').length}</div><div className="stat-label">Pending · {formatCurrency(totalPending)}</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Receipt size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{items.filter(i => i.status === 'approved' || i.status === 'paid').length}</div><div className="stat-label">Approved · {formatCurrency(totalApproved)}</div></div></div>
                </div>

                <div className="toolbar"><div /><div className="toolbar-right">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(reimbPdfCols, reimbData, `CSC_Reimbursement_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Reimbursement CSC', subtitle: `Pending: ${formatCurrency(totalPending)} | Approved: ${formatCurrency(totalApproved)}`, columns: reimbPdfCols, data: reimbData })}><FileText size={14} /> Export PDF</button>
                    <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ member_id: '', program_id: '', title: '', description: '', amount: '', receipt_url: '', status: 'pending', notes: '' }); setShowModal(true) }}><Plus size={16} /> Ajukan Reimburse</button>
                </div></div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Anggota</th><th>Judul</th><th>Program</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                items.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Receipt size={48} /><h3>Belum ada reimbursement</h3></div></td></tr> :
                                    items.map((r: any) => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 500 }}>{r.member?.full_name}</td>
                                            <td>{r.title}</td>
                                            <td>{r.program?.name || '-'}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                                            <td>{formatDateShort(r.created_at)}</td>
                                            <td><span className={`badge badge-${getStatusColor(r.status)}`}>{getStatusLabel(r.status)}</span></td>
                                            <td>
                                                {canApprove ? (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ member_id: r.member_id, program_id: r.program_id || '', title: r.title, description: r.description || '', amount: r.amount.toString(), receipt_url: r.receipt_url || '', status: r.status, notes: r.notes || '' }); setEditId(r.id); setShowModal(true) }}>Review</button>
                                                ) : r.member_id === currentUser?.id ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Disubmit</span>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Ajukan'} Reimbursement</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Anggota *</label><select className="form-select" required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Jumlah (Rp) *</label><input className="form-input" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Program</label><select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}><option value="">Pilih</option>{programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Link Bukti</label><input className="form-input" value={form.receipt_url} onChange={e => setForm({ ...form, receipt_url: e.target.value })} /></div>
                                {editId && canApprove && <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="paid">Paid</option></select></div>}
                                {editId && canApprove && <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>}
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Ajukan'}</button></div></form>
                        </div>
                    </div>
                )}

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={[{ key: 'member_name', label: 'Nama Anggota', required: true }, { key: 'title', label: 'Judul', required: true }, { key: 'amount', label: 'Jumlah (Rp)', required: true }, { key: 'description', label: 'Deskripsi' }]}
                    existingData={reimbData} matchFields={['member_name', 'title']} title="Import Data Reimbursement" />
            </div>
        </div>
    )
}

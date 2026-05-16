'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canManageModule } from '@/lib/rbac'
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
    const [form, setForm] = useState({ member_id: '', program_id: '', title: '', description: '', amount: '', receipt_url: '', status: 'pending', notes: '', reimbursed_amount: '' })
    const [editId, setEditId] = useState<string | null>(null)

    const canManage = canManageModule(currentUser, 'reimbursement')

    useEffect(() => { if (currentUser) loadData() }, [currentUser])

    async function loadData() {
        setLoading(true)
        let query = supabase.from('reimbursements').select('*, member:members!reimbursements_member_id_fkey(full_name), program:programs(name)').order('created_at', { ascending: false })
        
        if (!canManage) {
            query = query.eq('member_id', currentUser?.id)
        }
        
        const { data } = await query
        const { data: m } = await supabase.from('members').select('id,full_name')
        const { data: p } = await supabase.from('programs').select('id,name')
        setItems(data || []); setMembers(m || []); setPrograms(p || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const finalAmount = parseFloat(form.reimbursed_amount || form.amount)
        const payload = { 
            ...form, 
            amount: parseFloat(form.amount), 
            reimbursed_amount: finalAmount,
            program_id: form.program_id || null,
            paid_at: form.status === 'paid' ? new Date().toISOString() : (editId ? items.find(i => i.id === editId)?.paid_at : null)
        }
        
        let resultId = editId
        if (editId) { 
            await supabase.from('reimbursements').update(payload).eq('id', editId) 
        } else { 
            const { data } = await supabase.from('reimbursements').insert(payload).select().single()
            resultId = data?.id
        }

        // Handle transaction creation if approved or paid
        if ((form.status === 'approved' || form.status === 'paid') && resultId) {
            // Check if transaction already exists for this reimbursement
            const { data: existingTx } = await supabase.from('financial_transactions').select('id').eq('reimbursement_id', resultId).single()
            
            const txPayload = {
                program_id: form.program_id || null,
                type: 'expense',
                category: 'Reimbursement',
                description: `Reimbursement: ${form.title} (${members.find(m => m.id === (form.member_id || items.find(i => i.id === editId)?.member_id))?.full_name})`,
                amount: finalAmount,
                transaction_date: new Date().toISOString().split('T')[0],
                recorded_by: currentUser?.id,
                reimbursement_id: resultId,
                member_id: form.member_id || items.find(i => i.id === editId)?.member_id
            }

            if (existingTx) {
                await supabase.from('financial_transactions').update(txPayload).eq('id', existingTx.id)
            } else {
                await supabase.from('financial_transactions').insert(txPayload)
            }
        } else if (resultId) {
            // If status is not approved/paid, but transaction exists, remove it
            await supabase.from('financial_transactions').delete().eq('reimbursement_id', resultId)
        }

        setShowModal(false); setEditId(null); setForm({ member_id: '', program_id: '', title: '', description: '', amount: '', receipt_url: '', status: 'pending', notes: '', reimbursed_amount: '' } as any); loadData()
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
            <div className="topbar"><div className="topbar-title">{canManage ? 'Manajemen Reimbursement' : 'Reimbursement Saya'}</div></div>
            <div className="page-container">
                <h1 className="page-title">{canManage ? 'Manajemen Reimbursement' : 'Reimbursement Saya'}</h1>
                <p className="page-subtitle">{canManage ? 'Proses pengajuan dan persetujuan reimbursement' : 'Pantau status pengajuan pengembalian dana Anda'}</p>

                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card" style={{ borderLeft: '3px solid var(--color-warning)' }}><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><Receipt size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{items.filter(i => i.status === 'pending').length}</div><div className="stat-label">Pending · {formatCurrency(totalPending)}</div></div></div>
                    <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Receipt size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{items.filter(i => i.status === 'approved' || i.status === 'paid').length}</div><div className="stat-label">Approved · {formatCurrency(totalApproved)}</div></div></div>
                </div>

                <div className="toolbar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="toolbar-left" />
                    <div className="toolbar-right" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                        {canManage && (
                            <>
                                <button className="btn btn-secondary btn-sm hidden md:flex" onClick={() => setShowCsvImport(true)}><Upload size={14} /> <span className="hidden lg:inline">Import CSV</span></button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(reimbPdfCols, reimbData, `CSC_Reimbursement_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> <span className="hidden sm:inline">CSV</span></button>
                                <button className="btn btn-secondary btn-sm hidden sm:flex" onClick={() => exportToPdf({ title: 'Daftar Reimbursement CSC', subtitle: `Pending: ${formatCurrency(totalPending)} | Approved: ${formatCurrency(totalApproved)}`, columns: reimbPdfCols, data: reimbData })}><FileText size={14} /> <span className="hidden lg:inline">Export PDF</span></button>
                            </>
                        )}
                        <button className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }} onClick={() => { setEditId(null); setForm({ member_id: canManage ? '' : currentUser?.id || '', program_id: '', title: '', description: '', amount: '', receipt_url: '', status: 'pending', notes: '', reimbursed_amount: '' }); setShowModal(true) }}><Plus size={16} /> <span className="hidden sm:inline">Ajukan Reimburse</span><span className="sm:hidden">Ajukan</span></button>
                    </div>
                </div>

                <div className="data-table-container">
                    <table className="data-table">
                        <thead><tr><th>Anggota</th><th>Judul</th><th>Program</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                items.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Receipt size={48} /><h3>Belum ada reimbursement</h3></div></td></tr> :
                                    items.map((r: any) => (
                                        <tr key={r.id}>
                                            <td data-label="Anggota" style={{ fontWeight: 500 }}>{r.member?.full_name}</td>
                                            <td data-label="Judul">{r.title}</td>
                                            <td data-label="Program">{r.program?.name || '-'}</td>
                                            <td data-label="Jumlah" style={{ fontWeight: 600 }}>
                                                {r.reimbursed_amount && r.reimbursed_amount !== r.amount ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatCurrency(r.amount)}</span>
                                                        <span style={{ color: 'var(--color-success)' }}>{formatCurrency(r.reimbursed_amount)}</span>
                                                    </div>
                                                ) : formatCurrency(r.amount)}
                                            </td>
                                            <td data-label="Tanggal">{formatDateShort(r.created_at)}</td>
                                            <td data-label="Status"><span className={`badge badge-${getStatusColor(r.status)}`}>{getStatusLabel(r.status)}</span></td>
                                            <td>
                                                {canManage ? (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ member_id: r.member_id, program_id: r.program_id || '', title: r.title, description: r.description || '', amount: r.amount.toString(), receipt_url: r.receipt_url || '', status: r.status, notes: r.notes || '', reimbursed_amount: r.reimbursed_amount?.toString() || r.amount.toString() }); setEditId(r.id); setShowModal(true) }}>Review</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={async () => { if (confirm('Hapus reimbursement ini?')) { await supabase.from('reimbursements').delete().eq('id', r.id); loadData() } }}>Hapus</button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Disubmit</span>
                                                )}
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
                                <div className="form-group"><label className="form-label">Anggota *</label><select className="form-select" required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} disabled={!canManage}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} disabled={!canManage && editId !== null} /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Jumlah (Rp) *</label><input className="form-input" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} disabled={!canManage && editId !== null} /></div>
                                    <div className="form-group"><label className="form-label">Program</label><select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })} disabled={!canManage && editId !== null}><option value="">Pilih</option>{programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={!canManage && editId !== null} /></div>
                                <div className="form-group"><label className="form-label">Link Bukti</label><input className="form-input" value={form.receipt_url} onChange={e => setForm({ ...form, receipt_url: e.target.value })} disabled={!canManage && editId !== null} /></div>
                                {editId && canManage && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="paid">Paid</option></select></div>
                                        <div className="form-group"><label className="form-label">Nilai Dicairkan (Rp)</label><input className="form-input" type="number" value={form.reimbursed_amount} onChange={e => setForm({ ...form, reimbursed_amount: e.target.value })} placeholder="Kosongkan jika full" /></div>
                                    </div>
                                )}
                                {editId && canManage && <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>}
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary" disabled={!canManage && editId !== null}>{editId ? 'Simpan' : 'Ajukan'}</button></div></form>
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

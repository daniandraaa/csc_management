'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { DollarSign, Plus, X, TrendingUp, TrendingDown, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'type', label: 'Tipe (income/expense)', required: true },
    { key: 'description', label: 'Deskripsi', required: true },
    { key: 'amount', label: 'Jumlah', required: true },
    { key: 'category', label: 'Kategori' },
    { key: 'transaction_date', label: 'Tanggal' },
]
const PDF_COLUMNS = [
    { header: 'Tanggal', key: 'transaction_date' },
    { header: 'Deskripsi', key: 'description' },
    { header: 'Kategori', key: 'category' },
    { header: 'Tipe', key: 'type' },
    { header: 'Jumlah', key: 'amount' },
]

export default function TransactionsPage() {
    const [txns, setTxns] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [filterType, setFilterType] = useState('')
    const [form, setForm] = useState({ program_id: '', type: 'expense', category: '', description: '', amount: '', transaction_date: '', receipt_url: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('financial_transactions').select('*, program:programs(name)').order('transaction_date', { ascending: false })
        const { data: p } = await supabase.from('programs').select('id,name')
        const { data: m } = await supabase.from('members').select('id,full_name')
        setTxns(data || []); setPrograms(p || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, amount: parseFloat(form.amount), program_id: form.program_id || null, transaction_date: form.transaction_date || new Date().toISOString().split('T')[0] }
        if (editId) { await supabase.from('financial_transactions').update(payload).eq('id', editId) } else { await supabase.from('financial_transactions').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ program_id: '', type: 'expense', category: '', description: '', amount: '', transaction_date: '', receipt_url: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ type: r.type || 'expense', description: r.description, amount: parseFloat(r.amount) || 0, category: r.category || null, transaction_date: r.transaction_date || new Date().toISOString().split('T')[0] }))
        await supabase.from('financial_transactions').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus?')) { await supabase.from('financial_transactions').delete().eq('id', id); loadData() } }

    const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const filtered = txns.filter(t => !filterType || t.type === filterType)

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Transaksi Keuangan</div></div>
            <div className="page-container">
                <h1 className="page-title">Transaksi Keuangan</h1>
                <p className="page-subtitle">Keluar masuk uang per program kerja</p>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><TrendingUp size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.25rem' }}>{formatCurrency(totalIncome)}</div><div className="stat-label">Total Pemasukan</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}><TrendingDown size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-danger)', fontSize: '1.25rem' }}>{formatCurrency(totalExpense)}</div><div className="stat-label">Total Pengeluaran</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><DollarSign size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-info)', fontSize: '1.25rem' }}>{formatCurrency(totalIncome - totalExpense)}</div><div className="stat-label">Saldo</div></div></div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Semua</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option>
                        </select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, filtered, `CSC_Transaksi_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Transaksi Keuangan CSC', subtitle: `Pemasukan: ${formatCurrency(totalIncome)} | Pengeluaran: ${formatCurrency(totalExpense)}`, columns: PDF_COLUMNS, data: filtered })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ program_id: '', type: 'expense', category: '', description: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], receipt_url: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Transaksi</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Program</th><th>Kategori</th><th>Tipe</th><th>Jumlah</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><DollarSign size={48} /><h3>Belum ada transaksi</h3></div></td></tr> :
                                    filtered.map((t: any) => (
                                        <tr key={t.id}>
                                            <td>{formatDateShort(t.transaction_date)}</td>
                                            <td style={{ fontWeight: 500 }}>{t.description}</td>
                                            <td>{t.program?.name || '-'}</td>
                                            <td>{t.category || '-'}</td>
                                            <td><span className={`badge badge-${t.type === 'income' ? 'success' : 'danger'}`}>{t.type === 'income' ? '↑ Masuk' : '↓ Keluar'}</span></td>
                                            <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</td>
                                            <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => { setForm({ program_id: t.program_id || '', type: t.type, category: t.category || '', description: t.description, amount: t.amount.toString(), transaction_date: t.transaction_date, receipt_url: t.receipt_url || '' }); setEditId(t.id); setShowModal(true) }}>Edit</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(t.id)}>Hapus</button></div></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={txns} matchFields={['description', 'transaction_date']} title="Import Transaksi" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Transaksi</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Tipe *</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></div>
                                    <div className="form-group"><label className="form-label">Jumlah (Rp) *</label><input className="form-input" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi *</label><input className="form-input" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Program</label><select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}><option value="">Pilih</option>{programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Kategori</label><input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Tanggal</label><input className="form-input" type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

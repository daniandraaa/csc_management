'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { DollarSign, Plus, X, Search, Filter, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/export'

const MONTHS = [
    { label: 'Semua Bulan', value: 'all' },
    { label: 'Januari', value: '01' },
    { label: 'Februari', value: '02' },
    { label: 'Maret', value: '03' },
    { label: 'April', value: '04' },
    { label: 'Mei', value: '05' },
    { label: 'Juni', value: '06' },
    { label: 'Juli', value: '07' },
    { label: 'Agustus', value: '08' },
    { label: 'September', value: '09' },
    { label: 'Oktober', value: '10' },
    { label: 'November', value: '11' },
    { label: 'Desember', value: '12' },
]

const YEARS = ['all', '2024', '2025', '2026']

export default function KasManagementPage() {
    const [items, setItems] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [filterMonth, setFilterMonth] = useState('all')
    const [filterYear, setFilterYear] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
    
    const [form, setForm] = useState({ 
        member_id: '', 
        month: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-01`, 
        amount_paid: '25000', 
        status: 'paid', 
        payment_date: new Date().toISOString().split('T')[0], 
        receipt_url: '',
        transaction_id: null as string | null,
        notes: '' 
    })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [filterMonth, filterYear])

    async function loadData() {
        setLoading(true)
        
        let query = supabase.from('member_kas').select('*, member:members(full_name, nim)')
        
        if (filterYear !== 'all' && filterMonth !== 'all') {
            const startDate = `${filterYear}-${filterMonth}-01`
            query = query.or(`month.eq.${startDate},status.eq.pending`)
        } else if (filterYear !== 'all') {
            // All months in a year
            query = query.gte('month', `${filterYear}-01-01`).lte('month', `${filterYear}-12-31`)
        } else if (filterMonth !== 'all') {
            // A specific month across all years
            // This is complex in Supabase, better to fetch all and filter in JS if needed,
            // or just fetch all for now since data isn't huge.
        }

        const { data, error } = await query
        if (error) console.error("Error loading kas:", error)
        
        const { data: m } = await supabase.from('members').select('id, full_name, nim, kas_monthly_amount').order('full_name')
        
        setItems(data || [])
        setMembers(m || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { 
            ...form, 
            amount_paid: parseFloat(form.amount_paid),
            month: form.month // Ensure it's YYYY-MM-01
        }
        
        let txId = form.transaction_id
        // Create or Update financial transaction if status is paid/partial
        if (form.status === 'paid' || form.status === 'partial') {
            const member = members.find(m => m.id === form.member_id)
            const txPayload = {
                type: 'income',
                category: 'Kas Anggota',
                description: `Kas Anggota: ${member?.full_name} - ${form.month.substring(0, 7)}`,
                amount: parseFloat(form.amount_paid),
                transaction_date: form.payment_date || new Date().toISOString().split('T')[0],
                member_id: form.member_id
            }

            if (txId) {
                // Update existing transaction
                await supabase.from('financial_transactions').update(txPayload).eq('id', txId)
            } else {
                // Create new transaction
                const { data: txData } = await supabase.from('financial_transactions').insert(txPayload).select().single()
                txId = txData?.id
            }
        }

        const kasPayload = { 
            member_id: form.member_id,
            month: form.month,
            amount_paid: parseFloat(form.amount_paid),
            status: form.status,
            payment_date: form.payment_date,
            receipt_url: form.receipt_url,
            notes: form.notes,
            transaction_id: txId 
        }

        if (editId) { 
            await supabase.from('member_kas').update(kasPayload).eq('id', editId) 
        } else { 
            await supabase.from('member_kas').insert(kasPayload) 
        }

        setShowModal(false); setEditId(null); loadData()
    }

    async function handleApprove(item: any) {
        const member = members.find(m => m.id === item.member_id)
        
        // Create transaction
        const txPayload = {
            type: 'income',
            category: 'Kas Anggota',
            description: `Kas Anggota: ${member?.full_name} - ${item.month.substring(0, 7)}`,
            amount: item.amount_paid,
            transaction_date: new Date().toISOString().split('T')[0],
            member_id: item.member_id
        }
        
        const { data: txData } = await supabase.from('financial_transactions').insert(txPayload).select().single()
        
        // Update Kas status
        await supabase.from('member_kas').update({ 
            status: 'paid', 
            transaction_id: txData?.id 
        }).eq('id', item.id)
        
        loadData()
    }

    async function handleReject(id: string) {
        if (!confirm('Yakin ingin menolak pembayaran ini?')) return
        await supabase.from('member_kas').update({ status: 'rejected' }).eq('id', id)
        loadData()
    }

    const filtered = items.filter(i => 
        i.member?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.member?.nim?.includes(searchTerm)
    )

    // Members who haven't fully paid this month
    const memberPaidTotals = items.reduce((acc, i) => {
        if (i.status === 'paid') acc[i.member_id] = (acc[i.member_id] || 0) + i.amount_paid
        return acc
    }, {} as Record<string, number>)

    const unpaidMembers = members.filter(m => (memberPaidTotals[m.id] || 0) < (m.kas_monthly_amount || 25000))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Manajemen Kas Anggota</div></div>
            <div className="page-container">
                <h1 className="page-title">Manajemen Kas Anggota</h1>
                <p className="page-subtitle">Input dan pantau iuran bulanan anggota</p>

                <div style={{ 
                    display: 'inline-flex', 
                    background: 'var(--bg-secondary)', 
                    padding: '0.25rem', 
                    borderRadius: '0.75rem', 
                    marginBottom: '2rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <button 
                        className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`} 
                        style={{ 
                            borderRadius: '0.5rem', 
                            padding: '0.5rem 1.25rem',
                            fontSize: '0.875rem',
                            boxShadow: activeTab === 'all' ? '0 4px 12px rgba(var(--color-primary-rgb), 0.2)' : 'none'
                        }} 
                        onClick={() => setActiveTab('all')}
                    >
                        Semua Data
                    </button>
                    <button 
                        className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`} 
                        style={{ 
                            borderRadius: '0.5rem', 
                            padding: '0.5rem 1.25rem',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(var(--color-primary-rgb), 0.2)' : 'none'
                        }} 
                        onClick={() => setActiveTab('pending')}
                    >
                        Menunggu Persetujuan
                        {items.filter(i => i.status === 'pending').length > 0 && (
                            <span style={{ 
                                background: activeTab === 'pending' ? 'rgba(255,255,255,0.2)' : 'var(--color-primary)', 
                                color: activeTab === 'pending' ? 'white' : 'white',
                                padding: '0.1rem 0.5rem',
                                borderRadius: '1rem',
                                fontSize: '0.75rem',
                                fontWeight: 700
                            }}>
                                {items.filter(i => i.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="toolbar" style={{ 
                    gap: '1rem', 
                    flexWrap: 'wrap', 
                    background: 'var(--bg-secondary)', 
                    padding: '1rem', 
                    borderRadius: '1rem', 
                    marginBottom: '2rem',
                    border: '1px solid var(--border-color)',
                    alignItems: 'center'
                }}>
                    <div className="toolbar-left" style={{ gap: '0.75rem', flex: 1 }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input 
                                className="form-input" 
                                style={{ paddingLeft: '3rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }} 
                                placeholder="Cari nama anggota atau NIM..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="form-select" style={{ borderRadius: '0.75rem', width: 'auto' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select className="form-select" style={{ borderRadius: '0.75rem', width: 'auto' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                {YEARS.map(y => <option key={y} value={y}>{y === 'all' ? 'Semua Tahun' : y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="toolbar-right" style={{ gap: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ borderRadius: '0.75rem' }} onClick={() => exportToCsv([], filtered, `Kas_Export.csv`)}><Download size={16} /> Export CSV</button>
                        <button className="btn btn-primary" style={{ borderRadius: '0.75rem' }} onClick={() => { 
                            setEditId(null); 
                            setForm({ 
                                ...form, 
                                member_id: '', 
                                receipt_url: '', 
                                transaction_id: null, 
                                status: 'paid' 
                            }); 
                            setShowModal(true) 
                        }}>
                            <Plus size={16} /> Input Kas
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8">
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="data-table-container">
                                <table className="data-table">
                                    <thead><tr><th>Anggota</th><th>Bulan</th><th>Tanggal Bayar</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr></thead>
                                    <tbody>
                                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                            filtered.length === 0 ? <tr><td colSpan={6} className="text-center" style={{ padding: '3rem' }}>Tidak ada data yang ditemukan</td></tr> :
                                            filtered
                                            .filter(i => {
                                                if (activeTab === 'pending') return i.status === 'pending';
                                                if (filterYear === 'all' || filterMonth === 'all') return true;
                                                return i.month === `${filterYear}-${filterMonth}-01` || i.status === 'pending';
                                            })
                                            .map(i => (
                                                <tr key={i.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{i.member?.full_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{i.member?.nim}</div>
                                                    </td>
                                                    <td style={{ fontSize: '0.8125rem' }}>{new Date(i.month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</td>
                                                    <td>{i.payment_date ? formatDateShort(i.payment_date) : '-'}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(i.amount_paid)}</td>
                                                    <td>
                                                        <span className={`badge badge-${
                                                            i.status === 'paid' ? 'success' : 
                                                            i.status === 'pending' ? 'info' : 
                                                            i.status === 'rejected' ? 'danger' : 'warning'
                                                        }`}>
                                                            {i.status === 'paid' ? 'Lunas' : 
                                                             i.status === 'pending' ? 'Menunggu Verifikasi' : 
                                                             i.status === 'rejected' ? 'Ditolak' : 'Sebagian'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {i.status === 'pending' ? (
                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                <button className="btn btn-primary btn-sm" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleApprove(i)}>Approve</button>
                                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleReject(i.id)}>Reject</button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => { 
                                                                    setForm({ 
                                                                        member_id: i.member_id, 
                                                                        month: i.month, 
                                                                        amount_paid: i.amount_paid.toString(), 
                                                                        status: i.status, 
                                                                        payment_date: i.payment_date || '', 
                                                                        receipt_url: i.receipt_url || '',
                                                                        transaction_id: i.transaction_id,
                                                                        notes: i.notes || '' 
                                                                    }); 
                                                                    setEditId(i.id); 
                                                                    setShowModal(true) 
                                                                }}>Edit</button>
                                                            </div>
                                                        ) : (
                                                            <button className="btn btn-ghost btn-sm" onClick={() => { 
                                                                setForm({ 
                                                                    member_id: i.member_id, 
                                                                    month: i.month, 
                                                                    amount_paid: i.amount_paid.toString(), 
                                                                    status: i.status, 
                                                                    payment_date: i.payment_date || '', 
                                                                    receipt_url: i.receipt_url || '',
                                                                    transaction_id: i.transaction_id,
                                                                    notes: i.notes || '' 
                                                                }); 
                                                                setEditId(i.id); 
                                                                setShowModal(true) 
                                                            }}>Edit</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="card">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Belum Bayar ({unpaidMembers.length})</h3>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {unpaidMembers.map(m => (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.full_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.nim}</div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { 
                                            setForm({ 
                                                ...form, 
                                                member_id: m.id, 
                                                amount_paid: m.kas_monthly_amount?.toString() || '25000',
                                                receipt_url: '',
                                                transaction_id: null,
                                                status: 'paid'
                                            }); 
                                            setShowModal(true) 
                                        }}><Plus size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Input'} Kas Anggota</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Anggota *</label>
                                    <select className="form-select" required value={form.member_id} onChange={e => {
                                        const m = members.find(mem => mem.id === e.target.value)
                                        setForm({ ...form, member_id: e.target.value, amount_paid: m?.kas_monthly_amount?.toString() || '20000' })
                                    }}>
                                        <option value="">Pilih Anggota</option>
                                        {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.nim})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Jumlah (Rp) *</label><input className="form-input" type="number" required value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tanggal Bayar</label><input className="form-input" type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group"><label className="form-label">Bulan</label><input className="form-input" type="month" value={form.month.substring(0, 7)} onChange={e => setForm({ ...form, month: `${e.target.value}-01` })} /></div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            <option value="paid">Lunas</option>
                                            <option value="pending">Menunggu Verifikasi</option>
                                            <option value="partial">Sebagian</option>
                                        </select>
                                    </div>
                                </div>
                                {form.receipt_url && (
                                    <div className="form-group">
                                        <label className="form-label">Bukti Transfer</label>
                                        <a href={form.receipt_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--color-primary)' }}>Lihat Bukti &rarr;</a>
                                    </div>
                                )}
                                <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Simpan'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

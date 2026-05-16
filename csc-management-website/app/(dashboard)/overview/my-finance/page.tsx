'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { DollarSign, Receipt, Clock, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react'

export default function MyFinancePage() {
    const { currentUser } = useCurrentUser()
    const [kasHistory, setKasHistory] = useState<any[]>([])
    const [reimbursements, setReimbursements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [showPayModal, setShowPayModal] = useState(false)
    const [payForm, setPayForm] = useState({ month: '', amount: '', receipt_url: '', notes: '' })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (currentUser) {
            loadData()
            setPayForm(prev => ({ ...prev, amount: (currentUser.kas_monthly_amount || 25000).toString() }))
        }
    }, [currentUser])

    async function loadData() {
        setLoading(true)
        const { data: kas } = await supabase.from('member_kas')
            .select('*')
            .eq('member_id', currentUser?.id)
            .order('month', { ascending: false })
        
        const { data: re } = await supabase.from('reimbursements')
            .select('*')
            .eq('member_id', currentUser?.id)
            .order('created_at', { ascending: false })
            .limit(5)

        setKasHistory(kas || [])
        setReimbursements(re || [])
        setLoading(false)
    }

    async function handlePay(e: React.FormEvent) {
        e.preventDefault()
        if (!payForm.month || !payForm.receipt_url) return alert('Bulan dan Link Bukti wajib diisi')
        
        setSubmitting(true)
        const payload = {
            member_id: currentUser?.id,
            month: `${payForm.month}-01`,
            amount_paid: parseFloat(payForm.amount),
            status: 'pending',
            payment_date: new Date().toISOString().split('T')[0],
            receipt_url: payForm.receipt_url,
            notes: payForm.notes
        }

        const { error } = await supabase.from('member_kas').insert(payload)
        
        if (error) {
            alert('Gagal mengirim konfirmasi: ' + error.message)
        } else {
            setShowPayModal(false)
            setPayForm({ ...payForm, month: '', receipt_url: '', notes: '' })
            loadData()
        }
        setSubmitting(false)
    }

    const currentYear = new Date().getFullYear()
    const monthlyStatus = Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${currentYear}-${(i + 1).toString().padStart(2, '0')}-01`
        const payments = kasHistory.filter(k => k.month === monthStr)
        const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0)
        const hasPending = payments.some(p => p.status === 'pending')
        
        let status = 'unpaid'
        if (totalPaid >= (currentUser?.kas_monthly_amount || 25000)) status = 'paid'
        else if (totalPaid > 0) status = 'partial'
        else if (hasPending) status = 'pending'

        return {
            month: new Date(currentYear, i).toLocaleString('id-ID', { month: 'long' }),
            monthVal: `${currentYear}-${(i + 1).toString().padStart(2, '0')}`,
            status: status as any,
            amount: totalPaid,
            payments: payments // All logs for this month
        }
    })

    const unpaidCount = monthlyStatus.filter(m => m.status === 'unpaid' && new Date(currentYear, monthlyStatus.indexOf(m)) <= new Date()).length

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Keuangan Saya</div></div>
            <div className="page-container">
                <h1 className="page-title">Keuangan Saya</h1>
                <div className="toolbar" style={{ marginBottom: '2rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
                        <Plus size={16} /> Konfirmasi Pembayaran
                    </button>
                </div>

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <div className="stat-value">{unpaidCount}</div>
                            <div className="stat-label">Bulan Belum Lunas</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <div className="stat-value">{kasHistory.filter(k => k.status === 'paid').length}</div>
                            <div className="stat-label">Total Bulan Lunas</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={20} /> Status Kas {currentYear}
                        </h2>
                        <div className="card" style={{ padding: '0.5rem' }}>
                            {monthlyStatus.map((m, idx) => {
                                const isFuture = new Date(currentYear, idx) > new Date()
                                return (
                                    <div key={m.month} className="card" style={{ padding: '1.25rem', marginBottom: '1rem', border: isFuture ? '1px dashed var(--border-color)' : '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{m.month}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                Total Bayar: {formatCurrency(m.amount)}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className={`badge badge-${m.status === 'paid' ? 'success' : m.status === 'partial' ? 'warning' : m.status === 'pending' ? 'info' : isFuture ? 'default' : 'danger'}`}>
                                                    {m.status === 'paid' ? 'Lunas' : m.status === 'partial' ? 'Sebagian' : m.status === 'pending' ? 'Menunggu Approval' : isFuture ? 'Mendatang' : 'Belum Bayar'}
                                                </span>
                                            </div>
                                            {m.status !== 'paid' && !isFuture && (
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setPayForm({ ...payForm, month: m.monthVal }); setShowPayModal(true) }} title="Bayar Sekarang"><Plus size={14} /></button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {m.payments.length > 0 && (
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Riwayat Pembayaran</div>
                                            {m.payments.map((p: any) => (
                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '0.25rem 0' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                                                        <span>{formatDateShort(p.payment_date)}</span>
                                                        <span className={`badge badge-${p.status === 'paid' ? 'success' : p.status === 'pending' ? 'info' : 'warning'}`} style={{ fontSize: '0.625rem', padding: '0 0.4rem' }}>
                                                            {p.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontWeight: 600 }}>{formatCurrency(p.amount_paid)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Receipt size={20} /> Reimbursement Terakhir
                        </h2>
                        <div className="card">
                            {reimbursements.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Belum ada pengajuan reimbursement
                                </div>
                            ) : (
                                reimbursements.map((r, idx) => (
                                    <div key={r.id} style={{ 
                                        padding: '1rem 0',
                                        borderBottom: idx === reimbursements.length - 1 ? 'none' : '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: 600 }}>{r.title}</div>
                                            <span className={`badge badge-${
                                                r.status === 'paid' ? 'success' : 
                                                r.status === 'approved' ? 'info' : 
                                                r.status === 'rejected' ? 'danger' : 'warning'
                                            }`}>{r.status.toUpperCase()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <div style={{ color: 'var(--text-secondary)' }}>{formatDateShort(r.created_at)}</div>
                                            <div style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <a href="/finance/reimbursement" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>Lihat Semua &rarr;</a>
                            </div>
                        </div>

                        <div className="card" style={{ marginTop: '2rem', background: 'var(--color-info-bg)', borderColor: 'var(--color-info)' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <AlertCircle size={24} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
                                <div>
                                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-info)', marginBottom: '0.25rem' }}>Informasi Pembayaran Kas</h3>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Pembayaran kas dilakukan setiap bulan sebesar <strong>{formatCurrency(currentUser?.kas_monthly_amount || 25000)}</strong>. 
                                        Silakan hubungi tim Finance untuk melakukan pembayaran atau konfirmasi.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {showPayModal && (
                    <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>Konfirmasi Pembayaran Kas</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowPayModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handlePay}><div className="modal-body">
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                    Silakan isi detail pembayaran Anda. Tim Finance akan melakukan verifikasi sebelum status berubah menjadi lunas.
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Bulan *</label>
                                    <input className="form-input" type="month" required value={payForm.month} onChange={e => setPayForm({ ...payForm, month: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jumlah (Rp) *</label>
                                    <input className="form-input" type="number" required value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Link Bukti Transfer (Gdrive/Imgur/dsb) *</label>
                                    <input className="form-input" required placeholder="https://..." value={payForm.receipt_url} onChange={e => setPayForm({ ...payForm, receipt_url: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Catatan</label>
                                    <textarea className="form-textarea" placeholder="Contoh: Bayar via Bank Mandiri" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
                                </div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Batal</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim Konfirmasi'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

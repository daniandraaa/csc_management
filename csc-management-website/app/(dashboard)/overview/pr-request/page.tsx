'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import { UserCheck, Plus, X, Package, CheckCircle2, XCircle, Briefcase, Clock } from 'lucide-react'
import { canManageModule } from '@/lib/rbac'
import { useRouter } from 'next/navigation'

export default function OverviewPRRequestPage() {
    const { currentUser } = useCurrentUser()
    const router = useRouter()
    const canManage = canManageModule(currentUser, 'content') // PR is handled by Marketing
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', deadline: '' })
    const [members, setMembers] = useState<any[]>([])
    const [showJobdeskModal, setShowJobdeskModal] = useState<any>(null)
    const [jobdeskForm, setJobdeskForm] = useState({ category: 'Lainnya', pic_id: '' })

    useEffect(() => { if (currentUser) loadData() }, [currentUser])

    async function loadData() {
        setLoading(true)
        // Using simpler joins to be more robust
        let query = supabase.from('pr_requests')
            .select('*, requester:members!requester_id(full_name, department), handler:members!handled_by(full_name)')
        
        if (!canManage) {
            query = query.eq('requester_id', currentUser?.id)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) {
            console.error('PR Requests Error:', error)
            setRequests([])
        } else {
            setRequests(data || [])
        }

        const { data: m } = await supabase.from('members').select('id,full_name').eq('department', 'Marketing').order('full_name')
        setMembers(m || [])
        setLoading(false)
    }

    async function updateRequestStatus(id: string, status: string, notes?: string) {
        const { error } = await supabase.from('pr_requests').update({
            status,
            notes: notes || null,
            handled_by: currentUser?.id,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        
        if (error) {
            alert(`Gagal update: ${error.message}`)
            return
        }
        loadData()
    }

    async function handleConfirmJobdesk(e: React.FormEvent) {
        e.preventDefault()
        const req = showJobdeskModal
        
        // 1. Create Jobdesk
        const { error: jobError } = await supabase.from('pr_jobdesk').insert({
            title: req.title,
            category: jobdeskForm.category,
            description: `Diteruskan dari permintaan Overview: ${req.description}`,
            deadline: req.deadline,
            status: 'on_going',
            pic_id: jobdeskForm.pic_id || null,
            notes: `Pengaju: ${req.requester?.full_name} (${req.requester?.department})`
        })

        if (jobError) {
            alert(`Gagal membuat jobdesk: ${jobError.message}`)
            return
        }

        // 2. Update Request Status
        await updateRequestStatus(req.id, 'in_progress', `Diteruskan ke Jobdesk PR (${jobdeskForm.category})`)
        
        setShowJobdeskModal(null)
        if (confirm('Jobdesk PR berhasil dibuat. Buka halaman Jobdesk PR?')) {
            router.push('/marketing/pr-tasks')
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        await supabase.from('pr_requests').insert({
            ...form,
            requester_id: currentUser?.id,
            deadline: form.deadline || null,
        })
        setShowModal(false)
        setForm({ title: '', description: '', deadline: '' })
        setSubmitted(true)
        loadData()
        setTimeout(() => setSubmitted(false), 3000)
    }

    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' },
        in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'Diproses' },
        completed: { bg: '#dcfce7', text: '#166534', label: 'Selesai' },
        rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Ditolak' },
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Ajukan ke PR</div></div>
            <div className="page-container">
                <h1 className="page-title">Ajukan ke PR</h1>
                <p className="page-subtitle">Ajukan permintaan bantuan atau informasi ke tim Public Relations (PR)</p>

                {submitted && (
                    <div style={{
                        padding: '1rem', borderRadius: 12,
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        border: '1px solid #86efac',
                        marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}>
                        <span style={{ fontSize: '1.25rem' }}>✅</span>
                        <span style={{ fontWeight: 600, color: '#166534' }}>Permintaan berhasil dikirim ke tim PR!</span>
                    </div>
                )}

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '1.25rem'
                    }}>
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Clock size={20} /></div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Pending</div>
                            <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 700 }}>{requests.filter(r => r.status === 'pending').length}</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '1.25rem'
                    }}>
                        <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}><Package size={20} /></div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Diproses</div>
                            <div className="stat-value" style={{ color: '#2563eb', fontSize: '1.25rem', fontWeight: 700 }}>{requests.filter(r => r.status === 'in_progress').length}</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '1.25rem'
                    }}>
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><CheckCircle2 size={20} /></div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Selesai</div>
                            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 700 }}>{requests.filter(r => r.status === 'completed').length}</div>
                        </div>
                    </div>
                </div>

                <div className="toolbar" style={{ 
                    marginBottom: '1.5rem', 
                    background: 'var(--bg-secondary)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '1rem',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', background: 'var(--bg-primary)', fontSize: '0.8125rem', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                            {requests.length} Permintaan PR
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-primary" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }} onClick={() => setShowModal(true)}>
                            <Plus size={18} /> Ajukan Baru
                        </button>
                    </div>
                </div>

                {/* Requests List */}
                <div className="data-table-container" style={{ borderRadius: '1.25rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                    <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ padding: '1.25rem 1rem' }}>Judul / Kebutuhan</th>
                                {canManage && <th>Pengaju</th>}
                                <th>Deadline</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>{canManage ? 'Aksi' : 'Catatan PR'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canManage ? 5 : 4} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={canManage ? 5 : 4}><div className="empty-state"><Package size={48} /><h3>Belum ada permintaan</h3><p>Ajukan permintaan baru ke tim PR.</p></div></td></tr>
                            ) : requests.map((r: any) => {
                                const st = statusStyles[r.status] || statusStyles.pending
                                return (
                                    <tr key={r.id} className="table-row-hover">
                                        <td data-label="Judul" style={{ padding: '1.25rem 1rem' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                                            {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                                        </td>
                                        {canManage && (
                                            <td data-label="Pengaju">
                                                <div style={{ fontWeight: 500 }}>{r.requester?.full_name || '-'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.requester?.department}</div>
                                            </td>
                                        )}
                                        <td data-label="Deadline" style={{ fontSize: '0.8125rem' }}>{r.deadline ? formatDateShort(r.deadline) : <span style={{ color: 'var(--text-tertiary)' }}>-</span>}</td>
                                        <td data-label="Status">
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '0.5rem',
                                                fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.text,
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.text }}></div>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                            {canManage ? (
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" style={{ borderRadius: '0.5rem' }} onClick={() => setShowJobdeskModal(r)} title="Terima & Jadikan Jobdesk">
                                                                <Briefcase size={14} /> Terima & Jobdesk
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderRadius: '0.5rem' }} onClick={() => updateRequestStatus(r.id, 'rejected')} title="Tolak">
                                                                <XCircle size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'in_progress' && (
                                                        <button className="btn btn-secondary btn-sm" style={{ borderRadius: '0.5rem' }} onClick={() => updateRequestStatus(r.id, 'completed')}>Selesai</button>
                                                    )}
                                                    {['completed', 'rejected'].includes(r.status) && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Tuntas</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                    {r.notes || 'Belum ada catatan'}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Submit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                            <div className="modal-header"><h2>Ajukan ke PR</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Judul Permintaan *</label><input className="form-input" required placeholder="Contoh: Bantuan penyebaran undangan" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Detail Deskripsi</label><textarea className="form-textarea" placeholder="Jelaskan kebutuhan Anda..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Deadline (Jika ada)</label><input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">Kirim Permintaan</button></div></form>
                        </div>
                    </div>
                )}
                {/* Jobdesk Specification Modal */}
                {showJobdeskModal && (
                    <div className="modal-overlay" onClick={() => setShowJobdeskModal(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                            <div className="modal-header"><h2>Tentukan Jobdesk PR</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowJobdeskModal(null)}><X size={18} /></button></div>
                            <form onSubmit={handleConfirmJobdesk}><div className="modal-body">
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                    Tentukan kategori dan penanggung jawab untuk permintaan: <strong>{showJobdeskModal.title}</strong>
                                </p>
                                <div className="form-group"><label className="form-label">Kategori Tugas</label>
                                    <select className="form-select" value={jobdeskForm.category} onChange={e => setJobdeskForm({ ...jobdeskForm, category: e.target.value })}>
                                        <option value="Penyebaran Undangan">Penyebaran Undangan</option>
                                        <option value="Penyampaian Informasi">Penyampaian Informasi</option>
                                        <option value="Pengerjaan Konten">Pengerjaan Konten</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Pilih PIC (Person In Charge)</label>
                                    <select className="form-select" required value={jobdeskForm.pic_id} onChange={e => setJobdeskForm({ ...jobdeskForm, pic_id: e.target.value })}>
                                        <option value="">Pilih Anggota Marketing</option>
                                        {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                    </select>
                                </div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowJobdeskModal(null)}>Batal</button><button type="submit" className="btn btn-primary">Konfirmasi & Buat Tugas</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

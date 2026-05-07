'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort, getStatusColor, getStatusLabel } from '@/lib/utils'
import { ClipboardList, Plus, Search, X, FileText } from 'lucide-react'
import { exportToPdf } from '@/lib/export'

const PDF_COLUMNS = [
    { header: 'Resi', key: 'tracking_code' },
    { header: 'Klien', key: 'client_name' },
    { header: 'Pekerjaan', key: 'project_title' },
    { header: 'Status', key: 'status_label' },
    { header: 'PIC', key: '_handler' },
    { header: 'Tanggal', key: '_date' },
]

export default function OrderMonitoringPage() {
    const { currentUser } = useCurrentUser()
    const [orders, setOrders] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [editId, setEditId] = useState<string | null>(null)
    
    const [form, setForm] = useState({
        client_name: '',
        project_title: '',
        description: '',
        status: 'pending',
        operating_notes: '',
        handled_by: ''
    })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('external_orders').select('*, handler:members!external_orders_handled_by_fkey(full_name)').order('created_at', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name').eq('department', 'Operating').order('full_name')
        
        setOrders(data || [])
        setMembers(m || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = {
            client_name: form.client_name,
            project_title: form.project_title,
            description: form.description,
            status: form.status,
            operating_notes: form.operating_notes,
            handled_by: form.handled_by || null
        }

        let submitError = null
        if (editId) {
            const { error } = await supabase.from('external_orders').update(payload).eq('id', editId)
            submitError = error
        } else {
            // Generate tracking code for new orders: ORD- + 6 random uppercase chars/numbers
            const tracking_code = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase()
            const { error } = await supabase.from('external_orders').insert({ ...payload, tracking_code })
            submitError = error
        }
        
        if (submitError) {
            console.error("Order submission error:", submitError)
            alert("Gagal menyimpan order: " + submitError.message)
            return
        }
        
        setShowModal(false)
        setEditId(null)
        setForm({ client_name: '', project_title: '', description: '', status: 'pending', operating_notes: '', handled_by: '' })
        loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus order ini? Tindakan ini tidak dapat dibatalkan.')) {
            await supabase.from('external_orders').delete().eq('id', id)
            loadData()
        }
    }

    const filtered = orders.filter((o: any) =>
        (o.project_title?.toLowerCase().includes(search.toLowerCase()) || o.client_name?.toLowerCase().includes(search.toLowerCase()) || o.tracking_code?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterStatus || o.status === filterStatus)
    )

    const pendingCount = orders.filter(o => o.status === 'pending').length
    const onProgressCount = orders.filter(o => o.status === 'on_progress').length
    const doneCount = orders.filter(o => o.status === 'done').length

    const exportData = filtered.map((o: any) => ({
        ...o,
        status_label: getStatusLabel(o.status),
        _handler: o.handler?.full_name || '-',
        _date: formatDateShort(o.created_at)
    }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Order Monitoring</div></div>
            <div className="page-container">
                <h1 className="page-title">Order Monitoring</h1>
                <p className="page-subtitle">Kelola dan pantau status permintaan/proyek dari pihak luar</p>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><ClipboardList size={20} /></div>
                        <div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{pendingCount}</div><div className="stat-label">Pending</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><ClipboardList size={20} /></div>
                        <div><div className="stat-value" style={{ color: 'var(--color-info)' }}>{onProgressCount}</div><div className="stat-label">On Progress</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><ClipboardList size={20} /></div>
                        <div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{doneCount}</div><div className="stat-label">Selesai</div></div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input"><Search /><input className="form-input" placeholder="Cari Resi / Nama..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div>
                        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Semua Status</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="on_progress">On Progress</option>
                            <option value="done">Done</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Order Monitoring', subtitle: `Total Order: ${filtered.length}`, columns: PDF_COLUMNS, data: exportData })}>
                            <FileText size={14} /> Export PDF
                        </button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ client_name: '', project_title: '', description: '', status: 'pending', operating_notes: '', handled_by: '' }); setShowModal(true) }}>
                            <Plus size={16} /> Tambah Order
                        </button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Resi / Kode</th>
                                <th>Klien</th>
                                <th>Pekerjaan</th>
                                <th>Status</th>
                                <th>PIC Operating</th>
                                <th>Tanggal Masuk</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><ClipboardList size={48} /><h3>Belum ada order</h3></div></td></tr> :
                                    filtered.map((o: any) => (
                                        <tr key={o.id}>
                                            <td data-label="Resi / Kode" style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-brand-500)' }}>{o.tracking_code}</td>
                                            <td data-label="Klien" style={{ fontWeight: 500 }}>{o.client_name}</td>
                                            <td data-label="Pekerjaan">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontWeight: 600 }}>{o.project_title}</div>
                                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description}</div>
                                                </div>
                                            </td>
                                            <td data-label="Status"><span className={`badge badge-${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                                            <td data-label="PIC Operating">{o.handler?.full_name || '-'}</td>
                                            <td data-label="Tanggal Masuk">{formatDateShort(o.created_at)}</td>
                                            <td data-label="Aksi">
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ client_name: o.client_name, project_title: o.project_title, description: o.description || '', status: o.status, operating_notes: o.operating_notes || '', handled_by: o.handled_by || '' }); setEditId(o.id); setShowModal(true) }}>Kelola</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(o.id)}>Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <div className="modal-header"><h2>{editId ? 'Kelola Order' : 'Tambah Order Baru'}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Nama Klien / Instansi *</label><input className="form-input" required value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Contoh: BEM Tel-U" /></div>
                                        <div className="form-group"><label className="form-label">Judul Permintaan *</label><input className="form-input" required value={form.project_title} onChange={e => setForm({ ...form, project_title: e.target.value })} /></div>
                                    </div>
                                    
                                    <div className="form-group"><label className="form-label">Deskripsi Lengkap *</label><textarea className="form-textarea" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 80 }} /></div>
                                    
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-primary)', margin: '1.5rem 0' }} />
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Status Pekerjaan</label>
                                            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                <option value="pending">Pending (Menunggu)</option>
                                                <option value="accepted">Accepted (Diterima)</option>
                                                <option value="on_progress">On Progress (Dikerjakan)</option>
                                                <option value="done">Done (Selesai)</option>
                                                <option value="rejected">Rejected (Ditolak)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">PIC Operating</label>
                                            <select className="form-select" value={form.handled_by} onChange={e => setForm({ ...form, handled_by: e.target.value })}>
                                                <option value="">Belum ditentukan</option>
                                                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Keterangan / Notes (Akan terlihat oleh Klien)</label>
                                        <textarea className="form-textarea" value={form.operating_notes} onChange={e => setForm({ ...form, operating_notes: e.target.value })} placeholder="Tulis progress atau catatan untuk klien..." style={{ minHeight: 80 }} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary">{editId ? 'Simpan Perubahan' : 'Tambah Order'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

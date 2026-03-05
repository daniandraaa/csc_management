'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { useCurrentUser } from '@/lib/auth'
import { PenTool, Plus, X, Upload, FileText, Download, Inbox, CheckCircle2, XCircle } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'platform', label: 'Platform', required: true },
    { key: 'content_type', label: 'Tipe Konten' },
    { key: 'description', label: 'Deskripsi' },
    { key: 'scheduled_date', label: 'Jadwal' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Judul', key: 'title' },
    { header: 'Platform', key: 'platform' },
    { header: 'Tipe', key: 'content_type' },
    { header: 'Jadwal', key: 'scheduled_date' },
    { header: 'Status', key: 'status' },
]

export default function ContentPage() {
    const { currentUser } = useCurrentUser()
    const [activeTab, setActiveTab] = useState<'plans' | 'requests'>('plans')
    const [plans, setPlans] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('content_plans').select('*, assignee:members!content_plans_assigned_to_fkey(full_name)').order('scheduled_date', { ascending: true })
        const { data: m } = await supabase.from('members').select('id,full_name')
        const { data: reqs } = await supabase.from('content_requests')
            .select('*, requester:members!content_requests_requester_id_fkey(full_name, department)')
            .order('created_at', { ascending: false })
        setPlans(data || [])
        setMembers(m || [])
        setRequests(reqs || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, assigned_to: form.assigned_to || null, scheduled_date: form.scheduled_date || null }
        if (editId) { await supabase.from('content_plans').update(payload).eq('id', editId) } else { await supabase.from('content_plans').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, platform: r.platform, content_type: r.content_type || 'post', description: r.description || null, scheduled_date: r.scheduled_date || null, status: r.status || 'draft' }))
        await supabase.from('content_plans').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus?')) { await supabase.from('content_plans').delete().eq('id', id); loadData() } }

    async function updateRequestStatus(id: string, status: string, notes?: string) {
        await supabase.from('content_requests').update({
            status,
            marketing_notes: notes || null,
            handled_by: currentUser?.id,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        loadData()
    }

    async function convertToContentPlan(req: any) {
        await supabase.from('content_plans').insert({
            title: req.title,
            platform: req.platform || 'Instagram',
            content_type: req.content_type || 'post',
            description: req.description || null,
            scheduled_date: req.deadline || null,
            status: 'draft',
        })
        await updateRequestStatus(req.id, 'in_progress', 'Dikonversi menjadi content plan')
        loadData()
    }

    const platformColors: Record<string, string> = { Instagram: '#E1306C', TikTok: '#000', Twitter: '#1DA1F2', LinkedIn: '#0077B5', YouTube: '#FF0000' }

    const grouped = plans.reduce((acc: Record<string, any[]>, p) => {
        const key = p.scheduled_date || 'Tidak Terjadwal'
        if (!acc[key]) acc[key] = []
        acc[key].push(p)
        return acc
    }, {})

    const pendingRequests = requests.filter(r => r.status === 'pending').length

    const reqStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' },
        in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'Diproses' },
        completed: { bg: '#dcfce7', text: '#166534', label: 'Selesai' },
        rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Ditolak' },
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Content Planner</div></div>
            <div className="page-container">
                <h1 className="page-title">Content Planner</h1>
                <p className="page-subtitle">Kelola jadwal konten media sosial dan permintaan konten</p>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('plans')}>
                        <PenTool size={16} /> Content Plan
                    </button>
                    <button className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('requests')} style={{ position: 'relative' }}>
                        <Inbox size={16} /> Permintaan Konten
                        {pendingRequests > 0 && (
                            <span style={{
                                position: 'absolute', top: -6, right: -6,
                                background: '#ef4444', color: 'white',
                                borderRadius: '50%', width: 20, height: 20,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6875rem', fontWeight: 700,
                            }}>{pendingRequests}</span>
                        )}
                    </button>
                </div>

                {activeTab === 'plans' ? (
                    <>
                        <div className="toolbar">
                            <div className="toolbar-left" />
                            <div className="toolbar-right">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, plans, `CSC_Content_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Content Plan CSC', subtitle: `Total: ${plans.length} konten`, columns: PDF_COLUMNS, data: plans })}><FileText size={14} /> Export PDF</button>
                                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Konten</button>
                            </div>
                        </div>

                        {loading ? <p>Memuat...</p> : Object.keys(grouped).length === 0 ? <div className="card"><div className="empty-state"><PenTool size={48} /><h3>Belum ada konten</h3></div></div> :
                            Object.entries(grouped).map(([date, items]) => (
                                <div key={date} style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>📅 {date === 'Tidak Terjadwal' ? date : formatDateShort(date)}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
                                        {(items as any[]).map((p: any) => (
                                            <div key={p.id} className="card" style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <span className="badge" style={{ background: platformColors[p.platform] || 'var(--color-surface-tertiary)', color: platformColors[p.platform] ? '#fff' : 'var(--color-text-secondary)' }}>{p.platform}</span>
                                                        <span className="badge badge-default">{p.content_type}</span>
                                                    </div>
                                                    <span className={`badge badge-${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                                                </div>
                                                <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</h4>
                                                {p.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>{p.description}</p>}
                                                {p.assignee && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>PIC: {p.assignee.full_name}</span>}
                                                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ title: p.title, platform: p.platform, content_type: p.content_type, description: p.description || '', scheduled_date: p.scheduled_date || '', status: p.status, assigned_to: p.assigned_to || '', content_url: p.content_url || '', notes: p.notes || '' }); setEditId(p.id); setShowModal(true) }}>Edit</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}>Hapus</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </>
                ) : (
                    /* Content Requests Tab */
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead><tr><th>Judul</th><th>Pengaju</th><th>Platform</th><th>Tipe</th><th>Deadline</th><th>Status</th><th>Aksi</th></tr></thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                                ) : requests.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state"><Inbox size={48} /><h3>Belum ada permintaan</h3><p>Belum ada permintaan konten dari anggota.</p></div></td></tr>
                                ) : requests.map((r: any) => {
                                    const st = reqStatusStyles[r.status] || reqStatusStyles.pending
                                    return (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{r.title}</div>
                                                {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                                            </td>
                                            <td style={{ fontSize: '0.8125rem' }}>{r.requester?.full_name || '-'}<br /><span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{r.requester?.department}</span></td>
                                            <td>{r.platform || '-'}</td>
                                            <td><span className="badge badge-info">{r.content_type}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{r.deadline ? formatDateShort(r.deadline) : '-'}</td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 6,
                                                    fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.text,
                                                }}>{st.label}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" onClick={() => convertToContentPlan(r)} title="Terima & buat content plan">
                                                                <CheckCircle2 size={14} /> Terima
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => updateRequestStatus(r.id, 'rejected')} title="Tolak">
                                                                <XCircle size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'in_progress' && (
                                                        <button className="btn btn-secondary btn-sm" onClick={() => updateRequestStatus(r.id, 'completed', 'Konten selesai')}>
                                                            Selesai
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={plans} matchFields={['title', 'platform']} title="Import Content Plan" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Konten</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Platform *</label><input className="form-input" required placeholder="Instagram, TikTok..." value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tipe *</label><select className="form-select" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}><option value="post">Post</option><option value="story">Story</option><option value="reel">Reel</option><option value="article">Article</option><option value="video">Video</option><option value="other">Other</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Jadwal</label><input className="form-input" type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">PIC</label><select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

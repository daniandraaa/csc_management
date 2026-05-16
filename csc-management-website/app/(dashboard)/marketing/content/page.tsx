'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { useCurrentUser } from '@/lib/auth'
import { canManageModule } from '@/lib/rbac'
import { PenTool, Plus, X, Upload, FileText, Download, Inbox, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
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
    const canManage = canManageModule(currentUser, 'content')
    const [activeTab, setActiveTab] = useState<'plans' | 'requests'>('plans')
    const [plans, setPlans] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [picSearch, setPicSearch] = useState('')
    const [showPicList, setShowPicList] = useState(false)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('content_plans').select('*, assignee:members!content_plans_assigned_to_fkey(full_name)').order('scheduled_date', { ascending: true })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
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
        setShowModal(false); setEditId(null); setForm({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' }); setPicSearch(''); setShowPicList(false); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, platform: r.platform, content_type: r.content_type || 'post', description: r.description || null, scheduled_date: r.scheduled_date || null, status: r.status || 'draft' }))
        await supabase.from('content_plans').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus?')) { await supabase.from('content_plans').delete().eq('id', id); loadData() } }

    async function updateRequestStatus(id: string, status: string, notes?: string) {
        const { error } = await supabase.from('content_requests').update({
            status,
            marketing_notes: notes || null,
            handled_by: currentUser?.id,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        
        if (error) {
            console.error('Update status error:', error)
            alert(`Gagal update status: ${error.message}`)
            return
        }
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

    const filteredMembers = members.filter(m => m.full_name.toLowerCase().includes(picSearch.toLowerCase()))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Content Planner</div></div>
            <div className="page-container">
                <h1 className="page-title">Content Planner</h1>
                <p className="page-subtitle">Kelola jadwal konten media sosial dan permintaan konten</p>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border-primary)', paddingBottom: '1rem' }}>
                    <button className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('plans')} style={{ borderRadius: 8, padding: '0.625rem 1.25rem' }}>
                        <PenTool size={16} /> <span style={{ marginLeft: 8 }}>Content Plan</span>
                    </button>
                    <button className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('requests')} style={{ position: 'relative', borderRadius: 8, padding: '0.625rem 1.25rem' }}>
                        <Inbox size={16} /> <span style={{ marginLeft: 8 }}>Permintaan Konten</span>
                        {pendingRequests > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: 'var(--color-danger)', color: 'white',
                                borderRadius: '50%', minWidth: 18, height: 18,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.625rem', fontWeight: 700, padding: '0 4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' }); setPicSearch(''); setShowModal(true) }}><Plus size={16} /> Tambah Konten</button>
                            </div>
                        </div>

                        {loading ? <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loading-spinner" /> <p style={{ marginTop: 12, color: 'var(--color-text-tertiary)' }}>Memuat data...</p></div> : Object.keys(grouped).length === 0 ? <div className="card"><div className="empty-state" style={{ padding: '4rem 2rem' }}><div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><PenTool size={32} style={{ color: 'var(--color-text-tertiary)' }} /></div><h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Belum ada konten</h3><p style={{ color: 'var(--color-text-tertiary)', maxWidth: 300, margin: '8px auto' }}>Mulai buat perencanaan konten Anda atau impor dari file CSV.</p></div></div> :
                            Object.entries(grouped).map(([date, items]) => (
                                <div key={date} style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                                        <div style={{ padding: '4px 12px', background: 'var(--color-brand-50)', color: 'var(--color-brand-600)', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                            {date === 'Tidak Terjadwal' ? 'Draft' : 'Jadwal'}
                                        </div>
                                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                            {date === 'Tidak Terjadwal' ? date : formatDateShort(date)}
                                        </h3>
                                        <div style={{ flex: 1, height: 1, background: 'var(--color-border-primary)' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                        {(items as any[]).map((p: any) => (
                                            <div key={p.id} className="card hover-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border-primary)', transition: 'all 0.2s ease' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <span style={{ 
                                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600, 
                                                            background: platformColors[p.platform] ? `${platformColors[p.platform]}15` : 'var(--color-surface-secondary)', 
                                                            color: platformColors[p.platform] || 'var(--color-text-secondary)',
                                                            border: `1px solid ${platformColors[p.platform] ? `${platformColors[p.platform]}30` : 'var(--color-border-primary)'}`
                                                        }}>{p.platform}</span>
                                                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600, background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{p.content_type}</span>
                                                    </div>
                                                    <span className={`badge badge-${getStatusColor(p.status)}`} style={{ fontSize: '0.625rem', padding: '2px 8px' }}>{getStatusLabel(p.status)}</span>
                                                </div>
                                                <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 8, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{p.title}</h4>
                                                {p.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>{p.description}</p>}
                                                
                                                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--color-border-primary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-brand-50)', color: 'var(--color-brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700 }}>
                                                            {p.assignee?.full_name ? p.assignee.full_name.charAt(0) : '?'}
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{p.assignee?.full_name || 'Unassigned'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => { setForm({ title: p.title, platform: p.platform, content_type: p.content_type, description: p.description || '', scheduled_date: p.scheduled_date || '', status: p.status, assigned_to: p.assigned_to || '', content_url: p.content_url || '', notes: p.notes || '' }); setEditId(p.id); setPicSearch(p.assignee?.full_name || ''); setShowModal(true) }}>Edit</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '4px 8px' }} onClick={() => handleDelete(p.id)}>Hapus</button>
                                                    </div>
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
                    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border-primary)' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '1.25rem' }}>Konten</th>
                                    <th>Pengaju</th>
                                    <th>Platform</th>
                                    <th>Tipe</th>
                                    <th>Deadline</th>
                                    <th>Status</th>
                                    <th style={{ paddingRight: '1.25rem' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem' }}><div className="loading-spinner" /><p style={{ marginTop: 12, color: 'var(--color-text-tertiary)' }}>Memuat permintaan...</p></td></tr>
                                ) : requests.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state" style={{ padding: '4rem 2rem' }}><div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Inbox size={32} style={{ color: 'var(--color-text-tertiary)' }} /></div><h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Belum ada permintaan</h3><p style={{ color: 'var(--color-text-tertiary)', maxWidth: 300, margin: '8px auto' }}>Permintaan konten dari departemen lain akan muncul di sini.</p></div></td></tr>
                                ) : requests.map((r: any) => {
                                    const st = reqStatusStyles[r.status] || reqStatusStyles.pending
                                    return (
                                        <tr key={r.id}>
                                            <td style={{ paddingLeft: '1.25rem' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.title}</div>
                                                {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{r.description}</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{r.requester?.full_name || 'Unknown'}</div>
                                                <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{r.requester?.department}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{r.platform || 'General'}</span>
                                            </td>
                                            <td><span className="badge badge-default" style={{ fontSize: '0.6875rem' }}>{r.content_type}</span></td>
                                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{r.deadline ? formatDateShort(r.deadline) : 'No Deadline'}</td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12,
                                                    fontSize: '0.6875rem', fontWeight: 600, background: st.bg, color: st.text,
                                                }}>{st.label}</span>
                                            </td>
                                            <td style={{ paddingRight: '1.25rem' }}>
                                                {canManage ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        {r.status === 'pending' && (
                                                            <>
                                                                <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', height: 28, fontSize: '0.75rem' }} onClick={() => convertToContentPlan(r)}>
                                                                    <CheckCircle2 size={12} /> Terima
                                                                </button>
                                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '4px 8px', height: 28 }} onClick={() => updateRequestStatus(r.id, 'rejected')}>
                                                                    <XCircle size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {r.status === 'in_progress' && (
                                                            <button className="btn btn-secondary btn-sm" style={{ height: 28, fontSize: '0.75rem' }} onClick={() => updateRequestStatus(r.id, 'completed', 'Konten selesai')}>
                                                                Selesai
                                                            </button>
                                                        )}
                                                        {['completed', 'rejected'].includes(r.status) && (
                                                            <select 
                                                                className="form-select" 
                                                                style={{ width: 'auto', fontSize: '0.75rem', height: 28, padding: '0 8px' }}
                                                                value={r.status}
                                                                onChange={(e) => updateRequestStatus(r.id, e.target.value)}
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="in_progress">In Progress</option>
                                                                <option value="completed">Completed</option>
                                                                <option value="rejected">Rejected</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>View Only</span>
                                                )}
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
                        <div className="modal-content" style={{ maxWidth: 600, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border-primary)', padding: '1.25rem 1.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editId ? 'Edit Content Plan' : 'Tambah Konten Baru'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
<div className="modal-body">
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Platform *</label><input className="form-input" required placeholder="Instagram, TikTok..." value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tipe *</label><select className="form-select" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}><option value="post">Post</option><option value="story">Story</option><option value="reel">Reel</option><option value="article">Article</option><option value="video">Video</option><option value="other">Other</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Jadwal</label><input className="form-input" type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                    <div className="form-group" style={{ position: 'relative' }}>
                                        <label className="form-label">PIC</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                className="form-input" 
                                                placeholder="Cari PIC..." 
                                                value={picSearch}
                                                autoComplete="off"
                                                onChange={e => {
                                                    setPicSearch(e.target.value)
                                                    setShowPicList(true)
                                                    if (e.target.value === '') setForm({ ...form, assigned_to: '' })
                                                }}
                                                onFocus={() => setShowPicList(true)}
                                                onBlur={() => setTimeout(() => setShowPicList(false), 200)}
                                            />
                                            {showPicList && (
                                                <div style={{ 
                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                    borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '200px', overflowY: 'auto',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                                }}>
                                                    {filteredMembers.length === 0 ? (
                                                        <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Tidak ditemukan</div>
                                                    ) : (
                                                        filteredMembers.map((m: any) => (
                                                            <div 
                                                                key={m.id}
                                                                style={{ padding: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                                                                onClick={() => {
                                                                    setForm({ ...form, assigned_to: m.id })
                                                                    setPicSearch(m.full_name)
                                                                    setShowPicList(false)
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                {m.full_name}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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

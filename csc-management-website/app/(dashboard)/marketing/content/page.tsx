'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { useCurrentUser } from '@/lib/auth'
import { canManageModule } from '@/lib/rbac'
import { PenTool, Plus, X, Upload, FileText, Download, Inbox, CheckCircle2, XCircle, ChevronDown, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from 'lucide-react'
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
    const [plans, setPlans] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [picSearch, setPicSearch] = useState('')
    const [showPicList, setShowPicList] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
    const [currentDate, setCurrentDate] = useState(new Date())

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('content_plans').select('*, assignee:members!content_plans_assigned_to_fkey(full_name)').order('scheduled_date', { ascending: true })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setPlans(data || [])
        setMembers(m || [])
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

    const platformColors: Record<string, string> = { Instagram: '#E1306C', TikTok: '#000', Twitter: '#1DA1F2', LinkedIn: '#0077B5', YouTube: '#FF0000' }

    const grouped = plans.reduce((acc: Record<string, any[]>, p) => {
        const key = p.scheduled_date || 'Tidak Terjadwal'
        if (!acc[key]) acc[key] = []
        acc[key].push(p)
        return acc
    }, {})

    const filteredMembers = members.filter(m => m.full_name.toLowerCase().includes(picSearch.toLowerCase()))

    // Calendar logic
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()

    const calendarDays = []
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i)
    }

    const currentMonthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Content Planner</div></div>
            <div className="page-container">
                <h1 className="page-title">Content Planner</h1>
                <p className="page-subtitle">Kelola jadwal konten media sosial</p>

                <div className="toolbar" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="toolbar-left" style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                                    <button className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', height: 'auto', fontSize: '0.875rem' }} onClick={() => setViewMode('list')}><List size={16} /> List</button>
                                    <button className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', height: 'auto', fontSize: '0.875rem' }} onClick={() => setViewMode('calendar')}><CalendarIcon size={16} /> Kalender</button>
                                </div>
                            </div>
                            <div className="toolbar-right" style={{ gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, plans, `CSC_Content_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Content Plan CSC', subtitle: `Total: ${plans.length} konten`, columns: PDF_COLUMNS, data: plans })}><FileText size={14} /> Export PDF</button>
                                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', platform: '', content_type: 'post', description: '', scheduled_date: '', status: 'draft', assigned_to: '', content_url: '', notes: '' }); setPicSearch(''); setShowModal(true) }}><Plus size={16} /> Tambah Konten</button>
                            </div>
                        </div>

                        {loading ? <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loading-spinner" /> <p style={{ marginTop: 12, color: 'var(--color-text-tertiary)' }}>Memuat data...</p></div> : 
                            viewMode === 'list' ? (
                                Object.keys(grouped).length === 0 ? <div className="card"><div className="empty-state" style={{ padding: '4rem 2rem' }}><div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><PenTool size={32} style={{ color: 'var(--color-text-tertiary)' }} /></div><h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Belum ada konten</h3><p style={{ color: 'var(--color-text-tertiary)', maxWidth: 300, margin: '8px auto' }}>Mulai buat perencanaan konten Anda atau impor dari file CSV.</p></div></div> :
                                Object.entries(grouped).map(([date, items]) => (
                                <div key={date} style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                                        <div style={{ padding: '4px 12px', background: 'var(--color-brand-50)', color: 'var(--color-brand-600)', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                            {date === 'Tidak Terjadwal' ? 'Draft' : 'Jadwal'}
                                        </div>
                                        {date === 'Tidak Terjadwal' ? (
                                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{date}</h3>
                                        ) : (
                                            <button 
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-600)', padding: '0 4px', height: 'auto', textDecoration: 'underline' }}
                                                onClick={() => {
                                                    const d = new Date(date)
                                                    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1))
                                                    setViewMode('calendar')
                                                }}
                                            >
                                                {formatDateShort(date)}
                                            </button>
                                        )}
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
                        ) : (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{monthNames[month]} {year}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary btn-icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><ChevronLeft size={18} /></button>
                                        <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>Bulan Ini</button>
                                        <button className="btn btn-secondary btn-icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><ChevronRight size={18} /></button>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                        {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => (
                                            <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{day}</div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--border-color)', gap: '1px' }}>
                                        {calendarDays.map((day, idx) => {
                                            if (day === null) return <div key={`empty-${idx}`} style={{ background: '#fafafa', minHeight: '120px' }} />
                                            const dateStr = `${currentMonthStr}-${day.toString().padStart(2, '0')}`
                                            const dayPlans = plans.filter(p => p.scheduled_date === dateStr)
                                            const isToday = new Date().toISOString().split('T')[0] === dateStr
                                            
                                            return (
                                                <div key={`day-${day}`} style={{ background: isToday ? '#f0fdf4' : 'var(--bg-primary)', minHeight: '140px', padding: '0.5rem', transition: 'background 0.2s', position: 'relative' }}>
                                                    <div style={{ 
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                        width: '28px', height: '28px', 
                                                        margin: '0 auto 0.5rem auto',
                                                        borderRadius: '50%',
                                                        fontWeight: isToday ? 700 : 500, 
                                                        fontSize: '0.875rem',
                                                        color: isToday ? '#16a34a' : 'var(--text-primary)',
                                                        background: isToday ? '#dcfce7' : 'transparent',
                                                    }}>
                                                        {day}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {dayPlans.map(p => (
                                                            <div key={p.id} className="hover-card" style={{ 
                                                                fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                                                background: platformColors[p.platform] ? `${platformColors[p.platform]}15` : 'var(--bg-secondary)',
                                                                color: platformColors[p.platform] || 'var(--text-primary)',
                                                                fontWeight: 500,
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                transition: 'all 0.15s ease'
                                                            }} onClick={() => { setForm({ title: p.title, platform: p.platform, content_type: p.content_type, description: p.description || '', scheduled_date: p.scheduled_date || '', status: p.status, assigned_to: p.assigned_to || '', content_url: p.content_url || '', notes: p.notes || '' }); setEditId(p.id); setPicSearch(p.assignee?.full_name || ''); setShowModal(true) }}>
                                                                {p.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
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

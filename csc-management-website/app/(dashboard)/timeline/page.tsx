'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { formatDateShort, getInitials } from '@/lib/utils'
import { Clock, Plus, X, CalendarDays, Upload, FileText, Download, ChevronLeft, ChevronRight, List, Calendar } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const TYPES = [
    { value: 'meeting', label: 'Rapat', icon: '📋', color: '#dc2626' },
    { value: 'activity', label: 'Kegiatan', icon: '🎯', color: '#f59e0b' },
    { value: 'event', label: 'Event', icon: '🎉', color: '#3b82f6' },
    { value: 'announcement', label: 'Pengumuman', icon: '📢', color: '#8b5cf6' },
]

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'type', label: 'Tipe (meeting/activity/event/announcement)', required: true },
    { key: 'event_date', label: 'Tanggal', required: true },
    { key: 'description', label: 'Deskripsi' },
    { key: 'location', label: 'Lokasi' },
    { key: 'start_time', label: 'Jam Mulai' },
    { key: 'end_time', label: 'Jam Selesai' },
    { key: 'attendees_text', label: 'Peserta' },
    { key: 'decisions', label: 'Keputusan' },
]
const PDF_COLUMNS = [
    { header: 'Tanggal', key: 'event_date' },
    { header: 'Judul', key: 'title' },
    { header: 'Tipe', key: 'type' },
    { header: 'Lokasi', key: 'location' },
    { header: 'Dibuat Oleh', key: '_creator' },
]

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function TimelinePage() {
    const { currentUser } = useCurrentUser()
    const [items, setItems] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [filterType, setFilterType] = useState('')
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [form, setForm] = useState({
        title: '', description: '', type: 'meeting', event_date: '', start_time: '', end_time: '',
        location: '', created_by: '', attendees_text: '', decisions: '', notes: ''
    })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/timeline', 'create')
    const canDelete = canPerformAction(currentUser, '/timeline', 'delete')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('timeline_entries').select('*, creator:members!timeline_entries_created_by_fkey(full_name,role)').order('event_date', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name,role')
        const { data: p } = await supabase.from('programs').select('*').not('start_date', 'is', null)
        setItems(data || []); setMembers(m || []); setPrograms(p || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = {
            ...form,
            created_by: form.created_by || currentUser?.id || null,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            event_date: form.event_date || new Date().toISOString().split('T')[0],
        }
        if (editId) { await supabase.from('timeline_entries').update(payload).eq('id', editId) }
        else { await supabase.from('timeline_entries').insert(payload) }
        setShowModal(false); setEditId(null)
        setForm({ title: '', description: '', type: 'meeting', event_date: '', start_time: '', end_time: '', location: '', created_by: '', attendees_text: '', decisions: '', notes: '' })
        loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, type: r.type || 'meeting', event_date: r.event_date || new Date().toISOString().split('T')[0], description: r.description || null, location: r.location || null, start_time: r.start_time || null, end_time: r.end_time || null, attendees_text: r.attendees_text || null, decisions: r.decisions || null }))
        await supabase.from('timeline_entries').insert(payload)
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus entri?')) { await supabase.from('timeline_entries').delete().eq('id', id); loadData() }
    }

    const filtered = items.filter(i => !filterType || i.type === filterType)
    const exportData = filtered.map((i: any) => ({ ...i, _creator: i.creator?.full_name || '-' }))

    // Calendar helpers
    function getCalendarDays() {
        const firstDay = new Date(calendarYear, calendarMonth, 1).getDay()
        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
        const days: (number | null)[] = []
        for (let i = 0; i < firstDay; i++) days.push(null)
        for (let i = 1; i <= daysInMonth; i++) days.push(i)
        return days
    }

    function getEventsForDate(day: number) {
        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const timelineEvents = items.filter(i => i.event_date === dateStr)
        // Also include programs spanning this date
        const programEvents = programs.filter(p => {
            if (!p.start_date) return false
            const start = p.start_date
            const end = p.end_date || p.start_date
            return dateStr >= start && dateStr <= end
        }).map(p => ({
            id: `prog-${p.id}`,
            title: p.name,
            type: 'activity',
            event_date: dateStr,
            description: p.description,
            _isProgram: true,
        }))
        return [...timelineEvents, ...programEvents]
    }

    const calendarDays = getCalendarDays()
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Selected date events
    const selectedDateEvents = selectedDate ? items.filter(i => i.event_date === selectedDate) : []

    // LIST VIEW: group by month
    const grouped = filtered.reduce((acc: Record<string, any[]>, item) => {
        const date = new Date(item.event_date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {})

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Timeline Rapat & Kegiatan</div></div>
            <div className="page-container">
                <h1 className="page-title">Timeline Rapat & Kegiatan</h1>
                <p className="page-subtitle">Riwayat rapat, kegiatan, dan event CSC</p>

                <div className="stats-grid">
                    {TYPES.map(t => {
                        const count = items.filter(i => i.type === t.value).length
                        return (
                            <div key={t.value} className="stat-card" style={{ borderLeft: `3px solid ${t.color}` }}>
                                <div>
                                    <div className="stat-value" style={{ color: t.color, fontSize: '1.5rem' }}>{count}</div>
                                    <div className="stat-label">{t.icon} {t.label}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        {/* View Mode Toggle */}
                        <div style={{ display: 'flex', gap: 2, background: 'var(--color-surface-tertiary)', borderRadius: 8, padding: 2 }}>
                            <button
                                className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('calendar')}
                                style={{ borderRadius: 6 }}
                            ><Calendar size={14} /> Kalender</button>
                            <button
                                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('list')}
                                style={{ borderRadius: 6 }}
                            ><List size={14} /> List</button>
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                            <button className={`btn ${filterType === '' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilterType('')}>Semua</button>
                            {TYPES.map(t => <button key={t.value} className={`btn ${filterType === t.value ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilterType(t.value)}>{t.icon} {t.label}</button>)}
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Timeline_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Timeline Rapat & Kegiatan CSC', subtitle: `Total: ${filtered.length} entri`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', description: '', type: 'meeting', event_date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', location: '', created_by: '', attendees_text: '', decisions: '', notes: '' }); setShowModal(true) }}>
                                    <Plus size={16} /> Tambah Entri
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* CALENDAR VIEW */}
                {viewMode === 'calendar' && (
                    <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 360px' : '1fr', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1.25rem' }}>
                            {/* Calendar Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) }
                                    else setCalendarMonth(m => m - 1)
                                }}><ChevronLeft size={18} /></button>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                                </h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) }
                                    else setCalendarMonth(m => m + 1)
                                }}><ChevronRight size={18} /></button>
                            </div>

                            {/* Day headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                                {DAY_NAMES.map(d => (
                                    <div key={d} style={{
                                        textAlign: 'center', padding: '0.5rem',
                                        fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8',
                                        textTransform: 'uppercase',
                                    }}>{d}</div>
                                ))}

                                {/* Calendar Cells */}
                                {calendarDays.map((day, idx) => {
                                    if (day === null) return <div key={`empty-${idx}`} style={{ minHeight: 80 }} />
                                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const dayEvents = getEventsForDate(day)
                                    const isToday = dateStr === todayStr
                                    const isSelected = dateStr === selectedDate

                                    return (
                                        <div
                                            key={day}
                                            onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                            style={{
                                                minHeight: 80, padding: '0.375rem',
                                                border: isSelected ? '2px solid #6d28d9' : '1px solid var(--color-border-primary)',
                                                borderRadius: 8, cursor: 'pointer',
                                                background: isSelected ? '#f5f3ff' : isToday ? '#fefce8' : 'white',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{
                                                fontSize: '0.8125rem', fontWeight: isToday ? 700 : 500,
                                                color: isToday ? '#dc2626' : '#374151',
                                                marginBottom: 2,
                                            }}>{day}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {dayEvents.slice(0, 3).map((ev: any) => {
                                                    const typeInfo = TYPES.find(t => t.value === ev.type)
                                                    return (
                                                        <div key={ev.id} style={{
                                                            padding: '1px 4px', borderRadius: 4,
                                                            fontSize: '0.625rem', fontWeight: 500,
                                                            background: `${typeInfo?.color || '#6b7280'}20`,
                                                            color: typeInfo?.color || '#6b7280',
                                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            borderLeft: `2px solid ${typeInfo?.color || '#6b7280'}`,
                                                        }}>
                                                            {ev.title}
                                                        </div>
                                                    )
                                                })}
                                                {dayEvents.length > 3 && (
                                                    <div style={{ fontSize: '0.625rem', color: '#94a3b8', paddingLeft: 4 }}>
                                                        +{dayEvents.length - 3} lagi
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {TYPES.map(t => (
                                    <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color }} />
                                        <span style={{ color: '#64748b' }}>{t.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Selected Date Detail Panel */}
                        {selectedDate && (
                            <div className="card" style={{ padding: '1rem', maxHeight: 600, overflow: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                                        {formatDateShort(selectedDate)}
                                    </h4>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(null)}><X size={14} /></button>
                                </div>
                                {selectedDateEvents.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', padding: '2rem 0' }}>Tidak ada kegiatan</p>
                                ) : selectedDateEvents.map((ev: any) => {
                                    const typeInfo = TYPES.find(t => t.value === ev.type)
                                    return (
                                        <div key={ev.id} style={{
                                            padding: '0.75rem', borderRadius: 8,
                                            border: '1px solid var(--color-border-primary)',
                                            marginBottom: '0.5rem',
                                            borderLeft: `3px solid ${typeInfo?.color || '#6b7280'}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <span style={{ fontSize: '1rem' }}>{typeInfo?.icon}</span>
                                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ev.title}</span>
                                            </div>
                                            <span className="badge" style={{ background: `${typeInfo?.color}15`, color: typeInfo?.color, fontSize: '0.6875rem', marginBottom: 4 }}>{typeInfo?.label}</span>
                                            {ev.start_time && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>🕐 {ev.start_time.slice(0, 5)}{ev.end_time ? ` - ${ev.end_time.slice(0, 5)}` : ''}</div>}
                                            {ev.location && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📍 {ev.location}</div>}
                                            {ev.description && <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 4 }}>{ev.description}</p>}
                                            {(canCreate || canDelete) && (
                                                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.6875rem' }} onClick={() => { setForm({ title: ev.title, description: ev.description || '', type: ev.type, event_date: ev.event_date, start_time: ev.start_time || '', end_time: ev.end_time || '', location: ev.location || '', created_by: ev.created_by || '', attendees_text: ev.attendees_text || '', decisions: ev.decisions || '', notes: ev.notes || '' }); setEditId(ev.id); setShowModal(true) }}>Edit</button>
                                                    {canDelete && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', fontSize: '0.6875rem' }} onClick={() => handleDelete(ev.id)}>Hapus</button>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    loading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Memuat...</p> :
                        Object.keys(grouped).length === 0 ? <div className="card"><div className="empty-state"><Clock size={48} /><h3>Belum ada entri timeline</h3><p>Tambahkan rapat atau kegiatan pertama.</p></div></div> :
                            Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([monthKey, monthItems]) => {
                                const [year, month] = monthKey.split('-')
                                return (
                                    <div key={monthKey} style={{ marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                            <CalendarDays size={18} style={{ color: '#dc2626' }} />
                                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#991b1b' }}>{MONTH_NAMES[parseInt(month) - 1]} {year}</h2>
                                            <span className="badge badge-default">{monthItems.length} entri</span>
                                        </div>
                                        <div className="timeline">
                                            {(monthItems as any[]).map((item: any) => {
                                                const typeInfo = TYPES.find(t => t.value === item.type)!
                                                return (
                                                    <div key={item.id} className={`timeline-item ${item.type}`}>
                                                        <div className="timeline-date">{formatDateShort(item.event_date)} {item.start_time && `· ${item.start_time.slice(0, 5)}`}{item.end_time && ` - ${item.end_time.slice(0, 5)}`}</div>
                                                        <div className="timeline-card">
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span style={{ fontSize: '1.125rem' }}>{typeInfo.icon}</span>
                                                                    <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.title}</h3>
                                                                </div>
                                                                <span className="badge" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>{typeInfo.label}</span>
                                                            </div>
                                                            {item.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '0.5rem' }}>{item.description}</p>}
                                                            {item.location && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>📍 {item.location}</div>}
                                                            {item.attendees_text && (
                                                                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--color-surface-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                                                                    <strong>Peserta:</strong> {item.attendees_text}
                                                                </div>
                                                            )}
                                                            {item.decisions && (
                                                                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #dc2626' }}>
                                                                    <strong>Keputusan:</strong> {item.decisions}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border-primary)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                                                    {item.creator && <><div className="avatar avatar-sm">{getInitials(item.creator.full_name)}</div><span>{item.creator.full_name}</span></>}
                                                                </div>
                                                                {canCreate && (
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ title: item.title, description: item.description || '', type: item.type, event_date: item.event_date, start_time: item.start_time || '', end_time: item.end_time || '', location: item.location || '', created_by: item.created_by || '', attendees_text: item.attendees_text || '', decisions: item.decisions || '', notes: item.notes || '' }); setEditId(item.id); setShowModal(true) }}>Edit</button>
                                                                        {canDelete && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(item.id)}>Hapus</button>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })
                )}

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={items} matchFields={['title', 'event_date']} title="Import Timeline" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Entri Timeline</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="cth: Rapat Mingguan, Workshop AI..." /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Tipe *</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Tanggal *</label><input className="form-input" type="date" required value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Jam Mulai</label><input className="form-input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Jam Selesai</label><input className="form-input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Lokasi</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi rapat/kegiatan..." /></div>
                                <div className="form-group"><label className="form-label">Peserta</label><input className="form-input" value={form.attendees_text} onChange={e => setForm({ ...form, attendees_text: e.target.value })} placeholder="cth: Seluruh staf, Bidang Operating, dll" /></div>
                                <div className="form-group"><label className="form-label">Keputusan/Hasil</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={form.decisions} onChange={e => setForm({ ...form, decisions: e.target.value })} placeholder="Keputusan atau hasil dari rapat/kegiatan..." /></div>
                                <div className="form-group"><label className="form-label">Catatan</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

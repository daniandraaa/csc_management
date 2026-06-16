'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { formatDateShort, getInitials } from '@/lib/utils'
import { Clock, Plus, X, CalendarDays, Upload, FileText, Download, ChevronLeft, ChevronRight, List, Calendar, ClipboardList, Users, Link2, ExternalLink, Sparkles } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { useRouter, useSearchParams } from 'next/navigation'
import { exportToPdf, exportToCsv } from '@/lib/export'

const TYPES = [
    { value: 'meeting', label: 'Rapat', icon: '📋', color: '#dc2626' },
    { value: 'activity', label: 'Kegiatan', icon: '🎯', color: '#f59e0b' },
    { value: 'event', label: 'Event', icon: '🎉', color: '#3b82f6' },
    { value: 'invitation', label: 'Undangan', icon: '✉️', color: '#10b981' },
    { value: 'announcement', label: 'Pengumuman', icon: '📢', color: '#8b5cf6' },
    { value: 'admin_deadline', label: 'Deadline Admin', icon: '📄', color: '#ec4899' },
]

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul', required: true },
    { key: 'type', label: 'Tipe (meeting/activity/event/announcement)', required: true },
    { key: 'event_date', label: 'Tanggal Mulai', required: true },
    { key: 'end_date', label: 'Tanggal Berakhir' },
    { key: 'is_full_day', label: 'Full Day (true/false)' },
    { key: 'description', label: 'Deskripsi' },
    { key: 'location', label: 'Lokasi' },
    { key: 'start_time', label: 'Jam Mulai' },
    { key: 'end_time', label: 'Jam Selesai' },
    { key: 'attendees_text', label: 'Peserta' },
    { key: 'decisions', label: 'Keputusan' },
    { key: 'decision_link', label: 'Link Keputusan' },
]
const PDF_COLUMNS = [
    { header: 'Tanggal', key: 'event_date' },
    { header: 'Sampai', key: 'end_date' },
    { header: 'Judul', key: 'title' },
    { header: 'Tipe', key: 'type' },
    { header: 'Lokasi', key: 'location' },
    { header: 'Dibuat Oleh', key: '_creator' },
]

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function TimelinePage() {
    const { currentUser } = useCurrentUser()
    const router = useRouter()
    const searchParams = useSearchParams()
    const targetDate = searchParams.get('date')
    const [items, setItems] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [invitations, setInvitations] = useState<any[]>([])
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
        title: '', description: '', type: 'meeting', event_date: '', end_date: '', is_full_day: false,
        start_time: '', end_time: '', location: '', created_by: '', attendees_text: '', decisions: '', decision_link: '', notes: ''
    })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/timeline', 'create')
    const canDelete = canPerformAction(currentUser, '/timeline', 'delete')

    useEffect(() => { loadData() }, [])
    
    useEffect(() => {
        if (targetDate) {
            const date = new Date(targetDate)
            if (!isNaN(date.getTime())) {
                setCalendarMonth(date.getMonth())
                setCalendarYear(date.getFullYear())
                setSelectedDate(targetDate)
                setViewMode('calendar')
            }
        }
    }, [targetDate])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('timeline_entries').select('*, creator:members!timeline_entries_created_by_fkey(full_name,role)').order('event_date', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name,role')
        const { data: p } = await supabase.from('programs').select('*').not('start_date', 'is', null)
        const { data: i } = await supabase.from('guest_invitations').select('*').not('event_date', 'is', null)
        setItems(data || []); setMembers(m || []); setPrograms(p || []); setInvitations(i || [])
        // Fetch admin deadlines
        const { data: ad } = await supabase.from('admin_reviews').select('id, title, deadline, doc_type, admin_status').not('deadline', 'is', null)
        const adminDeadlines = (ad || []).map((a: any) => ({
            id: `admin-${a.id}`, title: `📄 ${a.doc_type || 'Dokumen'}: ${a.title}`,
            type: 'admin_deadline', event_date: a.deadline, end_date: a.deadline,
            description: `Deadline administrasi - Status: ${a.admin_status}`, _isAdminDeadline: true,
        }))
        setInvitations(i || []); setItems([...(data || []), ...adminDeadlines])
        setLoading(false)
    }

    const emptyForm = {
        title: '', description: '', type: 'meeting', event_date: '', end_date: '', is_full_day: false,
        start_time: '', end_time: '', location: '', created_by: '', attendees_text: '', decisions: '', decision_link: '', notes: ''
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            const { creator, ...cleanForm } = form as any
            const payload = {
                ...cleanForm,
                created_by: form.created_by || currentUser?.id || null,
                start_time: form.is_full_day ? null : (form.start_time || null),
                end_time: form.is_full_day ? null : (form.end_time || null),
                event_date: form.event_date || new Date().toISOString().split('T')[0],
                end_date: form.end_date || null,
                is_full_day: form.is_full_day,
            }
            
            let error;
            if (editId) { 
                const res = await supabase.from('timeline_entries').update(payload).eq('id', editId)
                error = res.error
            } else { 
                const res = await supabase.from('timeline_entries').insert(payload)
                error = res.error
            }
            
            if (error) throw error
            
            setShowModal(false); setEditId(null)
            setForm(emptyForm)
            loadData()
            alert(editId ? 'Entri berhasil diperbarui' : 'Entri berhasil ditambahkan')
        } catch (err: any) {
            console.error('Error saving timeline entry:', err)
            alert('Gagal menyimpan entri: ' + (err.message || 'Terjadi kesalahan internal'))
        }
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, type: r.type || 'meeting', event_date: r.event_date || new Date().toISOString().split('T')[0], description: r.description || null, location: r.location || null, start_time: r.start_time || null, end_time: r.end_time || null, attendees_text: r.attendees_text || null, decisions: r.decisions || null }))
        await supabase.from('timeline_entries').insert(payload)
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus entri?')) { await supabase.from('timeline_entries').delete().eq('id', id); loadData() }
    }

    const exportData = items.map((i: any) => ({ ...i, _creator: i.creator?.full_name || '-' }))

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
        return filtered.filter(i => {
            const start = i.event_date
            const end = i.end_date || i.event_date
            return dateStr >= start && dateStr <= end
        }).sort((a, b) => {
            if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
            const aEnd = a.end_date || a.event_date
            const bEnd = b.end_date || b.event_date
            if (aEnd !== bEnd) return bEnd.localeCompare(aEnd) // Longer events first
            return a.title.localeCompare(b.title)
        })
    }

    const calendarDays = getCalendarDays()
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Unified list of all events (Timeline + Programs + Invitations)
    const allEventsRaw = [
        ...items,
        ...programs.filter(p => p.start_date).map(p => ({
            id: `prog-${p.id}`,
            title: p.name,
            type: 'activity',
            event_date: p.start_date,
            end_date: p.end_date || p.start_date,
            description: p.description,
            _isProgram: true,
        })),
        ...invitations.filter(inv => inv.event_date).map(inv => ({
            id: `inv-${inv.id}`,
            title: inv.event_name,
            type: 'invitation',
            event_date: inv.event_date,
            end_date: inv.event_date,
            description: inv.description || inv.notes,
            location: inv.event_location,
            _isInvitation: true,
        }))
    ]

    // Remove any duplicates by ID
    const allEvents = Array.from(new Map(allEventsRaw.map(item => [item.id, item])).values())

    const filtered = allEvents.filter(i => !filterType || i.type === filterType)

    // Selected date events
    const selectedDateEvents = selectedDate ? filtered.filter(i => {
        const start = i.event_date
        const end = i.end_date || i.event_date
        return selectedDate >= start && selectedDate <= end
    }) : []

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
                        const count = allEvents.filter(i => i.type === t.value).length
                        return (
                            <div key={t.value} className="stat-card" style={{
                                borderLeft: `4px solid ${t.color}`,
                                background: `linear-gradient(135deg, white 0%, ${t.color}05 100%)`,
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: `${t.color}08` }} />
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ color: t.color, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t.label}</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                                        {count}
                                    </div>
                                </div>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${t.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', position: 'relative', zIndex: 1 }}>{t.icon}</div>
                            </div>
                        )
                    })}
                </div>

                <div className="toolbar timeline-toolbar">
                    <div className="toolbar-left">
                        {/* View Mode Toggle */}
                        <div className="view-mode-toggle">
                            <button
                                className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('calendar')}
                            ><Calendar size={14} /> <span className="hidden sm:inline">Kalender</span></button>
                            <button
                                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('list')}
                            ><List size={14} /> <span className="hidden sm:inline">List View</span></button>
                        </div>
                        
                        <div className="toolbar-separator hidden lg:block" />

                        <div className="filter-group">
                            <button 
                                className={`btn btn-sm ${filterType === '' ? 'btn-primary' : 'btn-ghost'}`} 
                                onClick={() => setFilterType('')}
                            >Semua</button>
                            {TYPES.map(t => (
                                <button 
                                    key={t.value} 
                                    className={`btn btn-sm ${filterType === t.value ? 'btn-primary' : 'btn-ghost'}`} 
                                    onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
                                    title={t.label}
                                >
                                    <span>{t.icon}</span> <span className="hidden lg:inline">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm hidden md:flex" style={{ borderRadius: 8 }} onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import</button>
                                <button className="btn btn-primary btn-sm" style={{ borderRadius: 8, padding: '0.5rem 1rem' }} onClick={() => { setEditId(null); setForm({ ...emptyForm, event_date: new Date().toISOString().split('T')[0] }); setShowModal(true) }}>
                                    <Plus size={16} /> <span className="hidden sm:inline">Tambah</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CALENDAR VIEW */}
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="card lg:col-span-2 calendar-card">
                            {/* Calendar Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', minWidth: '600px' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) }
                                    else setCalendarMonth(m => m - 1)
                                }}><ChevronLeft size={18} /></button>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                        {MONTH_NAMES[calendarMonth]} {calendarYear}
                                    </h3>
                                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 2 }}>
                                        {items.filter(i => {
                                            const d = new Date(i.event_date)
                                            return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear
                                        }).length} kegiatan bulan ini
                                    </p>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) }
                                    else setCalendarMonth(m => m + 1)
                                }}><ChevronRight size={18} /></button>
                            </div>

                            {/* Day headers */}
                            <div className="calendar-grid">
                                {DAY_NAMES.map(d => (
                                    <div key={d} className={`calendar-day-header ${d === 'Min' ? 'sunday' : ''}`}>{d}</div>
                                ))}

                                {/* Calendar Cells */}
                                {calendarDays.map((day, idx) => {
                                    if (day === null) return <div key={`empty-${idx}`} style={{ minHeight: 80 }} />
                                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const dayEvents = getEventsForDate(day)
                                    const isToday = dateStr === todayStr
                                    const isSelected = dateStr === selectedDate
                                    const isSunday = new Date(calendarYear, calendarMonth, day).getDay() === 0
                                    const hasEvents = dayEvents.length > 0

                                    return (
                                        <div
                                            key={day}
                                            onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                            style={{
                                                minHeight: 90, padding: '0.4rem',
                                                border: isSelected ? '2px solid #6d28d9' : isToday ? '2px solid #e11d48' : '1px solid var(--color-border-primary)',
                                                borderRadius: 12, cursor: 'pointer',
                                                background: isSelected ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : isToday ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' : hasEvents ? '#fafbff' : 'white',
                                                transition: 'all 0.2s ease',
                                                position: 'relative',
                                                boxShadow: isSelected ? '0 4px 12px rgba(109, 40, 217, 0.15)' : isToday ? '0 4px 12px rgba(225, 29, 72, 0.1)' : 'none',
                                                display: 'flex', flexDirection: 'column'
                                            }}
                                        >
                                            {/* Day Number */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <div style={{
                                                    fontSize: '0.8125rem', fontWeight: isToday ? 800 : 600,
                                                    color: isToday ? 'white' : isSunday ? '#ef4444' : '#374151',
                                                    width: isToday ? 24 : 'auto', height: isToday ? 24 : 'auto',
                                                    borderRadius: '50%',
                                                    background: isToday ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'none',
                                                    display: isToday ? 'flex' : 'block',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: isToday ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none',
                                                }}>{day}</div>
                                                {dayEvents.length > 0 && (
                                                    <div style={{
                                                        width: 14, height: 14, borderRadius: '50%',
                                                        background: dayEvents.length >= 3 ? '#e11d48' : dayEvents.length >= 2 ? '#6d28d9' : '#94a3b8',
                                                        color: 'white', fontSize: '0.625rem', fontWeight: 800,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>{dayEvents.length}</div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                                                {dayEvents.slice(0, 3).map((ev: any) => {
                                                    const typeInfo = TYPES.find(t => t.value === ev.type)
                                                    const isStart = ev.event_date === dateStr
                                                    return (
                                                        <div key={`${ev.id}-${dateStr}`} style={{
                                                            padding: '1px 4px',
                                                            borderRadius: 3,
                                                            fontSize: '0.625rem', fontWeight: 700,
                                                            background: isStart ? `${typeInfo?.color || '#6b7280'}15` : 'transparent',
                                                            color: typeInfo?.color || '#6b7280',
                                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            borderLeft: isStart ? `2px solid ${typeInfo?.color || '#6b7280'}` : 'none',
                                                            display: 'flex', alignItems: 'center', gap: 2,
                                                            height: 16,
                                                        }}>
                                                            <span style={{ opacity: isStart ? 1 : 0.6 }}>{ev.title}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Legend with counts */}
                            <div className="calendar-legend">
                                {TYPES.map(t => {
                                    const count = allEvents.filter(i => i.type === t.value).length
                                    return (
                                        <div key={t.value} className={`legend-item ${filterType === t.value ? 'active' : ''}`} 
                                            style={{ '--type-color': t.color } as any}
                                            onClick={() => setFilterType(filterType === t.value ? '' : t.value)}>
                                            <div className="legend-dot" style={{ background: t.color }} />
                                            <span className="legend-label">{t.label}</span>
                                            <span className="legend-count">({count})</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Selected Date Detail Panel */}
                        {selectedDate && (
                            <div className="card selected-date-panel">
                                {/* Panel Header */}
                                <div className="panel-header">
                                    <div>
                                        <h4 className="panel-title">
                                            📅 {formatDateShort(selectedDate)}
                                        </h4>
                                        <p className="panel-subtitle">
                                            {['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(selectedDate).getDay()]}
                                            {' · '}{selectedDateEvents.length} kegiatan
                                        </p>
                                    </div>
                                    <button className="btn btn-ghost btn-sm close-panel" onClick={() => setSelectedDate(null)} style={{ color: 'white' }}><X size={16} /></button>
                                </div>
                                <div className="panel-body">
                                {selectedDateEvents.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Tidak ada kegiatan</p>
                                    </div>
                                ) : selectedDateEvents.map((ev: any) => {
                                    const typeInfo = TYPES.find(t => t.value === ev.type)
                                    return (
                                        <div key={ev.id} style={{
                                            padding: '0.875rem', borderRadius: 12,
                                            border: '1px solid var(--color-border-primary)',
                                            marginBottom: '0.625rem',
                                            borderLeft: `4px solid ${typeInfo?.color || '#6b7280'}`,
                                            background: `linear-gradient(135deg, white 0%, ${typeInfo?.color || '#6b7280'}04 100%)`,
                                            transition: 'all 0.2s ease',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
                                                <span style={{ fontSize: '1rem' }}>{typeInfo?.icon}</span>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', flex: 1 }}>{ev.title}</div>
                                                <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: `${typeInfo?.color}15`, color: typeInfo?.color }}>{typeInfo?.label}</span>
                                            </div>
                                            {ev.is_full_day ? <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Full Day</div> : ev.start_time && <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {ev.start_time.slice(0, 5)}{ev.end_time ? ` - ${ev.end_time.slice(0, 5)}` : ''}</div>}
                                            {ev.location && <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>📍 {ev.location}</div>}
                                            {ev.description && <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6, lineHeight: 1.5 }}>{ev.description}</p>}
                                            {ev.decisions && (
                                                <div style={{ marginTop: 6, padding: '0.5rem 0.625rem', background: '#fff1f2', borderRadius: 8, fontSize: '0.75rem', color: '#9f1239', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                                    <ClipboardList size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                                                    <span>{ev.decisions}</span>
                                                </div>
                                            )}
                                            {ev.decision_link && (
                                                <a href={ev.decision_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.75rem', color: '#6d28d9', fontWeight: 600, textDecoration: 'none', padding: '4px 8px', background: '#f5f3ff', borderRadius: 6, transition: 'all 0.15s' }}>
                                                    <Link2 size={12} /> Dokumen Keputusan <ExternalLink size={10} />
                                                </a>
                                            )}
                                            {(canCreate || canDelete) && !ev._isProgram && (
                                                <div style={{ display: 'flex', gap: 4, marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.6875rem' }} onClick={() => { setForm({ ...ev, end_date: ev.end_date || '', attendees_text: ev.attendees_text || '', decisions: ev.decisions || '', decision_link: ev.decision_link || '', notes: ev.notes || '' }); setEditId(ev.id); setShowModal(true) }}>Edit</button>
                                                    {canDelete && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', fontSize: '0.6875rem' }} onClick={() => handleDelete(ev.id)}>Hapus</button>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    loading ? <p style={{ textAlign: 'center', padding: '3rem' }}>Memuat data timeline...</p> :
                        Object.keys(grouped).length === 0 ? <div className="card"><div className="empty-state"><Clock size={48} /><h3>Belum ada entri timeline</h3><p>Tambahkan rapat atau kegiatan pertama Anda.</p></div></div> :
                            <div className="timeline-list-container">
                                {/* Main Timeline Line */}
                                <div className="timeline-vertical-line" />
                                
                                {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([monthKey, monthItems]) => {
                                    const [year, month] = monthKey.split('-')
                                    return (
                                        <div key={monthKey} style={{ marginBottom: '3rem' }}>
                                            {/* Month Header */}
                                            <div style={{ 
                                                position: 'relative', marginBottom: '1.5rem', 
                                                display: 'flex', alignItems: 'center', gap: '1rem' 
                                            }}>
                                                <div style={{ 
                                                    position: 'absolute', left: '-2.05rem', 
                                                    width: '12px', height: '12px', borderRadius: '50%', 
                                                    background: 'white', border: '3px solid #e11d48',
                                                    zIndex: 2, boxShadow: '0 0 0 4px rgba(225, 29, 72, 0.1)'
                                                }} />
                                                <h2 style={{ 
                                                    fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', 
                                                    letterSpacing: '-0.02em', background: '#f8fafc', paddingRight: '1rem'
                                                }}>
                                                    {MONTH_NAMES[parseInt(month) - 1]} {year}
                                                </h2>
                                                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                {(monthItems as any[]).map((item: any) => {
                                                    const typeInfo = TYPES.find(t => t.value === item.type)!
                                                    return (
                                                        <div key={item.id} className="timeline-item" style={{ position: 'relative' }}>
                                                            {/* Day Circle */}
                                                            <div style={{ 
                                                                position: 'absolute', left: '-2rem', top: '1rem',
                                                                width: '8px', height: '8px', borderRadius: '50%',
                                                                background: typeInfo.color, zIndex: 1
                                                            }} />
                                                            
                                                            <div className="card" style={{ 
                                                                padding: '1.25rem', borderLeft: `4px solid ${typeInfo.color}`,
                                                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                                cursor: 'default'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                                                            {formatDateShort(item.event_date)}
                                                                            {item.end_date && item.end_date !== item.event_date && ` — ${formatDateShort(item.end_date)}`}
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                                            <span style={{ fontSize: '1.25rem' }}>{typeInfo.icon}</span>
                                                                            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{item.title}</h3>
                                                                        </div>
                                                                    </div>
                                                                    <span className="badge" style={{ background: `${typeInfo.color}10`, color: typeInfo.color, fontWeight: 700, fontSize: '0.6875rem' }}>{typeInfo.label}</span>
                                                                </div>

                                                                {item.description && <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1rem' }}>{item.description}</p>}
                                                                
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                                                                        <Clock size={14} style={{ color: '#94a3b8' }} />
                                                                        <span style={{ fontWeight: 500 }}>{item.is_full_day ? 'Full Day' : <>{item.start_time?.slice(0, 5) || '--:--'}{item.end_time && ` - ${item.end_time.slice(0, 5)}`}</>}</span>
                                                                    </div>
                                                                    {item.location && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                                                                            <span style={{ fontSize: '1rem' }}>📍</span>
                                                                            <span style={{ fontWeight: 500 }}>{item.location}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {item.attendees_text && (
                                                                    <div style={{ marginBottom: '1rem' }}>
                                                                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <Users size={12} /> Peserta
                                                                        </div>
                                                                        <p style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 500 }}>{item.attendees_text}</p>
                                                                    </div>
                                                                )}

                                                                {item.decisions && (
                                                                    <div style={{ 
                                                                        padding: '0.875rem', background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%)', 
                                                                        borderRadius: 12, border: '1px solid #fecdd3',
                                                                        marginBottom: '1rem'
                                                                    }}>
                                                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <ClipboardList size={12} /> Keputusan Utama
                                                                        </div>
                                                                        <p style={{ fontSize: '0.8125rem', color: '#9f1239', fontWeight: 500 }}>{item.decisions}</p>
                                                                    </div>
                                                                )}

                                                                {item.decision_link && (
                                                                    <a href={item.decision_link} target="_blank" rel="noopener noreferrer" style={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                        padding: '0.625rem 1rem', borderRadius: 10, marginBottom: '1rem',
                                                                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                                                                        border: '1px solid #ddd6fe', color: '#6d28d9',
                                                                        fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none',
                                                                        transition: 'all 0.2s ease',
                                                                    }}>
                                                                        <Link2 size={14} /> Lihat Dokumen Keputusan <ExternalLink size={12} />
                                                                    </a>
                                                                )}

                                                                {item.notes && (
                                                                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 10, borderLeft: '3px solid #e2e8f0' }}>
                                                                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Catatan Tambahan</div>
                                                                        <p style={{ fontSize: '0.8125rem', color: '#475569', fontStyle: 'italic' }}>"{item.notes}"</p>
                                                                    </div>
                                                                )}

                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        {item.creator && (
                                                                            <>
                                                                                <div style={{ 
                                                                                    width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    fontSize: '0.625rem', fontWeight: 700, color: '#475569'
                                                                                }}>{getInitials(item.creator.full_name)}</div>
                                                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{item.creator.full_name}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        {canCreate && !item._isProgram && (
                                                                            <>
                                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => { setForm({ title: item.title, description: item.description || '', type: item.type, event_date: item.event_date, end_date: item.end_date || '', is_full_day: item.is_full_day || false, start_time: item.start_time || '', end_time: item.end_time || '', location: item.location || '', created_by: item.created_by || '', attendees_text: item.attendees_text || '', decisions: item.decisions || '', decision_link: item.decision_link || '', notes: item.notes || '' }); setEditId(item.id); setShowModal(true) }}>Edit</button>
                                                                                {canDelete && <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: '0.75rem' }} onClick={() => handleDelete(item.id)}>Hapus</button>}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
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
                                    <div className="form-group"><label className="form-label">Lokasi</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="cth: Ruang Meeting, Online via Zoom" /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Tanggal Mulai *</label><input className="form-input" type="date" required value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tanggal Berakhir</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} min={form.event_date} /><p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 2 }}>Kosongkan jika hanya 1 hari</p></div>
                                </div>
                                {/* Full Day Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: form.is_full_day ? '#f0fdf4' : '#f8fafc', borderRadius: 10, border: `1px solid ${form.is_full_day ? '#86efac' : '#e2e8f0'}`, marginBottom: '0.25rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setForm({ ...form, is_full_day: !form.is_full_day })}>
                                    <div style={{ width: 40, height: 22, borderRadius: 11, background: form.is_full_day ? '#22c55e' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: form.is_full_day ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: form.is_full_day ? '#15803d' : '#374151' }}>Full Day (Seharian)</div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{form.is_full_day ? 'Kegiatan berlangsung seharian penuh' : 'Atur jam mulai dan jam selesai'}</div>
                                    </div>
                                </div>
                                {/* Time inputs - only show when NOT full day */}
                                {!form.is_full_day && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Jam Mulai</label><input className="form-input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Jam Selesai</label><input className="form-input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
                                    </div>
                                )}
                                <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi rapat/kegiatan..." /></div>
                                <div className="form-group"><label className="form-label">Peserta</label><input className="form-input" value={form.attendees_text} onChange={e => setForm({ ...form, attendees_text: e.target.value })} placeholder="cth: Seluruh staf, Bidang Operating, dll" /></div>
                                <div className="form-group"><label className="form-label">Keputusan/Hasil</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={form.decisions} onChange={e => setForm({ ...form, decisions: e.target.value })} placeholder="Keputusan atau hasil dari rapat/kegiatan..." /></div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Link2 size={14} color="#6d28d9" /> Link Dokumen Keputusan
                                    </label>
                                    <input className="form-input" type="url" value={form.decision_link} onChange={e => setForm({ ...form, decision_link: e.target.value })} placeholder="https://docs.google.com/... atau link lainnya" style={{ borderColor: form.decision_link ? '#6d28d9' : undefined }} />
                                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 4 }}>Upload link Google Docs, Notion, atau dokumen hasil keputusan rapat</p>
                                </div>
                                <div className="form-group"><label className="form-label">Catatan</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

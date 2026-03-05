'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'
import { CalendarCheck, Plus, X, Users, Upload, FileText, Download, QrCode, Link2, RefreshCw } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'title', label: 'Judul Event', required: true },
    { key: 'event_date', label: 'Tanggal', required: true },
    { key: 'description', label: 'Deskripsi' },
    { key: 'location', label: 'Lokasi' },
    { key: 'type', label: 'Tipe (general/meeting/training/social/other)' },
    { key: 'start_time', label: 'Jam Mulai' },
    { key: 'end_time', label: 'Jam Selesai' },
]
const PDF_COLUMNS = [
    { header: 'Judul', key: 'title' },
    { header: 'Tanggal', key: 'event_date' },
    { header: 'Tipe', key: 'type' },
    { header: 'Lokasi', key: 'location' },
    { header: 'Hadir', key: '_present' },
    { header: 'Total', key: '_total' },
]

export default function AttendancePage() {
    const { currentUser } = useCurrentUser()
    const [events, setEvents] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [showAttendees, setShowAttendees] = useState<string | null>(null)
    const [attendees, setAttendees] = useState<any[]>([])
    const [showGenerate, setShowGenerate] = useState(false)
    const [timelineEvents, setTimelineEvents] = useState<any[]>([])
    const [form, setForm] = useState({ title: '', description: '', event_date: '', start_time: '', end_time: '', location: '', type: 'general' })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/hr/attendance', 'create')
    const canApprove = canPerformAction(currentUser, '/hr/attendance', 'approve')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name,department,role').neq('role', 'Business Partner').order('full_name')
        setEvents(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, start_time: form.start_time || null, end_time: form.end_time || null }
        if (editId) { await supabase.from('events').update(payload).eq('id', editId) }
        else { await supabase.from('events').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ title: '', description: '', event_date: '', start_time: '', end_time: '', location: '', type: 'general' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ title: r.title, event_date: r.event_date, description: r.description || null, location: r.location || null, type: r.type || 'general', start_time: r.start_time || null, end_time: r.end_time || null }))
        await supabase.from('events').insert(payload)
    }

    async function loadAttendees(eventId: string) {
        const { data } = await supabase.from('event_attendees').select('*, member:members(id,full_name,department)').eq('event_id', eventId)
        setAttendees(data || []); setShowAttendees(eventId)
    }

    async function addAttendee(eventId: string, memberId: string) {
        await supabase.from('event_attendees').insert({ event_id: eventId, member_id: memberId })
        loadAttendees(eventId)
    }

    async function addAllMembers(eventId: string) {
        const existing = attendees.map(a => a.member_id)
        const toAdd = members.filter(m => !existing.includes(m.id))
        if (toAdd.length > 0) {
            await supabase.from('event_attendees').insert(toAdd.map(m => ({ event_id: eventId, member_id: m.id })))
            loadAttendees(eventId)
        }
    }

    async function updateAttendeeStatus(id: string, status: string) {
        await supabase.from('event_attendees').update({ status, check_in_time: status === 'present' ? new Date().toISOString() : null }).eq('id', id)
        if (showAttendees) loadAttendees(showAttendees)
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus event?')) { await supabase.from('events').delete().eq('id', id); loadData() }
    }

    // Generate from Timeline
    async function loadTimelineForGenerate() {
        const { data } = await supabase.from('timeline_entries')
            .select('*')
            .in('type', ['meeting', 'activity', 'event'])
            .order('event_date', { ascending: false })
            .limit(20)
        setTimelineEvents(data || [])
        setShowGenerate(true)
    }

    async function generateFromTimeline(entry: any) {
        // Check if event already exists for this date + title
        const { data: existing } = await supabase.from('events')
            .select('id').eq('title', entry.title).eq('event_date', entry.event_date)
        if (existing && existing.length > 0) {
            alert('Event dengan judul dan tanggal ini sudah ada!')
            return
        }
        await supabase.from('events').insert({
            title: entry.title,
            description: entry.description,
            event_date: entry.event_date,
            start_time: entry.start_time,
            end_time: entry.end_time,
            location: entry.location,
            type: entry.type === 'meeting' ? 'meeting' : entry.type === 'activity' ? 'training' : 'general',
        })
        loadData()
        alert(`Event "${entry.title}" berhasil dibuat!`)
    }

    function getCheckInLink(eventId: string) {
        return `${window.location.origin}/check-in?event=${eventId}`
    }

    const typeLabels: Record<string, string> = { general: 'Umum', meeting: 'Rapat', training: 'Pelatihan', social: 'Sosial', other: 'Lainnya' }
    const exportData = events.map((ev: any) => ({ ...ev, _time: `${ev.start_time?.slice(0, 5) || ''} - ${ev.end_time?.slice(0, 5) || ''}`, _present: '—', _total: '—' }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Kehadiran & Event</div></div>
            <div className="page-container">
                <h1 className="page-title">Kehadiran & Event</h1>
                <p className="page-subtitle">Kelola event dan absensi kehadiran anggota</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        {canCreate && (
                            <button className="btn btn-secondary btn-sm" onClick={loadTimelineForGenerate}>
                                <RefreshCw size={14} /> Generate dari Timeline
                            </button>
                        )}
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Event_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Event CSC', subtitle: `Total: ${events.length} event`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ title: '', description: '', event_date: '', start_time: '', end_time: '', location: '', type: 'general' }); setShowModal(true) }}>
                                    <Plus size={16} /> Tambah Event
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : events.length === 0 ? <div className="card"><div className="empty-state"><CalendarCheck size={48} /><h3>Belum ada event</h3></div></div> :
                        events.map((ev: any) => (
                            <div key={ev.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="badge badge-info">{typeLabels[ev.type] || ev.type}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{formatDateShort(ev.event_date)}</span>
                                </div>
                                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{ev.title}</h3>
                                {ev.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{ev.description}</p>}
                                {ev.location && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>📍 {ev.location}</p>}
                                {(ev.start_time || ev.end_time) && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>🕐 {ev.start_time?.slice(0, 5)} - {ev.end_time?.slice(0, 5)}</p>}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border-primary)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => loadAttendees(ev.id)}><Users size={14} /> Daftar Hadir</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(getCheckInLink(ev.id)); alert('Link check-in disalin!') }} title="Copy link check-in"><Link2 size={14} /> Link Absen</button>
                                    {canCreate && (
                                        <>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ title: ev.title, description: ev.description || '', event_date: ev.event_date, start_time: ev.start_time || '', end_time: ev.end_time || '', location: ev.location || '', type: ev.type }); setEditId(ev.id); setShowModal(true) }}>Edit</button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(ev.id)}>Hapus</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={events} matchFields={['title', 'event_date']} title="Import Event" />

                {/* Generate from Timeline Modal */}
                {showGenerate && (
                    <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>Generate Event dari Timeline</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowGenerate(false)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                    Pilih kegiatan dari timeline untuk dibuat sebagai event absensi:
                                </p>
                                {timelineEvents.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Tidak ada kegiatan di timeline</p>
                                ) : timelineEvents.map((te: any) => (
                                    <div key={te.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.75rem', borderRadius: 8,
                                        border: '1px solid var(--color-border-primary)',
                                        marginBottom: '0.5rem',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{te.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {formatDateShort(te.event_date)} {te.start_time && `· ${te.start_time.slice(0, 5)}`}
                                                {te.location && ` · ${te.location}`}
                                            </div>
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={() => generateFromTimeline(te)}>Buat Event</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Create/Edit Event Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Event</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Judul Event *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Tanggal *</label><input className="form-input" type="date" required value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Tipe</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="general">Umum</option><option value="meeting">Rapat</option><option value="training">Pelatihan</option><option value="social">Sosial</option><option value="other">Lainnya</option></select></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Jam Mulai</label><input className="form-input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Jam Selesai</label><input className="form-input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Lokasi</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Attendees Modal */}
                {showAttendees && (
                    <div className="modal-overlay" onClick={() => setShowAttendees(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <div className="modal-header"><h2>Daftar Hadir</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowAttendees(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                {canCreate && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                                        <select className="form-select" style={{ flex: 1 }} onChange={e => { if (e.target.value) { addAttendee(showAttendees, e.target.value); e.target.value = '' } }}>
                                            <option value="">Tambah Peserta...</option>
                                            {members.filter(m => !attendees.find(a => a.member_id === m.id)).map((m: any) => <option key={m.id} value={m.id}>{m.full_name} ({m.department})</option>)}
                                        </select>
                                        <button className="btn btn-secondary btn-sm" onClick={() => addAllMembers(showAttendees)}>+ Semua</button>
                                    </div>
                                )}

                                {/* Stats */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#f0fdf4', fontSize: '0.8125rem' }}>
                                        <strong style={{ color: '#15803d' }}>{attendees.filter(a => a.status === 'present').length}</strong> <span style={{ color: '#64748b' }}>Hadir</span>
                                    </div>
                                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#fef2f2', fontSize: '0.8125rem' }}>
                                        <strong style={{ color: '#dc2626' }}>{attendees.filter(a => a.status === 'absent').length}</strong> <span style={{ color: '#64748b' }}>Tidak Hadir</span>
                                    </div>
                                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#f1f5f9', fontSize: '0.8125rem' }}>
                                        <strong style={{ color: '#475569' }}>{attendees.length}</strong> <span style={{ color: '#64748b' }}>Total</span>
                                    </div>
                                </div>

                                {attendees.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '1rem' }}>Belum ada peserta</p> :
                                    <table className="data-table">
                                        <thead><tr><th>Nama</th><th>Bidang</th><th>Status</th>{canApprove && <th>Ubah Status</th>}</tr></thead>
                                        <tbody>{attendees.map((a: any) => (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 500 }}>{a.member?.full_name}</td>
                                                <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{a.member?.department || '-'}</td>
                                                <td><span className={`badge badge-${getStatusColor(a.status)}`}>{getStatusLabel(a.status)}</span></td>
                                                {canApprove && (
                                                    <td>
                                                        <select className="form-select" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} value={a.status} onChange={e => updateAttendeeStatus(a.id, e.target.value)}>
                                                            <option value="registered">Registered</option><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option>
                                                        </select>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}</tbody>
                                    </table>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

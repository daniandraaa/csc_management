'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { formatDateShort } from '@/lib/utils'
import { CalendarCheck, Plus, X, Users, RefreshCw, CheckSquare, Clock, BarChart3, Trash2 } from 'lucide-react'

export default function AttendancePage() {
    const { currentUser } = useCurrentUser()
    const [sessions, setSessions] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Generate modal states
    const [showGenerate, setShowGenerate] = useState(false)
    const [sourceType, setSourceType] = useState<'timeline' | 'program' | 'invitation'>('timeline')
    const [sourceItems, setSourceItems] = useState<any[]>([])
    const [selectedSource, setSelectedSource] = useState<any>(null)

    // Member selection modal
    const [showMemberSelect, setShowMemberSelect] = useState(false)
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])
    const [sessionTitle, setSessionTitle] = useState('')
    const [sessionDate, setSessionDate] = useState('')
    const [sessionDeadline, setSessionDeadline] = useState('')
    const [sessionDesc, setSessionDesc] = useState('')

    // Detail modal
    const [showDetail, setShowDetail] = useState<string | null>(null)
    const [sessionMembers, setSessionMembers] = useState<any[]>([])

    const canCreate = canPerformAction(currentUser, '/hr/attendance', 'create')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('attendance_sessions')
            .select('*, creator:members!attendance_sessions_created_by_fkey(full_name)')
            .order('event_date', { ascending: false })

        // For each session, get member counts
        if (data) {
            const enriched = await Promise.all(data.map(async (s: any) => {
                const { data: members } = await supabase.from('attendance_session_members')
                    .select('status')
                    .eq('session_id', s.id)
                const total = members?.length || 0
                const present = members?.filter(m => m.status === 'present').length || 0
                const absent = members?.filter(m => m.status === 'absent' || m.status === 'alpa').length || 0
                const pending = members?.filter(m => m.status === 'pending').length || 0
                return { ...s, _total: total, _present: present, _absent: absent, _pending: pending }
            }))
            setSessions(enriched)
        } else {
            setSessions([])
        }

        const { data: m } = await supabase.from('members')
            .select('id,full_name,department,role')
            .neq('role', 'Business Partner')
            .order('full_name')
        setMembers(m || [])
        setLoading(false)
    }

    async function loadSources(type: string) {
        setSourceType(type as any)
        if (type === 'timeline') {
            const { data } = await supabase.from('timeline_entries')
                .select('*').in('type', ['meeting', 'activity', 'event']).order('event_date', { ascending: false }).limit(30)
            setSourceItems(data || [])
        } else if (type === 'program') {
            const { data } = await supabase.from('programs')
                .select('*, department:departments(name)').order('start_date', { ascending: false }).limit(30)
            setSourceItems(data || [])
        } else if (type === 'invitation') {
            const { data } = await supabase.from('guest_invitations')
                .select('*').order('event_date', { ascending: false }).limit(30)
            setSourceItems(data || [])
        }
    }

    function selectSource(item: any) {
        setSelectedSource(item)
        if (sourceType === 'timeline') {
            setSessionTitle(item.title)
            setSessionDate(item.event_date)
            setSessionDesc(item.description || '')
        } else if (sourceType === 'program') {
            setSessionTitle(item.name)
            setSessionDate(item.start_date || new Date().toISOString().split('T')[0])
            setSessionDesc(item.description || '')
        } else if (sourceType === 'invitation') {
            setSessionTitle(item.event_name)
            setSessionDate(item.event_date || new Date().toISOString().split('T')[0])
            setSessionDesc(item.description || '')
        }
        setShowGenerate(false)
        setShowMemberSelect(true)
        setSelectedMembers([])
    }

    function toggleMember(id: string) {
        setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
    }

    function toggleAll() {
        if (selectedMembers.length === members.length) {
            setSelectedMembers([])
        } else {
            setSelectedMembers(members.map(m => m.id))
        }
    }

    async function createSession() {
        if (!sessionTitle || !sessionDate || selectedMembers.length === 0) {
            alert('Harap isi judul, tanggal, dan pilih minimal 1 anggota.')
            return
        }

        const { data: session, error } = await supabase.from('attendance_sessions').insert({
            source_type: sourceType,
            source_id: selectedSource?.id || null,
            title: sessionTitle,
            description: sessionDesc || null,
            event_date: sessionDate,
            deadline: sessionDeadline || null,
            created_by: currentUser?.id,
        }).select().single()

        if (error || !session) {
            alert('Gagal membuat sesi kehadiran.')
            return
        }

        // Add members
        const memberPayload = selectedMembers.map(memberId => ({
            session_id: session.id,
            member_id: memberId,
        }))
        await supabase.from('attendance_session_members').insert(memberPayload)

        setShowMemberSelect(false)
        setSelectedSource(null)
        setSessionTitle('')
        setSessionDate('')
        setSessionDeadline('')
        setSessionDesc('')
        setSelectedMembers([])
        loadData()
    }

    async function deleteSession(id: string) {
        if (confirm('Hapus sesi kehadiran ini?')) {
            await supabase.from('attendance_sessions').delete().eq('id', id)
            loadData()
        }
    }

    async function loadSessionDetail(sessionId: string) {
        const { data } = await supabase.from('attendance_session_members')
            .select('*, member:members(id,full_name,department)')
            .eq('session_id', sessionId)
            .order('member(full_name)')
        setSessionMembers(data || [])
        setShowDetail(sessionId)
    }

    async function updateMemberStatus(id: string, status: string) {
        await supabase.from('attendance_session_members').update({ status }).eq('id', id)
        if (showDetail) loadSessionDetail(showDetail)
        loadData()
    }

    async function markExpiredAsAlpa(sessionId: string) {
        const { data } = await supabase.from('attendance_session_members')
            .select('id')
            .eq('session_id', sessionId)
            .eq('status', 'pending')
        if (data && data.length > 0) {
            for (const m of data) {
                await supabase.from('attendance_session_members').update({ status: 'alpa' }).eq('id', m.id)
            }
            if (showDetail) loadSessionDetail(showDetail)
            loadData()
        }
    }

    const statusLabels: Record<string, string> = {
        present: 'Hadir', absent: 'Tidak Hadir', excused: 'Izin', pending: 'Menunggu', alpa: 'Alpa',
    }
    const statusColors: Record<string, string> = {
        present: '#16a34a', absent: '#dc2626', excused: '#2563eb', pending: '#f59e0b', alpa: '#991b1b',
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Kehadiran & Event</div></div>
            <div className="page-container">
                <h1 className="page-title">Kelola Kehadiran</h1>
                <p className="page-subtitle">Generate sesi kehadiran dari timeline, program kerja, atau undangan</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {sessions.length} sesi kehadiran
                        </span>
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <button className="btn btn-primary" onClick={() => { setShowGenerate(true); loadSources('timeline') }}>
                                <RefreshCw size={16} /> Generate Kehadiran
                            </button>
                        )}
                    </div>
                </div>

                {/* Session Cards */}
                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</div>
                ) : sessions.length === 0 ? (
                    <div className="card"><div className="empty-state"><CalendarCheck size={48} /><h3>Belum ada sesi kehadiran</h3><p>Klik &quot;Generate Kehadiran&quot; untuk membuat sesi baru dari daftar kegiatan.</p></div></div>
                ) : (
                    <div className="cards-grid">
                        {sessions.map((s: any) => {
                            const rate = s._total > 0 ? ((s._present / s._total) * 100) : 0
                            const isExpired = s.deadline && new Date() > new Date(s.deadline)
                            return (
                                <div key={s.id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span className="badge badge-info">{s.source_type}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{formatDateShort(s.event_date)}</span>
                                    </div>
                                    <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{s.title}</h3>
                                    {s.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{s.description}</p>}

                                    {/* Attendance Stats */}
                                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                        <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {s._present} Hadir</span>
                                        <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ {s._absent} Tidak Hadir</span>
                                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>⏳ {s._pending} Menunggu</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                                            <span>{s._total} anggota</span>
                                            <span style={{ fontWeight: 600, color: rate >= 75 ? '#16a34a' : rate >= 50 ? '#f59e0b' : '#dc2626' }}>{rate.toFixed(0)}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className={`progress-bar-fill ${rate >= 75 ? 'success' : rate >= 50 ? 'warning' : 'danger'}`} style={{ width: `${rate}%` }} />
                                        </div>
                                    </div>

                                    {s.deadline && (
                                        <p style={{ fontSize: '0.75rem', color: isExpired ? '#dc2626' : 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                                            ⏰ Batas: {new Date(s.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {isExpired && ' (Lewat)'}
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border-primary)', paddingTop: '0.75rem' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => loadSessionDetail(s.id)}>
                                            <Users size={14} /> Detail
                                        </button>
                                        {canCreate && isExpired && s._pending > 0 && (
                                            <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => markExpiredAsAlpa(s.id)}>
                                                Tandai Alpa
                                            </button>
                                        )}
                                        {canCreate && (
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteSession(s.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Generate Source Modal */}
                {showGenerate && (
                    <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <div className="modal-header"><h2>Generate Kehadiran</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowGenerate(false)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Pilih sumber kegiatan untuk membuat sesi kehadiran:</p>

                                {/* Source Type Tabs */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <button className={`btn ${sourceType === 'timeline' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => loadSources('timeline')}>Timeline</button>
                                    <button className={`btn ${sourceType === 'program' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => loadSources('program')}>Program Kerja</button>
                                    <button className={`btn ${sourceType === 'invitation' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => loadSources('invitation')}>Undangan</button>
                                </div>

                                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {sourceItems.length === 0 ? (
                                        <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Tidak ada data</p>
                                    ) : sourceItems.map((item: any) => (
                                        <div key={item.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.75rem', borderRadius: 8,
                                            border: '1px solid var(--color-border-primary)', marginBottom: '0.5rem',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                    {item.title || item.name || item.event_name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {formatDateShort(item.event_date || item.start_date)}
                                                    {item.location && ` · ${item.location}`}
                                                    {item.department?.name && ` · ${item.department.name}`}
                                                    {item.event_location && ` · ${item.event_location}`}
                                                </div>
                                            </div>
                                            <button className="btn btn-primary btn-sm" onClick={() => selectSource(item)}>Pilih</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Member Selection Modal */}
                {showMemberSelect && (
                    <div className="modal-overlay" onClick={() => setShowMemberSelect(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <div className="modal-header"><h2>Buat Sesi Kehadiran</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowMemberSelect(false)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} /></div>
                                    <div className="form-group"><label className="form-label">Tanggal *</label><input className="form-input" type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Deskripsi</label><input className="form-input" value={sessionDesc} onChange={e => setSessionDesc(e.target.value)} /></div>
                                <div className="form-group"><label className="form-label">Batas Waktu Pengisian</label><input className="form-input" type="datetime-local" value={sessionDeadline} onChange={e => setSessionDeadline(e.target.value)} /></div>

                                <div style={{ borderTop: '1px solid var(--color-border-primary)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <label className="form-label" style={{ margin: 0 }}>Pilih Anggota ({selectedMembers.length}/{members.length})</label>
                                        <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
                                            <CheckSquare size={14} /> {selectedMembers.length === members.length ? 'Hapus Semua' : 'Pilih Semua'}
                                        </button>
                                    </div>
                                    <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--color-border-primary)', borderRadius: 8, padding: '0.5rem' }}>
                                        {members.map((m: any) => (
                                            <label key={m.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: 6,
                                                background: selectedMembers.includes(m.id) ? 'var(--color-brand-50)' : 'transparent',
                                            }}>
                                                <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} />
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.full_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{m.department} · {m.role}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowMemberSelect(false)}>Batal</button>
                                <button className="btn btn-primary" onClick={createSession} disabled={selectedMembers.length === 0 || !sessionTitle || !sessionDate}>
                                    <Plus size={16} /> Buat Sesi ({selectedMembers.length} anggota)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Session Detail Modal */}
                {showDetail && (
                    <div className="modal-overlay" onClick={() => setShowDetail(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <div className="modal-header"><h2>Detail Kehadiran</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                {/* Stats */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    {['present', 'absent', 'excused', 'alpa', 'pending'].map(status => {
                                        const count = sessionMembers.filter(m => m.status === status).length
                                        return (
                                            <div key={status} style={{
                                                padding: '0.5rem 0.75rem', borderRadius: 8,
                                                background: status === 'present' ? '#f0fdf4' : status === 'pending' ? '#fef3c7' : '#fee2e2',
                                                fontSize: '0.8125rem',
                                            }}>
                                                <strong style={{ color: statusColors[status] }}>{count}</strong>{' '}
                                                <span style={{ color: '#64748b' }}>{statusLabels[status]}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                {sessionMembers.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>Belum ada anggota</p>
                                ) : (
                                    <table className="data-table">
                                        <thead><tr><th>Nama</th><th>Bidang</th><th>Status</th>{canCreate && <th>Ubah</th>}</tr></thead>
                                        <tbody>
                                            {sessionMembers.map((m: any) => (
                                                <tr key={m.id}>
                                                    <td style={{ fontWeight: 500 }}>{m.member?.full_name}</td>
                                                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{m.member?.department || '-'}</td>
                                                    <td>
                                                        <span style={{
                                                            display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 6,
                                                            fontSize: '0.6875rem', fontWeight: 600,
                                                            background: m.status === 'present' ? '#dcfce7' : m.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                                            color: statusColors[m.status] || '#475569',
                                                        }}>{statusLabels[m.status] || m.status}</span>
                                                    </td>
                                                    {canCreate && (
                                                        <td>
                                                            <select className="form-select" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                                value={m.status} onChange={e => updateMemberStatus(m.id, e.target.value)}>
                                                                <option value="pending">Menunggu</option>
                                                                <option value="present">Hadir</option>
                                                                <option value="absent">Tidak Hadir</option>
                                                                <option value="excused">Izin</option>
                                                                <option value="alpa">Alpa</option>
                                                            </select>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

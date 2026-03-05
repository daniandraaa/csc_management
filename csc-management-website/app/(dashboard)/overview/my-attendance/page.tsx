'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

export default function MyAttendancePage() {
    const { currentUser } = useCurrentUser()
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { if (currentUser) loadData() }, [currentUser])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('attendance_session_members')
            .select('*, session:attendance_sessions(*)')
            .eq('member_id', currentUser?.id)
            .order('created_at', { ascending: false })
        setSessions(data || [])
        setLoading(false)
    }

    async function respond(id: string, status: 'present' | 'absent' | 'excused') {
        await supabase.from('attendance_session_members').update({
            status,
            responded_at: new Date().toISOString(),
        }).eq('id', id)
        loadData()
    }

    // Check for expired sessions and auto-mark as alpa
    useEffect(() => {
        if (sessions.length > 0) {
            const now = new Date()
            sessions.forEach(async (s) => {
                if (s.status === 'pending' && s.session?.deadline) {
                    const deadline = new Date(s.session.deadline)
                    if (now > deadline) {
                        await supabase.from('attendance_session_members').update({
                            status: 'alpa',
                        }).eq('id', s.id)
                    }
                }
            })
        }
    }, [sessions])

    const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
        pending: { icon: Clock, color: '#92400e', bg: '#fef3c7', label: 'Menunggu Respons' },
        present: { icon: CheckCircle2, color: '#166534', bg: '#dcfce7', label: 'Hadir' },
        absent: { icon: XCircle, color: '#991b1b', bg: '#fee2e2', label: 'Tidak Hadir' },
        excused: { icon: AlertTriangle, color: '#1e40af', bg: '#dbeafe', label: 'Izin' },
        alpa: { icon: XCircle, color: '#991b1b', bg: '#fee2e2', label: 'Alpa (Tanpa Keterangan)' },
    }

    // Stats
    const totalAssigned = sessions.length
    const totalPresent = sessions.filter(s => s.status === 'present').length
    const totalAbsent = sessions.filter(s => s.status === 'absent' || s.status === 'alpa').length
    const totalPending = sessions.filter(s => s.status === 'pending').length
    const attendRate = totalAssigned > 0 ? ((totalPresent / totalAssigned) * 100) : 0

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Kehadiran Saya</div></div>
            <div className="page-container">
                <h1 className="page-title">Kehadiran Saya</h1>
                <p className="page-subtitle">Lihat dan isi kehadiran kegiatan yang telah di-assign kepada Anda</p>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-brand-500)' }}>{attendRate.toFixed(0)}%</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Persentase Kehadiran</div>
                        <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                            <div className={`progress-bar-fill ${attendRate >= 75 ? 'success' : attendRate >= 50 ? 'warning' : 'danger'}`} style={{ width: `${attendRate}%` }} />
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{totalPresent}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Hadir</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{totalAbsent}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Tidak Hadir / Alpa</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{totalPending}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Belum Diisi</div>
                    </div>
                </div>

                {/* Sessions List */}
                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</div>
                ) : sessions.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <CalendarCheck size={48} />
                            <h3>Belum ada kegiatan</h3>
                            <p>Belum ada kegiatan yang di-assign kepada Anda.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {sessions.map((s: any) => {
                            const st = statusConfig[s.status] || statusConfig.pending
                            const StIcon = st.icon
                            const isPending = s.status === 'pending'
                            const isExpired = s.session?.deadline && new Date() > new Date(s.session.deadline)

                            return (
                                <div key={s.id} className="card" style={{
                                    borderLeft: `4px solid ${st.color}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{s.session?.title}</h3>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '0.15rem 0.5rem', borderRadius: 6,
                                                    fontSize: '0.6875rem', fontWeight: 600,
                                                    background: st.bg, color: st.color,
                                                }}>
                                                    <StIcon size={12} /> {st.label}
                                                </span>
                                            </div>
                                            {s.session?.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0' }}>{s.session.description}</p>}
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                                <span>📅 {formatDateShort(s.session?.event_date)}</span>
                                                {s.session?.deadline && (
                                                    <span style={{ color: isExpired ? '#dc2626' : undefined }}>
                                                        ⏰ Batas: {new Date(s.session.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                {s.responded_at && <span>✓ Diisi: {new Date(s.responded_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                                            </div>
                                        </div>

                                        {isPending && !isExpired && (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => respond(s.id, 'present')} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                                                    <CheckCircle2 size={14} /> Hadir
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => respond(s.id, 'excused')}>
                                                    Izin
                                                </button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => respond(s.id, 'absent')}>
                                                    Tidak Hadir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

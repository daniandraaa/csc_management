'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { CheckCircle2, CalendarCheck } from 'lucide-react'

export default function CheckInPage() {
    const [events, setEvents] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState<string>('')
    const [selectedMember, setSelectedMember] = useState<string>('')
    const [checkInStatus, setCheckInStatus] = useState<'idle' | 'success' | 'error' | 'already'>('idle')
    const [eventDetail, setEventDetail] = useState<any>(null)

    useEffect(() => {
        async function load() {
            // Load upcoming or recent events
            const today = new Date().toISOString().split('T')[0]
            const { data: ev } = await supabase
                .from('attendance_sessions')
                .select('*')
                .gte('event_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                .order('event_date', { ascending: true })
            setEvents(ev || [])
            setLoading(false)

            // Check URL params for event pre-selection
            const params = new URLSearchParams(window.location.search)
            const eventId = params.get('event')
            if (eventId) setSelectedEvent(eventId)
        }
        load()
    }, [])

    useEffect(() => {
        async function fetchAssignedMembers() {
            if (selectedEvent) {
                const ev = events.find(e => e.id === selectedEvent)
                setEventDetail(ev || null)
                
                // Fetch members specifically assigned to this event
                const { data } = await supabase
                    .from('attendance_session_members')
                    .select('member:members(id, full_name, department)')
                    .eq('session_id', selectedEvent)
                
                if (data) {
                    const assigned = data.map((d: any) => d.member).filter(Boolean)
                    assigned.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name))
                    setMembers(assigned)
                } else {
                    setMembers([])
                }
            } else {
                setEventDetail(null)
                setMembers([])
            }
            setSelectedMember('')
        }
        fetchAssignedMembers()
    }, [selectedEvent, events])

    async function handleCheckIn() {
        if (!selectedEvent || !selectedMember) return
        setCheckInStatus('idle')

        // Check if already checked in
        const { data: existing } = await supabase
            .from('attendance_session_members')
            .select('id, status')
            .eq('session_id', selectedEvent)
            .eq('member_id', selectedMember)

        if (existing && existing.length > 0) {
            // Update status to present
            await supabase
                .from('attendance_session_members')
                .update({ status: 'present', responded_at: new Date().toISOString() })
                .eq('id', existing[0].id)
            setCheckInStatus('success')
        } else {
            // This case shouldn't happen anymore since they must be assigned, but handle error just in case
            setCheckInStatus('error')
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFCF8 0%, #F5EEDC 50%, #EFE5D1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{ position: 'fixed', inset: 0, opacity: 0.2, backgroundImage: 'radial-gradient(circle at 25px 25px, #9A3412 1px, transparent 0%)', backgroundSize: '60px 60px' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'white', 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                        boxShadow: '0 10px 25px -5px rgba(154, 52, 18, 0.15)',
                        border: '1px solid #F5EEDC',
                    }}><CalendarCheck size={36} color="#9A3412" /></div>
                    <h1 style={{ color: '#431407', fontSize: '1.75rem', fontWeight: 800 }}>Check-In Kehadiran</h1>
                    <p style={{ color: '#78350f', fontSize: '0.875rem' }}>CSC Telkom University</p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'white', borderRadius: 20, padding: '2rem',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                }}>
                    {checkInStatus === 'success' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: '#f0fdf4', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem',
                            }}><CheckCircle2 size={48} color="#22c55e" /></div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#15803d', marginBottom: '0.5rem' }}>
                                Berhasil Check-In! ✅
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                                Kehadiran Anda telah dicatat pada {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <button
                                onClick={() => { setCheckInStatus('idle'); setSelectedMember('') }}
                                style={{
                                    padding: '0.625rem 1.5rem', borderRadius: 10,
                                    border: '1px solid #e2e8f0', background: 'white',
                                    fontSize: '0.875rem', cursor: 'pointer',
                                }}
                            >Check-In Orang Lain</button>
                        </div>
                    ) : (
                        <>
                            {loading ? (
                                <p style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>Memuat data...</p>
                            ) : (
                                <>
                                    {/* Event Selection */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                            Pilih Event / Kegiatan
                                        </label>
                                        <select
                                            value={selectedEvent}
                                            onChange={e => setSelectedEvent(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.75rem 1rem',
                                                borderRadius: 10, border: '2px solid #e2e8f0',
                                                fontSize: '0.875rem', background: 'white',
                                            }}
                                        >
                                            <option value="">— Pilih event —</option>
                                            {events.map(ev => (
                                                <option key={ev.id} value={ev.id}>
                                                    {ev.title} ({formatDateShort(ev.event_date)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Event detail */}
                                    {eventDetail && (
                                        <div style={{
                                            padding: '0.75rem', borderRadius: 10,
                                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                                            marginBottom: '1rem', fontSize: '0.8125rem',
                                        }}>
                                            <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 4 }}>{eventDetail.title}</div>
                                            <div style={{ display: 'flex', gap: '0.75rem', color: '#475569', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CalendarCheck size={12} /> {formatDateShort(eventDetail.event_date)}</span>
                                                {eventDetail.description && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{eventDetail.description}</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Member Selection */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                            Pilih Nama Anda
                                        </label>
                                        <select
                                            value={selectedMember}
                                            onChange={e => setSelectedMember(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.75rem 1rem',
                                                borderRadius: 10, border: '2px solid #e2e8f0',
                                                fontSize: '0.875rem', background: 'white',
                                            }}
                                        >
                                            <option value="">— Pilih nama —</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.full_name} — {m.department}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {checkInStatus === 'error' && (
                                        <div style={{
                                            padding: '0.75rem', borderRadius: 10,
                                            background: '#fef2f2', border: '1px solid #fecaca',
                                            color: '#dc2626', fontSize: '0.8125rem',
                                            marginBottom: '1rem',
                                        }}>Gagal check-in. Silakan coba lagi.</div>
                                    )}

                                    <button
                                        onClick={handleCheckIn}
                                        disabled={!selectedEvent || !selectedMember}
                                        style={{
                                            width: '100%', padding: '0.875rem', borderRadius: 12,
                                            border: 'none',
                                            background: selectedEvent && selectedMember ? 'linear-gradient(135deg, #9A3412, #7C2D12)' : '#e2e8f0',
                                            color: selectedEvent && selectedMember ? 'white' : '#94a3b8',
                                            fontSize: '1rem', fontWeight: 600,
                                            cursor: selectedEvent && selectedMember ? 'pointer' : 'not-allowed',
                                            boxShadow: selectedEvent && selectedMember ? '0 4px 12px rgba(154, 52, 18, 0.3)' : 'none',
                                        }}
                                    >
                                        ✋ Check-In Sekarang
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', color: '#78350f', opacity: 0.5, fontSize: '0.75rem', marginTop: '1.5rem' }}>
                    CSC Management System • Absensi Digital
                </p>
            </div>
        </div>
    )
}

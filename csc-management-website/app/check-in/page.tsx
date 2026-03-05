'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { CheckCircle2, CalendarCheck, MapPin, Clock } from 'lucide-react'

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
                .from('events')
                .select('*')
                .gte('event_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                .order('event_date', { ascending: true })
            const { data: m } = await supabase
                .from('members')
                .select('id, full_name, department, role')
                .neq('role', 'Business Partner')
                .order('full_name')
            setEvents(ev || [])
            setMembers(m || [])
            setLoading(false)

            // Check URL params for event pre-selection
            const params = new URLSearchParams(window.location.search)
            const eventId = params.get('event')
            if (eventId) setSelectedEvent(eventId)
        }
        load()
    }, [])

    useEffect(() => {
        if (selectedEvent) {
            const ev = events.find(e => e.id === selectedEvent)
            setEventDetail(ev || null)
        } else {
            setEventDetail(null)
        }
    }, [selectedEvent, events])

    async function handleCheckIn() {
        if (!selectedEvent || !selectedMember) return
        setCheckInStatus('idle')

        // Check if already checked in
        const { data: existing } = await supabase
            .from('event_attendees')
            .select('id')
            .eq('event_id', selectedEvent)
            .eq('member_id', selectedMember)

        if (existing && existing.length > 0) {
            // Update status to present
            await supabase
                .from('event_attendees')
                .update({ status: 'present', check_in_time: new Date().toISOString() })
                .eq('event_id', selectedEvent)
                .eq('member_id', selectedMember)
            setCheckInStatus('success')
        } else {
            // Insert new attendance record
            const { error } = await supabase
                .from('event_attendees')
                .insert({
                    event_id: selectedEvent,
                    member_id: selectedMember,
                    status: 'present',
                    check_in_time: new Date().toISOString(),
                })
            if (error) {
                setCheckInStatus('error')
            } else {
                setCheckInStatus('success')
            }
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{ position: 'fixed', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%)', backgroundSize: '100px 100px' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                    }}><CalendarCheck size={36} color="white" /></div>
                    <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 700 }}>Check-In Kehadiran</h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>CSC Telkom University</p>
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
                                                {eventDetail.start_time && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {eventDetail.start_time.slice(0, 5)}</span>}
                                                {eventDetail.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={12} /> {eventDetail.location}</span>}
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
                                            background: selectedEvent && selectedMember ? 'linear-gradient(135deg, #059669, #047857)' : '#e2e8f0',
                                            color: selectedEvent && selectedMember ? 'white' : '#94a3b8',
                                            fontSize: '1rem', fontWeight: 600,
                                            cursor: selectedEvent && selectedMember ? 'pointer' : 'not-allowed',
                                            boxShadow: selectedEvent && selectedMember ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
                                        }}
                                    >
                                        ✋ Check-In Sekarang
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
                    CSC Management System • Absensi Digital
                </p>
            </div>
        </div>
    )
}

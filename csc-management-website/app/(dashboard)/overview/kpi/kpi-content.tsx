'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { BarChart3, Target } from 'lucide-react'

export default function OverviewKPIPage() {
    const { currentUser } = useCurrentUser()
    const [kpis, setKpis] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (currentUser) {
            loadData()
        }
    }, [currentUser])

    async function loadData() {
        setLoading(true)

        // 1. Get all programs assigned to the current user via HR attendance
        const { data: asm } = await supabase
            .from('attendance_session_members')
            .select('session:attendance_sessions!inner(source_type, source_id)')
            .eq('member_id', currentUser?.id)
            .eq('session.source_type', 'program')

        // Extract unique program IDs
        const allowedProgramIds = [...new Set(
            (asm || []).map((record: any) => record.session?.source_id).filter(Boolean)
        )]

        if (allowedProgramIds.length === 0) {
            setKpis([])
            setPrograms([])
            setLoading(false)
            return
        }

        // 2. Fetch Programs and their KPIs
        const { data: p } = await supabase
            .from('programs')
            .select('id, name')
            .in('id', allowedProgramIds)

        const { data: k } = await supabase
            .from('program_kpis')
            .select('*')
            .in('program_id', allowedProgramIds)

        setPrograms(p || [])
        setKpis(k || [])
        setLoading(false)
    }

    const statusColors: Record<string, string> = {
        'on_track': '#16a34a',
        'at_risk': '#d97706',
        'behind': '#dc2626',
        'completed': '#2563eb'
    }

    const statusLabels: Record<string, string> = {
        'on_track': 'Sesuai Target',
        'at_risk': 'Beresiko',
        'behind': 'Tertinggal',
        'completed': 'Selesai'
    }

    return (
        <div style={{ padding: '0 2rem', marginTop: '1.5rem' }}>
                    {loading ? (
                        <p style={{ color: '#94a3b8' }}>Memuat KPI...</p>
                    ) : programs.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <BarChart3 size={48} />
                                <h3>Tidak ada data KPI</h3>
                                <p>Anda belum ditugaskan ke program kerja manapun.</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {programs.map(program => {
                                const programKpis = kpis.filter(k => k.program_id === program.id)
                                
                                return (
                                    <div key={program.id} className="card" style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <div style={{ 
                                                width: 40, height: 40, borderRadius: 10, 
                                                background: 'rgba(154, 52, 18, 0.08)', color: '#9A3412',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                            }}>
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#292524' }}>{program.name}</h2>
                                                <span style={{ fontSize: '0.8125rem', color: '#78716c' }}>{programKpis.length} Indikator Kinerja</span>
                                            </div>
                                        </div>

                                        {programKpis.length === 0 ? (
                                            <p style={{ fontSize: '0.875rem', color: '#a8a29e', fontStyle: 'italic' }}>Belum ada KPI yang diatur untuk program ini.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {programKpis.map(kpi => {
                                                    const progress = kpi.target_value > 0 
                                                        ? Math.min(100, Math.max(0, (kpi.current_value / kpi.target_value) * 100))
                                                        : 0

                                                    return (
                                                        <div key={kpi.id} style={{ 
                                                            padding: '1rem', borderRadius: 12, border: '1px solid #e2e8f0',
                                                            background: '#fafaf9' 
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#44403c', flex: 1, paddingRight: '0.5rem' }}>
                                                                    {kpi.indicator}
                                                                </h3>
                                                                <span style={{ 
                                                                    fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 99,
                                                                    background: `${statusColors[kpi.status]}15`, color: statusColors[kpi.status]
                                                                }}>
                                                                    {statusLabels[kpi.status]}
                                                                </span>
                                                            </div>
                                                            
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#292524' }}>
                                                                    {kpi.current_value}
                                                                </span>
                                                                <span style={{ fontSize: '0.8125rem', color: '#78716c' }}>
                                                                    / {kpi.target_value} {kpi.unit}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                                                                    <div 
                                                                        className="progress-bar-fill" 
                                                                        style={{ 
                                                                            width: `${progress}%`,
                                                                            background: progress >= 100 ? '#2563eb' : progress >= 75 ? '#16a34a' : progress >= 50 ? '#d97706' : '#dc2626'
                                                                        }} 
                                                                    />
                                                                </div>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#57534e', width: '35px', textAlign: 'right' }}>
                                                                    {progress.toFixed(0)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
        </div>
    )
}

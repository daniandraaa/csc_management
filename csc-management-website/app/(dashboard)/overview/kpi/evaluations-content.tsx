'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import { ClipboardCheck, FileText } from 'lucide-react'

export default function OverviewEvaluationsPage() {
    const { currentUser } = useCurrentUser()
    const [evals, setEvals] = useState<any[]>([])
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
            .eq('role_type', 'Panitia')
            
        // Extract unique program IDs
        const allowedProgramIds = [...new Set(
            (asm || []).map((record: any) => record.session?.source_id).filter(Boolean)
        )]

        if (allowedProgramIds.length === 0) {
            setEvals([])
            setLoading(false)
            return
        }

        // 2. Fetch evaluations for those programs
        const { data } = await supabase
            .from('program_evaluations')
            .select('*, program:programs(name), evaluator:members!program_evaluations_evaluated_by_fkey(full_name)')
            .in('program_id', allowedProgramIds)
            .order('evaluation_date', { ascending: false })
            
        setEvals(data || [])
        setLoading(false)
    }

    return (
        <div className="cards-grid" style={{ padding: '0 2rem', marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {loading ? (
                        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: '#94a3b8' }}>Memuat evaluasi...</p>
                        </div>
                    ) : evals.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <div className="empty-state">
                                <ClipboardCheck size={48} />
                                <h3>Tidak ada evaluasi</h3>
                                <p>Anda belum ditugaskan ke program kerja manapun yang memiliki evaluasi.</p>
                            </div>
                        </div>
                    ) : (
                        evals.map((ev: any) => (
                            <div key={ev.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: '1rem' }}>
                                    <span className="badge" style={{ background: 'rgba(154, 52, 18, 0.08)', color: '#9A3412', fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                                        {ev.program?.name}
                                    </span>
                                    {ev.overall_score && (
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ 
                                                fontSize: '1.5rem', fontWeight: 800, lineHeight: 1,
                                                color: ev.overall_score >= 75 ? '#16a34a' : ev.overall_score >= 50 ? '#d97706' : '#dc2626' 
                                            }}>
                                                {ev.overall_score}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: '#a8a29e', fontWeight: 600 }}>SKOR</div>
                                        </div>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.6, color: '#44403c', flex: 1 }}>
                                    {ev.summary}
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {ev.strengths && (
                                        <div style={{ fontSize: '0.8125rem', padding: '0.625rem', background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #16a34a' }}>
                                            <strong style={{ color: '#15803d', display: 'block', marginBottom: 2, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Kekuatan</strong> 
                                            {ev.strengths}
                                        </div>
                                    )}
                                    
                                    {ev.weaknesses && (
                                        <div style={{ fontSize: '0.8125rem', padding: '0.625rem', background: '#fef2f2', borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
                                            <strong style={{ color: '#b91c1c', display: 'block', marginBottom: 2, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Kelemahan</strong> 
                                            {ev.weaknesses}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: '0.75rem', color: '#78716c', 
                                    marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f5f5f4' 
                                }}>
                                    <FileText size={14} />
                                    <span>
                                        {formatDateShort(ev.evaluation_date)} 
                                        {ev.evaluator?.full_name ? ` · ${ev.evaluator.full_name}` : ''}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy } from 'lucide-react'

export default function OverviewPerformancePage() {
    const [rankings, setRankings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('performance_rankings')
            .select('*, member:members(id,full_name,department,role)')
            .order('score', { ascending: false })
        setRankings(data || [])
        setLoading(false)
    }

    function getScoreColor(score: number) {
        if (score >= 90) return 'var(--color-success)'
        if (score >= 75) return 'var(--color-info)'
        if (score >= 60) return 'var(--color-warning)'
        return 'var(--color-danger)'
    }

    const filtered = rankings.filter((r: any) =>
        r.member?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.period?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Performansi</div></div>
            <div className="page-container">
                <h1 className="page-title">Ranking Performansi</h1>
                <p className="page-subtitle">Lihat ranking performa anggota CSC</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <input className="form-input" placeholder="Cari anggota atau periode..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '0.75rem' }} />
                        </div>
                    </div>
                </div>

                {/* Top 3 Podium */}
                {filtered.length >= 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {filtered.slice(0, 3).map((r: any, i: number) => (
                            <div key={r.id} className="card" style={{ textAlign: 'center', borderTop: `3px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32'}` }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{r.member?.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>{r.member?.department}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: getScoreColor(r.score), margin: '0.5rem 0' }}>{r.score}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Periode: {r.period}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>#</th><th>Anggota</th><th>Bidang</th><th>Periode</th><th>Score</th><th>Progress</th></tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state"><Trophy size={48} /><h3>Belum ada data ranking</h3><p>Data ranking performansi belum tersedia.</p></div></td></tr>
                            ) : filtered.map((r: any, i: number) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--color-text-tertiary)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{r.member?.full_name || '-'}</td>
                                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{r.member?.department || '-'}</td>
                                    <td>{r.period}</td>
                                    <td><span style={{ fontWeight: 700, color: getScoreColor(r.score), fontSize: '1.125rem' }}>{r.score}</span></td>
                                    <td style={{ width: 140 }}>
                                        <div className="progress-bar">
                                            <div className={`progress-bar-fill ${r.score >= 75 ? 'success' : r.score >= 50 ? 'warning' : 'danger'}`} style={{ width: `${r.score}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

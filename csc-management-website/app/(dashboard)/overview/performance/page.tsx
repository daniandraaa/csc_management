'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, ChevronLeft, ChevronRight, Search } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_QUARTER = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`

function getYears() {
    const years = []
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 3; y--) years.push(y)
    return years
}

export default function OverviewPerformancePage() {
    const [rankings, setRankings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedQuarter, setSelectedQuarter] = useState(CURRENT_QUARTER)
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('performance_rankings')
            .select('*, member:members!performance_rankings_member_id_fkey(id,full_name,department,role)')
            .order('score', { ascending: false })
        setRankings(data || [])
        setLoading(false)
    }

    function getScoreColor(score: number) {
        if (score >= 90) return '#16a34a'
        if (score >= 75) return '#2563eb'
        if (score >= 60) return '#d97706'
        return '#dc2626'
    }

    function getScoreBg(score: number) {
        if (score >= 90) return '#dcfce7'
        if (score >= 75) return '#dbeafe'
        if (score >= 60) return '#fef3c7'
        return '#fee2e2'
    }

    function navigateQuarter(dir: 'prev' | 'next') {
        const qi = QUARTERS.indexOf(selectedQuarter)
        if (dir === 'next') {
            if (qi === 3) { setSelectedQuarter('Q1'); setSelectedYear(y => y + 1) }
            else setSelectedQuarter(QUARTERS[qi + 1])
        } else {
            if (qi === 0) { setSelectedQuarter('Q4'); setSelectedYear(y => y - 1) }
            else setSelectedQuarter(QUARTERS[qi - 1])
        }
    }

    const currentPeriod = `${selectedQuarter} ${selectedYear}`
    const filteredByPeriod = rankings.filter((r: any) => r.period === currentPeriod)
    const filtered = filteredByPeriod.filter((r: any) =>
        r.member?.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    const allPeriods = Array.from(new Set(rankings.map((r: any) => r.period))).sort((a, b) => {
        const [qa, ya] = (a as string).split(' ')
        const [qb, yb] = (b as string).split(' ')
        return Number(yb) - Number(ya) || QUARTERS.indexOf(qb) - QUARTERS.indexOf(qa)
    })

    return (
        <div>
            <div className="page-container">
                <h1 className="page-title">Ranking Performansi</h1>
                <p className="page-subtitle">Lihat ranking performa anggota CSC per kuartal</p>

                {/* Toolbar */}
                <div className="performance-toolbar">
                    <div className="period-nav">
                        <button className="nav-btn" onClick={() => navigateQuarter('prev')}><ChevronLeft size={16} /></button>
                        <div className="period-pills">
                            {QUARTERS.map(q => (
                                <button key={q} onClick={() => setSelectedQuarter(q)} className={`pill ${selectedQuarter === q ? 'active' : ''}`}>{q}</button>
                            ))}
                        </div>
                        <select className="year-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                            {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button className="nav-btn" onClick={() => navigateQuarter('next')}><ChevronRight size={16} /></button>
                    </div>

                    <div className="search-wrapper">
                        <Search className="search-icon" size={14} />
                        <input
                            className="form-input search-input"
                            placeholder="Cari anggota..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top 3 Podium */}
                {!loading && filtered.length >= 3 && (
                <div className="podium-grid">
                    {[filtered[1], filtered[0], filtered[2]].map((r: any, i: number) => {
                        const medals = [
                            { emoji: '🥈', color: '#94a3b8', label: '2nd' },
                            { emoji: '🥇', color: '#f59e0b', label: '1st' },
                            { emoji: '🥉', color: '#cd7f32', label: '3rd' },
                        ]
                        const medal = medals[i]
                        if (!r) return <div key={i} />
                        return (
                            <div key={r.id} className={`podium-card ${i === 1 ? 'gold-podium' : ''}`} style={{ borderTopColor: medal.color }}>
                                <div className="medal-wrapper">
                                    <span className="medal-emoji">{medal.emoji}</span>
                                    <span className="medal-rank">{medal.label}</span>
                                </div>
                                <div className="podium-info">
                                    <div className="podium-name">{r.member?.full_name}</div>
                                    <div className="podium-dept">{r.member?.department}</div>
                                </div>
                                <div className="podium-score-wrapper" style={{ background: getScoreBg(r.score) }}>
                                    <span className="podium-score" style={{ color: getScoreColor(r.score) }}>{r.score}</span>
                                </div>
                                <div className="podium-unit">poin</div>
                            </div>
                        )
                    })}
                </div>
                )}

                {/* Table */}
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Anggota</th>
                                <th>Bidang</th>
                                <th>Score</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5}>
                                    <div className="empty-state">
                                        <Trophy size={48} />
                                        <h3>Belum ada data untuk {currentPeriod}</h3>
                                        <p>Data ranking performansi belum tersedia untuk kuartal ini.</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map((r: any, i: number) => (
                                <tr key={r.id}>
                                    <td data-label="Rank" style={{ fontWeight: 700, color: i < 3 ? getScoreColor(r.score) : '#a8a29e', width: 40 }}>{i + 1}</td>
                                    <td data-label="Anggota">
                                        <div style={{ fontWeight: 600, color: '#292524' }}>{r.member?.full_name || '-'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#78716c' }}>{r.member?.role}</div>
                                    </td>
                                    <td data-label="Bidang" style={{ fontSize: '0.8125rem', color: '#57534e' }}>{r.member?.department || '-'}</td>
                                    <td data-label="Score">
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '0.2rem 0.625rem', borderRadius: 99,
                                            fontWeight: 700, fontSize: '0.875rem',
                                            background: getScoreBg(r.score), color: getScoreColor(r.score),
                                        }}>{r.score}</span>
                                    </td>
                                    <td data-label="Progress" style={{ width: 160 }}>
                                        <div className="progress-bar">
                                            <div className={`progress-bar-fill ${r.score >= 75 ? 'success' : r.score >= 50 ? 'warning' : 'danger'}`} style={{ width: `${r.score}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Other periods */}
                {allPeriods.length > 1 && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a8a29e', fontWeight: 600 }}>Periode lain:</span>
                        {allPeriods.filter(p => p !== currentPeriod).slice(0, 6).map((p: any) => {
                            const [q, y] = p.split(' ')
                            const count = rankings.filter((r: any) => r.period === p).length
                            return (
                                <button key={p}
                                    onClick={() => { setSelectedQuarter(q); setSelectedYear(Number(y)) }}
                                    style={{
                                        padding: '0.2rem 0.625rem', borderRadius: 99,
                                        border: '1px solid #e2e8f0', background: 'white',
                                        fontSize: '0.75rem', cursor: 'pointer', color: '#57534e',
                                    }}
                                >{p} <span style={{ color: '#a8a29e' }}>({count})</span></button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

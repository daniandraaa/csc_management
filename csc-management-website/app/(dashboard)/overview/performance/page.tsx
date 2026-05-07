'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, ChevronLeft, ChevronRight, Search, Calculator } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH_IDX = new Date().getMonth()
const CURRENT_QUARTER = `Q${Math.ceil((CURRENT_MONTH_IDX + 1) / 3)}`
const CURRENT_MONTH = MONTHS[CURRENT_MONTH_IDX]

function getYears() {
    const years = []
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 3; y--) years.push(y)
    return years
}

export default function OverviewPerformancePage() {
    const [rankings, setRankings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [viewType, setViewType] = useState<'quarter' | 'month'>('month')
    const [selectedQuarter, setSelectedQuarter] = useState(CURRENT_QUARTER)
    const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
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

    function navigatePeriod(dir: 'prev' | 'next') {
        if (viewType === 'quarter') {
            const qi = QUARTERS.indexOf(selectedQuarter)
            if (dir === 'next') {
                if (qi === 3) { setSelectedQuarter('Q1'); setSelectedYear(y => y + 1) }
                else setSelectedQuarter(QUARTERS[qi + 1])
            } else {
                if (qi === 0) { setSelectedQuarter('Q4'); setSelectedYear(y => y - 1) }
                else setSelectedQuarter(QUARTERS[qi - 1])
            }
        } else {
            const mi = MONTHS.indexOf(selectedMonth)
            if (dir === 'next') {
                if (mi === 11) { setSelectedMonth(MONTHS[0]); setSelectedYear(y => y + 1) }
                else setSelectedMonth(MONTHS[mi + 1])
            } else {
                if (mi === 0) { setSelectedMonth(MONTHS[11]); setSelectedYear(y => y - 1) }
                else setSelectedMonth(MONTHS[mi - 1])
            }
        }
    }

    // Integrated Logic: Quarterly is an aggregation of Monthly data
    const filteredByPeriod = useMemo(() => {
        if (viewType === 'month') {
            const periodStr = `${selectedMonth} ${selectedYear}`
            return rankings.filter((r: any) => r.period === periodStr)
        } else {
            const qMonths = {
                'Q1': ['Januari', 'Februari', 'Maret'],
                'Q2': ['April', 'Mei', 'Juni'],
                'Q3': ['Juli', 'Agustus', 'September'],
                'Q4': ['Oktober', 'November', 'Desember']
            }[selectedQuarter] || []
            
            const monthPeriods = qMonths.map(m => `${m} ${selectedYear}`)
            const relevantRankings = rankings.filter((r: any) => monthPeriods.includes(r.period))
            
            const grouped = new Map<string, any>()
            relevantRankings.forEach(r => {
                const mid = r.member_id
                if (!grouped.has(mid)) {
                    grouped.set(mid, { ...r, scoreSum: 0, count: 0, notesList: [] })
                }
                const g = grouped.get(mid)
                g.scoreSum += r.score
                g.count += 1
                if (r.notes) g.notesList.push(`${r.period.split(' ')[0]}: ${r.notes}`)
            })
            
            return Array.from(grouped.values()).map(g => ({
                ...g,
                score: parseFloat((g.scoreSum / g.count).toFixed(1)),
                notes: g.notesList.join(' | '),
                isAggregate: true,
                count: g.count
            })).sort((a, b) => b.score - a.score)
        }
    }, [viewType, selectedMonth, selectedQuarter, selectedYear, rankings])

    const filtered = filteredByPeriod.filter((r: any) =>
        r.member?.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    const currentPeriod = viewType === 'quarter' ? `${selectedQuarter} ${selectedYear}` : `${selectedMonth} ${selectedYear}`

    const allPeriods = Array.from(new Set(rankings.map((r: any) => r.period))).sort((a, b) => {
        const partsA = (a as string).split(' ')
        const partsB = (b as string).split(' ')
        if (partsA[1] !== partsB[1]) return Number(partsB[1]) - Number(partsA[1])
        const isQA = partsA[0].startsWith('Q')
        const isQB = partsB[0].startsWith('Q')
        if (isQA && isQB) return QUARTERS.indexOf(partsB[0]) - QUARTERS.indexOf(partsA[0])
        if (!isQA && !isQB) return MONTHS.indexOf(partsB[0]) - MONTHS.indexOf(partsA[0])
        return isQA ? -1 : 1
    })

    return (
        <div>
            <div className="page-container">
                <h1 className="page-title">Ranking Performansi</h1>
                <p className="page-subtitle">Lihat ranking performa anggota CSC per periode</p>

                {/* Period Type Toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <button 
                        onClick={() => setViewType('quarter')}
                        style={{ padding: '0.375rem 1rem', borderRadius: 99, border: '1px solid #e2e8f0', background: viewType === 'quarter' ? '#9A3412' : 'white', color: viewType === 'quarter' ? 'white' : '#57534e', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                    >Kuartal</button>
                    <button 
                        onClick={() => setViewType('month')}
                        style={{ padding: '0.375rem 1rem', borderRadius: 99, border: '1px solid #e2e8f0', background: viewType === 'month' ? '#9A3412' : 'white', color: viewType === 'month' ? 'white' : '#57534e', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                    >Bulanan</button>
                </div>

                {/* Toolbar */}
                <div className="performance-toolbar">
                    <div className="period-nav">
                        <button className="nav-btn" onClick={() => navigatePeriod('prev')}><ChevronLeft size={16} /></button>
                        {viewType === 'quarter' ? (
                            <div className="period-pills">
                                {QUARTERS.map(q => (
                                    <button key={q} onClick={() => setSelectedQuarter(q)} className={`pill ${selectedQuarter === q ? 'active' : ''}`}>{q}</button>
                                ))}
                            </div>
                        ) : (
                            <select className="year-select" style={{ borderRight: '1px solid #e2e8f0', paddingRight: '0.5rem' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        )}
                        <select className="year-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                            {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button className="nav-btn" onClick={() => navigatePeriod('next')}><ChevronRight size={16} /></button>
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
                                    <span className="podium-score" style={{ color: getScoreColor(r.score), display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {r.score}
                                        {r.isAggregate && <Calculator size={14} title={`Rata-rata dari ${r.count} bulan`} />}
                                    </span>
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
                                        <h3>Belum ada data untuk {viewType === 'month' ? `${selectedMonth} ${selectedYear}` : `${selectedQuarter} ${selectedYear}`}</h3>
                                        <p>Data ranking performansi belum tersedia untuk periode ini.</p>
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
                                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                            padding: '0.2rem 0.625rem', borderRadius: 99,
                                            fontWeight: 700, fontSize: '0.875rem',
                                            background: getScoreBg(r.score), color: getScoreColor(r.score),
                                        }}>
                                            {r.score}
                                            {r.isAggregate && <Calculator size={12} title={`Rata-rata dari ${r.count} bulan`} />}
                                        </span>
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
                            const parts = p.split(' ')
                            const isQ = parts[0].startsWith('Q')
                            const count = rankings.filter((r: any) => r.period === p).length
                            return (
                                <button key={p}
                                    onClick={() => { 
                                        setViewType(isQ ? 'quarter' : 'month')
                                        if (isQ) setSelectedQuarter(parts[0])
                                        else setSelectedMonth(parts[0])
                                        setSelectedYear(Number(parts[1])) 
                                    }}
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

'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Trophy, Download, Calendar, TrendingUp, FileText, Medal, ArrowUpRight, ArrowDownRight, Star } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import '../admin-responsive.css'

export default function LaporanAdministrasiPage() {
    const [activeTab, setActiveTab] = useState('rekapitulasi')
    const [loading, setLoading] = useState(true)
    const [statsData, setStatsData] = useState<any[]>([])
    const [programRanking, setProgramRanking] = useState<any[]>([])
    const [summaryStats, setSummaryStats] = useState({ total: 0, approved: 0, revisi: 0, rejected: 0, scored: 0, avgScore: 0 })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: reviews } = await supabase.from('admin_reviews').select('id, admin_status, created_at, doc_type, doc_score, program_id, submitter:members!admin_reviews_submitted_by_fkey(department)')
        const { data: programs } = await supabase.from('programs').select('id, name, department:departments(name), program_type')

        // Monthly stats
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
        const monthlyStats: Record<string, { approved: number, revisi: number, rejected: number }> = {}
        months.forEach(m => monthlyStats[m] = { approved: 0, revisi: 0, rejected: 0 })

        let totalA = 0, totalR = 0, totalRj = 0, scored = 0, scoreSum = 0

        if (reviews && reviews.length > 0) {
            reviews.forEach(r => {
                const monthStr = months[new Date(r.created_at).getMonth()]
                if (r.admin_status === 'approved') { monthlyStats[monthStr].approved++; totalA++ }
                else if (r.admin_status === 'revision_needed') { monthlyStats[monthStr].revisi++; totalR++ }
                else if (r.admin_status === 'rejected') { monthlyStats[monthStr].rejected++; totalRj++ }
                if (r.doc_score != null) { scored++; scoreSum += r.doc_score }
            })
            const currentMonthIdx = new Date().getMonth()
            const formatted = []
            for (let i = 0; i <= currentMonthIdx; i++) formatted.push({ name: months[i], ...monthlyStats[months[i]] })
            setStatsData(formatted.length > 0 ? formatted : [{ name: months[currentMonthIdx], approved: 0, revisi: 0, rejected: 0 }])
        } else {
            setStatsData([])
        }
        setSummaryStats({ total: reviews?.length || 0, approved: totalA, revisi: totalR, rejected: totalRj, scored, avgScore: scored > 0 ? Math.round(scoreSum / scored) : 0 })

        // Per-program ranking
        const progMap: Record<string, { name: string, dept: string, type: string, docs: number, approved: number, scored: number, scoreSum: number }> = {}
        if (programs) programs.forEach(p => { progMap[p.id] = { name: p.name, dept: (p.department as any)?.name || '-', type: p.program_type || 'internal', docs: 0, approved: 0, scored: 0, scoreSum: 0 } })
        if (reviews) reviews.forEach(r => {
            if (r.program_id && progMap[r.program_id]) {
                progMap[r.program_id].docs++
                if (r.admin_status === 'approved') progMap[r.program_id].approved++
                if (r.doc_score != null) { progMap[r.program_id].scored++; progMap[r.program_id].scoreSum += r.doc_score }
            }
        })
        const ranking = Object.entries(progMap)
            .filter(([, v]) => v.docs > 0)
            .map(([id, v]) => ({ id, ...v, avgScore: v.scored > 0 ? Math.round(v.scoreSum / v.scored) : 0 }))
            .sort((a, b) => b.avgScore - a.avgScore)
        setProgramRanking(ranking)
        setLoading(false)
    }

    const tabs = [
        { id: 'rekapitulasi', label: 'Rekapitulasi', icon: <BarChart3 size={16} /> },
        { id: 'leaderboard', label: 'Ranking Program Kerja', icon: <Trophy size={16} /> },
    ]

    const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32']
    const scoreColor = (s: number) => s >= 90 ? '#10b981' : s >= 80 ? '#3b82f6' : s >= 70 ? '#f59e0b' : '#ef4444'

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Laporan Administrasi</div></div>
            <div className="page-container">
                <div className="admin-page-header">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><BarChart3 size={20} /></div>
                            Laporan Administrasi
                        </h1>
                        <p className="page-subtitle">Rekapitulasi dan ranking administrasi per program kerja.</p>
                    </div>
                    <button className="btn btn-primary" style={{ gap: 6 }}><Download size={16} /> Unduh Laporan</button>
                </div>

                {/* Summary */}
                <div className="admin-stats-row">
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#8b5cf6' }}>{summaryStats.total}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Total Dokumen</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUpRight size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#10b981' }}>{summaryStats.approved}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Approved</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#dbeafe', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#3b82f6' }}>{summaryStats.avgScore}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/100</span></div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Rata-rata Skor</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f59e0b' }}>{summaryStats.scored}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/{summaryStats.total}</span></div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Dinilai</div></div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="admin-tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? 'var(--color-bg-primary)' : 'transparent', color: activeTab === tab.id ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>Memuat data...</div>
                ) : activeTab === 'rekapitulasi' ? (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4 }}>Statistik Pengajuan Dokumen</h3>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>Perbandingan status per bulan</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, fontSize: '0.8125rem', border: '1px solid var(--color-border-primary)' }}><Calendar size={14} /> {new Date().getFullYear()}</div>
                        </div>
                        {statsData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>Belum ada data</div>
                        ) : (
                            <div style={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '0.8125rem' }} />
                                        <YAxis axisLine={false} tickLine={false} style={{ fontSize: '0.8125rem' }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                        <Legend wrapperStyle={{ paddingTop: 16 }} />
                                        <Bar dataKey="approved" name="Approved" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="revisi" name="Revisi" stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* Podium top 3 programs */}
                        {programRanking.length >= 3 && (
                            <div className="admin-podium">
                                {[1, 0, 2].map(idx => {
                                    const item = programRanking[idx]
                                    if (!item) return null
                                    const isFirst = idx === 0
                                    return (
                                        <div key={idx} style={{ textAlign: 'center', width: isFirst ? 170 : 140 }}>
                                            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: isFirst ? 'linear-gradient(135deg, #fef3c7, #fffbeb)' : undefined, border: isFirst ? '2px solid #f59e0b40' : undefined }}>
                                                <Medal size={isFirst ? 32 : 24} color={medalColors[idx]} style={{ marginBottom: 8 }} />
                                                <div style={{ fontSize: isFirst ? '2rem' : '1.5rem', fontWeight: 700, color: scoreColor(item.avgScore) }}>{item.avgScore}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{item.docs} dok • {item.dept}</div>
                                            </div>
                                            <div style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 700, color: medalColors[idx] }}>#{idx + 1}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Full ranking */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-primary)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Ranking Program Kerja</h3>
                            </div>
                            {programRanking.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>Belum ada data penilaian</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead><tr>
                                            <th style={{ width: 50, textAlign: 'center' }}>Rank</th>
                                            <th>Program Kerja</th>
                                            <th>Bidang</th>
                                            <th>Tipe</th>
                                            <th style={{ textAlign: 'center' }}>Dok</th>
                                            <th style={{ textAlign: 'center' }}>Approved</th>
                                            <th style={{ textAlign: 'center' }}>Dinilai</th>
                                            <th>Skor Rata-rata</th>
                                        </tr></thead>
                                        <tbody>
                                            {programRanking.map((item, idx) => (
                                                <tr key={item.id}>
                                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                                        {idx < 3 ? <span style={{ color: medalColors[idx] }}>{idx + 1} {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}</span> : idx + 1}
                                                    </td>
                                                    <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.name}</td>
                                                    <td style={{ fontSize: '0.8125rem' }}>{item.dept}</td>
                                                    <td><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: item.type === 'collaboration' ? '#fef3c7' : '#dbeafe', color: item.type === 'collaboration' ? '#d97706' : '#2563eb' }}>{item.type === 'collaboration' ? 'Kolaborasi' : 'Internal'}</span></td>
                                                    <td style={{ textAlign: 'center' }}>{item.docs}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.approved}/{item.docs}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.scored}/{item.docs}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden', maxWidth: 120 }}>
                                                                <div style={{ height: '100%', width: `${item.avgScore}%`, background: `linear-gradient(90deg, ${scoreColor(item.avgScore)}, ${scoreColor(item.avgScore)}aa)`, borderRadius: 4, transition: 'width 0.6s' }} />
                                                            </div>
                                                            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: scoreColor(item.avgScore), minWidth: 30 }}>{item.avgScore}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

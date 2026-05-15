'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Trophy, Download, Calendar, TrendingUp, FileText, Medal, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import '../admin-responsive.css'

export default function LaporanAdministrasiPage() {
    const [activeTab, setActiveTab] = useState('rekapitulasi')
    const [loading, setLoading] = useState(true)
    const [statsData, setStatsData] = useState<any[]>([])
    const [leaderboardData, setLeaderboardData] = useState<any[]>([])
    const [summaryStats, setSummaryStats] = useState({ total: 0, approved: 0, revisi: 0, rejected: 0 })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: reviews } = await supabase.from('admin_reviews').select('admin_status, created_at, submitter:members!admin_reviews_submitted_by_fkey(department)')
        const { data: evals } = await supabase.from('admin_evaluations').select('score, program:programs(department:departments(name))')

        const monthlyStats: Record<string, { approved: number, revisi: number, rejected: number }> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
        months.forEach(m => monthlyStats[m] = { approved: 0, revisi: 0, rejected: 0 })

        let totalA = 0, totalR = 0, totalRj = 0

        if (reviews && reviews.length > 0) {
            reviews.forEach(r => {
                const monthStr = months[new Date(r.created_at).getMonth()]
                if (r.admin_status === 'approved') { monthlyStats[monthStr].approved++; totalA++ }
                else if (r.admin_status === 'revision_needed') { monthlyStats[monthStr].revisi++; totalR++ }
                else if (r.admin_status === 'rejected') { monthlyStats[monthStr].rejected++; totalRj++ }
            })
            const currentMonthIdx = new Date().getMonth()
            const formatted = []
            for (let i = 0; i <= currentMonthIdx; i++) formatted.push({ name: months[i], ...monthlyStats[months[i]] })
            setStatsData(formatted.length > 0 ? formatted : [{ name: months[currentMonthIdx], approved: 0, revisi: 0, rejected: 0 }])
        } else {
            setStatsData([])
        }
        setSummaryStats({ total: (reviews?.length || 0), approved: totalA, revisi: totalR, rejected: totalRj })

        const deptStats: Record<string, { scoreSum: number, count: number, docs: number }> = {}
        if (reviews) reviews.forEach(r => { const dept = (r.submitter as any)?.department || 'Lainnya'; if (!deptStats[dept]) deptStats[dept] = { scoreSum: 0, count: 0, docs: 0 }; deptStats[dept].docs++ })
        if (evals) evals.forEach(e => { const dept = (e.program as any)?.department?.name || 'Lainnya'; if (!deptStats[dept]) deptStats[dept] = { scoreSum: 0, count: 0, docs: 0 }; deptStats[dept].scoreSum += e.score || 0; deptStats[dept].count++ })
        const lbData = Object.keys(deptStats).map(dept => { const s = deptStats[dept]; return { bidang: dept, score: s.count > 0 ? Math.round((s.scoreSum / s.count) * 10) / 10 : 0, docs: s.docs } }).sort((a, b) => b.score - a.score)
        setLeaderboardData(lbData.length > 0 ? lbData : [])
        setLoading(false)
    }

    const tabs = [
        { id: 'rekapitulasi', label: 'Rekapitulasi & Statistik', icon: <BarChart3 size={16} /> },
        { id: 'leaderboard', label: 'Leaderboard Bidang', icon: <Trophy size={16} /> },
    ]

    const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32']

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Laporan Administrasi</div></div>
            <div className="page-container">
                {/* Header */}
                <div className="admin-page-header">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><BarChart3 size={20} /></div>
                            Laporan Administrasi
                        </h1>
                        <p className="page-subtitle">Pantau rekapitulasi, statistik, dan leaderboard kepatuhan administrasi.</p>
                    </div>
                    <button className="btn btn-primary" style={{ gap: 6 }}><Download size={16} /> Unduh Laporan</button>
                </div>

                {/* Summary Row */}
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
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f59e0b' }}>{summaryStats.revisi}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Revisi</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDownRight size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#ef4444' }}>{summaryStats.rejected}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Rejected</div></div>
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
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>Perbandingan status dokumen per bulan</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, fontSize: '0.8125rem', border: '1px solid var(--color-border-primary)' }}><Calendar size={14} /> Tahun {new Date().getFullYear()}</div>
                        </div>
                        {statsData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>Belum ada data pengajuan dokumen</div>
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
                        {/* Podium top 3 */}
                        {leaderboardData.length >= 3 && (
                            <div className="admin-podium">
                                {[1, 0, 2].map(idx => {
                                    const item = leaderboardData[idx]
                                    if (!item) return null
                                    const isFirst = idx === 0
                                    return (
                                        <div key={idx} style={{ textAlign: 'center', width: isFirst ? 160 : 140 }}>
                                            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: isFirst ? 'linear-gradient(135deg, #fef3c7, #fffbeb)' : undefined, border: isFirst ? '2px solid #f59e0b40' : undefined }}>
                                                <Medal size={isFirst ? 32 : 24} color={medalColors[idx] || '#94a3b8'} style={{ marginBottom: 8 }} />
                                                <div style={{ fontSize: isFirst ? '2rem' : '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.score}</div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{item.bidang}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{item.docs} dokumen</div>
                                            </div>
                                            <div style={{ marginTop: 8, fontSize: '0.75rem', fontWeight: 700, color: medalColors[idx] || '#94a3b8' }}>#{idx + 1}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Full leaderboard table */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border-primary)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Ranking Lengkap</h3>
                            </div>
                            {leaderboardData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>Belum ada data penilaian</div>
                            ) : (
                                <table className="data-table">
                                    <thead><tr><th style={{ width: 60, textAlign: 'center' }}>Rank</th><th>Bidang</th><th>Total Dokumen</th><th>Compliance Score</th></tr></thead>
                                    <tbody>
                                        {leaderboardData.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{idx < 3 ? <span style={{ color: medalColors[idx] }}>{idx + 1} {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}</span> : idx + 1}</td>
                                                <td style={{ fontWeight: 500 }}>{item.bidang}</td>
                                                <td>{item.docs}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ flex: 1, background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${item.score}%`, background: item.score >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : item.score >= 70 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                                                        </div>
                                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', minWidth: 36 }}>{item.score}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

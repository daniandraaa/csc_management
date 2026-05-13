'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Trophy, Download, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

export default function LaporanAdministrasiPage() {
    const [activeTab, setActiveTab] = useState('rekapitulasi')
    const [loading, setLoading] = useState(true)
    const [statsData, setStatsData] = useState<any[]>([])
    const [leaderboardData, setLeaderboardData] = useState<any[]>([])

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        
        // 1. Fetch Admin Reviews for Stats
        const { data: reviews } = await supabase
            .from('admin_reviews')
            .select('admin_status, created_at, submitter:members!admin_reviews_submitted_by_fkey(department)')

        // 2. Fetch Evaluations for Leaderboard
        const { data: evals, error: evalsError } = await supabase
            .from('admin_evaluations')
            .select('score, program:programs(department:departments(name))') // In case table is missing

        // Compute Stats Data
        const monthlyStats: Record<string, { approved: number, revisi: number, rejected: number }> = {
            'Jan': { approved: 0, revisi: 0, rejected: 0 },
            'Feb': { approved: 0, revisi: 0, rejected: 0 },
            'Mar': { approved: 0, revisi: 0, rejected: 0 },
            'Apr': { approved: 0, revisi: 0, rejected: 0 },
            'Mei': { approved: 0, revisi: 0, rejected: 0 },
            'Jun': { approved: 0, revisi: 0, rejected: 0 },
            'Jul': { approved: 0, revisi: 0, rejected: 0 },
            'Ags': { approved: 0, revisi: 0, rejected: 0 },
            'Sep': { approved: 0, revisi: 0, rejected: 0 },
            'Okt': { approved: 0, revisi: 0, rejected: 0 },
            'Nov': { approved: 0, revisi: 0, rejected: 0 },
            'Des': { approved: 0, revisi: 0, rejected: 0 },
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
        
        if (reviews && reviews.length > 0) {
            reviews.forEach(r => {
                const monthStr = months[new Date(r.created_at).getMonth()]
                if (r.admin_status === 'approved') monthlyStats[monthStr].approved++
                else if (r.admin_status === 'revision_needed') monthlyStats[monthStr].revisi++
                else if (r.admin_status === 'rejected') monthlyStats[monthStr].rejected++
            })
            // Only show months up to current
            const currentMonthIdx = new Date().getMonth()
            const formattedStats = []
            for (let i = 0; i <= currentMonthIdx; i++) {
                formattedStats.push({ name: months[i], ...monthlyStats[months[i]] })
            }
            if (formattedStats.length === 0) {
                setStatsData([{ name: months[currentMonthIdx], approved: 0, revisi: 0, rejected: 0 }])
            } else {
                setStatsData(formattedStats)
            }
        } else {
            // Mock if empty
            setStatsData([
                { name: 'Jan', approved: 40, revisi: 24, rejected: 4 },
                { name: 'Feb', approved: 30, revisi: 13, rejected: 2 },
                { name: 'Mar', approved: 20, revisi: 38, rejected: 8 },
                { name: 'Apr', approved: 27, revisi: 19, rejected: 3 },
                { name: 'Mei', approved: 18, revisi: 12, rejected: 1 },
            ])
        }

        // Compute Leaderboard
        const deptStats: Record<string, { scoreSum: number, count: number, docs: number }> = {}
        
        // Count docs per dept
        if (reviews) {
            reviews.forEach(r => {
                const dept = (r.submitter as any)?.department || 'Lainnya'
                if (!deptStats[dept]) deptStats[dept] = { scoreSum: 0, count: 0, docs: 0 }
                deptStats[dept].docs++
            })
        }
        
        // Sum scores per dept
        if (evals) {
            evals.forEach(e => {
                const dept = (e.program as any)?.department?.name || 'Lainnya'
                if (!deptStats[dept]) deptStats[dept] = { scoreSum: 0, count: 0, docs: 0 }
                deptStats[dept].scoreSum += e.score || 0
                deptStats[dept].count++
            })
        }

        const lbData = Object.keys(deptStats).map(dept => {
            const stat = deptStats[dept]
            const avgScore = stat.count > 0 ? Math.round((stat.scoreSum / stat.count) * 10) / 10 : 0
            return {
                bidang: dept,
                score: avgScore,
                docs: stat.docs
            }
        }).sort((a, b) => b.score - a.score)

        if (lbData.length > 0) {
            setLeaderboardData(lbData)
        } else {
            setLeaderboardData([
                { bidang: 'Sekretari', score: 92.3, docs: 45 },
                { bidang: 'Media & Kominfo', score: 87.1, docs: 36 },
                { bidang: 'PSDM', score: 75.4, docs: 31 },
                { bidang: 'Sosial Masyarakat', score: 68.2, docs: 21 },
                { bidang: 'Kewirausahaan', score: 62.7, docs: 18 },
            ])
        }

        setLoading(false)
    }

    return (
        <div>
            <div className="topbar">
                <div className="topbar-title">Laporan Administrasi</div>
            </div>
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h1 className="page-title">Laporan Administrasi</h1>
                        <p className="page-subtitle">Pantau rekapitulasi, statistik, dan leaderboard kepatuhan administrasi.</p>
                    </div>
                    <button className="btn btn-primary"><Download size={16} /> Unduh Laporan</button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border-primary)', marginBottom: '1.5rem' }}>
                    <button 
                        onClick={() => setActiveTab('rekapitulasi')}
                        style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'rekapitulasi' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'rekapitulasi' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', fontWeight: activeTab === 'rekapitulasi' ? 600 : 400, background: 'transparent', cursor: 'pointer' }}
                    >
                        Rekapitulasi & Statistik
                    </button>
                    <button 
                        onClick={() => setActiveTab('leaderboard')}
                        style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'leaderboard' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'leaderboard' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', fontWeight: activeTab === 'leaderboard' ? 600 : 400, background: 'transparent', cursor: 'pointer' }}
                    >
                        Leaderboard Bidang
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</div>
                ) : activeTab === 'rekapitulasi' ? (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Statistik Pengajuan Dokumen</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: 8, fontSize: '0.8125rem' }}>
                                <Calendar size={14} /> Tahun {new Date().getFullYear()}
                            </div>
                        </div>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="approved" name="Approved" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="revisi" name="Revisi" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                                    <th>Bidang</th>
                                    <th>Total Dokumen</th>
                                    <th>Compliance Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboardData.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {idx === 0 ? <span style={{ color: '#f59e0b' }}>1 🏆</span> : idx + 1}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{item.bidang}</td>
                                        <td>{item.docs}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${item.score}%`, background: item.score >= 80 ? '#10b981' : item.score >= 70 ? '#3b82f6' : '#f59e0b' }} />
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.score}</span>
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
    )
}

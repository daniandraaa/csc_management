'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatCurrency, formatDateShort, getInitials } from '@/lib/utils'
import {
    Users, FolderKanban, DollarSign, BarChart3,
    TrendingUp, TrendingDown, CalendarCheck, FileText,
    ArrowUpRight, CheckCircle2, Clock, AlertTriangle,
    Receipt, Handshake, Trophy
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'

export default function DashboardPage() {
    const { currentUser } = useCurrentUser()
    const [memberCount, setMemberCount] = useState(0)
    const [programCount, setProgramCount] = useState(0)
    const [totalBudget, setTotalBudget] = useState(0)
    const [myAttendance, setMyAttendance] = useState({ rate: 0, present: 0, total: 0 })
    const [programStatus, setProgramStatus] = useState<any[]>([])
    const [financeHistory, setFinanceHistory] = useState<any[]>([])
    const [recentLogs, setRecentLogs] = useState<any[]>([])
    const [quickStats, setQuickStats] = useState({ events: 0, sop: 0, pendingReimburse: 0, partners: 0 })
    const [topRankings, setTopRankings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadDashboardData() {
            setLoading(true)
            
            // 1. Basic Stats
            const { count: members } = await supabase.from('members').select('*', { count: 'exact', head: true })
            const { count: programs } = await supabase.from('programs').select('*', { count: 'exact', head: true })
            const { data: txns } = await supabase.from('financial_transactions').select('amount, type, transaction_date')
            
            setMemberCount(members || 0)
            setProgramCount(programs || 0)
            
            const income = txns?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0
            setTotalBudget(income)

            // 2. My Attendance
            if (currentUser) {
                const { data: att } = await supabase.from('attendance_session_members').select('status').eq('member_id', currentUser.id)
                if (att?.length) {
                    const present = att.filter(a => a.status === 'present').length
                    setMyAttendance({ rate: (present / att.length) * 100, present, total: att.length })
                }
            }

            // 3. Program Status Chart
            const { data: progData } = await supabase.from('programs').select('status')
            const statusCounts: Record<string, number> = { 'completed': 0, 'on_going': 0, 'planned': 0, 'cancelled': 0 }
            progData?.forEach(p => { if (statusCounts[p.status] !== undefined) statusCounts[p.status]++ })
            setProgramStatus([
                { name: 'Selesai', value: statusCounts.completed, color: '#22c55e' },
                { name: 'Proses', value: statusCounts.on_going, color: '#3b82f6' },
                { name: 'Rencana', value: statusCounts.planned, color: '#f59e0b' },
                { name: 'Batal', value: statusCounts.cancelled, color: '#ef4444' },
            ])

            // 4. Finance Chart (last 6 months)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const financeMap: Record<string, { income: number, expense: number }> = {}
            txns?.forEach(t => {
                const m = months[new Date(t.transaction_date).getMonth()]
                if (!financeMap[m]) financeMap[m] = { income: 0, expense: 0 }
                if (t.type === 'income') financeMap[m].income += t.amount
                else financeMap[m].expense += t.amount
            })
            const currentMonthIdx = new Date().getMonth()
            const chartData = months.slice(Math.max(0, currentMonthIdx - 5), currentMonthIdx + 1).map(m => ({
                name: m,
                income: financeMap[m]?.income || 0,
                expense: financeMap[m]?.expense || 0
            }))
            setFinanceHistory(chartData)

            // 5. Recent Activities
            const logs: any[] = []
            const { data: rProg } = await supabase.from('programs').select('name, created_at').order('created_at', { ascending: false }).limit(2)
            const { data: rReim } = await supabase.from('reimbursements').select('title, status, created_at').order('created_at', { ascending: false }).limit(2)
            const { data: rDocs } = await supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2)
            const { data: rMemb } = await supabase.from('members').select('full_name, created_at').order('created_at', { ascending: false }).limit(2)
            
            rProg?.forEach(p => logs.push({ id: `p-${p.name}`, action: `Program baru: ${p.name}`, time: formatDateShort(p.created_at), type: 'info', rawTime: p.created_at }))
            rReim?.forEach(r => logs.push({ id: `r-${r.title}`, action: `Reimburse: ${r.title} (${r.status})`, time: formatDateShort(r.created_at), type: r.status === 'pending' ? 'warning' : 'success', rawTime: r.created_at }))
            rDocs?.forEach(d => logs.push({ id: `d-${d.title}`, action: `Dokumen baru: ${d.title}`, time: formatDateShort(d.created_at), type: 'info', rawTime: d.created_at }))
            rMemb?.forEach(m => logs.push({ id: `m-${m.full_name}`, action: `Anggota baru: ${m.full_name}`, time: formatDateShort(m.created_at), type: 'success', rawTime: m.created_at }))
            
            setRecentLogs(logs.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime()).slice(0, 5))

            // 6. Quick Stats
            const { count: sCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('category', 'SOP')
            const { count: rCount } = await supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('status', 'pending')
            const { count: pCount } = await supabase.from('business_partners').select('*', { count: 'exact', head: true })
            const { count: eCount } = await supabase.from('programs').select('*', { count: 'exact', head: true }) 
            
            setQuickStats({ events: eCount || 0, sop: sCount || 0, pendingReimburse: rCount || 0, partners: pCount || 0 })

            // 7. Top Performance (Current Month)
            const currentMonthStr = `${months[currentMonthIdx]} ${new Date().getFullYear()}`
            const { data: perf } = await supabase.from('performance_rankings')
                .select('*, member:members(full_name, department, photo_url)')
                .eq('period', currentMonthStr)
                .order('score', { ascending: false })
                .limit(5)
            setTopRankings(perf || [])
            
            setLoading(false)
        }
        loadDashboardData()
    }, [currentUser])

    return (
        <div>
            <div className="topbar">
                <div className="topbar-title">Dashboard Overview</div>
            </div>

            <div className="page-container">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 className="page-title">Selamat Datang, {currentUser?.full_name || 'User'} di CSC Management 👋</h1>
                    <p className="page-subtitle">Community Support Center — Telkom University</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><Users size={22} /></div>
                        <div><div className="stat-value" style={{ color: 'var(--color-info)' }}>{memberCount}</div><div className="stat-label">Total Anggota</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><FolderKanban size={22} /></div>
                        <div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{programCount}</div><div className="stat-label">Program Kerja</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><DollarSign size={22} /></div>
                        <div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>{formatCurrency(totalBudget).replace('Rp', '').trim()}</div><div className="stat-label">Total Pemasukan</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#faf5ff', color: '#a855f7' }}><CalendarCheck size={22} /></div>
                        <div><div className="stat-value" style={{ color: '#a855f7' }}>{myAttendance.rate.toFixed(0)}%</div><div className="stat-label">Kehadiran Saya</div></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <div className="card lg:col-span-2">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div><h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Tren KPI Organisasi</h3><p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Target vs Aktual (6 bulan terakhir)</p></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16} style={{ color: 'var(--color-success)' }} /><span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-success)' }}>+8.2%</span></div>
                        </div>
                        <div style={{ height: 240, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    { name: 'Jan', target: 85, actual: 78 },
                                    { name: 'Feb', target: 85, actual: 82 },
                                    { name: 'Mar', target: 85, actual: 90 },
                                    { name: 'Apr', target: 90, actual: 88 },
                                    { name: 'May', target: 90, actual: 92 },
                                    { name: 'Jun', target: 90, actual: 95 },
                                ]}>
                                    <defs><linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[50, 100]} /><Tooltip /><Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#colorActual)" /><Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Status Program Kerja</h3>
                        <div style={{ height: 200, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={programStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">{programStatus.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>{programStatus.map((item) => <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} /><span style={{ color: 'var(--color-text-secondary)' }}>{item.name} ({item.value})</span></div>)}</div>
                    </div>
                </div>

                {/* Top Performance Podium */}
                {!loading && topRankings.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div><h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Top Performansi Bulan Ini</h3><p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Ranking 3 besar anggota dengan skor tertinggi</p></div>
                            <a href="/overview/performance" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-600)' }}>Lihat Semua <ArrowUpRight size={14} /></a>
                        </div>
                        
                        <div className="podium-grid" style={{ minHeight: 'auto', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end' }}>
                            {/* 2nd Place */}
                            {topRankings[1] && (
                                <div className="podium-card" style={{ borderTopColor: '#94a3b8', padding: '1.5rem 0.75rem', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 8px', background: '#94a3b8', color: 'white', fontSize: '0.625rem', fontWeight: 800, borderBottomLeftRadius: 8 }}>#2</div>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', border: '2px solid #94a3b8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {topRankings[1].member?.photo_url ? (
                                            <img src={topRankings[1].member.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>{getInitials(topRankings[1].member?.full_name)}</span>
                                        )}
                                    </div>
                                    <div className="podium-info">
                                        <div className="podium-name" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{topRankings[1].member?.full_name}</div>
                                        <div className="podium-dept" style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)' }}>{topRankings[1].member?.department}</div>
                                    </div>
                                    <div className="podium-score-wrapper" style={{ width: 42, height: 42, background: '#f1f5f9', marginTop: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        <span className="podium-score" style={{ fontSize: '0.875rem', color: '#64748b' }}>{topRankings[1].score}</span>
                                    </div>
                                </div>
                            )}

                            {/* 1st Place */}
                            {topRankings[0] && (
                                <div className="podium-card gold-podium" style={{ 
                                    padding: '2.5rem 1rem', 
                                    position: 'relative', 
                                    boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.15), 0 10px 10px -5px rgba(245, 158, 11, 0.04)',
                                    transform: 'scale(1.05)',
                                    zIndex: 2,
                                    borderWidth: 1,
                                    borderTopWidth: 6,
                                    borderTopColor: '#f59e0b',
                                    background: 'linear-gradient(to bottom, #fffcf0, #ffffff)'
                                }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '6px 12px', background: '#f59e0b', color: 'white', fontSize: '0.75rem', fontWeight: 900, borderBottomLeftRadius: 10 }}>#1</div>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fffbeb', border: '3px solid #f59e0b', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }}>
                                        {topRankings[0].member?.photo_url ? (
                                            <img src={topRankings[0].member.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.25rem' }}>{getInitials(topRankings[0].member?.full_name)}</span>
                                        )}
                                    </div>
                                    <div className="podium-info">
                                        <div className="podium-name" style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#92400e' }}>{topRankings[0].member?.full_name}</div>
                                        <div className="podium-dept" style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>{topRankings[0].member?.department}</div>
                                    </div>
                                    <div className="podium-score-wrapper" style={{ width: 56, height: 56, background: '#f59e0b', marginTop: '1rem', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)' }}>
                                        <span className="podium-score" style={{ fontSize: '1.125rem', color: 'white', fontWeight: 900 }}>{topRankings[0].score}</span>
                                    </div>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {topRankings[2] && (
                                <div className="podium-card" style={{ borderTopColor: '#b45309', padding: '1.25rem 0.5rem', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 8px', background: '#b45309', color: 'white', fontSize: '0.625rem', fontWeight: 800, borderBottomLeftRadius: 8 }}>#3</div>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff7ed', border: '2px solid #b45309', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {topRankings[2].member?.photo_url ? (
                                            <img src={topRankings[2].member.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.8125rem' }}>{getInitials(topRankings[2].member?.full_name)}</span>
                                        )}
                                    </div>
                                    <div className="podium-info">
                                        <div className="podium-name" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{topRankings[2].member?.full_name}</div>
                                        <div className="podium-dept" style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)' }}>{topRankings[2].member?.department}</div>
                                    </div>
                                    <div className="podium-score-wrapper" style={{ width: 38, height: 38, background: '#fff7ed', marginTop: '0.5rem', border: '1px solid #ffedd5' }}>
                                        <span className="podium-score" style={{ fontSize: '0.8125rem', color: '#b45309' }}>{topRankings[2].score}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Keuangan (Pemasukan vs Pengeluaran)</h3>
                        <div style={{ height: 220, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financeHistory}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} /><Tooltip formatter={(value) => formatCurrency(Number(value || 0))} /><Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Pemasukan" /><Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pengeluaran" /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Aktivitas Terbaru</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentLogs.length === 0 ? <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Belum ada aktivitas</p> : recentLogs.map((activity) => <div key={activity.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><div style={{ marginTop: '0.125rem' }}>{activity.type === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />}{activity.type === 'warning' && <Clock size={16} style={{ color: 'var(--color-warning)' }} />}{activity.type === 'info' && <ArrowUpRight size={16} style={{ color: 'var(--color-info)' }} />}{activity.type === 'danger' && <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />}</div><div style={{ flex: 1 }}><p style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{activity.action}</p><span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{activity.time}</span></div></div>)}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#fff1f2', color: '#e11d48' }}><CalendarCheck size={22} /></div>
                        <div>
                            <div className="stat-value" style={{ color: '#e11d48' }}>{quickStats.events}</div>
                            <div className="stat-label">Event Aktif</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><FileText size={22} /></div>
                        <div>
                            <div className="stat-value" style={{ color: '#7c3aed' }}>{quickStats.sop}</div>
                            <div className="stat-label">Dokumen SOP</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><Receipt size={22} /></div>
                        <div>
                            <div className="stat-value" style={{ color: '#ea580c' }}>{quickStats.pendingReimburse}</div>
                            <div className="stat-label">Pending Reimburse</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Handshake size={22} /></div>
                        <div>
                            <div className="stat-value" style={{ color: '#16a34a' }}>{quickStats.partners}</div>
                            <div className="stat-label">Mitra Bisnis</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

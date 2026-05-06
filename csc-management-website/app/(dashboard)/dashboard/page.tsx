'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
    Users, FolderKanban, DollarSign, BarChart3,
    TrendingUp, TrendingDown, CalendarCheck, FileText,
    ArrowUpRight, CheckCircle2, Clock, AlertTriangle,
    Receipt, Handshake
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'

// Sample data for charts (will be replaced with Supabase data)
const kpiData = [
    { name: 'Jan', target: 85, actual: 78 },
    { name: 'Feb', target: 85, actual: 82 },
    { name: 'Mar', target: 85, actual: 90 },
    { name: 'Apr', target: 90, actual: 88 },
    { name: 'May', target: 90, actual: 92 },
    { name: 'Jun', target: 90, actual: 95 },
]

const programStatusData = [
    { name: 'Completed', value: 8, color: '#22c55e' },
    { name: 'In Progress', value: 5, color: '#3b82f6' },
    { name: 'Planned', value: 3, color: '#f59e0b' },
    { name: 'Cancelled', value: 1, color: '#ef4444' },
]

const financeData = [
    { name: 'Jan', income: 5000000, expense: 3200000 },
    { name: 'Feb', income: 7500000, expense: 4100000 },
    { name: 'Mar', income: 6200000, expense: 5800000 },
    { name: 'Apr', income: 8100000, expense: 4500000 },
    { name: 'May', income: 9500000, expense: 6200000 },
    { name: 'Jun', income: 11000000, expense: 7300000 },
]

const recentActivities = [] // Will be populated from DB

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

            // 5. Recent Activities (from multiple tables)
            const logs: any[] = []
            const { data: rProg } = await supabase.from('programs').select('name, created_at').order('created_at', { ascending: false }).limit(2)
            const { data: rReim } = await supabase.from('reimbursements').select('title, status, created_at').order('created_at', { ascending: false }).limit(2)
            const { data: rDocs } = await supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2)
            
            rProg?.forEach(p => logs.push({ id: `p-${p.name}`, action: `Program baru: ${p.name}`, time: formatDateShort(p.created_at), type: 'info', rawTime: p.created_at }))
            rReim?.forEach(r => logs.push({ id: `r-${r.title}`, action: `Reimburse: ${r.title} (${r.status})`, time: formatDateShort(r.created_at), type: r.status === 'pending' ? 'warning' : 'success', rawTime: r.created_at }))
            rDocs?.forEach(d => logs.push({ id: `d-${d.title}`, action: `Dokumen baru: ${d.title}`, time: formatDateShort(d.created_at), type: 'info', rawTime: d.created_at }))
            
            setRecentLogs(logs.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime()).slice(0, 5))

            // 6. Quick Stats
            const { count: sCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('category', 'SOP')
            const { count: rCount } = await supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('status', 'pending')
            const { count: pCount } = await supabase.from('business_partners').select('*', { count: 'exact', head: true })
            const { count: eCount } = await supabase.from('programs').select('*', { count: 'exact', head: true }) // using programs as events
            
            setQuickStats({ events: eCount || 0, sop: sCount || 0, pendingReimburse: rCount || 0, partners: pCount || 0 })
            
            setLoading(false)
        }
        loadDashboardData()
    }, [currentUser])

    return (
        <div>
            {/* Top Bar */}
            <div className="topbar">
                <div className="topbar-title">Dashboard Overview</div>
                <div className="topbar-actions" style={{ display: 'none' }}> {/* Hidden on mobile, handled by mobile header */}
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            <div className="page-container">
                {/* Welcome */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 className="page-title">Selamat Datang di CSC Management 👋</h1>
                    <p className="page-subtitle">Community Support Center — Telkom University</p>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                            <Users size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--color-info)' }}>{memberCount || 0}</div>
                            <div className="stat-label">Total Anggota</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                            <FolderKanban size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{programCount || 0}</div>
                            <div className="stat-label">Program Kerja</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{formatCurrency(totalBudget).replace('Rp', '').trim()}</div>
                            <div className="stat-label">Total Pemasukan</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#faf5ff', color: '#a855f7' }}>
                            <CalendarCheck size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: '#a855f7' }}>{myAttendance.rate.toFixed(0)}%</div>
                            <div className="stat-label">Kehadiran Saya</div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    {/* KPI Trend Chart */}
                    <div className="card lg:col-span-2">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Tren KPI Organisasi</h3>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Target vs Aktual (6 bulan terakhir)</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-success)' }}>+8.2%</span>
                            </div>
                        </div>
                        <div style={{ height: 240, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={kpiData}>
                                    <defs>
                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[50, 100]} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#colorActual)" />
                                    <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Program Status Pie */}
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Status Program Kerja</h3>
                        <div style={{ height: 200, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={programStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {programStatus.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                            {programStatus.map((item) => (
                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.name} ({item.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Finance Chart */}
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Keuangan (Pemasukan vs Pengeluaran)</h3>
                        <div style={{ height: 220, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financeHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Pemasukan" />
                                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Aktivitas Terbaru</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentLogs.length === 0 ? <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Belum ada aktivitas</p> : 
                             recentLogs.map((activity) => (
                                <div key={activity.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                    <div style={{ marginTop: '0.125rem' }}>
                                        {activity.type === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />}
                                        {activity.type === 'warning' && <Clock size={16} style={{ color: 'var(--color-warning)' }} />}
                                        {activity.type === 'info' && <ArrowUpRight size={16} style={{ color: 'var(--color-info)' }} />}
                                        {activity.type === 'danger' && <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{activity.action}</p>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{activity.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="stats-grid">
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <CalendarCheck size={24} style={{ color: 'var(--color-brand-500)', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{quickStats.events}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Event Aktif</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <FileText size={24} style={{ color: '#a855f7', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{quickStats.sop}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Dokumen SOP</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <Receipt size={24} style={{ color: '#f59e0b', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{quickStats.pendingReimburse}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Pending Reimburse</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <Handshake size={24} style={{ color: '#22c55e', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{quickStats.partners}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Mitra Bisnis</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

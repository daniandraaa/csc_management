'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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

const recentActivities = [
    { id: 1, action: 'Program kerja "Workshop AI" telah selesai', time: '2 jam lalu', type: 'success' },
    { id: 2, action: 'Reimbursement oleh Ahmad Fauzi menunggu approval', time: '3 jam lalu', type: 'warning' },
    { id: 3, action: 'SOP baru untuk divisi Marketing ditambahkan', time: '5 jam lalu', type: 'info' },
    { id: 4, action: 'Event "Weekly Meeting" dijadwalkan', time: '1 hari lalu', type: 'info' },
    { id: 5, action: 'Review administrasi ditolak oleh Sekretaris', time: '1 hari lalu', type: 'danger' },
]

export default function DashboardPage() {
    const [memberCount, setMemberCount] = useState(0)
    const [programCount, setProgramCount] = useState(0)

    useEffect(() => {
        async function loadCounts() {
            const { count: members } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
            const { count: programs } = await supabase
                .from('programs')
                .select('*', { count: 'exact', head: true })
            setMemberCount(members || 0)
            setProgramCount(programs || 0)
        }
        loadCounts()
    }, [])

    return (
        <div>
            {/* Top Bar */}
            <div className="topbar">
                <div className="topbar-title">Dashboard Overview</div>
                <div className="topbar-actions">
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
                            <div className="stat-value" style={{ color: 'var(--color-info)' }}>{memberCount || 24}</div>
                            <div className="stat-label">Total Anggota</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                            <FolderKanban size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{programCount || 17}</div>
                            <div className="stat-label">Program Kerja</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>47.3jt</div>
                            <div className="stat-label">Total Anggaran</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#faf5ff', color: '#a855f7' }}>
                            <BarChart3 size={22} />
                        </div>
                        <div>
                            <div className="stat-value" style={{ color: '#a855f7' }}>87%</div>
                            <div className="stat-label">KPI Rata-rata</div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    {/* KPI Trend Chart */}
                    <div className="card">
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
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={kpiData}>
                                <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[50, 100]} />
                                <Tooltip />
                                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#colorActual)" />
                                <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Program Status Pie */}
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Status Program Kerja</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={programStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {programStatusData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                            {programStatusData.map((item) => (
                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.name} ({item.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Finance Chart */}
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Keuangan (Pemasukan vs Pengeluaran)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={financeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                                <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Pemasukan" />
                                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent Activities */}
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Aktivitas Terbaru</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentActivities.map((activity) => (
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <CalendarCheck size={24} style={{ color: 'var(--color-brand-500)', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>12</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Event Bulan Ini</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <FileText size={24} style={{ color: '#a855f7', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>8</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>SOP Aktif</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <Receipt size={24} style={{ color: '#f59e0b', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>3</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Pending Reimburse</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                        <Handshake size={24} style={{ color: '#22c55e', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>6</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Mitra Aktif</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

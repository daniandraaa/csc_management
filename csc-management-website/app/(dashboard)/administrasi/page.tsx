'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
    FileText, 
    FileWarning, 
    FileEdit, 
    CheckCircle2, 
    Clock, 
    MoreVertical, 
    Trophy,
    AlertTriangle
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { getStatusColor, getStatusLabel, formatDateShort } from '@/lib/utils'

export default function AdministrasiDashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        total: 128,
        pending: 34,
        revisi: 26,
        approved: 68,
        overdue: 7
    })
    const [recentDocs, setRecentDocs] = useState<any[]>([])
    const [complianceScore, setComplianceScore] = useState(0)
    const [totalEvaluated, setTotalEvaluated] = useState(0)
    const [totalPrograms, setTotalPrograms] = useState(0)
    const [pieData, setPieData] = useState<any[]>([])
    const [leaderboardData, setLeaderboardData] = useState<any[]>([])
    
    const [ringkasanBulanIni, setRingkasanBulanIni] = useState({
        totalRevisi: 0,
        rataRata: 0,
        tepatWaktu: 0,
        terlambat: 0
    })
    const [deadlinesData, setDeadlinesData] = useState<any[]>([])

    const [kesalahanSering, setKesalahanSering] = useState<any[]>([])

    useEffect(() => {
        loadRealData()
    }, [])

    async function loadRealData() {
        setLoading(true)
        
        // 1. Fetch Total Programs for Compliance Score
        const { count: pCount } = await supabase.from('programs').select('*', { count: 'exact', head: true })
        if (pCount) setTotalPrograms(pCount)

        // 2. Fetch Recent Documents with Program Dates
        const { data: docs } = await supabase
            .from('admin_reviews')
            .select(`
                *,
                submitter:members!admin_reviews_submitted_by_fkey(full_name,department,role),
                document:documents(title, document_number, file_url, type, program:programs(name, start_date, end_date))
            `)
            .order('created_at', { ascending: false })

        if (docs && docs.length > 0) {
            // Setup recent docs (limit 5 for table)
            const recent = docs.slice(0, 5).map(d => ({
                id: d.id,
                nama: d.title,
                jenis: d.document?.type === 'lpj' ? 'LPJ' : d.document?.type === 'proposal' ? 'Proposal' : 'TOR',
                proker: d.title.replace('Review: ', '').replace('LPJ ', '').replace('Proposal ', ''),
                bidang: d.submitter?.department || '-',
                pic: d.submitter?.full_name || '-',
                tanggal: d.created_at,
                status: d.admin_status,
                revisi: d.revision_count || 0
            }))
            setRecentDocs(recent)

            // Calculate Ringkasan Bulan Ini
            let revThisMonth = 0
            let docCountThisMonth = 0
            let onTime = 0
            let late = 0
            const currentMonth = new Date().getMonth()

            docs.forEach(r => {
                const createdDate = new Date(r.created_at)
                if (createdDate.getMonth() === currentMonth) {
                    docCountThisMonth++
                    revThisMonth += (r.revision_count || 0)
                    
                    // Deadline rule: Proposal (Start Date - 14 days), LPJ (End Date + 14 days)
                    const prog = r.document?.program
                    const type = r.document?.type?.toLowerCase()
                    if (prog && prog.start_date && type === 'proposal') {
                        const deadline = new Date(prog.start_date)
                        deadline.setDate(deadline.getDate() - 14)
                        if (createdDate <= deadline) onTime++
                        else late++
                    } else if (prog && prog.end_date && type === 'lpj') {
                        const deadline = new Date(prog.end_date)
                        deadline.setDate(deadline.getDate() + 14)
                        if (createdDate <= deadline) onTime++
                        else late++
                    } else {
                        onTime++ // Default on-time
                    }
                }
            })

            setRingkasanBulanIni({
                totalRevisi: revThisMonth,
                rataRata: docCountThisMonth > 0 ? Math.round((revThisMonth / docCountThisMonth) * 10) / 10 : 0,
                tepatWaktu: docCountThisMonth > 0 ? Math.round((onTime / docCountThisMonth) * 100) : 0,
                terlambat: late
            })

            // Calculate Kesalahan Paling Sering
            const errorCounts: Record<string, number> = {
                'TTD Pembina belum ada': 0,
                'Margin / Format tidak sesuai': 0,
                'Lampiran tidak lengkap': 0,
                'Data keuangan tidak sinkron': 0,
                'Nama file tidak sesuai': 0,
            }
            
            docs.forEach(r => {
                if (r.admin_status === 'revision_needed' && r.admin_notes) {
                    const notes = r.admin_notes.toLowerCase();
                    if (notes.includes('ttd') || notes.includes('tanda tangan') || notes.includes('paraf')) errorCounts['TTD Pembina belum ada']++;
                    if (notes.includes('format') || notes.includes('margin') || notes.includes('font') || notes.includes('spasi') || notes.includes('rata')) errorCounts['Margin / Format tidak sesuai']++;
                    if (notes.includes('lampiran') || notes.includes('nota') || notes.includes('kuitansi') || notes.includes('bukti')) errorCounts['Lampiran tidak lengkap']++;
                    if (notes.includes('uang') || notes.includes('dana') || notes.includes('anggaran') || notes.includes('budget') || notes.includes('keuangan') || notes.includes('rab')) errorCounts['Data keuangan tidak sinkron']++;
                    if (notes.includes('nama file') || notes.includes('judul file') || notes.includes('format file')) errorCounts['Nama file tidak sesuai']++;
                }
            })
            
            const sortedErrors = Object.keys(errorCounts).map(k => ({ masalah: k, count: errorCounts[k] }))
                                       .sort((a, b) => b.count - a.count)
                                       .filter(e => e.count > 0)
            
            setKesalahanSering(sortedErrors)

            // Calculate Pie Chart (Statistik per bidang)
            const deptCounts: Record<string, number> = {}
            docs.forEach(d => {
                const dept = d.submitter?.department || 'Lainnya'
                deptCounts[dept] = (deptCounts[dept] || 0) + 1
            })
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#64748b']
            const pd = Object.keys(deptCounts).map((dept, i) => ({
                name: dept,
                value: deptCounts[dept],
                color: colors[i % colors.length]
            })).sort((a, b) => b.value - a.value)
            setPieData(pd)

        } else {
            setRecentDocs([])
            setPieData([])
        }
        
        // 3. Fetch KPI Stats
        const { count: totalDocs } = await supabase.from('admin_reviews').select('*', { count: 'exact', head: true })
        const { count: pendingDocs } = await supabase.from('admin_reviews').select('*', { count: 'exact', head: true }).eq('admin_status', 'pending')
        const { count: revisiDocs } = await supabase.from('admin_reviews').select('*', { count: 'exact', head: true }).eq('admin_status', 'revision_needed')
        const { count: approvedDocs } = await supabase.from('admin_reviews').select('*', { count: 'exact', head: true }).eq('admin_status', 'approved')

        if (totalDocs !== null) {
            setStats(prev => ({
                ...prev,
                total: totalDocs || 0,
                pending: pendingDocs || 0,
                revisi: revisiDocs || 0,
                approved: approvedDocs || 0
            }))
        }

        // 4. Fetch Evaluations for Compliance Score and Leaderboard
        const { data: evals, error: evalsError } = await supabase
            .from('admin_evaluations')
            .select('score, program:programs(department:departments(name))')
        
        if (evals && evals.length > 0) {
            setTotalEvaluated(evals.length)
            const sum = evals.reduce((acc, curr) => acc + (curr.score || 0), 0)
            setComplianceScore(Math.round(sum / evals.length))

            const deptStats: Record<string, { sum: number, count: number }> = {}
            evals.forEach(e => {
                const dept = e.program?.department?.name || 'Lainnya'
                if (!deptStats[dept]) deptStats[dept] = { sum: 0, count: 0 }
                deptStats[dept].sum += (e.score || 0)
                deptStats[dept].count++
            })
            const lbData = Object.keys(deptStats).map(dept => ({
                bidang: dept,
                score: Math.round((deptStats[dept].sum / deptStats[dept].count) * 10) / 10
            })).sort((a, b) => b.score - a.score)
            setLeaderboardData(lbData)
        } else {
            setComplianceScore(0)
            setTotalEvaluated(0)
            setLeaderboardData([])
        }

        // 5. Calculate Upcoming Deadlines from Programs
        const { data: allPrograms } = await supabase.from('programs').select('name, start_date, end_date')
        const upcoming: any[] = []
        const today = new Date()
        today.setHours(0,0,0,0)
        
        if (allPrograms) {
            allPrograms.forEach(p => {
                if (p.start_date) {
                    const propDead = new Date(p.start_date)
                    propDead.setDate(propDead.getDate() - 14)
                    // Tampilkan deadline dari H-7 yang terlewat hingga masa depan
                    if (propDead >= new Date(today.getTime() - 7 * 24 * 3600 * 1000)) {
                        const diffDays = Math.ceil((propDead.getTime() - today.getTime()) / (1000 * 3600 * 24))
                        const status = diffDays === 0 ? 'Hari Ini' : diffDays < 0 ? `Terlewat ${Math.abs(diffDays)} Hari` : `H-${diffDays}`
                        upcoming.push({ judul: `Proposal ${p.name}`, tgl: formatDateShort(propDead.toISOString()), dateObj: propDead, status })
                    }
                }
                if (p.end_date) {
                    const lpjDead = new Date(p.end_date)
                    lpjDead.setDate(lpjDead.getDate() + 14)
                    if (lpjDead >= new Date(today.getTime() - 7 * 24 * 3600 * 1000)) {
                        const diffDays = Math.ceil((lpjDead.getTime() - today.getTime()) / (1000 * 3600 * 24))
                        const status = diffDays === 0 ? 'Hari Ini' : diffDays < 0 ? `Terlewat ${Math.abs(diffDays)} Hari` : `H-${diffDays}`
                        upcoming.push({ judul: `LPJ ${p.name}`, tgl: formatDateShort(lpjDead.toISOString()), dateObj: lpjDead, status })
                    }
                }
            })
        }
        
        upcoming.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        setDeadlinesData(upcoming.slice(0, 4))

        setLoading(false)
    }

    const GaugeChart = ({ score }: { score: number }) => {
        const radius = 60;
        const circumference = Math.PI * radius;
        const strokeDashoffset = circumference - (score / 100) * circumference;
        const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score > 0 ? '#ef4444' : '#cbd5e1';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: 110, marginTop: 20 }}>
                <svg width="160" height="90" viewBox="0 0 160 90">
                    {/* Background Arc */}
                    <path
                        d="M 20 80 A 60 60 0 0 1 140 80"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="16"
                        strokeLinecap="round"
                    />
                    {/* Value Arc */}
                    <path
                        d="M 20 80 A 60 60 0 0 1 140 80"
                        fill="none"
                        stroke={color}
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={score === 0 ? circumference : strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                </svg>
                <div style={{ position: 'absolute', top: 35, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{score}%</div>
                    <div style={{ fontSize: '0.8125rem', color: color, fontWeight: 600, marginTop: 4 }}>
                        {score >= 80 ? 'Cukup Baik' : score >= 60 ? 'Perlu Ditingkatkan' : score > 0 ? 'Kritis' : 'Belum Ada Penilaian'}
                    </div>
                </div>
            </div>
        )
    }

    const typeColor = (type: string) => {
        switch(type?.toUpperCase()) {
            case 'LPJ': return { bg: '#dcfce7', text: '#166534' }
            case 'PROPOSAL': return { bg: '#dbeafe', text: '#1e40af' }
            case 'TOR': return { bg: '#f3e8ff', text: '#6b21a8' }
            case 'SURAT': return { bg: '#fef3c7', text: '#92400e' }
            case 'UNDANGAN': return { bg: '#fce7f3', text: '#9d174d' }
            default: return { bg: '#f1f5f9', text: '#475569' }
        }
    }

    return (
        <div>
            <div className="topbar">
                <div className="topbar-title">Dashboard Administrasi</div>
            </div>
            <div className="page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LayoutDashboardIcon /> Dashboard Administrasi
                    </h1>
                    <p className="page-subtitle">Kelola dan pantau semua dokumen administrasi program kerja</p>
                </div>

                {/* KPI Cards */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '1rem', 
                    marginBottom: '1.5rem' 
                }}>
                    <StatCard icon={<FileText size={24} />} title="Total Dokumen" value={stats.total} subtitle="Semua dokumen masuk" color="#8b5cf6" bg="#f5f3ff" />
                    <StatCard icon={<FileWarning size={24} />} title="Pending Review" value={stats.pending} subtitle="Menunggu pemeriksaan" color="#f59e0b" bg="#fffbeb" />
                    <StatCard icon={<FileEdit size={24} />} title="Perlu Revisi" value={stats.revisi} subtitle="Dokumen perlu diperbaiki" color="#3b82f6" bg="#eff6ff" />
                    <StatCard icon={<CheckCircle2 size={24} />} title="Approved" value={stats.approved} subtitle="Dokumen disetujui" color="#10b981" bg="#ecfdf5" />
                    <StatCard icon={<Clock size={24} />} title="Overdue" value={stats.overdue} subtitle="Melewati deadline" color="#ef4444" bg="#fef2f2" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Dokumen Terbaru */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Dokumen Terbaru</h3>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-600)' }}>Lihat Semua Dokumen</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Nama Dokumen</th>
                                            <th>Jenis</th>
                                            <th>Program Kerja</th>
                                            <th>Bidang</th>
                                            <th>PIC</th>
                                            <th>Tanggal Submit</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                            <th style={{ textAlign: 'center' }}>Revisi</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentDocs.length === 0 ? (
                                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Belum ada dokumen</td></tr>
                                        ) : recentDocs.map((doc, idx) => {
                                            const tc = typeColor(doc.jenis)
                                            return (
                                                <tr key={idx}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.nama}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{doc.proker}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span style={{ background: tc.bg, color: tc.text, padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 500 }}>{doc.jenis || 'Lainnya'}</span></td>
                                                    <td style={{ fontSize: '0.8125rem' }}>{doc.proker}</td>
                                                    <td style={{ fontSize: '0.8125rem' }}>{doc.bidang}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>
                                                                {doc.pic.substring(0,2).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontSize: '0.8125rem' }}>{doc.pic.split(' ')[0]}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '0.8125rem' }}>{formatDateShort(doc.tanggal)}</div>
                                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                                                            {new Date(doc.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge badge-${getStatusColor(doc.status)}`} style={{ fontSize: '0.6875rem' }}>
                                                            {doc.status === 'revision_needed' ? 'Perlu Revisi' : doc.status === 'approved' ? 'Approved' : 'On Review'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{doc.revisi}x</td>
                                                    <td>
                                                        <button className="btn btn-ghost btn-sm btn-icon"><MoreVertical size={16} /></button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
 
                        {/* Bottom Charts Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.5rem' }}>
                            {/* Pie Chart */}
                            <div className="card">
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Statistik Dokumen per Bidang</h3>
                                <div style={{ display: 'flex', alignItems: 'center', height: 180 }}>
                                    <div style={{ width: '50%', height: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={70}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {pieData.length === 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Belum ada data</span>}
                                        {pieData.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                                                <div style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{item.name}</div>
                                                <div style={{ fontWeight: 600 }}>{Math.round((item.value / stats.total) * 100)}% <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({item.value})</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
 
                            {/* Gauge Chart */}
                            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Compliance Score <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(Rata-rata)</span></h3>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <GaugeChart score={complianceScore} />
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                                        {totalEvaluated} dinilai dari {totalPrograms} program kerja
                                    </div>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-600)', marginTop: '0.5rem' }}>Lihat Detail</button>
                                </div>
                            </div>
 
                            {/* Leaderboard */}
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Leaderboard Bidang</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {leaderboardData.length === 0 ? (
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '1rem' }}>Belum ada data penilaian</div>
                                    ) : leaderboardData.slice(0, 5).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontWeight: 600, width: 16 }}>{idx + 1}</span>
                                                {idx === 0 ? <Trophy size={14} color="#f59e0b" /> : <div style={{ width: 14 }} />}
                                                <span style={{ fontWeight: idx === 0 ? 600 : 400 }}>{item.bidang}</span>
                                            </div>
                                            <span style={{ fontWeight: 600, color: idx === 0 ? '#10b981' : 'var(--color-text-primary)' }}>{item.score}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '1rem', color: 'var(--color-brand-600)' }}>Lihat Selengkapnya</button>
                            </div>
                        </div>
                    </div>
 
                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Ringkasan Bulan Ini */}
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Ringkasan Bulan Ini</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}><FileEdit size={16} /> Total Revisi</span>
                                    <span style={{ fontWeight: 600 }}>{ringkasanBulanIni.totalRevisi} kali</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}><AlertTriangle size={16} /> Rata-rata Revisi / Dokumen</span>
                                    <span style={{ fontWeight: 600 }}>{ringkasanBulanIni.rataRata} kali</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}><CheckCircle2 size={16} /> Dokumen Tepat Waktu</span>
                                    <span style={{ fontWeight: 600 }}>{ringkasanBulanIni.tepatWaktu}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}><Clock size={16} /> Dokumen Terlambat</span>
                                    <span style={{ fontWeight: 600 }}>{ringkasanBulanIni.terlambat} dokumen</span>
                                </div>
                            </div>
                        </div>
 
                        {/* Kesalahan Paling Sering */}
                        <div className="card">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Kesalahan Paling Sering</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {kesalahanSering.length === 0 ? (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Belum ada catatan kesalahan bulan ini</div>
                                ) : kesalahanSering.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ 
                                                width: 20, height: 20, borderRadius: '50%', background: '#fffbeb', color: '#d97706', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600 
                                            }}>
                                                {idx + 1}
                                            </span>
                                            <span>{item.masalah}</span>
                                        </div>
                                        <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.count}x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
 
                        {/* Deadline Terdekat */}
                        <div className="card">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Deadline Terdekat</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {deadlinesData.length === 0 ? (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Tidak ada deadline dalam waktu dekat</div>
                                ) : deadlinesData.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.judul}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{item.tgl}</div>
                                        </div>
                                        <span style={{ color: item.status.includes('Terlewat') ? '#ef4444' : item.status === 'Hari Ini' ? '#ef4444' : '#f59e0b', fontWeight: 600, fontSize: '0.875rem' }}>{item.status}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '1rem', color: 'var(--color-brand-600)' }}>Lihat Semua Deadline</button>
                        </div>
 
                    </div>
                </div>
            </div>
        </div>
    )
}
 
function LayoutDashboardIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    )
}
 
function StatCard({ icon, title, value, subtitle, color, bg }: { icon: React.ReactNode, title: string, value: string | number, subtitle: string, color: string, bg: string }) {
    return (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color, lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{subtitle}</div>
            </div>
        </div>
    )
}

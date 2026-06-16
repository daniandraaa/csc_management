'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { UserPlus, Search, X, CheckCircle, XCircle, Eye, Users, Clock, FileText, ExternalLink, KeyRound, Handshake, BarChart2, Briefcase, TrendingUp } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import { exportToPdf } from '@/lib/export'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Menunggu Review', color: '#f59e0b', bg: '#fef3c7' },
    interview: { label: 'Proses Interview', color: '#6366f1', bg: '#e0e7ff' },
    accepted: { label: 'Diterima', color: '#10b981', bg: '#d1fae5' },
    rejected: { label: 'Ditolak', color: '#ef4444', bg: '#fee2e2' },
}

const PDF_COLUMNS = [
    { header: 'Nama', key: 'nama' },
    { header: 'NIM', key: 'nim' },
    { header: 'Fakultas', key: 'fakultas' },
    { header: 'Prodi', key: 'prodi' },
    { header: 'WhatsApp', key: 'whatsapp' },
    { header: 'Kategori', key: 'kategori_bisnis' },
    { header: 'Status', key: '_status' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']

export default function AgentsPage() {
    const { currentUser } = useCurrentUser()
    const [applications, setApplications] = useState<any[]>([])
    const [activeMitra, setActiveMitra] = useState<any[]>([])
    const [ordersAnalytics, setOrdersAnalytics] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    
    // UI State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'kelola'>('dashboard')
    const [filterStatus, setFilterStatus] = useState('')
    const [search, setSearch] = useState('')
    
    // Modal State
    const [showDetail, setShowDetail] = useState<any>(null)
    const [reviewNotes, setReviewNotes] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState<any>(null)
    const [editMouId, setEditMouId] = useState<string | null>(null)
    const [mouLinkInput, setMouLinkInput] = useState('')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: apps } = await supabase.from('agent_applications').select('*').order('created_at', { ascending: false })
        setApplications(apps || [])
        
        const { data: mitraData } = await supabase.from('members').select('*').eq('role', 'Business Partner').order('created_at', { ascending: false })
        setActiveMitra(mitraData || [])

        const { data: orderData } = await supabase.from('external_orders').select('*').not('assigned_mitra_id', 'is', null).order('created_at', { ascending: true })
        setOrdersAnalytics(orderData || [])
        
        setLoading(false)
    }

    async function updateStatus(id: string, status: string) {
        const payload: any = {
            status,
            reviewed_by: currentUser?.id,
            reviewed_at: new Date().toISOString(),
            review_notes: reviewNotes || null,
        }

        const { error: updateError } = await supabase.from('agent_applications').update(payload).eq('id', id)
        if (updateError) {
            alert('Gagal mengupdate status: ' + updateError.message)
            return
        }

        if (status === 'interview' && showDetail) {
            let phone = showDetail.whatsapp || ''
            if (phone.startsWith('0')) phone = '62' + phone.substring(1)
            const message = `Halo ${showDetail.nama}, ini dari CSC Telkom University. Kami ingin menginformasikan bahwa pendaftaran Mitra Bisnis Anda berlanjut ke tahap Interview.`
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
        }

        if (status === 'accepted' && showDetail) {
            const app = showDetail
            const { error } = await supabase.from('members').insert({
                full_name: app.nama,
                nim: app.nim,
                whatsapp: app.whatsapp,
                department: 'Business',
                role: 'Business Partner',
                position: 'Mitra Bisnis',
            })
            if (error) {
                alert('Pendaftaran diterima, tapi gagal membuat akun member: ' + error.message)
            } else {
                alert(`${app.nama} telah diterima dan akun member berhasil dibuat!`)
            }
        }

        setShowDetail(null)
        setReviewNotes('')
        setIsEditing(false)
        loadData()
    }

    async function handleResetPassword(nim: string) {
        if (!confirm('Yakin ingin mereset password mitra ini?')) return
        const { error } = await supabase.from('members').update({ password_hash: null, has_set_password: false }).eq('nim', nim).eq('role', 'Business Partner')
        if (error) {
            alert('Gagal mereset password: ' + error.message)
        } else {
            alert('Password berhasil direset! Mitra akan diminta membuat password baru saat login.')
        }
    }

    async function handleSaveEdit() {
        if (!editData) return
        setLoading(true)
        const { id, nama, nim, fakultas, prodi, whatsapp, kategori_bisnis } = editData
        
        const { error: appErr } = await supabase.from('agent_applications').update({ nama, nim, fakultas, prodi, whatsapp, kategori_bisnis }).eq('id', id)
        
        if (appErr) {
            alert('Gagal menyimpan data: ' + appErr.message)
            setLoading(false)
            return
        }

        if (showDetail.status === 'accepted') {
            await supabase.from('members').update({ full_name: nama, nim, whatsapp }).eq('nim', showDetail.nim).eq('role', 'Business Partner')
        }

        setShowDetail({ ...showDetail, nama, nim, fakultas, prodi, whatsapp, kategori_bisnis })
        setIsEditing(false)
        loadData()
    }

    async function handleSaveMou() {
        if (!editMouId) return
        setLoading(true)
        const { error } = await supabase.from('members').update({ mou_link: mouLinkInput }).eq('id', editMouId)
        if (error) {
            alert('Gagal menyimpan MoU: ' + error.message)
        } else {
            setEditMouId(null)
            setMouLinkInput('')
            loadData()
        }
        setLoading(false)
    }

    const filtered = applications.filter(a =>
        (a.nama?.toLowerCase().includes(search.toLowerCase()) || a.nim?.includes(search)) &&
        (!filterStatus || a.status === filterStatus)
    )

    const pendingCount = applications.filter(a => a.status === 'pending').length
    const totalCount = applications.length

    // Analytics Data Prep: Categories (Pendaftar)
    const catCounts = applications.reduce((acc: any, curr: any) => {
        const cat = curr.kategori_bisnis || 'Lainnya'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
    }, {})
    const categoryChartData = Object.keys(catCounts).map(k => ({ name: k, value: catCounts[k] })).sort((a, b) => b.value - a.value)

    // Analytics Data Prep: Monthly Orders & Finance
    const monthlyDataMap: Record<string, any> = {}
    
    // Find Mitra Category mapping
    const getMitraKategori = (mitraId: string) => {
        const mitra = activeMitra.find(m => m.id === mitraId)
        if (!mitra) return 'Lainnya'
        const app = applications.find(a => a.nim === mitra.nim)
        return app?.kategori_bisnis || 'Lainnya'
    }

    const orderCategoryCounts: Record<string, number> = {}

    ordersAnalytics.forEach(order => {
        const date = new Date(order.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyDataMap[monthKey]) {
            monthlyDataMap[monthKey] = { name: monthKey, Orders: 0, Pemasukan: 0, Pengeluaran: 0 }
        }
        
        monthlyDataMap[monthKey].Orders += 1
        monthlyDataMap[monthKey].Pemasukan += Number(order.order_value || 0)
        monthlyDataMap[monthKey].Pengeluaran += Number(order.partner_fee || 0)

        // Count category usage
        if (order.assigned_mitra_id) {
            const cat = getMitraKategori(order.assigned_mitra_id)
            orderCategoryCounts[cat] = (orderCategoryCounts[cat] || 0) + 1
        }
    })

    const financialChartData = Object.values(monthlyDataMap)
    const orderCategoryChartData = Object.keys(orderCategoryCounts).map(k => ({ name: k, value: orderCategoryCounts[k] }))

    const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Mitra Bisnis</div></div>
            <div className="page-container">
                <h1 className="page-title">Mitra Bisnis</h1>
                <p className="page-subtitle">Pusat monitoring dan pengelolaan seluruh Mitra Bisnis CSC</p>

                <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border-primary)', marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-ghost" style={{ borderBottom: activeTab === 'dashboard' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'dashboard' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', borderRadius: 0, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                        <BarChart2 size={18} /> Dashboard Mitra
                    </button>
                    <button className="btn btn-ghost" style={{ borderBottom: activeTab === 'kelola' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'kelola' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', borderRadius: 0, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setActiveTab('kelola')}>
                        <Briefcase size={18} /> Kelola Mitra Bisnis
                    </button>
                </div>

                {activeTab === 'dashboard' ? (
                    <div>
                        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                            <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b', background: 'linear-gradient(135deg, white 0%, #fffbeb 100%)' }}>
                                <div><div className="stat-value" style={{ color: '#f59e0b' }}>{pendingCount}</div><div className="stat-label">Menunggu Review</div></div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} color="#f59e0b" /></div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(135deg, white 0%, #ecfdf5 100%)' }}>
                                <div><div className="stat-value" style={{ color: '#10b981' }}>{activeMitra.length}</div><div className="stat-label">Mitra Bisnis Aktif</div></div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={20} color="#10b981" /></div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid #6366f1', background: 'linear-gradient(135deg, white 0%, #e0e7ff 100%)' }}>
                                <div><div className="stat-value" style={{ color: '#6366f1' }}>{ordersAnalytics.length}</div><div className="stat-label">Total Pekerjaan / Permintaan</div></div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} color="#6366f1" /></div>
                            </div>
                        </div>

                        {/* Chart Row 1: Finance and Orders */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="card">
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>Pemasukan vs Pengeluaran (Mitra)</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    {financialChartData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <LineChart data={financialChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp ${val/1000}k`} />
                                                <Tooltip formatter={(value: number) => formatRupiah(value)} />
                                                <Legend />
                                                <Line type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                                                <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={3} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Belum ada data keuangan</div>}
                                </div>
                            </div>
                            
                            <div className="card">
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>Permintaan Pekerjaan (Per Bulan)</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    {financialChartData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                                <Bar dataKey="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Belum ada data order</div>}
                                </div>
                            </div>
                        </div>

                        {/* Chart Row 2: Categories */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="card">
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>Kategori Bisnis (Calon Pendaftar)</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" label>
                                                {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            <div className="card">
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>Penggunaan Kategori (Dari Pekerjaan Selesai)</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    {orderCategoryChartData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={orderCategoryChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                                                    {orderCategoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index+2) % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Belum ada pesanan yang di-assign ke mitra</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="toolbar">
                            <div className="toolbar-left">
                                <div className="search-input"><Search /><input className="form-input" placeholder="Cari nama atau NIM..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div>
                                <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="">Semua Status Pendaftar</option>
                                    <option value="pending">Menunggu</option>
                                    <option value="interview">Interview</option>
                                    <option value="accepted">Diterima</option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                            </div>
                            <div className="toolbar-right">
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                    const data = filtered.map(a => ({ ...a, _status: STATUS_MAP[a.status]?.label || a.status }))
                                    exportToPdf({ title: 'Data Mitra Bisnis CSC', subtitle: `Total: ${filtered.length} orang`, columns: PDF_COLUMNS, data })
                                }}><FileText size={14} /> Export PDF</button>
                                <button className="btn btn-primary btn-sm" onClick={() => window.open('/daftar-agen', '_blank')}>
                                    <ExternalLink size={14} /> Buka Form Publik
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Tabel Mitra Aktif */}
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={18} /> Mitra Bisnis Aktif
                                </h3>
                                <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '4px solid #10b981' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nama Mitra</th>
                                                <th>NIM</th>
                                                <th>WhatsApp</th>
                                                <th>Tanggal Bergabung</th>
                                                <th>MoU</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                            activeMitra.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><Handshake size={32} /><h4>Belum ada mitra bisnis aktif</h4></div></td></tr> :
                                            activeMitra.map(m => (
                                                <tr key={m.id}>
                                                    <td data-label="Nama" style={{ fontWeight: 600 }}>{m.full_name}</td>
                                                    <td data-label="NIM" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{m.nim}</td>
                                                    <td data-label="WhatsApp">{m.whatsapp || '-'}</td>
                                                    <td data-label="Tanggal">{formatDateShort(m.created_at)}</td>
                                                    <td data-label="MoU">
                                                        {m.mou_link ? (
                                                            <a href={m.mou_link} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <ExternalLink size={13} /> Lihat MoU
                                                            </a>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Belum ada</span>
                                                        )}
                                                    </td>
                                                    <td data-label="Aksi" style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditMouId(m.id); setMouLinkInput(m.mou_link || ''); }}>
                                                            Edit MoU
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: '#d97706' }} onClick={() => handleResetPassword(m.nim)} title="Reset Password">
                                                            <KeyRound size={13} /> Reset Password
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Tabel Pendaftar Baru */}
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <UserPlus size={18} /> Manajemen Pendaftar Baru
                                </h3>
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Pendaftar</th>
                                                <th>NIM</th>
                                                <th>Fakultas / Prodi</th>
                                                <th>Kategori Bisnis</th>
                                                <th>WhatsApp</th>
                                                <th>Status</th>
                                                <th>Tanggal</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                            filtered.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><UserPlus size={32} /><h4>Belum ada pendaftaran</h4></div></td></tr> :
                                            filtered.map(a => {
                                                const st = STATUS_MAP[a.status] || STATUS_MAP.pending
                                                return (
                                                    <tr key={a.id}>
                                                        <td data-label="Pendaftar" style={{ fontWeight: 600 }}>{a.nama}</td>
                                                        <td data-label="NIM" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{a.nim}</td>
                                                        <td data-label="Fakultas">
                                                            <div style={{ fontSize: '0.8125rem' }}>{a.fakultas}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.prodi}</div>
                                                        </td>
                                                        <td data-label="Kategori Bisnis">
                                                            <span className="badge badge-secondary">{a.kategori_bisnis || 'Lainnya'}</span>
                                                        </td>
                                                        <td data-label="WhatsApp" style={{ fontSize: '0.8125rem' }}>{a.whatsapp}</td>
                                                        <td data-label="Status">
                                                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                                                        </td>
                                                        <td data-label="Tanggal" style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{formatDateShort(a.created_at)}</td>
                                                        <td data-label="Aksi" style={{ display: 'flex', gap: 4 }}>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowDetail(a); setReviewNotes(a.review_notes || '') }} title="Detail">
                                                                <Eye size={13} /> Detail
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {showDetail && (
                    <div className="modal-overlay" onClick={() => { setShowDetail(null); setIsEditing(false); }}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <h2>Detail Pendaftaran</h2>
                                    {!isEditing && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setIsEditing(true); setEditData(showDetail); }}>Edit Data</button>
                                    )}
                                </div>
                                <button className="btn btn-ghost btn-icon" onClick={() => { setShowDetail(null); setIsEditing(false); }}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {isEditing ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div className="form-group"><label className="form-label">Nama</label><input className="form-input" value={editData.nama} onChange={e => setEditData({...editData, nama: e.target.value})} /></div>
                                        <div className="form-group"><label className="form-label">NIM</label><input className="form-input" value={editData.nim} onChange={e => setEditData({...editData, nim: e.target.value})} /></div>
                                        <div className="form-group"><label className="form-label">Fakultas</label><input className="form-input" value={editData.fakultas} onChange={e => setEditData({...editData, fakultas: e.target.value})} /></div>
                                        <div className="form-group"><label className="form-label">Program Studi</label><input className="form-input" value={editData.prodi} onChange={e => setEditData({...editData, prodi: e.target.value})} /></div>
                                        <div className="form-group"><label className="form-label">Kategori Bisnis</label><input className="form-input" value={editData.kategori_bisnis} onChange={e => setEditData({...editData, kategori_bisnis: e.target.value})} /></div>
                                        <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={editData.whatsapp} onChange={e => setEditData({...editData, whatsapp: e.target.value})} /></div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Nama</div><div style={{ fontWeight: 600, marginTop: 2 }}>{showDetail.nama}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>NIM</div><div style={{ fontWeight: 600, marginTop: 2, fontFamily: 'monospace' }}>{showDetail.nim}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Kategori Bisnis</div><div style={{ marginTop: 2 }}>{showDetail.kategori_bisnis || '-'}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Fakultas</div><div style={{ marginTop: 2 }}>{showDetail.fakultas}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Program Studi</div><div style={{ marginTop: 2 }}>{showDetail.prodi}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Angkatan</div><div style={{ marginTop: 2 }}>{showDetail.angkatan}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>WhatsApp</div><div style={{ marginTop: 2 }}>{showDetail.whatsapp}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Domisili</div><div style={{ marginTop: 2 }}>{showDetail.domisili}</div></div>
                                        <div><div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Pengalaman Bisnis</div><div style={{ marginTop: 2 }}>{showDetail.pengalaman_bisnis}</div></div>
                                    </div>
                                )}

                                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-primary)', margin: '1rem 0' }} />

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Lingkar Pertemanan</div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {(showDetail.lingkar_pertemanan || []).map((l: string) => (
                                            <span key={l} className="badge badge-secondary">{l}</span>
                                        ))}
                                    </div>
                                </div>

                                {showDetail.komunitas_aktif && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Komunitas Aktif</div>
                                        <div>{showDetail.komunitas_aktif}</div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Estimasi Market (7 hari pertama)</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#9A3412' }}>{showDetail.estimasi_market || '-'} orang</div>
                                </div>

                                {showDetail.portfolio_link && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Portofolio</div>
                                        <a href={showDetail.portfolio_link} target="_blank" rel="noopener noreferrer" style={{ color: '#6d28d9', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <ExternalLink size={14} /> Lihat Portofolio
                                        </a>
                                        {showDetail.portfolio_description && <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>{showDetail.portfolio_description}</p>}
                                    </div>
                                )}

                                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-primary)', margin: '1.5rem 0' }} />

                                <div className="form-group">
                                    <label className="form-label">Catatan Review</label>
                                    <textarea className="form-textarea" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Catatan dari reviewer..." style={{ minHeight: 80 }} />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isEditing ? (
                                    <>
                                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Batal Edit</button>
                                        <button className="btn btn-primary" onClick={handleSaveEdit}>Simpan Perubahan</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-secondary" onClick={() => setShowDetail(null)}>Tutup</button>
                                        
                                        {showDetail.status !== 'accepted' && showDetail.status !== 'rejected' && (
                                            <>
                                                <button className="btn btn-secondary" style={{ color: '#6366f1' }} onClick={() => updateStatus(showDetail.id, 'interview')}>
                                                    <Clock size={14} /> Interview
                                                </button>
                                                <button className="btn btn-secondary" style={{ color: '#ef4444' }} onClick={() => updateStatus(showDetail.id, 'rejected')}>
                                                    <XCircle size={14} /> Tolak
                                                </button>
                                                <button className="btn btn-primary" onClick={() => updateStatus(showDetail.id, 'accepted')}>
                                                    <CheckCircle size={14} /> Terima & Buat Akun
                                                </button>
                                            </>
                                        )}

                                        {showDetail.status === 'accepted' && (
                                            <button className="btn btn-secondary" style={{ color: '#d97706', marginLeft: 'auto' }} onClick={() => handleResetPassword(showDetail.nim)}>
                                                Reset Password Mitra
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MoU Edit Modal */}
                {editMouId && (
                    <div className="modal-overlay" onClick={() => setEditMouId(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                            <div className="modal-header">
                                <h2>Edit Link MoU</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setEditMouId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Link MoU / Google Drive</label>
                                    <input className="form-input" value={mouLinkInput} onChange={e => setMouLinkInput(e.target.value)} placeholder="https://..." />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setEditMouId(null)}>Batal</button>
                                <button className="btn btn-primary" onClick={handleSaveMou}>Simpan MoU</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

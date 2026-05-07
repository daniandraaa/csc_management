'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useCurrentUser } from '@/lib/auth'
import { getVisibleSections } from '@/lib/rbac'
import { getInitials } from '@/lib/utils'
import { hashPassword, verifyPassword } from '@/lib/password'
import { supabase } from '@/lib/supabase'
import {
    LayoutDashboard, Users, Clock, Trophy, Heart,
    CalendarClock, BookOpen, CalendarCheck, FolderKanban,
    BarChart3, ClipboardCheck, FileText, Receipt, DollarSign,
    Handshake, Building2, Megaphone, PenTool, Newspaper,
    UserCheck, FileStack, ShieldCheck, LogOut, Shield,
    KeyRound, X, Eye, EyeOff, MessageCircle, Send, ClipboardList, Menu, Bell, Mail
} from 'lucide-react'

const navSections = [
    {
        title: 'Overview',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Anggota', href: '/members', icon: Users },
            { label: 'Timeline', href: '/timeline', icon: Clock },
            { label: 'SOP Guide', href: '/overview/sop', icon: FileText },
            { label: 'Logbook', href: '/overview/logbook', icon: BookOpen },
            { label: 'Performansi', href: '/overview/performance', icon: Trophy },
            { label: 'Evaluasi Program', href: '/overview/evaluations', icon: ClipboardCheck },
            { label: 'KPI Program', href: '/overview/kpi', icon: BarChart3 },
            { label: 'Ajukan Konten', href: '/overview/content-request', icon: Send, badgeKey: 'content' },
            { label: 'Ajukan ke PR', href: '/overview/pr-request', icon: UserCheck, badgeKey: 'pr_request' },
            { label: 'Reimbursement', href: '/finance/reimbursement', icon: Receipt, badgeKey: 'reimbursement' },
            { label: 'Pengaduan Anonim', href: '/overview/advocacy', icon: MessageCircle },
            { label: 'Kehadiran Saya', href: '/overview/my-attendance', icon: CalendarCheck },
        ],
    },
    {
        title: 'Human Resources',
        items: [
            { label: 'Pengaduan & Aspirasi', href: '/hr/advocacy', icon: Heart, badgeKey: 'advocacy' },
            { label: 'Konseling', href: '/hr/counseling', icon: CalendarClock, badgeKey: 'counseling' },
            { label: 'Logbook', href: '/hr/logbook', icon: BookOpen },
            { label: 'Kehadiran', href: '/hr/attendance', icon: UserCheck },
            { label: 'Penilaian', href: '/hr/performance', icon: BarChart3 },
        ],
    },
    {
        title: 'Operating',
        items: [
            { label: 'Program Kerja', href: '/operating/programs', icon: FolderKanban },
            { label: 'Penjadwalan Broadcast', href: '/operating/broadcasts', icon: Megaphone },
            { label: 'Editorial Plan', href: '/operating/editorial', icon: PenTool },
            { label: 'Direktori CP', href: '/operating/directory', icon: MessageCircle },
            { label: 'Order Monitoring', href: '/operating/orders', icon: ClipboardList, badgeKey: 'orders' },
            { label: 'KPI Program', href: '/operating/kpi', icon: BarChart3 },
            { label: 'Evaluasi', href: '/operating/evaluations', icon: ClipboardCheck },
            { label: 'SOP Guide', href: '/operating/sop', icon: FileText },
        ],
    },
    {
        title: 'Finance',
        items: [
            { label: 'Reimbursement', href: '/finance/reimbursement', icon: Receipt, badgeKey: 'reimbursement' },
            { label: 'Transaksi', href: '/finance/transactions', icon: DollarSign },
        ],
    },
    {
        title: 'Business',
        items: [
            { label: 'Mitra Bisnis', href: '/business/partners', icon: Handshake },
            { label: 'Order Monitoring', href: '/operating/orders', icon: ClipboardList, badgeKey: 'orders' },
            { label: 'Overview', href: '/business/overview', icon: Building2 },
        ],
    },
    {
        title: 'Marketing & Branding',
        items: [
            { label: 'Content Planner', href: '/marketing/content', icon: PenTool },
            { label: 'Ajukan Konten', href: '/overview/content-request', icon: Send, badgeKey: 'content' },
        ],
    },
    {
        title: 'Public Relation',
        items: [
            { label: 'Media Partner', href: '/marketing/media-partners', icon: Megaphone },
            { label: 'Database PR', href: '/documents?is_pr=true', icon: Newspaper },
            { label: 'Surat Masuk', href: '/marketing/mail', icon: Mail },
            { label: 'Tamu Undangan', href: '/marketing/invitations', icon: UserCheck },
            { label: 'Jobdesk PR', href: '/marketing/pr-tasks', icon: ClipboardList, badgeKey: 'pr_jobdesk' },
        ],
    },
    {
        title: 'Administrasi',
        items: [
            { label: 'Dokumen & Review', href: '/documents', icon: FileStack },
            { label: 'Review Status', href: '/admin-review', icon: ShieldCheck, badgeKey: 'admin_review' },
        ],
    },
]

const roleColors: Record<string, { bg: string; text: string }> = {
    'BOE': { bg: '#fef2f2', text: '#991b1b' },
    'C Level': { bg: '#fff7ed', text: '#9a3412' },
    'Secretary': { bg: '#eff6ff', text: '#1d4ed8' },
    'Administration': { bg: '#f5f3ff', text: '#6d28d9' },
    'Staff': { bg: '#f0fdf4', text: '#15803d' },
    'Business Partner': { bg: '#f0fdfa', text: '#0d9488' },
}

export default function Sidebar() {
    const pathname = usePathname()
    const { currentUser, logout } = useCurrentUser()
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [showOld, setShowOld] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [pwError, setPwError] = useState('')
    const [pwSuccess, setPwSuccess] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [counts, setCounts] = useState<Record<string, number>>({})

    const fetchCounts = useCallback(async () => {
        if (!currentUser) return
        
        const results: Record<string, number> = {}
        
        // 1. Content Requests (Marketing/Admin/BOE see all pending, others see their own?)
        // Actually usually manager see pending
        const { count: cReq } = await supabase.from('content_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        results.content = cReq || 0

        // 2. PR Requests
        const { count: pReq } = await supabase.from('pr_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        results.pr_request = pReq || 0

        // 3. Reimbursements (Finance/Admin/BOE see pending)
        const { count: reCount } = await supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        results.reimbursement = reCount || 0

        // 4. Jobdesk PR (Current user's on going/pending tasks)
        const { count: jdCount } = await supabase.from('pr_jobdesk').select('*', { count: 'exact', head: true }).eq('pic_id', currentUser.id).neq('status', 'done')
        results.pr_jobdesk = jdCount || 0

        // 5. HR (Advocacy & Counseling)
        const { count: advCount } = await supabase.from('advocacy_aspirations').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        const { count: csCount } = await supabase.from('counseling_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        results.advocacy = advCount || 0
        results.counseling = csCount || 0

        // 6. Orders (Operating/Business - show handled items that are not done)
        let oQuery = supabase.from('external_orders').select('*', { count: 'exact', head: true }).neq('status', 'completed')
        if (currentUser.role === 'Staff') {
            oQuery = oQuery.eq('handled_by', currentUser.id)
        }
        const { count: oCount } = await oQuery
        results.orders = oCount || 0

        // 7. Admin Review (Documents in draft/review status)
        const { count: dCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).in('status', ['draft', 'review'])
        results.admin_review = dCount || 0

        setCounts(results)
    }, [currentUser])

    useEffect(() => {
        fetchCounts()
        const interval = setInterval(fetchCounts, 60000) // refresh every minute
        return () => clearInterval(interval)
    }, [fetchCounts])

    const visibleSections = getVisibleSections(currentUser)
    const filteredSections = navSections.filter(s => visibleSections.includes(s.title))

    const rc = roleColors[currentUser?.role || ''] || { bg: '#f1f5f9', text: '#475569' }

    async function handleChangePassword() {
        setPwError('')
        if (!oldPassword || !newPw || !confirmPw) {
            setPwError('Harap isi semua field.')
            return
        }
        if (newPw.length < 6) {
            setPwError('Password baru minimal 6 karakter.')
            return
        }
        if (newPw !== confirmPw) {
            setPwError('Konfirmasi password tidak sama.')
            return
        }

        setSaving(true)

        // Verify old password
        const { data: member } = await supabase
            .from('members')
            .select('password_hash')
            .eq('id', currentUser?.id)
            .single()

        if (member?.password_hash) {
            const valid = await verifyPassword(oldPassword, member.password_hash)
            if (!valid) {
                setPwError('Password lama salah.')
                setSaving(false)
                return
            }
        }

        // Update password
        const hashed = await hashPassword(newPw)
        const { error } = await supabase
            .from('members')
            .update({ password_hash: hashed })
            .eq('id', currentUser?.id)

        if (error) {
            setPwError('Gagal menyimpan password.')
        } else {
            setPwSuccess(true)
            setTimeout(() => {
                setShowPasswordModal(false)
                setPwSuccess(false)
                setOldPassword('')
                setNewPw('')
                setConfirmPw('')
            }, 1500)
        }
        setSaving(false)
    }

    return (
        <>
            {/* Mobile Header */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/logo.png" alt="CSC Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#9A3412' }}>CSC Management</span>
                </div>
                <button 
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileOpen(true)}
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Mobile Overlay */}
            <div className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`} onClick={() => setIsMobileOpen(false)} />

            <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
            <div className="sidebar-logo">
                <img src="/logo.png" alt="CSC Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#9A3412', margin: 0, letterSpacing: '-0.02em' }}>CSC Management</h1>
                    <span style={{ fontSize: '0.6875rem', color: '#78716c', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Telkom University</span>
                </div>
                {/* Mobile close button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="sidebar-close-btn"
                >
                    <X size={18} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {filteredSections.map((section) => (
                    <div key={section.title} className="sidebar-section">
                        <div className="sidebar-section-title">{section.title}</div>
                        {section.items.map((item) => {
                            const Icon = item.icon
                            const [hrefPath] = item.href.split('?')
                            const isActive = pathname === hrefPath || pathname?.startsWith(hrefPath + '/')
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setIsMobileOpen(false)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Icon size={18} />
                                        {item.label}
                                    </div>
                                    {item.badgeKey && counts[item.badgeKey] > 0 && (
                                        <span className="sidebar-badge">{counts[item.badgeKey]}</span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                ))}

                {/* User Profile Card - Moved inside nav to be scrollable */}
                {currentUser && (
                    <div style={{
                        padding: '1rem 0.5rem 0.5rem',
                        borderTop: '1px solid var(--color-sidebar-border)',
                        marginTop: '1rem',
                        background: 'rgba(154, 52, 18, 0.02)',
                        borderRadius: '0.75rem',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            marginBottom: '0.625rem',
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'linear-gradient(135deg, #9A3412, #7C2D12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(154, 52, 18, 0.2)',
                            }}>
                                {getInitials(currentUser.full_name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 600, fontSize: '0.8125rem',
                                    color: '#292524',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{currentUser.full_name}</div>
                                <div style={{ fontSize: '0.6875rem', color: '#78716c' }}>
                                    {currentUser.department}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '0.25rem',
                        }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '0.2rem 0.5rem', borderRadius: 6,
                                fontSize: '0.6875rem', fontWeight: 600,
                                background: rc.bg, color: rc.text,
                            }}>
                                <Shield size={10} /> {currentUser.role}
                            </span>
                            <div style={{ display: 'flex', gap: 2 }}>
                                <button
                                    onClick={() => { setShowPasswordModal(true); setPwError(''); setPwSuccess(false); setOldPassword(''); setNewPw(''); setConfirmPw('') }}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                        padding: '0.25rem 0.375rem', borderRadius: 6,
                                        border: 'none', background: 'transparent',
                                        color: '#78716c',
                                        fontSize: '0.6875rem', cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#9A3412'; e.currentTarget.style.background = 'rgba(154, 52, 18, 0.08)' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#78716c'; e.currentTarget.style.background = 'transparent' }}
                                    title="Ubah Password"
                                >
                                    <KeyRound size={12} />
                                </button>
                                <button
                                    onClick={logout}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                        padding: '0.25rem 0.5rem', borderRadius: 6,
                                        border: 'none', background: 'transparent',
                                        color: '#78716c',
                                        fontSize: '0.6875rem', cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#78716c'; e.currentTarget.style.background = 'transparent' }}
                                    title="Keluar"
                                >
                                    <LogOut size={12} /> Keluar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)} style={{ zIndex: 9999 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <KeyRound size={18} /> Ubah Password
                            </h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPasswordModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {pwSuccess ? (
                                <div style={{
                                    textAlign: 'center', padding: '2rem 0',
                                }}>
                                    <div style={{
                                        width: 64, height: 64, borderRadius: '50%',
                                        background: '#f0fdf4', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 1rem', fontSize: '2rem',
                                    }}>✅</div>
                                    <p style={{ fontWeight: 600, color: '#15803d' }}>Password berhasil diubah!</p>
                                </div>
                            ) : (
                                <>
                                    {pwError && (
                                        <div style={{
                                            padding: '0.75rem', borderRadius: 8,
                                            background: '#fef2f2', border: '1px solid #fecaca',
                                            color: '#dc2626', fontSize: '0.8125rem',
                                            marginBottom: '1rem',
                                        }}>{pwError}</div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label">Password Lama</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="form-input"
                                                type={showOld ? 'text' : 'password'}
                                                value={oldPassword}
                                                onChange={e => setOldPassword(e.target.value)}
                                                placeholder="Masukkan password saat ini"
                                                style={{ paddingRight: '2.5rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowOld(!showOld)}
                                                style={{
                                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
                                                }}
                                            >{showOld ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Password Baru</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="form-input"
                                                type={showNew ? 'text' : 'password'}
                                                value={newPw}
                                                onChange={e => setNewPw(e.target.value)}
                                                placeholder="Min. 6 karakter"
                                                style={{ paddingRight: '2.5rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNew(!showNew)}
                                                style={{
                                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
                                                }}
                                            >{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                        {newPw && newPw.length < 6 && <p style={{ fontSize: '0.6875rem', color: '#dc2626', marginTop: 4 }}>Minimal 6 karakter</p>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Konfirmasi Password Baru</label>
                                        <input
                                            className="form-input"
                                            type="password"
                                            value={confirmPw}
                                            onChange={e => setConfirmPw(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                                            placeholder="Ulangi password baru"
                                        />
                                        {confirmPw && confirmPw !== newPw && <p style={{ fontSize: '0.6875rem', color: '#dc2626', marginTop: 4 }}>Password tidak sama</p>}
                                    </div>
                                </>
                            )}
                        </div>
                        {!pwSuccess && (
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Batal</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleChangePassword}
                                    disabled={!oldPassword || !newPw || !confirmPw || newPw.length < 6 || newPw !== confirmPw || saving}
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Password'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
        </>
    )
}

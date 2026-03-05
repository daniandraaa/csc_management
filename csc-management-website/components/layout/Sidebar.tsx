'use client'

import Link from 'next/link'
import { useState } from 'react'
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
    KeyRound, X, Eye, EyeOff, MessageCircle, Send,
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
            { label: 'Pengaduan', href: '/overview/advocacy', icon: MessageCircle },
            { label: 'Ajukan Konten', href: '/overview/content-request', icon: Send },
            { label: 'Kehadiran Saya', href: '/overview/my-attendance', icon: CalendarCheck },
        ],
    },
    {
        title: 'Human Resources',
        items: [
            { label: 'Performansi', href: '/hr/performance', icon: Trophy },
            { label: 'Advokasi & Aspirasi', href: '/hr/advocacy', icon: Heart },
            { label: 'Konseling', href: '/hr/counseling', icon: CalendarClock },
            { label: 'Logbook', href: '/hr/logbook', icon: BookOpen },
            { label: 'Kehadiran', href: '/hr/attendance', icon: CalendarCheck },
        ],
    },
    {
        title: 'Operating',
        items: [
            { label: 'Program Kerja', href: '/operating/programs', icon: FolderKanban },
            { label: 'KPI Program', href: '/operating/kpi', icon: BarChart3 },
            { label: 'Evaluasi', href: '/operating/evaluations', icon: ClipboardCheck },
            { label: 'SOP Guide', href: '/operating/sop', icon: FileText },
        ],
    },
    {
        title: 'Finance',
        items: [
            { label: 'Reimbursement', href: '/finance/reimbursement', icon: Receipt },
            { label: 'Transaksi', href: '/finance/transactions', icon: DollarSign },
        ],
    },
    {
        title: 'Business',
        items: [
            { label: 'Mitra Bisnis', href: '/business/partners', icon: Handshake },
            { label: 'Overview', href: '/business/overview', icon: Building2 },
        ],
    },
    {
        title: 'Marketing',
        items: [
            { label: 'Content Planner', href: '/marketing/content', icon: PenTool },
            { label: 'Media Partner', href: '/marketing/media-partners', icon: Megaphone },
            { label: 'Surat Masuk', href: '/marketing/mail', icon: Newspaper },
            { label: 'Undangan', href: '/marketing/invitations', icon: UserCheck },
        ],
    },
    {
        title: 'Administrasi',
        items: [
            { label: 'Dokumen & Surat', href: '/documents', icon: FileStack },
            { label: 'Review Admin', href: '/admin-review', icon: ShieldCheck },
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
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">CSC</div>
                <div>
                    <h1>CSC Management</h1>
                    <span>Telkom University</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                {filteredSections.map((section) => (
                    <div key={section.title} className="sidebar-section">
                        <div className="sidebar-section-title">{section.title}</div>
                        {section.items.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                >
                                    <Icon />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                ))}
            </nav>

            {/* User Profile Card */}
            {currentUser && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid var(--color-border-primary)',
                    marginTop: 'auto',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        marginBottom: '0.5rem',
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}>
                            {getInitials(currentUser.full_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: 600, fontSize: '0.8125rem',
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{currentUser.full_name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
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
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '0.6875rem', cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#6d28d9'; e.currentTarget.style.background = '#f5f3ff' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
                                title="Ubah Password"
                            >
                                <KeyRound size={12} />
                            </button>
                            <button
                                onClick={logout}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    padding: '0.25rem 0.375rem', borderRadius: 6,
                                    border: 'none', background: 'transparent',
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '0.6875rem', cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
                                title="Keluar"
                            >
                                <LogOut size={12} /> Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'
import { Users, LogIn, Shield, Building2, Lock, Eye, EyeOff, KeyRound } from 'lucide-react'

const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    'BOE': { bg: '#fef2f2', text: '#991b1b', label: 'Board of Executive' },
    'C Level': { bg: '#fff7ed', text: '#9a3412', label: 'C Level / Head' },
    'Secretary': { bg: '#eff6ff', text: '#1d4ed8', label: 'Sekretaris' },
    'Administration': { bg: '#f5f3ff', text: '#6d28d9', label: 'Administrasi' },
    'Staff': { bg: '#f0fdf4', text: '#15803d', label: 'Staff' },
    'Business Partner': { bg: '#f0fdfa', text: '#0d9488', label: 'Mitra Bisnis' },
}

const deptColors: Record<string, string> = {
    'Executive': '#991b1b',
    'Marketing': '#9333ea',
    'Business': '#0d9488',
    'Operating': '#2563eb',
    'Human Resource': '#ea580c',
    'Financial': '#ca8a04',
}

type LoginStep = 'select' | 'password' | 'setup'

export default function LoginPage() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState('')
    const [loggingIn, setLoggingIn] = useState(false)
    const [step, setStep] = useState<LoginStep>('select')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    const { login } = useCurrentUser()

    // Prevent hydration mismatch - only render after client mount
    useEffect(() => { setMounted(true) }, [])

    const [passwordColumnsExist, setPasswordColumnsExist] = useState(true)

    useEffect(() => {
        async function loadMembers() {
            try {
                // First, always load basic member data (this always works)
                const { data: basicData, error: basicError } = await supabase
                    .from('members')
                    .select('id, full_name, role, department, position, email')
                    .order('department')
                    .order('role')
                    .order('full_name')

                if (basicError || !basicData) {
                    console.error('Failed to load members:', basicError?.message)
                    setMembers([])
                    setLoading(false)
                    return
                }

                // Then try to fetch password columns separately
                const { data: pwData, error: pwError } = await supabase
                    .from('members')
                    .select('id, has_set_password, password_hash')

                if (pwError || !pwData) {
                    // Password columns don't exist yet - use basic data without password info
                    setPasswordColumnsExist(false)
                    setMembers(basicData.map(m => ({ ...m, has_set_password: false, password_hash: null })))
                } else {
                    // Merge password data into basic data
                    setPasswordColumnsExist(true)
                    const pwMap = new Map(pwData.map(p => [p.id, p]))
                    setMembers(basicData.map(m => {
                        const pw = pwMap.get(m.id)
                        return { ...m, has_set_password: pw?.has_set_password ?? false, password_hash: pw?.password_hash ?? null }
                    }))
                }
                setLoading(false)
            } catch (err) {
                console.error('Unexpected error in loadMembers:', err)
                setMembers([])
                setLoading(false)
            }
        }
        loadMembers()
    }, [])

    async function handleSelectAccount() {
        if (!selectedId) return
        setError('')
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')

        // If password columns don't exist, skip password and login directly
        if (!passwordColumnsExist) {
            setLoggingIn(true)
            await login(selectedId)
            return
        }

        // Re-fetch the latest password status directly from Supabase
        // This prevents stale data from the initial load causing incorrect flow
        const { data: freshMember, error: fetchErr } = await supabase
            .from('members')
            .select('id, password_hash, has_set_password')
            .eq('id', selectedId)
            .single()

        if (fetchErr || !freshMember) {
            // If fetch fails (columns don't exist, etc.), login directly
            setLoggingIn(true)
            await login(selectedId)
            return
        }

        // Update the local members state with the fresh data
        setMembers(prev => prev.map(m =>
            m.id === selectedId
                ? { ...m, password_hash: freshMember.password_hash, has_set_password: freshMember.has_set_password }
                : m
        ))

        // Determine the correct step based on fresh data
        if (!freshMember.password_hash) {
            setStep('setup')
        } else {
            setStep('password')
        }
    }

    async function handlePasswordLogin() {
        if (!selectedId || !password) return
        setError('')
        setLoggingIn(true)

        // Try to verify password against stored hash
        const { data: member, error: fetchError } = await supabase
            .from('members')
            .select('password_hash')
            .eq('id', selectedId)
            .single()

        // If column doesn't exist yet, skip password check and log in directly
        if (fetchError) {
            await login(selectedId)
            return
        }

        if (!member?.password_hash) {
            setError('Akun belum memiliki password. Silakan buat password terlebih dahulu.')
            setLoggingIn(false)
            setStep('setup')
            return
        }

        try {
            const valid = await verifyPassword(password, member.password_hash)
            if (!valid) {
                setError('Password salah. Coba lagi.')
                setLoggingIn(false)
                return
            }
        } catch (err: any) {
            setError(err.message || 'Gagal memverifikasi password.')
            setLoggingIn(false)
            return
        }

        await login(selectedId)
    }

    async function handleSetupPassword() {
        if (!newPassword || !confirmPassword) {
            setError('Harap isi kedua field password.')
            return
        }
        if (newPassword.length < 6) {
            setError('Password minimal 6 karakter.')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Password tidak sama. Coba lagi.')
            return
        }

        setLoggingIn(true)
        setError('')

        let hashed = ''
        try {
            hashed = await hashPassword(newPassword)
        } catch (err: any) {
            setError(err.message || 'Gagal memproses password.')
            setLoggingIn(false)
            return
        }

        const { error: updateError } = await supabase
            .from('members')
            .update({ 
                password_hash: hashed,
                has_set_password: true 
            })
            .eq('id', selectedId)

        if (updateError) {
            // Still allow login even if save failed (columns may not exist)
        } else {
            // Update local state
            setMembers(prev => prev.map(m =>
                m.id === selectedId
                    ? { ...m, password_hash: hashed, has_set_password: true }
                    : m
            ))
        }

        // Auto-login after setup
        await login(selectedId)
    }

    // Group members by department
    const grouped = members.reduce((acc: Record<string, any[]>, m) => {
        const dept = m.department || 'Lainnya'
        if (!acc[dept]) acc[dept] = []
        acc[dept].push(m)
        return acc
    }, {})

    const selectedMember = members.find(m => m.id === selectedId)

    const inputStyle = {
        width: '100%', padding: '0.75rem 1rem',
        borderRadius: 12, border: '2px solid #e2e8f0',
        fontSize: '0.875rem', background: 'white',
        outline: 'none', transition: 'border-color 0.2s',
    }

    // Show loading state during SSR and initial hydration to prevent mismatch
    if (!mounted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #fdfbfb 0%, #f5eedc 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Memuat...</div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #fdfbfb 0%, #f5eedc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            {/* Background pattern */}
            <div style={{
                position: 'fixed', inset: 0, opacity: 0.05,
                backgroundImage: 'radial-gradient(circle at 25px 25px, #94a3b8 2%, transparent 0%), radial-gradient(circle at 75px 75px, #94a3b8 2%, transparent 0%)',
                backgroundSize: '100px 100px',
            }} />

            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 480,
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src="/logo.png" alt="CSC Logo" style={{
                        width: 90, height: 90, objectFit: 'contain',
                        display: 'block', margin: '0 auto 1.5rem auto',
                    }} />
                    <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        CSC Management
                    </h1>
                    <p style={{ color: '#475569', fontSize: '0.875rem' }}>
                        Community Support Center — Telkom University
                    </p>
                </div>

                {/* Login Card */}
                <div style={{
                    background: 'white',
                    borderRadius: 20,
                    padding: '2rem',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                }}>
                    {/* ===== STEP 1: Select Account ===== */}
                    {step === 'select' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: '#f1f5f9', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}><LogIn size={20} color="#475569" /></div>
                                <div>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>Masuk ke Akun</h2>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pilih akun untuk melanjutkan</p>
                                </div>
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                                    <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                    <p style={{ fontSize: '0.875rem' }}>Memuat data anggota...</p>
                                </div>
                            ) : members.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                                    <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Belum ada data anggota</p>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                        Jalankan SQL schema di Supabase terlebih dahulu.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                            Pilih Akun
                                        </label>
                                        <select
                                            value={selectedId}
                                            onChange={e => setSelectedId(e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                cursor: 'pointer',
                                            }}
                                            onFocus={e => e.target.style.borderColor = '#6d28d9'}
                                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                        >
                                            <option value="">— Pilih akun —</option>
                                            {Object.entries(grouped).map(([dept, deptMembers]) => (
                                                <optgroup key={dept} label={`📁 ${dept}`}>
                                                    {(deptMembers as any[]).map((m: any) => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.full_name} — {m.role} {m.position ? `(${m.position})` : ''} {!m.password_hash && !m.has_set_password ? '🆕' : ''}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Selected user preview */}
                                    {selectedMember && (
                                        <div style={{
                                            padding: '1rem',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            marginBottom: '1.5rem',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 12,
                                                    background: `linear-gradient(135deg, ${deptColors[selectedMember.department] || '#475569'}, ${deptColors[selectedMember.department] || '#475569'}dd)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 700, fontSize: 15,
                                                }}>
                                                    {selectedMember.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>{selectedMember.full_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedMember.email || 'No email'}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '0.25rem 0.625rem', borderRadius: 6,
                                                    fontSize: '0.75rem', fontWeight: 600,
                                                    background: roleColors[selectedMember.role]?.bg || '#f1f5f9',
                                                    color: roleColors[selectedMember.role]?.text || '#475569',
                                                }}>
                                                    <Shield size={12} /> {selectedMember.role}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '0.25rem 0.625rem', borderRadius: 6,
                                                    fontSize: '0.75rem', fontWeight: 500,
                                                    background: '#f1f5f9', color: '#475569',
                                                }}>
                                                    <Building2 size={12} /> {selectedMember.department}
                                                </span>
                                                {!selectedMember.password_hash && !selectedMember.has_set_password && (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '0.25rem 0.625rem', borderRadius: 6,
                                                        fontSize: '0.75rem', fontWeight: 600,
                                                        background: '#fef3c7', color: '#92400e',
                                                    }}>
                                                        🆕 Belum set password
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSelectAccount}
                                        disabled={!selectedId}
                                        style={{
                                            width: '100%', padding: '0.875rem',
                                            borderRadius: 12, border: 'none',
                                            background: selectedId ? 'linear-gradient(135deg, #6d28d9, #4c1d95)' : '#e2e8f0',
                                            color: selectedId ? 'white' : '#94a3b8',
                                            fontSize: '0.9375rem', fontWeight: 600,
                                            cursor: selectedId ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s',
                                            boxShadow: selectedId ? '0 4px 12px rgba(109, 40, 217, 0.3)' : 'none',
                                        }}
                                    >
                                        Lanjutkan
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {/* ===== STEP 2: Enter Password ===== */}
                    {step === 'password' && selectedMember && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: '#f1f5f9', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}><Lock size={20} color="#475569" /></div>
                                <div>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>Masukkan Password</h2>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{selectedMember.full_name}</p>
                                </div>
                            </div>

                            {/* Mini profile */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.625rem',
                                padding: '0.75rem', borderRadius: 10,
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                marginBottom: '1rem',
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `linear-gradient(135deg, ${deptColors[selectedMember.department] || '#475569'}, ${deptColors[selectedMember.department] || '#475569'}dd)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 13,
                                }}>
                                    {selectedMember.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>{selectedMember.full_name}</div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{selectedMember.role} · {selectedMember.department}</div>
                                </div>
                                <button onClick={() => { setStep('select'); setError('') }} style={{
                                    padding: '0.25rem 0.5rem', borderRadius: 6,
                                    border: '1px solid #e2e8f0', background: 'white',
                                    fontSize: '0.6875rem', cursor: 'pointer', color: '#64748b',
                                }}>Ganti</button>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '0.75rem', borderRadius: 10,
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    color: '#dc2626', fontSize: '0.8125rem',
                                    marginBottom: '1rem',
                                }}>{error}</div>
                            )}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                                        placeholder="Masukkan password"
                                        autoFocus
                                        style={{
                                            ...inputStyle,
                                            paddingRight: '3rem',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#6d28d9'}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: '#94a3b8', padding: 4,
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handlePasswordLogin}
                                disabled={!password || loggingIn}
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    borderRadius: 12, border: 'none',
                                    background: password ? 'linear-gradient(135deg, #6d28d9, #4c1d95)' : '#e2e8f0',
                                    color: password ? 'white' : '#94a3b8',
                                    fontSize: '0.9375rem', fontWeight: 600,
                                    cursor: password ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    boxShadow: password ? '0 4px 12px rgba(109, 40, 217, 0.3)' : 'none',
                                }}
                            >
                                {loggingIn ? 'Masuk...' : '🔐 Masuk'}
                            </button>
                        </>
                    )}

                    {/* ===== STEP 3: First-Login Password Setup ===== */}
                    {step === 'setup' && selectedMember && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: '#fef3c7', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}><KeyRound size={20} color="#92400e" /></div>
                                <div>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>Buat Password</h2>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Login pertama kali — wajib buat password</p>
                                </div>
                            </div>

                            {/* Info banner */}
                            <div style={{
                                padding: '0.75rem', borderRadius: 10,
                                background: '#fffbeb', border: '1px solid #fde68a',
                                fontSize: '0.8125rem', color: '#92400e',
                                marginBottom: '1rem',
                            }}>
                                👋 Selamat datang, <strong>{selectedMember.full_name}</strong>!
                                Silakan buat password untuk akun Anda.
                            </div>

                            {/* Mini profile */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.625rem',
                                padding: '0.75rem', borderRadius: 10,
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                marginBottom: '1rem',
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `linear-gradient(135deg, ${deptColors[selectedMember.department] || '#475569'}, ${deptColors[selectedMember.department] || '#475569'}dd)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 13,
                                }}>
                                    {selectedMember.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>{selectedMember.full_name}</div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{selectedMember.role} · {selectedMember.department}</div>
                                </div>
                                <button onClick={() => { setStep('select'); setError('') }} style={{
                                    marginLeft: 'auto',
                                    padding: '0.25rem 0.5rem', borderRadius: 6,
                                    border: '1px solid #e2e8f0', background: 'white',
                                    fontSize: '0.6875rem', cursor: 'pointer', color: '#64748b',
                                }}>Ganti akun</button>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '0.75rem', borderRadius: 10,
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    color: '#dc2626', fontSize: '0.8125rem',
                                    marginBottom: '1rem',
                                }}>{error}</div>
                            )}

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                    Password Baru
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min. 6 karakter"
                                        autoFocus
                                        style={{
                                            ...inputStyle,
                                            paddingRight: '3rem',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#6d28d9'}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: '#94a3b8', padding: 4,
                                        }}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {newPassword && newPassword.length < 6 && (
                                    <p style={{ fontSize: '0.6875rem', color: '#dc2626', marginTop: 4 }}>Password minimal 6 karakter</p>
                                )}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                    Konfirmasi Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSetupPassword()}
                                    placeholder="Ulangi password"
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = '#6d28d9'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                                {confirmPassword && confirmPassword !== newPassword && (
                                    <p style={{ fontSize: '0.6875rem', color: '#dc2626', marginTop: 4 }}>Password tidak sama</p>
                                )}
                            </div>

                            <button
                                onClick={handleSetupPassword}
                                disabled={!newPassword || !confirmPassword || newPassword.length < 6 || newPassword !== confirmPassword || loggingIn}
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    borderRadius: 12, border: 'none',
                                    background: newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6
                                        ? 'linear-gradient(135deg, #059669, #047857)' : '#e2e8f0',
                                    color: newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6
                                        ? 'white' : '#94a3b8',
                                    fontSize: '0.9375rem', fontWeight: 600,
                                    cursor: newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6
                                        ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    boxShadow: newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6
                                        ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
                                }}
                            >
                                {loggingIn ? 'Menyimpan...' : '✅ Simpan Password & Masuk'}
                            </button>
                        </>
                    )}
                </div>

                <p style={{
                    textAlign: 'center', color: '#64748b',
                    fontSize: '0.75rem', marginTop: '1.5rem',
                }}>
                    CSC Management System v1.0
                </p>
            </div>
        </div>
    )
}

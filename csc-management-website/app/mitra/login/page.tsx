'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentMitra } from '@/lib/mitra-auth'
import { hashPassword, verifyPassword } from '@/lib/password'
import { LogIn, Lock, Eye, EyeOff, KeyRound, Briefcase } from 'lucide-react'

type LoginStep = 'select' | 'password' | 'setup'

export default function MitraLoginPage() {
    const [identity, setIdentity] = useState('')
    const [selectedPartner, setSelectedPartner] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [loggingIn, setLoggingIn] = useState(false)
    const [step, setStep] = useState<LoginStep>('select')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    const { login } = useCurrentMitra()

    useEffect(() => { setMounted(true) }, [])

    async function handleSelectAccount() {
        if (!identity.trim()) return
        setLoading(true)
        setError('')
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')

        try {
            // Find partner by exact NIM or case-insensitive exact Name
            const { data, error: searchError } = await supabase
                .from('members')
                .select('id, full_name, role, email, has_set_password, password_hash')
                .eq('role', 'Business Partner')
                .or(`nim.eq.${identity.trim()},full_name.ilike.${identity.trim()}`)
                .limit(1)
                .single()

            if (searchError || !data) {
                setError('Akun tidak ditemukan. Pastikan Nama atau NIM sesuai dengan pendaftaran.')
                setLoading(false)
                return
            }

            setSelectedPartner(data)
            
            if (!data.password_hash) {
                setStep('setup')
            } else {
                setStep('password')
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan')
        }
        setLoading(false)
    }

    async function handlePasswordLogin() {
        if (!selectedPartner || !password) return
        setError('')
        setLoggingIn(true)

        try {
            const valid = await verifyPassword(password, selectedPartner.password_hash)
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

        try {
            await login(selectedPartner.id)
        } catch (err: any) {
            setError(err.message)
            setLoggingIn(false)
        }
    }

    async function handleSetupPassword() {
        if (!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6) return
        setLoggingIn(true)
        setError('')

        try {
            const hashed = await hashPassword(newPassword)
            await supabase.from('members').update({ password_hash: hashed, has_set_password: true }).eq('id', selectedPartner.id)
            await login(selectedPartner.id)
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan')
            setLoggingIn(false)
        }
    }

    const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: '0.875rem', outline: 'none' }

    if (!mounted) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>

    return (
        <div style={{
            minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: '#0f766e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Briefcase size={32} />
                    </div>
                    <h1 style={{ color: '#115e59', fontSize: '1.5rem', fontWeight: 800 }}>Portal Mitra Bisnis</h1>
                    <p style={{ color: '#0f766e', fontSize: '0.875rem' }}>CSC Telkom University</p>
                </div>

                <div style={{ background: 'white', borderRadius: 20, padding: '2rem', boxShadow: '0 20px 40px rgba(15,118,110,0.1)' }}>
                    {step === 'select' && (
                        <>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#134e4a', marginBottom: '0.5rem' }}>Masuk Portal</h2>
                            <p style={{ color: '#0f766e', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Masukkan Nama Lengkap atau NIM Anda untuk melanjutkan.</p>
                            
                            {error && <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: '0.8125rem', marginBottom: '1rem' }}>{error}</div>}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <input
                                    type="text"
                                    value={identity}
                                    onChange={e => setIdentity(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSelectAccount()}
                                    placeholder="Contoh: Budi Santoso atau 130121..."
                                    style={inputStyle}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleSelectAccount}
                                disabled={!identity.trim() || loading}
                                style={{
                                    width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none',
                                    background: identity.trim() ? '#0d9488' : '#e2e8f0', color: identity.trim() ? 'white' : '#94a3b8',
                                    fontWeight: 700, cursor: identity.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {loading ? 'Mencari Akun...' : 'Lanjutkan'}
                            </button>
                        </>
                    )}

                    {step === 'password' && selectedPartner && (
                        <>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#134e4a', marginBottom: '0.5rem' }}>Selamat datang,</h2>
                            <p style={{ color: '#0f766e', marginBottom: '1.5rem', fontWeight: 500 }}>{selectedPartner.full_name}</p>

                            {error && <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: '0.8125rem', marginBottom: '1rem' }}>{error}</div>}

                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Password"
                                    style={inputStyle}
                                    onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <button onClick={handlePasswordLogin} disabled={!password || loggingIn} style={{ width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none', background: password ? '#0d9488' : '#e2e8f0', color: password ? 'white' : '#94a3b8', fontWeight: 700, cursor: password ? 'pointer' : 'not-allowed' }}>
                                {loggingIn ? 'Masuk...' : 'Masuk Portal'}
                            </button>
                            <button onClick={() => setStep('select')} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8125rem', cursor: 'pointer' }}>Batal</button>
                        </>
                    )}

                    {step === 'setup' && selectedPartner && (
                        <>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#134e4a', marginBottom: '0.5rem' }}>Buat Password</h2>
                            <p style={{ color: '#0f766e', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Anda belum memiliki password. Buat password baru untuk akun <strong>{selectedPartner.full_name}</strong>.</p>

                            {error && <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: '0.8125rem', marginBottom: '1rem' }}>{error}</div>}

                            <div style={{ marginBottom: '1rem', position: 'relative' }}>
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Password Baru (min 6 karakter)"
                                    style={inputStyle}
                                />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Ulangi Password Baru"
                                    style={inputStyle}
                                />
                            </div>

                            <button onClick={handleSetupPassword} disabled={loggingIn || !newPassword || newPassword !== confirmPassword} style={{ width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none', background: newPassword === confirmPassword && newPassword.length >= 6 ? '#0d9488' : '#e2e8f0', color: newPassword === confirmPassword && newPassword.length >= 6 ? 'white' : '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>
                                {loggingIn ? 'Menyimpan...' : 'Simpan & Masuk'}
                            </button>
                            <button onClick={() => setStep('select')} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8125rem', cursor: 'pointer' }}>Batal</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

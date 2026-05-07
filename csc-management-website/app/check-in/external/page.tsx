'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, User, Building, AlertCircle, Loader2, QrCode, Camera } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

function ExternalCheckInContent() {
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('sessionId')
    
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const [name, setName] = useState('')
    const [org, setOrg] = useState('')
    const [step, setStep] = useState<'form' | 'scanner' | 'success'>('form')
    const [scannerActive, setScannerActive] = useState(false)

    useEffect(() => {
        if (sessionId) {
            loadSession()
        } else {
            setLoading(false)
            setError('ID Sesi tidak ditemukan.')
        }
    }, [sessionId])

    async function loadSession() {
        const { data, error } = await supabase
            .from('attendance_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()
        
        if (error || !data) {
            setError('Sesi kehadiran tidak ditemukan atau telah dihapus.')
        } else if (!data.allow_external) {
            setError('Sesi ini tidak mengizinkan check-in eksternal.')
        } else if (data.deadline && new Date() > new Date(data.deadline)) {
            setError('Batas waktu check-in untuk sesi ini telah berakhir.')
        } else {
            setSession(data)
        }
        setLoading(false)
    }

    async function handleStartScanner() {
        if (!name) return
        setStep('scanner')
        setScannerActive(true)
    }

    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;

        if (step === 'scanner' && scannerActive && session) {
            html5QrCode = new Html5Qrcode("reader");
            
            const startScanner = async () => {
                try {
                    await html5QrCode?.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                        },
                        (decodedText) => {
                            if (decodedText === session.qr_token) {
                                html5QrCode?.stop().then(() => {
                                    submitCheckIn();
                                }).catch(err => console.error(err));
                            } else {
                                alert("QR Code tidak valid untuk sesi ini. Pastikan Anda melakukan scan pada QR yang disediakan panitia.");
                            }
                        },
                        (errorMessage) => {
                            // parse error, ignore
                        }
                    );
                } catch (err) {
                    console.error("Gagal memulai scanner:", err);
                    alert("Tidak dapat mengakses kamera. Pastikan Anda memberikan izin kamera dan menggunakan koneksi HTTPS jika tidak di localhost.");
                    setStep('form');
                    setScannerActive(false);
                }
            };

            startScanner();
        }

        return () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
            }
        };
    }, [step, scannerActive, session])

    async function submitCheckIn() {
        setSubmitting(true)
        const { error } = await supabase.from('attendance_session_members').insert({
            session_id: sessionId,
            is_external: true,
            external_name: name,
            external_org: org,
            status: 'present',
            responded_at: new Date().toISOString()
        })
        
        if (error) {
            console.error(error)
            alert('Gagal melakukan check-in. Silakan coba lagi.')
            setStep('form')
            setScannerActive(false)
        } else {
            setSuccess(true)
            setStep('success')
        }
        setSubmitting(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        handleStartScanner()
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#f8fafc' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-brand-500)" />
                <p style={{ marginTop: '1rem', color: '#64748b' }}>Memuat informasi sesi...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#f8fafc' }}>
                <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: 400, textAlign: 'center' }}>
                    <div style={{ background: '#fef2f2', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <AlertCircle size={32} color="#dc2626" />
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>Terjadi Kesalahan</h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>{error}</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#f8fafc' }}>
                <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: 400, textAlign: 'center' }}>
                    <div style={{ background: '#f0fdf4', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <CheckCircle2 size={32} color="#16a34a" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b' }}>Berhasil!</h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Terima kasih, <strong>{name}</strong>. Check-in Anda untuk sesi <strong>{session.title}</strong> telah berhasil direkam.</p>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Anda dapat menutup halaman ini sekarang.</div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#f8fafc' }}>
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: 450, width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--color-brand-50)', color: 'var(--color-brand-600)', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Self Check-in Eksternal
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>{session.title}</h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        {step === 'form' ? (session.description || 'Silakan isi data diri Anda untuk melakukan absensi.') : 'Scan QR Code kehadiran yang ditampilkan oleh panitia untuk mengonfirmasi kehadiran Anda.'}
                    </p>
                </div>

                {step === 'form' ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={14} /> Nama Lengkap *
                            </label>
                            <input 
                                className="form-input" 
                                placeholder="Contoh: Budi Santoso" 
                                required 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                style={{ padding: '0.75rem 1rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building size={14} /> Institusi / Organisasi
                            </label>
                            <input 
                                className="form-input" 
                                placeholder="Contoh: Universitas Telkom" 
                                value={org} 
                                onChange={e => setOrg(e.target.value)}
                                style={{ padding: '0.75rem 1rem' }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={submitting || !name}
                            style={{ marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            Lanjut: Scan QR <QrCode size={18} />
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div id="reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '1rem', border: '1px solid #e2e8f0', background: '#000', minHeight: '300px' }}></div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>Membuka kamera...</p>
                            <button className="btn btn-ghost" onClick={() => setStep('form')} style={{ color: '#64748b' }}>
                                Kembali ke Form
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Powered by <strong>CSC Management System</strong>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function ExternalCheckInPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ExternalCheckInContent />
        </Suspense>
    )
}

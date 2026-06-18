'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, User, Building, AlertCircle, Loader2, QrCode, Camera, Upload, Image as ImageIcon } from 'lucide-react'
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
    const [processingFile, setProcessingFile] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [hasScanned, setHasScanned] = useState(false)
    
    // New fields
    const [userType, setUserType] = useState<'mahasiswa' | 'eksternal'>('mahasiswa')
    const [phone, setPhone] = useState('')
    const [nim, setNim] = useState('')
    const [faculty, setFaculty] = useState('')
    const [major, setMajor] = useState('')

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

        if (step === 'scanner' && scannerActive && session && !hasScanned) {
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
                            let isValid = false
                            if (decodedText === session.qr_token) {
                                isValid = true
                            } else if (decodedText.includes('sessionId=')) {
                                try {
                                    const url = new URL(decodedText)
                                    const sId = url.searchParams.get('sessionId')
                                    if (sId === session.id) isValid = true
                                } catch (e) {
                                    // ignore parse error
                                }
                            }

                            if (isValid) {
                                setHasScanned(true);
                                setScanError(null);
                                html5QrCode?.stop().then(() => {
                                    submitCheckIn();
                                }).catch(err => console.error("Error stopping scanner:", err));
                            } else {
                                setScanError("QR Code tidak valid untuk sesi ini.");
                            }
                        },
                        (errorMessage) => {
                            // parse error, ignore
                        }
                    );
                } catch (err) {
                    console.error("Gagal memulai scanner:", err);
                    setScanError("Tidak dapat mengakses kamera. Pastikan Anda memberikan izin kamera.");
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
    
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !session) return
        
        setProcessingFile(true)
        // We create a temporary reader div or just use a dummy id if library allows
        // html5-qrcode scanFile doesn't strictly need a visible element but it's good practice
        const html5QrCode = new Html5Qrcode("reader")
        
        try {
            const decodedText = await html5QrCode.scanFile(file, true)
            let isValid = false
            if (decodedText === session.qr_token) {
                isValid = true
            } else if (decodedText.includes('sessionId=')) {
                try {
                    const url = new URL(decodedText)
                    const sId = url.searchParams.get('sessionId')
                    if (sId === session.id) isValid = true
                } catch (e) { }
            }

            if (isValid) {
                setScanError(null)
                submitCheckIn()
            } else {
                setScanError("QR Code dalam gambar tidak valid untuk sesi ini. Pastikan Anda mengunggah QR Code yang benar.")
                setProcessingFile(false)
            }
        } catch (err) {
            console.error("Gagal men-scan file:", err)
            setScanError("Tidak dapat mendeteksi QR Code pada gambar ini. Pastikan gambar cukup jelas dan fokus pada QR Code.")
            setProcessingFile(false)
        }
    }

    async function submitCheckIn() {
        setSubmitting(true)
        const { error } = await supabase.from('attendance_session_members').insert({
            session_id: sessionId,
            is_external: true,
            external_name: name,
            external_phone: phone || null,
            external_org: userType === 'mahasiswa' ? 'Telkom University' : org,
            external_nim: userType === 'mahasiswa' ? nim : null,
            external_faculty: userType === 'mahasiswa' ? faculty : null,
            external_major: userType === 'mahasiswa' ? major : null,
            external_type: userType === 'mahasiswa' ? 'Mahasiswa Telkom' : 'Eksternal',
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
                        {step === 'form' ? (session.description || 'Silakan isi data diri Anda untuk melakukan absensi.') : 'Scan QR Code kehadiran menggunakan kamera atau unggah gambar QR Code yang diberikan panitia.'}
                    </p>
                </div>

                {step === 'form' ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* User Type Toggle */}
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.75rem', marginBottom: '0.5rem' }}>
                            <button 
                                type="button"
                                onClick={() => setUserType('mahasiswa')}
                                style={{ 
                                    flex: 1, padding: '0.5rem', borderRadius: '0.6rem', fontSize: '0.8125rem', fontWeight: 600, border: 'none',
                                    background: userType === 'mahasiswa' ? 'white' : 'transparent',
                                    color: userType === 'mahasiswa' ? 'var(--color-brand-600)' : '#64748b',
                                    boxShadow: userType === 'mahasiswa' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                Mahasiswa Telkom
                            </button>
                            <button 
                                type="button"
                                onClick={() => setUserType('eksternal')}
                                style={{ 
                                    flex: 1, padding: '0.5rem', borderRadius: '0.6rem', fontSize: '0.8125rem', fontWeight: 600, border: 'none',
                                    background: userType === 'eksternal' ? 'white' : 'transparent',
                                    color: userType === 'eksternal' ? 'var(--color-brand-600)' : '#64748b',
                                    boxShadow: userType === 'eksternal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                Eksternal
                            </button>
                        </div>

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
                                No. Telepon / WhatsApp
                            </label>
                            <input 
                                className="form-input" 
                                type="tel"
                                placeholder="Contoh: 08123456789" 
                                value={phone} 
                                onChange={e => setPhone(e.target.value)}
                                style={{ padding: '0.75rem 1rem' }}
                            />
                        </div>

                        {userType === 'mahasiswa' ? (
                            <>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <QrCode size={14} /> NIM *
                                    </label>
                                    <input 
                                        className="form-input" 
                                        placeholder="Contoh: 130121XXXX" 
                                        required 
                                        value={nim} 
                                        onChange={e => setNim(e.target.value)}
                                        style={{ padding: '0.75rem 1rem' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Fakultas *</label>
                                        <input 
                                            className="form-input" 
                                            placeholder="cth: FIF" 
                                            required 
                                            value={faculty} 
                                            onChange={e => setFaculty(e.target.value)}
                                            style={{ padding: '0.75rem 1rem' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Jurusan *</label>
                                        <input 
                                            className="form-input" 
                                            placeholder="cth: S1 IF" 
                                            required 
                                            value={major} 
                                            onChange={e => setMajor(e.target.value)}
                                            style={{ padding: '0.75rem 1rem' }}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={14} /> Institusi / Organisasi *
                                </label>
                                <input 
                                    className="form-input" 
                                    placeholder="Contoh: Universitas Gadjah Mada" 
                                    required
                                    value={org} 
                                    onChange={e => setOrg(e.target.value)}
                                    style={{ padding: '0.75rem 1rem' }}
                                />
                            </div>
                        )}
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={submitting || !name || (userType === 'mahasiswa' && (!nim || !faculty || !major)) || (userType === 'eksternal' && !org)}
                            style={{ marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            Lanjut: Scan QR <QrCode size={18} />
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div id="reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '1rem', border: '1px solid #e2e8f0', background: '#000', minHeight: '300px' }}></div>
                        {scanError && (
                            <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #fecaca' }}>
                                {scanError}
                            </div>
                        )}
                        <div style={{ textAlign: 'center' }}>
                            {processingFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-brand-600)', marginBottom: '1rem', fontWeight: 600 }}>
                                    <Loader2 className="animate-spin" size={18} /> Memproses Gambar...
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>Arahkan kamera ke QR Code kehadiran.</p>
                            )}
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <ImageIcon size={18} /> Unggah Gambar QR
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        style={{ display: 'none' }} 
                                        onChange={handleFileUpload}
                                        disabled={processingFile || submitting}
                                    />
                                </label>
                                
                                <button className="btn btn-ghost" onClick={() => setStep('form')} style={{ color: '#64748b' }}>
                                    Kembali ke Form
                                </button>
                            </div>
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

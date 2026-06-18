'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { formatDateShort } from '@/lib/utils'
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle, QrCode, X, Download } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { exportToPdf } from '@/lib/export'

export default function MyAttendancePage() {
    const { currentUser } = useCurrentUser()
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showScanner, setShowScanner] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [scanSuccess, setScanSuccess] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => { if (currentUser) loadData() }, [currentUser])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('attendance_session_members')
            .select('*, session:attendance_sessions(*)')
            .eq('member_id', currentUser?.id)
        setSessions(data || [])
        setLoading(false)
    }

    async function respond(id: string, status: 'present' | 'absent' | 'excused') {
        await supabase.from('attendance_session_members').update({
            status,
            responded_at: new Date().toISOString(),
        }).eq('id', id)
        loadData()
    }

    // Check for expired sessions and auto-mark as alpa
    useEffect(() => {
        if (sessions.length > 0) {
            const now = new Date()
            sessions.forEach(async (s) => {
                if (s.status === 'pending' && s.session?.deadline) {
                    const deadline = new Date(s.session.deadline)
                    if (now > deadline) {
                        await supabase.from('attendance_session_members').update({
                            status: 'alpa',
                        }).eq('id', s.id)
                    }
                }
            })
        }
    }, [sessions])

    const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
        pending: { icon: Clock, color: '#92400e', bg: '#fef3c7', label: 'Menunggu Respons' },
        present: { icon: CheckCircle2, color: '#166534', bg: '#dcfce7', label: 'Hadir' },
        absent: { icon: XCircle, color: '#991b1b', bg: '#fee2e2', label: 'Tidak Hadir' },
        excused: { icon: AlertTriangle, color: '#1e40af', bg: '#dbeafe', label: 'Izin' },
        alpa: { icon: XCircle, color: '#991b1b', bg: '#fee2e2', label: 'Alpa (Tanpa Keterangan)' },
    }

    // Stats
    const totalAssigned = sessions.length
    const totalPresent = sessions.filter(s => s.status === 'present').length
    const totalAbsent = sessions.filter(s => s.status === 'absent' || s.status === 'alpa').length
    const totalPending = sessions.filter(s => s.status === 'pending').length
    const attendRate = totalAssigned > 0 ? ((totalPresent / totalAssigned) * 100) : 0

    async function handleScanSuccess(decodedText: string) {
        if (scanning) return
        setScanning(true)
        setScanError(null)

        try {
            // 1. Find session by token or URL
            let sessionQuery = supabase.from('attendance_sessions').select('id, title')
            
            if (decodedText.includes('sessionId=')) {
                try {
                    const url = new URL(decodedText)
                    const sessionId = url.searchParams.get('sessionId')
                    if (sessionId) {
                        sessionQuery = sessionQuery.eq('id', sessionId)
                    } else {
                        sessionQuery = sessionQuery.eq('qr_token', decodedText)
                    }
                } catch (e) {
                    // fallback if not valid URL
                    sessionQuery = sessionQuery.eq('qr_token', decodedText)
                }
            } else {
                sessionQuery = sessionQuery.eq('qr_token', decodedText)
            }

            const { data: session, error: sError } = await sessionQuery.single()

            if (sError || !session) {
                setScanError('QR Code tidak valid atau sesi tidak ditemukan.')
                setScanning(false)
                return
            }

            // 2. Check if user is in this session
            const { data: memberRecord, error: mError } = await supabase
                .from('attendance_session_members')
                .select('id, status')
                .eq('session_id', session.id)
                .eq('member_id', currentUser?.id)
                .single()

            if (mError || !memberRecord) {
                setScanError(`Anda tidak terdaftar dalam sesi "${session.title}".`)
                setScanning(false)
                return
            }

            if (memberRecord.status === 'present') {
                setScanSuccess(`Anda sudah tercatat Hadir di sesi "${session.title}".`)
                setTimeout(() => setShowScanner(false), 2000)
                setScanning(false)
                return
            }

            // 3. Update status
            const { error: uError } = await supabase
                .from('attendance_session_members')
                .update({ 
                    status: 'present',
                    responded_at: new Date().toISOString()
                })
                .eq('id', memberRecord.id)

            if (uError) {
                setScanError('Gagal melakukan check-in. Silakan coba lagi.')
            } else {
                setScanSuccess(`Berhasil Check-In: ${session.title}`)
                loadData()
                setTimeout(() => setShowScanner(false), 2000)
            }
        } catch (err) {
            setScanError('Terjadi kesalahan saat memproses QR Code.')
        }
        setScanning(false)
    }

    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        
        if (showScanner && !scanSuccess) {
            html5QrCode = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // silently ignore scan errors while looking for QR
                }
            ).catch(err => {
                console.error("Camera error:", err);
                if (!window.isSecureContext) {
                    setScanError("Akses kamera hanya diperbolehkan melalui koneksi aman (HTTPS). Silakan akses website melalui HTTPS.");
                } else if (err.toString().includes("NotAllowedError")) {
                    setScanError("Izin kamera ditolak. Silakan aktifkan izin kamera di pengaturan browser Anda.");
                } else {
                    setScanError(`Gagal mengakses kamera: ${err.message || err.toString()}. Pastikan kamera tidak sedang digunakan aplikasi lain.`);
                }
            });
        }

        return () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(console.error);
            }
        };
    }, [showScanner, scanSuccess]);

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setScanError(null);
        
        const html5QrCode = new Html5Qrcode("reader");
        try {
            const decodedText = await html5QrCode.scanFileV2(file, false);
            await handleScanSuccess(decodedText.decodedText);
        } catch (err) {
            setScanError("Gagal membaca QR Code dari gambar. Pastikan gambar jelas dan berisi QR Code yang valid.");
        } finally {
            setIsUploading(false);
            // Clear input
            e.target.value = '';
        }
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Kehadiran Saya</div></div>
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Kehadiran Saya</h1>
                        <p className="page-subtitle" style={{ marginBottom: 0 }}>Lihat dan isi kehadiran kegiatan Anda</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => {
                            const pdfData = sessions.map(s => ({
                                title: s.session?.title,
                                date: formatDateShort(s.session?.event_date),
                                status: statusConfig[s.status]?.label || s.status
                            }));
                            exportToPdf({
                                title: `Laporan Kehadiran: ${currentUser?.full_name}`,
                                subtitle: `Tingkat Kehadiran: ${attendRate.toFixed(0)}%`,
                                columns: [
                                    { header: 'Kegiatan', key: 'title' },
                                    { header: 'Tanggal', key: 'date' },
                                    { header: 'Status', key: 'status' }
                                ],
                                data: pdfData
                            });
                        }}>
                            <Download size={18} /> Export PDF
                        </button>
                        <button className="btn btn-primary" onClick={() => { setShowScanner(true); setScanError(null); setScanSuccess(null); }}>
                            <QrCode size={18} /> Scan QR Check-In
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-brand-500)' }}>{attendRate.toFixed(0)}%</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Kehadiran</div>
                        <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                            <div className={`progress-bar-fill ${attendRate >= 75 ? 'success' : attendRate >= 50 ? 'warning' : 'danger'}`} style={{ width: `${attendRate}%` }} />
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{totalPresent}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Hadir</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{totalAbsent}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Alpa</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{totalPending}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Pending</div>
                    </div>
                </div>

                {/* Sessions List */}
                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</div>
                ) : sessions.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <CalendarCheck size={48} />
                            <h3>Belum ada kegiatan</h3>
                            <p>Belum ada kegiatan yang di-assign kepada Anda.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {sessions.map((s: any) => {
                            const st = statusConfig[s.status] || statusConfig.pending
                            const StIcon = st.icon
                            const isPending = s.status === 'pending'
                            const isExpired = s.session?.deadline && new Date() > new Date(s.session.deadline)

                            return (
                                <div key={s.id} className="card" style={{
                                    borderLeft: `4px solid ${st.color}`,
                                    padding: '1rem'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{s.session?.title}</h3>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '0.15rem 0.5rem', borderRadius: 6,
                                                    fontSize: '0.6875rem', fontWeight: 600,
                                                    background: st.bg, color: st.color,
                                                }}>
                                                    <StIcon size={12} /> {st.label}
                                                </span>
                                            </div>
                                            {s.session?.description && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0' }}>{s.session.description}</p>}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {formatDateShort(s.session?.event_date)}</span>
                                                {s.session?.deadline && (
                                                    <span style={{ color: isExpired ? '#dc2626' : undefined, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        ⏰ Batas: {new Date(s.session.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                {s.responded_at && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>✓ Diisi: {new Date(s.responded_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                                            </div>
                                        </div>

                                        {isPending && !isExpired && (
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '0.5rem', 
                                                flexWrap: 'wrap',
                                                borderTop: '1px solid var(--color-border-primary)',
                                                paddingTop: '1rem'
                                            }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => respond(s.id, 'present')} style={{ background: '#16a34a', borderColor: '#16a34a', flex: 1, minWidth: '100px' }}>
                                                    <CheckCircle2 size={14} /> Hadir
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => respond(s.id, 'excused')} style={{ flex: 1, minWidth: '80px' }}>
                                                    Izin
                                                </button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626', flex: 1, minWidth: '100px' }} onClick={() => respond(s.id, 'absent')}>
                                                    Tidak Hadir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* QR Scanner Modal */}
                {showScanner && (
                    <div className="modal-overlay" onClick={() => setShowScanner(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, textAlign: 'center' }}>
                            <div className="modal-header">
                                <h2>Scan QR Kehadiran</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowScanner(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ padding: '1.5rem' }}>
                                {scanSuccess ? (
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                        <div style={{ 
                                            width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            margin: '0 auto 1.5rem', color: '#166534' 
                                        }}>
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h3 style={{ fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>Check-In Berhasil!</h3>
                                        <p style={{ fontSize: '0.875rem', color: '#166534' }}>{scanSuccess}</p>
                                    </div>
                                ) : (
                                    <>
                                        {scanError && (
                                            <div style={{ 
                                                padding: '0.75rem', borderRadius: 8, background: '#fee2e2', 
                                                color: '#991b1b', fontSize: '0.8125rem', marginBottom: '1rem',
                                                display: 'flex', alignItems: 'center', gap: 8
                                            }}>
                                                <AlertTriangle size={16} /> {scanError}
                                            </div>
                                        )}
                                        <div id="reader" style={{ 
                                            width: '100%', 
                                            maxWidth: '350px', 
                                            margin: '0 auto',
                                            overflow: 'hidden',
                                            borderRadius: '1rem',
                                            border: '2px solid #e2e8f0',
                                            background: '#f8fafc'
                                        }}></div>

                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
                                                Atau upload screenshot/foto QR Code:
                                            </p>
                                            <label className={`btn btn-secondary btn-block ${isUploading ? 'disabled' : ''}`} style={{ cursor: 'pointer' }}>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleFileUpload} 
                                                    style={{ display: 'none' }}
                                                    disabled={isUploading}
                                                />
                                                {isUploading ? 'Memproses...' : 'Upload Gambar QR'}
                                            </label>
                                        </div>
                                        
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
                                            Arahkan kamera ke QR Code atau upload file gambar.
                                        </p>
                                    </>
                                )}
                                <div style={{ marginTop: '1.5rem' }}>
                                    <button className="btn btn-secondary btn-block" onClick={() => setShowScanner(false)}>
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

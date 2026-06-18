'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Package, Clock, CheckCircle2, ChevronRight, XCircle, AlertCircle, MessageCircle, BarChart3 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Link from 'next/link'

export default function OrderMonitoringPublicPage() {
    const [trackingCode, setTrackingCode] = useState('')
    const [orders, setOrders] = useState<any[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadPublicOrders() {
            setLoading(true)
            try {
                // Fetch some recent public orders to show activity (anonymized)
                const { data, error } = await supabase
                    .from('external_orders')
                    .select('project_title, status, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5)
                
                if (error) {
                    console.error('Order monitoring error:', error)
                    setOrders([])
                } else {
                    setOrders(data || [])
                }
            } catch (err) {
                console.error('Failed to load orders:', err)
                setOrders([])
            }
            setLoading(false)
        }
        loadPublicOrders()
    }, [])

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!trackingCode.trim()) return

        setSearching(true)
        setError('')
        setSelectedOrder(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('external_orders')
                .select('*')
                .eq('tracking_code', trackingCode.trim().toUpperCase())
                .single()

            if (fetchError || !data) {
                setError('Pesanan tidak ditemukan. Periksa kembali kode resi Anda.')
            } else {
                setSelectedOrder(data)
            }
        } catch (err) {
            console.error('Error searching orders:', err)
            setError('Terjadi kesalahan saat mencari pesanan. Coba lagi nanti.')
        }
        
        setSearching(false)
    }

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Menunggu', color: '#f59e0b', icon: Clock, bg: '#fffbeb' }
            case 'accepted': return { label: 'Diterima', color: '#3b82f6', icon: CheckCircle2, bg: '#eff6ff' }
            case 'on_progress': return { label: 'Diproses', color: '#6366f1', icon: Package, bg: '#eef2ff' }
            case 'done': return { label: 'Selesai', color: '#10b981', icon: CheckCircle2, bg: '#ecfdf5' }
            case 'rejected': return { label: 'Ditolak', color: '#ef4444', icon: XCircle, bg: '#fef2f2' }
            default: return { label: 'Unknown', color: '#6b7280', icon: AlertCircle, bg: '#f3f4f6' }
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFCF8 0%, #F5EEDC 50%, #EFE5D1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            {/* Background Pattern */}
            <div style={{ position: 'fixed', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle at 2px 2px, #9A3412 1px, transparent 0)', backgroundSize: '40px 40px' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 640 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 24,
                        background: 'white', 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1.25rem', border: '1px solid #F5EEDC',
                        boxShadow: '0 10px 25px -5px rgba(154, 52, 18, 0.15)',
                    }}><BarChart3 size={36} color="#9A3412" /></div>
                    <h1 style={{ color: '#431407', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Order Monitoring</h1>
                    <p style={{ color: '#78350f', fontSize: '1rem', marginBottom: '1rem' }}>Pantau perkembangan permintaan layanan CSC secara real-time</p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/order" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '0.625rem 1.25rem', borderRadius: 12,
                            background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white',
                            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(154, 52, 18, 0.25)',
                        }}>
                            <Package size={16} /> Buat Pemesanan Baru
                        </Link>
                        <Link href="/daftar-agen" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '0.625rem 1.25rem', borderRadius: 12,
                            background: 'white', color: '#9A3412', border: '2px solid #e7e5e4',
                            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                        }}>
                            Daftar Mitra Bisnis <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Main Card */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: '2rem',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                }}>
                    {/* Search Section */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Search size={20} style={{ color: '#9A3412' }} /> Lacak dengan Kode Resi
                        </h2>
                        <form onSubmit={handleSearch} className="search-form" style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                type="text"
                                placeholder="Masukkan Kode (Contoh: ORD-X1Y2Z3)"
                                value={trackingCode}
                                onChange={e => setTrackingCode(e.target.value)}
                                style={{
                                    flex: 1, padding: '0.875rem 1.25rem', borderRadius: 12,
                                    border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#9A3412'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                style={{
                                    padding: '0 1.5rem', borderRadius: 12, border: 'none',
                                    background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                {searching ? '...' : 'Cek'}
                            </button>
                        </form>
                    </div>

                    {/* Result or List Section */}
                    {selectedOrder ? (
                        <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    style={{ background: 'none', border: 'none', color: '#9A3412', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    ← Kembali
                                </button>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                                    KODE: <span style={{ fontFamily: 'monospace', color: '#1e293b', fontSize: '0.875rem' }}>{selectedOrder.tracking_code}</span>
                                </div>
                            </div>

                            <div style={{
                                padding: '1.5rem', borderRadius: 20,
                                background: getStatusInfo(selectedOrder.status).bg,
                                border: `1px solid ${getStatusInfo(selectedOrder.status).color}20`,
                                marginBottom: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 12,
                                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: getStatusInfo(selectedOrder.status).color,
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                    }}>
                                        {(() => {
                                            const Icon = getStatusInfo(selectedOrder.status).icon
                                            return <Icon size={24} />
                                        })()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: getStatusInfo(selectedOrder.status).color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Status: {getStatusInfo(selectedOrder.status).label}
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{selectedOrder.project_title}</h3>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1rem' }}>
                                    <strong>Klien:</strong> {selectedOrder.client_name}<br/>
                                    <strong>Update Terakhir:</strong> {formatDateShort(selectedOrder.updated_at)}
                                </div>

                                <div style={{ background: 'white', padding: '1rem', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MessageCircle size={14} /> CATATAN TIM OPERATING:
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#1e293b', fontStyle: selectedOrder.operating_notes ? 'normal' : 'italic' }}>
                                        {selectedOrder.operating_notes || 'Belum ada catatan khusus untuk saat ini.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', borderRadius: 16, border: '1px solid #fecaca', marginBottom: '1.5rem' }}>
                            <XCircle size={40} color="#ef4444" style={{ marginBottom: '0.75rem' }} />
                            <div style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</div>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                Aktivitas Terbaru
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>Memuat aktivitas...</div>
                                ) : orders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>Belum ada aktivitas pesanan.</div>
                                ) : (
                                    orders.map((o, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '1rem', borderRadius: 16, background: '#f8fafc',
                                            border: '1px solid #f1f5f9',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusInfo(o.status).color }} />
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{o.project_title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateShort(o.created_at)}</div>
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem',
                                                borderRadius: 999, background: getStatusInfo(o.status).bg, color: getStatusInfo(o.status).color,
                                            }}>
                                                {getStatusInfo(o.status).label}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <Link href="/" style={{ color: '#78350f', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Kembali ke Portal Utama <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: '#78350f', opacity: 0.5, fontSize: '0.75rem', marginTop: '1.5rem' }}>
                    &copy; {new Date().getFullYear()} Community Support Center Telkom University
                </p>
            </div>

            <style jsx global>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @media (max-width: 480px) {
                    .search-form {
                        flex-direction: column;
                    }
                    .search-form button {
                        padding: 0.875rem !important;
                    }
                }
            `}</style>
        </div>
    )
}

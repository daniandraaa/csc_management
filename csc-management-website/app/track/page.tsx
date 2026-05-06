'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Package, Clock, CheckCircle2, ChevronRight, XCircle, AlertCircle, MessageCircle } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Link from 'next/link'

export default function TrackOrderPage() {
    const [trackingCode, setTrackingCode] = useState('')
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [hasSearched, setHasSearched] = useState(false)

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!trackingCode.trim()) return

        setLoading(true)
        setError('')
        setHasSearched(true)
        setOrder(null)

        // Find order by tracking code
        const { data, error: fetchError } = await supabase
            .from('external_orders')
            .select('*')
            .eq('tracking_code', trackingCode.trim().toUpperCase())
            .single()

        if (fetchError || !data) {
            setError('Pesanan tidak ditemukan. Periksa kembali kode resi Anda.')
        } else {
            setOrder(data)
        }
        
        setLoading(false)
    }

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Menunggu', color: '#f59e0b', icon: Clock }
            case 'accepted': return { label: 'Diterima', color: '#3b82f6', icon: CheckCircle2 }
            case 'on_progress': return { label: 'Sedang Diproses', color: '#6366f1', icon: Package }
            case 'done': return { label: 'Selesai', color: '#10b981', icon: CheckCircle2 }
            case 'rejected': return { label: 'Ditolak', color: '#ef4444', icon: XCircle }
            default: return { label: 'Tidak Diketahui', color: '#6b7280', icon: AlertCircle }
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/logo.png" alt="CSC Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    <span style={{ fontWeight: 600, fontSize: '1.125rem', color: '#0f172a' }}>Lacak Pesanan</span>
                </div>
                <Link href="/" style={{ fontSize: '0.875rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
                    Kembali ke Beranda
                </Link>
            </header>

            <main style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Lacak Status Pesanan Anda</h1>
                    <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Masukkan kode resi (tracking code) yang diberikan oleh tim Operating CSC.</p>
                </div>

                {/* Search Box */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', marginBottom: '2rem' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Contoh: ORD-A1B2C3"
                                value={trackingCode}
                                onChange={e => setTrackingCode(e.target.value)}
                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: 8, border: '2px solid #e2e8f0', fontSize: '1.125rem', outline: 'none', transition: 'border-color 0.2s' }}
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} style={{ background: '#dc2626', color: 'white', padding: '0 2rem', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Mencari...' : 'Lacak'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                {hasSearched && !loading && (
                    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                        {error ? (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1.5rem', borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={32} style={{ color: '#ef4444' }} />
                                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Pesanan Tidak Ditemukan</div>
                                <div style={{ fontSize: '0.9375rem' }}>{error}</div>
                            </div>
                        ) : order ? (
                            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                {/* Order Header */}
                                <div style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>KODE RESI</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: 1 }}>{order.tracking_code}</div>
                                        </div>
                                        {(() => {
                                            const statusInfo = getStatusInfo(order.status)
                                            const Icon = statusInfo.icon
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: statusInfo.color + '15', color: statusInfo.color, padding: '0.5rem 1rem', borderRadius: 999, fontWeight: 600 }}>
                                                    <Icon size={18} />
                                                    {statusInfo.label}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{order.project_title}</h2>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                                        <span><strong>Klien:</strong> {order.client_name}</span>
                                        <span><strong>Dibuat:</strong> {formatDateShort(order.created_at)}</span>
                                        <span><strong>Terakhir Update:</strong> {formatDateShort(order.updated_at)}</span>
                                    </div>
                                </div>

                                {/* Order Details */}
                                <div style={{ padding: '2rem', background: '#f8fafc' }}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Package size={18} style={{ color: '#dc2626' }} /> Deskripsi Permintaan
                                        </h3>
                                        <div style={{ background: 'white', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                            {order.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada deskripsi</span>}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MessageCircle size={18} style={{ color: '#dc2626' }} /> Keterangan dari Tim Operating
                                        </h3>
                                        <div style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '1.25rem', borderRadius: '0 12px 12px 0', color: '#92400e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                            {order.operating_notes || <span style={{ color: '#b45309', fontStyle: 'italic' }}>Belum ada keterangan atau update dari tim.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </main>
            
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentMitra } from '@/lib/mitra-auth'
import { Package, Clock, CheckCircle2, DollarSign, Plus, X, Pencil, Trash2, ArrowUpRight, FileText } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export default function MitraDashboardPage() {
    const { currentMitra } = useCurrentMitra()
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<any[]>([])
    const [myServices, setMyServices] = useState<any[]>([])
    const [stats, setStats] = useState({ activeOrders: 0, completedOrders: 0, totalIncome: 0 })
    
    // UI State
    const [activeTab, setActiveTab] = useState<'tugas' | 'layanan'>('tugas')
    const [showServiceModal, setShowServiceModal] = useState(false)
    const [editServiceId, setEditServiceId] = useState<string | null>(null)
    const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', price_note: '', is_active: true })

    useEffect(() => {
        if (currentMitra) loadData()
    }, [currentMitra])

    async function loadData() {
        setLoading(true)
        
        // 1. Fetch Assigned Orders
        const { data: orderData } = await supabase.from('external_orders')
            .select('*')
            .eq('assigned_mitra_id', currentMitra!.id)
            .order('created_at', { ascending: false })
            
        // 2. Fetch My Services
        const { data: serviceData } = await supabase.from('service_categories')
            .select('*')
            .eq('provider_id', currentMitra!.id)
            .order('created_at', { ascending: false })
            
        if (orderData) {
            setOrders(orderData)
            const completed = orderData.filter(o => o.status === 'done')
            const income = completed.reduce((sum, o) => sum + (Number(o.partner_fee) || 0), 0)
            
            setStats({
                activeOrders: orderData.filter(o => o.status !== 'done' && o.status !== 'rejected').length,
                completedOrders: completed.length,
                totalIncome: income
            })
        }
        
        if (serviceData) {
            setMyServices(serviceData)
        }
        
        setLoading(false)
    }

    async function requestStatusDone(orderId: string) {
        if (!confirm('Ajukan penyelesaian pesanan ini ke pengurus CSC?')) return
        await supabase.from('external_orders').update({ partner_status_request: 'done' }).eq('id', orderId)
        alert('Pengajuan selesai telah dikirim. Menunggu persetujuan admin.')
        loadData()
    }

    async function handleSaveService(e: React.FormEvent) {
        e.preventDefault()
        const payload = {
            name: serviceForm.name,
            type: 'business', // Default untuk layanan dari mitra
            description: serviceForm.description || null,
            price: serviceForm.price ? parseFloat(serviceForm.price) : null,
            price_note: serviceForm.price_note || null,
            is_active: serviceForm.is_active,
            department: 'Business',
            provider_id: currentMitra!.id
        }

        if (editServiceId) {
            await supabase.from('service_categories').update(payload).eq('id', editServiceId)
        } else {
            await supabase.from('service_categories').insert(payload)
        }

        setShowServiceModal(false)
        loadData()
    }

    async function deleteService(id: string) {
        if (!confirm('Hapus layanan ini permanen?')) return
        await supabase.from('service_categories').delete().eq('id', id)
        loadData()
    }

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Memuat dashboard...</div>

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Dashboard Mitra Bisnis</div></div>
            <div className="page-container">
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="page-title">Halo, {currentMitra?.full_name} 👋</h1>
                    <p className="page-subtitle">Pantau pesanan yang masuk dan kelola katalog layanan Anda</p>
                </div>

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b', background: 'linear-gradient(135deg, white 0%, #fffbeb 100%)' }}>
                        <div><div className="stat-value" style={{ color: '#f59e0b' }}>{stats.activeOrders}</div><div className="stat-label">Pesanan Aktif</div></div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} color="#f59e0b" /></div>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(135deg, white 0%, #ecfdf5 100%)' }}>
                        <div><div className="stat-value" style={{ color: '#10b981' }}>{stats.completedOrders}</div><div className="stat-label">Pesanan Selesai</div></div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={20} color="#10b981" /></div>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(135deg, white 0%, #f5f3ff 100%)' }}>
                        <div><div className="stat-value" style={{ color: '#8b5cf6' }}>Rp {stats.totalIncome.toLocaleString('id-ID')}</div><div className="stat-label">Total Pendapatan</div></div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={20} color="#8b5cf6" /></div>
                    </div>
                </div>

                <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border-primary)', marginBottom: '1.5rem' }}>
                    <button className="btn btn-ghost" style={{ borderBottom: activeTab === 'tugas' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'tugas' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', borderRadius: 0, paddingBottom: '0.75rem' }} onClick={() => setActiveTab('tugas')}>Orderan Saya ({stats.activeOrders})</button>
                    <button className="btn btn-ghost" style={{ borderBottom: activeTab === 'layanan' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'layanan' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', borderRadius: 0, paddingBottom: '0.75rem' }} onClick={() => setActiveTab('layanan')}>Katalog Layanan Saya ({myServices.length})</button>
                </div>

                {activeTab === 'tugas' ? (
                    <>
                        {orders.length === 0 ? (
                            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1', background: 'rgba(255,255,255,0.5)' }}>
                                <div className="empty-state">
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <FileText size={36} color="#94a3b8" />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>Belum ada tugas pesanan</h3>
                                    <p style={{ color: '#64748b' }}>Pesanan yang di-assign oleh Admin CSC akan muncul di sini</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {orders.map(o => (
                                    <div key={o.id} className="card" style={{
                                        borderTop: `4px solid ${o.status === 'done' ? '#10b981' : '#3b82f6'}`,
                                        display: 'flex', flexDirection: 'column', height: '100%',
                                        background: 'white',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999, width: 'fit-content',
                                                    background: o.status === 'done' ? '#d1fae5' : '#dbeafe',
                                                    color: o.status === 'done' ? '#059669' : '#2563eb',
                                                }}>
                                                    {o.status === 'done' ? 'SELESAI' : 'DIPROSES'}
                                                </span>
                                                {o.partner_status_request && o.status !== 'done' && (
                                                    <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, width: 'fit-content', background: '#fef3c7', color: '#d97706' }}>
                                                        ⏳ MENUNGGU APPROVAL ADMIN
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{formatDateShort(o.created_at)}</div>
                                        </div>
                                        
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>{o.project_title || 'Pekerjaan Bisnis'}</h3>
                                        <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.6, flex: 1 }}>{o.description}</p>
                                        
                                        <div style={{ background: 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 12, marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                                                <div><div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Klien</div><div style={{ fontWeight: 600, color: '#334155', marginTop: '0.25rem' }}>{o.client_name || '-'}</div></div>
                                                <div><div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Fee Anda</div><div style={{ fontWeight: 800, color: '#0f766e', marginTop: '0.25rem' }}>{o.partner_fee ? `Rp ${Number(o.partner_fee).toLocaleString('id-ID')}` : 'Belum Set'}</div></div>
                                            </div>
                                        </div>

                                        {o.status !== 'done' && !o.partner_status_request && (
                                            <button className="btn btn-primary btn-sm" style={{ width: '100%', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', padding: '0.75rem', borderRadius: 8, fontWeight: 700 }} onClick={() => requestStatusDone(o.id)}>
                                                Tandai Selesai (Minta Approval)
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Layanan ini akan tampil di katalog publik CSC dan dapat dipesan oleh klien.</p>
                            <button className="btn btn-primary" onClick={() => { setEditServiceId(null); setServiceForm({ name: '', description: '', price: '', price_note: '', is_active: true }); setShowServiceModal(true); }}>
                                <Plus size={16} /> Buat Layanan Baru
                            </button>
                        </div>
                        
                        <div className="cards-grid">
                            {myServices.length === 0 ? <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}><div className="empty-state"><Package size={48} /><h3>Belum ada layanan</h3><p>Buat layanan pertama Anda untuk ditawarkan ke klien.</p></div></div> :
                            myServices.map(s => (
                                <div key={s.id} className="card" style={{ opacity: s.is_active ? 1 : 0.6, position: 'relative' }}>
                                    {!s.is_active && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.625rem', fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: 4 }}>NONAKTIF</div>}
                                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{s.name}</h3>
                                    {s.description && <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>{s.description}</p>}
                                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#9A3412', marginBottom: 12 }}>
                                        {s.price ? `Rp ${Number(s.price).toLocaleString('id-ID')}` : 'Nego'}
                                        {s.price_note && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: 4 }}>/ {s.price_note}</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, paddingTop: 8, borderTop: '1px solid var(--color-border-primary)' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setServiceForm({ name: s.name, description: s.description || '', price: s.price?.toString() || '', price_note: s.price_note || '', is_active: s.is_active }); setEditServiceId(s.id); setShowServiceModal(true) }}><Pencil size={13} /> Edit</button>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteService(s.id)}><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Modal Tambah/Edit Layanan */}
                {showServiceModal && (
                    <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
                            <div className="modal-header"><h2>{editServiceId ? 'Edit' : 'Tambah'} Layanan Anda</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowServiceModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSaveService}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Nama Layanan *</label>
                                        <input className="form-input" required value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="cth: Jasa Desain Logo (Mitra A)" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Harga (opsional)</label>
                                            <input className="form-input" type="number" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} placeholder="cth: 150000" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Catatan Harga</label>
                                            <input className="form-input" value={serviceForm.price_note} onChange={e => setServiceForm({ ...serviceForm, price_note: e.target.value })} placeholder="cth: per desain, nego, dll" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Deskripsi</label>
                                        <textarea className="form-textarea" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} placeholder="Jelaskan detail layanan yang Anda tawarkan..." style={{ minHeight: 80 }} />
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input type="checkbox" checked={serviceForm.is_active} onChange={e => setServiceForm({ ...serviceForm, is_active: e.target.checked })} style={{ accentColor: '#9A3412' }} />
                                        Layanan aktif (tampil di form pemesanan publik)
                                    </label>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowServiceModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary">{editServiceId ? 'Simpan' : 'Tambahkan Katalog'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { Package, Plus, X, Search, ToggleLeft, ToggleRight, Zap, Briefcase, Pencil, Trash2 } from 'lucide-react'

export default function ServicesPage() {
    const { currentUser } = useCurrentUser()
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState('')
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: '', type: 'event_fulfilment', description: '', price: '', price_note: '', is_active: true, department: 'Operating'
    })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('service_categories').select('*, provider:members!service_categories_provider_id_fkey(full_name)').order('type').order('name')
        setServices(data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = {
            name: form.name,
            type: form.type,
            description: form.description || null,
            price: form.price ? parseFloat(form.price) : null,
            price_note: form.price_note || null,
            is_active: form.is_active,
            department: form.type === 'event_fulfilment' ? 'Operating' : 'Business',
            ...(editId ? {} : { created_by: currentUser?.id })
        }

        if (editId) {
            await supabase.from('service_categories').update(payload).eq('id', editId)
        } else {
            await supabase.from('service_categories').insert(payload)
        }

        setShowModal(false)
        setEditId(null)
        setForm({ name: '', type: 'event_fulfilment', description: '', price: '', price_note: '', is_active: true, department: 'Operating' })
        loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus layanan ini?')) {
            await supabase.from('service_categories').delete().eq('id', id)
            loadData()
        }
    }

    async function toggleActive(id: string, current: boolean) {
        await supabase.from('service_categories').update({ is_active: !current }).eq('id', id)
        loadData()
    }

    const filtered = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) &&
        (!filterType || s.type === filterType)
    )

    const eventCount = services.filter(s => s.type === 'event_fulfilment').length
    const businessCount = services.filter(s => s.type === 'business').length
    const activeCount = services.filter(s => s.is_active).length

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Kelola Layanan</div></div>
            <div className="page-container">
                <h1 className="page-title">Kelola Layanan CSC</h1>
                <p className="page-subtitle">Kelola daftar layanan yang tersedia untuk pemesanan eksternal</p>

                <div className="stats-grid">
                    <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <div>
                            <div className="stat-value" style={{ color: '#8b5cf6' }}>{eventCount}</div>
                            <div className="stat-label">Event Fulfilment</div>
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={20} color="#8b5cf6" /></div>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid #14b8a6' }}>
                        <div>
                            <div className="stat-value" style={{ color: '#14b8a6' }}>{businessCount}</div>
                            <div className="stat-label">Business</div>
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={20} color="#14b8a6" /></div>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div>
                            <div className="stat-value" style={{ color: '#10b981' }}>{activeCount}</div>
                            <div className="stat-label">Layanan Aktif</div>
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="#10b981" /></div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input"><Search /><input className="form-input" placeholder="Cari layanan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div>
                        <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Semua Tipe</option>
                            <option value="event_fulfilment">Event Fulfilment</option>
                            <option value="business">Business</option>
                        </select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', type: 'event_fulfilment', description: '', price: '', price_note: '', is_active: true, department: 'Operating' }); setShowModal(true) }}>
                            <Plus size={16} /> Tambah Layanan
                        </button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div> :
                    filtered.length === 0 ? <div className="card"><div className="empty-state"><Package size={48} /><h3>Belum ada layanan</h3></div></div> :
                    filtered.map(s => (
                        <div key={s.id} className="card" style={{ opacity: s.is_active ? 1 : 0.6, position: 'relative' }}>
                            {!s.is_active && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.625rem', fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: 4 }}>NONAKTIF</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                <span style={{
                                    padding: '4px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 700,
                                    background: s.type === 'event_fulfilment' ? '#f5f3ff' : '#f0fdfa',
                                    color: s.type === 'event_fulfilment' ? '#8b5cf6' : '#14b8a6',
                                }}>{s.type === 'event_fulfilment' ? '⚡ Event' : '💼 Business'}</span>
                                
                                {s.provider_id && (
                                    <span style={{
                                        padding: '4px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 700,
                                        background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a'
                                    }}>🤝 Mitra: {s.provider?.full_name || 'Individual'}</span>
                                )}
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{s.name}</h3>
                            {s.description && <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>{s.description}</p>}
                            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#9A3412', marginBottom: 12 }}>
                                {s.price ? `Rp ${Number(s.price).toLocaleString('id-ID')}` : 'Nego'}
                                {s.price_note && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: 4 }}>/ {s.price_note}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 4, paddingTop: 8, borderTop: '1px solid var(--color-border-primary)' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(s.id, s.is_active)}>
                                    {s.is_active ? <><ToggleRight size={14} color="#10b981" /> Aktif</> : <><ToggleLeft size={14} /> Nonaktif</>}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name: s.name, type: s.type, description: s.description || '', price: s.price?.toString() || '', price_note: s.price_note || '', is_active: s.is_active, department: s.department || 'Operating' }); setEditId(s.id); setShowModal(true) }}><Pencil size={13} /> Edit</button>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Layanan</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Nama Layanan *</label>
                                        <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="cth: Jasa MC / Pembawa Acara" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Tipe *</label>
                                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                                <option value="event_fulfilment">Event Fulfilment</option>
                                                <option value="business">Business</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Harga (opsional)</label>
                                            <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="150000" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Catatan Harga</label>
                                        <input className="form-input" value={form.price_note} onChange={e => setForm({ ...form, price_note: e.target.value })} placeholder="cth: per event, per desain, nego, dll" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Deskripsi</label>
                                        <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat layanan..." style={{ minHeight: 80 }} />
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: '#9A3412' }} />
                                        Layanan aktif (tampil di form pemesanan)
                                    </label>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

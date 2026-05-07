'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { MessageCircle, Plus, X, Search, Phone, Building2, Trash2, ExternalLink, User } from 'lucide-react'

export default function DirectoryPage() {
    const { currentUser } = useCurrentUser()
    const [entries, setEntries] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ requirement: '', member_id: '' })
    const [editId, setEditId] = useState<string | null>(null)

    const canCreate = canPerformAction(currentUser, '/operating/directory', 'create')
    const canDelete = canPerformAction(currentUser, '/operating/directory', 'delete')

    useEffect(() => { 
        loadData()
        loadMembers()
    }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase
            .from('operating_directory')
            .select('*, member:members(full_name, department, whatsapp)')
            .order('created_at', { ascending: false })
        setEntries(data || [])
        setLoading(false)
    }

    async function loadMembers() {
        const { data } = await supabase.from('members').select('id, full_name, department').order('full_name')
        setMembers(data || [])
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editId) {
            await supabase.from('operating_directory').update(form).eq('id', editId)
        } else {
            await supabase.from('operating_directory').insert(form)
        }
        setShowModal(false); setEditId(null); loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus entri direktori ini?')) {
            await supabase.from('operating_directory').delete().eq('id', id)
            loadData()
        }
    }

    const filtered = entries.filter(e => 
        e.requirement.toLowerCase().includes(search.toLowerCase()) || 
        e.member?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.member?.department?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Direktori CP</div></div>
            <div className="page-container">
                <h1 className="page-title">Direktori Contact Person Lintas Bidang</h1>
                <p className="page-subtitle">Daftar kontak penanggung jawab untuk berbagai kebutuhan operasional</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <Search size={18} />
                            <input className="form-input" placeholder="Cari kebutuhan, nama, atau bidang..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {canCreate && (
                            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ requirement: '', member_id: '' }); setShowModal(true) }}>
                                <Plus size={18} /> Tambah Kontak
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Memuat data...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Belum ada kontak terdaftar.</div>
                    ) : (
                        filtered.map(entry => (
                            <div key={entry.id} className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ padding: '0.4rem', background: '#ecfdf5', color: '#059669', borderRadius: 8 }}>
                                        <Phone size={20} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditId(entry.id); setForm({ requirement: entry.requirement, member_id: entry.member_id }); setShowModal(true) }}>Edit</button>
                                        {canDelete && <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(entry.id)}><Trash2 size={14} /></button>}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>{entry.requirement}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                                    <Building2 size={14} style={{ color: '#94a3b8' }} />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{entry.member?.department || '-'}</span>
                                </div>
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 8, marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 2 }}>Nama CP</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{entry.member?.full_name || '-'}</div>
                                </div>
                                {entry.member?.whatsapp ? (
                                    <a 
                                        href={entry.member.whatsapp.startsWith('http') ? entry.member.whatsapp : `https://wa.me/${entry.member.whatsapp.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                        style={{ width: '100%', background: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <MessageCircle size={18} /> Hubungi WhatsApp <ExternalLink size={14} />
                                    </a>
                                ) : (
                                    <button className="btn btn-disabled" disabled style={{ width: '100%' }}>WA Tidak Tersedia</button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Modal Form */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                            <div className="modal-header">
                                <h2>{editId ? 'Edit' : 'Tambah'} Kontak CP</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Kebutuhan (Requirement)</label>
                                        <input className="form-input" required placeholder="Contoh: Pengiriman SOP Proker" value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Pilih Anggota (CP)</label>
                                        <select 
                                            className="form-select" 
                                            required 
                                            value={form.member_id} 
                                            onChange={e => setForm({ ...form, member_id: e.target.value })}
                                        >
                                            <option value="">-- Pilih Anggota --</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name} ({m.department})</option>
                                            ))}
                                        </select>
                                        <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: 4 }}>Data Nama, Bidang, dan WhatsApp akan diambil otomatis dari database anggota.</p>
                                    </div>
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

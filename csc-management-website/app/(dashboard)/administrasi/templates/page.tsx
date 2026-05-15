'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Search, Plus, X, Pencil, Trash2, FileSpreadsheet, File, FolderOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import '../admin-responsive.css'

const typeConfig: Record<string, { icon: any, gradient: string, badge: string }> = {
    'Proposal': { icon: FileText, gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', badge: '#dbeafe' },
    'LPJ': { icon: FileSpreadsheet, gradient: 'linear-gradient(135deg, #10b981, #059669)', badge: '#dcfce7' },
    'Surat': { icon: File, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', badge: '#fef3c7' },
    'TOR': { icon: FileText, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', badge: '#f3e8ff' },
    'Lainnya': { icon: FolderOpen, gradient: 'linear-gradient(135deg, #64748b, #475569)', badge: '#f1f5f9' },
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [newTemplate, setNewTemplate] = useState<any>({ name: '', type: 'Proposal', size: '', file_url: '' })

    useEffect(() => { loadTemplates() }, [])

    async function loadTemplates() {
        setLoading(true)
        const { data } = await supabase.from('document_templates').select('*').order('created_at', { ascending: false })
        if (data) setTemplates(data)
        setLoading(false)
    }

    function openAddModal() { setNewTemplate({ name: '', type: 'Proposal', size: '', file_url: '' }); setIsEditing(false); setShowModal(true) }
    function openEditModal(t: any) { setNewTemplate(t); setIsEditing(true); setShowModal(true) }

    async function handleDelete(id: string) {
        if (!confirm('Apakah Anda yakin ingin menghapus template ini?')) return
        const { error } = await supabase.from('document_templates').delete().eq('id', id)
        if (!error) setTemplates(templates.filter(t => t.id !== id))
        else alert('Gagal menghapus template: ' + error?.message)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!newTemplate.name || !newTemplate.file_url) return alert('Nama dan File URL wajib diisi')
        setSaving(true)
        if (isEditing) {
            const { data, error } = await supabase.from('document_templates').update({ name: newTemplate.name, type: newTemplate.type, size: newTemplate.size, file_url: newTemplate.file_url, updated_at: new Date().toISOString() }).eq('id', newTemplate.id).select()
            setSaving(false)
            if (!error && data) { setTemplates(templates.map(t => t.id === newTemplate.id ? data[0] : t)); setShowModal(false) }
            else alert('Gagal mengubah template: ' + error?.message)
        } else {
            const { data, error } = await supabase.from('document_templates').insert([{ name: newTemplate.name, type: newTemplate.type, size: newTemplate.size, file_url: newTemplate.file_url }]).select()
            setSaving(false)
            if (!error && data) { setTemplates([data[0], ...templates]); setShowModal(false) }
            else alert('Gagal menambah template: ' + error?.message)
        }
    }

    const filtered = templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.type.toLowerCase().includes(searchTerm.toLowerCase()))
    const grouped = filtered.reduce((acc: Record<string, any[]>, t) => { const k = t.type || 'Lainnya'; if (!acc[k]) acc[k] = []; acc[k].push(t); return acc }, {})

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Template Dokumen</div></div>
            <div className="page-container">
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div className="admin-page-header">
                        <div>
                            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><FileText size={20} /></div>
                                Template Dokumen
                            </h1>
                            <p className="page-subtitle">Kelola format baku dokumen administrasi program kerja.</p>
                        </div>
                        <button className="btn btn-primary" onClick={openAddModal} style={{ gap: 6 }}><Plus size={16} /> Tambah Template</button>
                    </div>
                    {/* Stats Bar */}
                    <div className="admin-template-stats">
                        {Object.entries(typeConfig).map(([type, cfg]) => {
                            const count = templates.filter(t => t.type === type).length
                            return (
                                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: cfg.badge, fontSize: '0.8125rem', fontWeight: 500 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.gradient }} />
                                    {type} <span style={{ fontWeight: 700 }}>{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        <input className="form-input" placeholder="Cari template berdasarkan nama atau jenis..." style={{ paddingLeft: '2.5rem', borderRadius: 12 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Grid Cards */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>Memuat template...</div>
                ) : filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <FolderOpen size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 12 }} />
                        <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Belum ada template</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Klik "Tambah Template" untuk membuat template baru.</p>
                    </div>
                ) : (
                    <div className="admin-template-grid">
                        {filtered.map(t => {
                            const cfg = typeConfig[t.type] || typeConfig['Lainnya']
                            const Icon = cfg.icon
                            return (
                                <div key={t.id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                                >
                                    {/* Color top strip */}
                                    <div style={{ height: 4, background: cfg.gradient }} />
                                    <div style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                <Icon size={22} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => openEditModal(t)} title="Edit" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-brand)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-brand)' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
                                                ><Pencil size={14} /></button>
                                                <button onClick={() => handleDelete(t.id)} title="Hapus" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
                                                ><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4, color: 'var(--color-text-primary)' }}>{t.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 20, background: cfg.badge, fontWeight: 500 }}>{t.type}</span>
                                            {t.size && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{t.size}</span>}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-primary)' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Diperbarui {formatDateShort(t.updated_at)}</span>
                                            <a href={t.file_url !== '#' ? t.file_url : undefined} target="_blank" onClick={e => { if (t.file_url === '#') { e.preventDefault(); alert('URL belum tersedia.') } }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-brand-600)', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-brand-light)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                            ><Download size={14} /> Unduh</a>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, animation: 'fadeIn 0.2s ease' }}>
                    <div className="card" style={{ width: '100%', maxWidth: 480, margin: '1rem', padding: 0, overflow: 'hidden', animation: 'slideUp 0.25s ease' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{isEditing ? 'Edit Template' : 'Tambah Template Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--color-bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group"><label className="form-label">Nama Template</label><input type="text" className="form-input" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="Contoh: Format Proposal 2024" required /></div>
                            <div className="form-group"><label className="form-label">Jenis Dokumen</label>
                                <select className="form-select" value={newTemplate.type} onChange={e => setNewTemplate({...newTemplate, type: e.target.value})}>
                                    <option value="Proposal">Proposal</option><option value="LPJ">LPJ</option><option value="Surat">Surat</option><option value="TOR">TOR</option><option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                            <div className="form-group"><label className="form-label">Link File / URL</label><input type="url" className="form-input" value={newTemplate.file_url} onChange={e => setNewTemplate({...newTemplate, file_url: e.target.value})} placeholder="https://drive.google.com/..." required /></div>
                            <div className="form-group"><label className="form-label">Ukuran (Opsional)</label><input type="text" className="form-input" value={newTemplate.size} onChange={e => setNewTemplate({...newTemplate, size: e.target.value})} placeholder="Contoh: 2.4 MB" /></div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border-primary)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Template'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Search, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [newTemplate, setNewTemplate] = useState<any>({
        name: '',
        type: 'Proposal',
        size: '',
        file_url: ''
    })

    useEffect(() => {
        loadTemplates()
    }, [])

    async function loadTemplates() {
        setLoading(true)
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (data) {
            setTemplates(data)
        }
        setLoading(false)
    }

    function openAddModal() {
        setNewTemplate({ name: '', type: 'Proposal', size: '', file_url: '' })
        setIsEditing(false)
        setShowModal(true)
    }

    function openEditModal(t: any) {
        setNewTemplate(t)
        setIsEditing(true)
        setShowModal(true)
    }

    async function handleDelete(id: string) {
        if (!confirm('Apakah Anda yakin ingin menghapus template ini?')) return
        setLoading(true)
        const { error } = await supabase.from('document_templates').delete().eq('id', id)
        if (!error) {
            setTemplates(templates.filter(t => t.id !== id))
        } else {
            alert('Gagal menghapus template: ' + error?.message)
        }
        setLoading(false)
    }

    async function handleAddTemplate(e: React.FormEvent) {
        e.preventDefault()
        if (!newTemplate.name || !newTemplate.file_url) return alert('Nama dan File URL wajib diisi')
        
        setSaving(true)
        
        if (isEditing) {
            const { data, error } = await supabase
                .from('document_templates')
                .update({
                    name: newTemplate.name,
                    type: newTemplate.type,
                    size: newTemplate.size,
                    file_url: newTemplate.file_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', newTemplate.id)
                .select()
            
            setSaving(false)
            if (!error && data) {
                setTemplates(templates.map(t => t.id === newTemplate.id ? data[0] : t))
                setShowModal(false)
            } else {
                alert('Gagal mengubah template: ' + error?.message)
            }
        } else {
            const { data, error } = await supabase
                .from('document_templates')
                .insert([{
                    name: newTemplate.name,
                    type: newTemplate.type,
                    size: newTemplate.size,
                    file_url: newTemplate.file_url
                }])
                .select()
            
            setSaving(false)
            if (!error && data) {
                setTemplates([data[0], ...templates])
                setShowModal(false)
            } else {
                alert('Gagal menambah template: ' + error?.message)
            }
        }
    }

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div className="topbar">
                <div className="topbar-title">Template Dokumen</div>
            </div>
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h1 className="page-title">Template Dokumen Administrasi</h1>
                        <p className="page-subtitle">Unduh format baku untuk keperluan administrasi program kerja.</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={16} /> Tambah Template
                    </button>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input 
                                className="form-input" 
                                placeholder="Cari template..." 
                                style={{ paddingLeft: '2.5rem' }} 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nama Template</th>
                                <th>Jenis</th>
                                <th>Ukuran</th>
                                <th>Terakhir Diperbarui</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td></tr>
                            ) : filteredTemplates.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Template tidak ditemukan</td></tr>
                            ) : (
                                filteredTemplates.map(t => (
                                    <tr key={t.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                    <FileText size={18} />
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{t.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-gray">{t.type}</span></td>
                                        <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{t.size || '-'}</td>
                                        <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{formatDateShort(t.updated_at)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <a href={t.file_url !== '#' ? t.file_url : undefined} target="_blank" className="btn btn-secondary btn-sm" onClick={(e) => {
                                                    if (t.file_url === '#') {
                                                        e.preventDefault();
                                                        alert('File URL belum tersedia.');
                                                    }
                                                }}>
                                                    <Download size={14} />
                                                </a>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(t)} title="Edit">
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)} title="Hapus" style={{ color: '#ef4444' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah/Edit Template */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 500, margin: '1rem', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Edit Template' : 'Tambah Template Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Nama Template</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={newTemplate.name} 
                                    onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} 
                                    placeholder="Contoh: Format Proposal 2024"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Jenis Dokumen</label>
                                <select 
                                    className="form-select" 
                                    value={newTemplate.type} 
                                    onChange={e => setNewTemplate({...newTemplate, type: e.target.value})}
                                >
                                    <option value="Proposal">Proposal</option>
                                    <option value="LPJ">LPJ</option>
                                    <option value="Surat">Surat</option>
                                    <option value="TOR">TOR</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Link File / URL</label>
                                <input 
                                    type="url" 
                                    className="form-input" 
                                    value={newTemplate.file_url} 
                                    onChange={e => setNewTemplate({...newTemplate, file_url: e.target.value})} 
                                    placeholder="https://drive.google.com/..."
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ukuran (Opsional)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={newTemplate.size} 
                                    onChange={e => setNewTemplate({...newTemplate, size: e.target.value})} 
                                    placeholder="Contoh: 2.4 MB"
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

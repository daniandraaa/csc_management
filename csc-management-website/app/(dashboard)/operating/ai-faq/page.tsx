'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canManageModule } from '@/lib/rbac'
import { Bot, Plus, X, Search } from 'lucide-react'

export default function AiFaqPage() {
    const { currentUser } = useCurrentUser()
    // For this module, anyone who can manage 'operating' or 'sop' or is manager
    const canManage = canManageModule(currentUser, 'operating') || ['BOE', 'C Level'].includes(currentUser?.role || '')
    const [faqs, setFaqs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ question: '', answer: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('ai_faqs').select('*').order('created_at', { ascending: false })
        setFaqs(data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canManage) return
        
        let error
        if (editId) {
            const { error: err } = await supabase.from('ai_faqs').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId)
            error = err
        } else {
            const { error: err } = await supabase.from('ai_faqs').insert(form)
            error = err
        }

        if (error) {
            alert('Gagal menyimpan: ' + error.message)
            return
        }

        setShowModal(false); setEditId(null); setForm({ question: '', answer: '' }); loadData()
    }

    async function handleDelete(id: string) {
        if (!canManage) return
        if (confirm('Hapus pengetahuan AI ini?')) {
            await supabase.from('ai_faqs').delete().eq('id', id)
            loadData()
        }
    }

    const filtered = faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Kelola AI Chatbot</div></div>
            <div className="page-container">
                <h1 className="page-title">Kelola AI Chatbot</h1>
                <p className="page-subtitle">Atur pengetahuan khusus (FAQ) yang akan digunakan oleh AI Assistant untuk merespons pertanyaan anggota secara presisi.</p>
                
                <div className="toolbar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="toolbar-left" style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input 
                                className="form-input" 
                                placeholder="Cari pertanyaan atau jawaban..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {canManage && (
                            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ question: '', answer: '' }); setShowModal(true) }}>
                                <Plus size={16} /> Tambah Data AI
                            </button>
                        )}
                    </div>
                </div>

                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Pertanyaan / Kata Kunci</th>
                                <th>Jawaban Khusus AI</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data AI...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={3}><div className="empty-state"><Bot size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 12 }} /><h3>Belum ada data</h3><p>Silakan tambah pertanyaan spesifik agar AI semakin pintar.</p></div></td></tr> :
                                filtered.map(f => (
                                    <tr key={f.id}>
                                        <td style={{ width: '30%', verticalAlign: 'top', fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.question}</td>
                                        <td style={{ whiteSpace: 'pre-wrap', verticalAlign: 'top', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.answer}</td>
                                        <td style={{ textAlign: 'right', verticalAlign: 'top', width: '120px' }}>
                                            {canManage && (
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(f.id); setForm({ question: f.question, answer: f.answer }); setShowModal(true) }}>Edit</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(f.id)}>Hapus</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <div className="modal-header">
                                <h2>{editId ? 'Edit' : 'Tambah'} Pengetahuan AI</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Pertanyaan / Kata Kunci *</label>
                                        <input 
                                            className="form-input" 
                                            required 
                                            placeholder="Contoh: Bagaimana cara izin absen?"
                                            value={form.question} 
                                            onChange={e => setForm({ ...form, question: e.target.value })} 
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>AI akan mendeteksi kemiripan kata kunci dari pertanyaan ini dengan pesan pengguna.</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Jawaban *</label>
                                        <textarea 
                                            className="form-textarea" 
                                            required 
                                            style={{ minHeight: 150 }}
                                            placeholder="Jawaban spesifik yang akan diberikan secara otomatis oleh AI..."
                                            value={form.answer} 
                                            onChange={e => setForm({ ...form, answer: e.target.value })} 
                                        />
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

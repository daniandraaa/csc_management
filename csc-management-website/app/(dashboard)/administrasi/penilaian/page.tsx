'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Search, Filter, MessageSquare, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PenilaianPage() {
    const [activeTab, setActiveTab] = useState('evaluasi')
    const [evaluations, setEvaluations] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        program_id: '',
        score: 80,
        comments: ''
    })
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        // Load Evaluations
        const { data: evals } = await supabase
            .from('admin_evaluations')
            .select(`
                id, score, comments, program_id,
                program:programs(id, name, department:departments(name)),
                evaluator:members!admin_evaluations_evaluated_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false })

        if (evals && evals.length > 0) {
            setEvaluations(evals.map(d => ({
                id: d.id,
                program_id: d.program_id,
                proker: d.program?.name || 'Unknown Program',
                bidang: d.program?.department?.name || 'Unknown',
                score: d.score,
                comments: d.comments,
                reviewer: d.evaluator?.full_name || 'Admin'
            })))
        }

        // Load Programs for dropdown
        const { data: progs } = await supabase
            .from('programs')
            .select('id, name')
            .order('name')
        
        if (progs) setPrograms(progs)

        setLoading(false)
    }

    function openAddModal() {
        setFormData({ program_id: programs[0]?.id || '', score: 80, comments: '' })
        setIsEditing(false)
        setShowModal(true)
    }

    function openEditModal(ev: any) {
        setFormData({ program_id: ev.program_id, score: ev.score, comments: ev.comments || '' })
        setIsEditing(true)
        setShowModal(true)
    }

    async function handleSaveEvaluation(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.program_id) return alert('Silakan pilih Program Kerja')
        
        setSaving(true)
        
        // Get current member id
        let evaluatorId = null
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
            const { data: member } = await supabase.from('members').select('id').eq('auth_user_id', session.user.id).single()
            if (member) evaluatorId = member.id
        }

        const payload = {
            program_id: formData.program_id,
            score: formData.score,
            comments: formData.comments,
            ...(evaluatorId && { evaluated_by: evaluatorId }),
            updated_at: new Date().toISOString()
        }

        const { error } = await supabase
            .from('admin_evaluations')
            .upsert(payload, { onConflict: 'program_id' })
        
        setSaving(false)
        if (!error) {
            setShowModal(false)
            loadData() // reload to get relations
        } else {
            alert('Gagal menyimpan penilaian: ' + error.message)
        }
    }

    const filteredEval = evaluations.filter(ev => 
        ev.proker.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ev.bidang.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div className="topbar">
                <div className="topbar-title">Penilaian & Evaluasi Administrasi</div>
            </div>
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h1 className="page-title">Penilaian & Evaluasi</h1>
                        <p className="page-subtitle">Berikan dan pantau penilaian kepatuhan administrasi untuk setiap program kerja.</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={16} /> Beri Penilaian Baru
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border-primary)', marginBottom: '1.5rem' }}>
                    <button 
                        onClick={() => setActiveTab('evaluasi')}
                        style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'evaluasi' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'evaluasi' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', fontWeight: activeTab === 'evaluasi' ? 600 : 400, background: 'transparent', cursor: 'pointer' }}
                    >
                        Daftar Penilaian
                    </button>
                    <button 
                        onClick={() => setActiveTab('komentar')}
                        style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'komentar' ? '2px solid var(--color-brand-600)' : 'none', color: activeTab === 'komentar' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', fontWeight: activeTab === 'komentar' ? 600 : 400, background: 'transparent', cursor: 'pointer' }}
                    >
                        Komentar & Umpan Balik
                    </button>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input 
                                className="form-input" 
                                placeholder="Cari program kerja..." 
                                style={{ paddingLeft: '2.5rem' }} 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary"><Filter size={16} /> Filter</button>
                    </div>
                    
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</div>
                        ) : filteredEval.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>Belum ada penilaian yang diberikan.</div>
                        ) : filteredEval.map(ev => (
                            <div key={ev.id} style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', border: `4px solid ${ev.score >= 90 ? '#10b981' : ev.score >= 80 ? '#3b82f6' : '#f59e0b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                                    {ev.score}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{ev.proker}</h3>
                                            <span className="badge badge-gray">{ev.bidang}</span>
                                        </div>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(ev)}>Edit Nilai</button>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <MessageSquare size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                                        <div>
                                            <p style={{ margin: '0 0 0.25rem 0' }}>{ev.comments || 'Tidak ada komentar.'}</p>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>— {ev.reviewer}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal Form Penilaian */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 500, margin: '1rem', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Edit Penilaian' : 'Beri Penilaian Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Program Kerja</label>
                                <select 
                                    className="form-select" 
                                    value={formData.program_id} 
                                    onChange={e => setFormData({...formData, program_id: e.target.value})}
                                    disabled={isEditing}
                                    required
                                >
                                    {programs.length === 0 && <option value="">Belum ada program kerja tersedia</option>}
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Compliance Score (0-100)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        style={{ flex: 1 }}
                                        value={formData.score}
                                        onChange={e => setFormData({...formData, score: parseInt(e.target.value)})}
                                    />
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ width: 80, textAlign: 'center', fontWeight: 600 }} 
                                        min="0" max="100"
                                        value={formData.score}
                                        onChange={e => setFormData({...formData, score: parseInt(e.target.value) || 0})}
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Komentar & Umpan Balik</label>
                                <textarea 
                                    className="form-input" 
                                    rows={4}
                                    value={formData.comments} 
                                    onChange={e => setFormData({...formData, comments: e.target.value})} 
                                    placeholder="Tuliskan evaluasi mengenai kelengkapan administrasi, ketepatan waktu, dll..."
                                />
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving || (!formData.program_id && programs.length === 0)}>
                                    {saving ? 'Menyimpan...' : 'Simpan Penilaian'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Search, Filter, MessageSquare, Plus, X, Star, TrendingUp, Award, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import '../admin-responsive.css'

export default function PenilaianPage() {
    const [activeTab, setActiveTab] = useState('evaluasi')
    const [evaluations, setEvaluations] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({ program_id: '', score: 80, comments: '' })
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: evals } = await supabase.from('admin_evaluations').select(`id, score, comments, program_id, program:programs(id, name, department:departments(name)), evaluator:members!admin_evaluations_evaluated_by_fkey(full_name)`).order('created_at', { ascending: false })
        if (evals && evals.length > 0) {
            setEvaluations(evals.map(d => ({ id: d.id, program_id: d.program_id, proker: (d.program as any)?.name || 'Unknown Program', bidang: (d.program as any)?.department?.name || 'Unknown', score: d.score, comments: d.comments, reviewer: (d.evaluator as any)?.full_name || 'Admin' })))
        }
        const { data: progs } = await supabase.from('programs').select('id, name').order('name')
        if (progs) setPrograms(progs)
        setLoading(false)
    }

    function openAddModal() { setFormData({ program_id: programs[0]?.id || '', score: 80, comments: '' }); setIsEditing(false); setShowModal(true) }
    function openEditModal(ev: any) { setFormData({ program_id: ev.program_id, score: ev.score, comments: ev.comments || '' }); setIsEditing(true); setShowModal(true) }

    async function handleSaveEvaluation(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.program_id) return alert('Silakan pilih Program Kerja')
        setSaving(true)
        let evaluatorId = null
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) { const { data: member } = await supabase.from('members').select('id').eq('auth_user_id', session.user.id).single(); if (member) evaluatorId = member.id }
        const payload = { program_id: formData.program_id, score: formData.score, comments: formData.comments, ...(evaluatorId && { evaluated_by: evaluatorId }), updated_at: new Date().toISOString() }
        const { error } = await supabase.from('admin_evaluations').upsert(payload, { onConflict: 'program_id' })
        setSaving(false)
        if (!error) { setShowModal(false); loadData() }
        else alert('Gagal menyimpan penilaian: ' + error.message)
    }

    const filteredEval = evaluations.filter(ev => ev.proker.toLowerCase().includes(searchTerm.toLowerCase()) || ev.bidang.toLowerCase().includes(searchTerm.toLowerCase()))
    const avgScore = evaluations.length > 0 ? Math.round(evaluations.reduce((a, b) => a + b.score, 0) / evaluations.length) : 0
    const excellent = evaluations.filter(e => e.score >= 90).length
    const good = evaluations.filter(e => e.score >= 70 && e.score < 90).length
    const needsWork = evaluations.filter(e => e.score < 70).length

    const scoreColor = (s: number) => s >= 90 ? '#10b981' : s >= 80 ? '#3b82f6' : s >= 70 ? '#f59e0b' : '#ef4444'
    const scoreLabel = (s: number) => s >= 90 ? 'Sangat Baik' : s >= 80 ? 'Baik' : s >= 70 ? 'Cukup' : 'Perlu Perbaikan'

    const tabs = [
        { id: 'evaluasi', label: 'Daftar Penilaian', icon: <ClipboardCheck size={16} /> },
        { id: 'komentar', label: 'Komentar & Umpan Balik', icon: <MessageSquare size={16} /> },
    ]

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Penilaian & Evaluasi Administrasi</div></div>
            <div className="page-container">
                {/* Header */}
                <div className="admin-page-header">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ClipboardCheck size={20} /></div>
                            Penilaian & Evaluasi
                        </h1>
                        <p className="page-subtitle">Berikan dan pantau penilaian kepatuhan administrasi untuk setiap program kerja.</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal} style={{ gap: 6 }}><Plus size={16} /> Beri Penilaian</button>
                </div>

                {/* Summary Stats */}
                <div className="admin-penilaian-stats">
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#8b5cf6' }}>{evaluations.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Total Penilaian</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#10b981' }}>{avgScore}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/100</span></div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Rata-rata Skor</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#dbeafe', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#3b82f6' }}>{excellent}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Skor Sangat Baik (≥90)</div></div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={20} /></div>
                        <div><div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f59e0b' }}>{needsWork}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Perlu Perbaikan (&lt;70)</div></div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="admin-tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? 'var(--color-bg-primary)' : 'transparent', color: activeTab === tab.id ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        <input className="form-input" placeholder="Cari program kerja..." style={{ paddingLeft: '2.5rem', borderRadius: 12 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>Memuat data...</div>
                ) : filteredEval.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <ClipboardCheck size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 12 }} />
                        <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Belum ada penilaian</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Klik "Beri Penilaian" untuk memberikan evaluasi pertama.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredEval.map(ev => (
                            <div key={ev.id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'box-shadow 0.2s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                            >
                                <div className="admin-eval-card-inner">
                                    {/* Score column */}
                                    <div className="admin-eval-score-col" style={{ background: `linear-gradient(135deg, ${scoreColor(ev.score)}15, ${scoreColor(ev.score)}08)` }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${scoreColor(ev.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', color: scoreColor(ev.score), marginBottom: 4 }}>{ev.score}</div>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: scoreColor(ev.score) }}>{scoreLabel(ev.score)}</span>
                                    </div>
                                    {/* Content column */}
                                    <div style={{ flex: 1, padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-primary)' }}>{ev.proker}</h3>
                                                <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>{ev.bidang}</span>
                                            </div>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(ev)} style={{ gap: 4, borderRadius: 8 }}><Star size={13} /> Edit Nilai</button>
                                        </div>
                                        {/* Score bar */}
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${ev.score}%`, background: `linear-gradient(90deg, ${scoreColor(ev.score)}, ${scoreColor(ev.score)}aa)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                                            </div>
                                        </div>
                                        {/* Comment */}
                                        {(activeTab === 'komentar' || ev.comments) && (
                                            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start', border: '1px solid #f1f5f9' }}>
                                                <MessageSquare size={14} style={{ marginTop: 2, flexShrink: 0, color: '#94a3b8' }} />
                                                <div>
                                                    <p style={{ margin: '0 0 4px 0', lineHeight: 1.5 }}>{ev.comments || 'Tidak ada komentar.'}</p>
                                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>— {ev.reviewer}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, animation: 'fadeIn 0.2s ease' }}>
                    <div className="card" style={{ width: '100%', maxWidth: 500, margin: '1rem', padding: 0, overflow: 'hidden', animation: 'slideUp 0.25s ease' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #8b5cf615, #6366f108)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{isEditing ? 'Edit Penilaian' : 'Beri Penilaian Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--color-bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveEvaluation} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group"><label className="form-label">Program Kerja</label>
                                <select className="form-select" value={formData.program_id} onChange={e => setFormData({...formData, program_id: e.target.value})} disabled={isEditing} required>
                                    {programs.length === 0 && <option value="">Belum ada program kerja</option>}
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Compliance Score</label>
                                <div style={{ background: `linear-gradient(135deg, ${scoreColor(formData.score)}08, transparent)`, border: `1px solid ${scoreColor(formData.score)}30`, borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: scoreColor(formData.score), lineHeight: 1 }}>{formData.score}</div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: scoreColor(formData.score), marginBottom: 12 }}>{scoreLabel(formData.score)}</div>
                                    <input type="range" min="0" max="100" style={{ width: '100%', accentColor: scoreColor(formData.score) }} value={formData.score} onChange={e => setFormData({...formData, score: parseInt(e.target.value)})} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}><span>0</span><span>50</span><span>100</span></div>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Komentar & Umpan Balik</label><textarea className="form-input" rows={3} value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} placeholder="Tuliskan evaluasi kelengkapan administrasi..." style={{ borderRadius: 10 }} /></div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border-primary)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving || (!formData.program_id && programs.length === 0)}>{saving ? 'Menyimpan...' : 'Simpan Penilaian'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    )
}

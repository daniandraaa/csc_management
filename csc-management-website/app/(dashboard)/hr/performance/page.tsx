'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { Trophy, Plus, Search, X, Star, Upload, Download, FileText } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

export default function PerformancePage() {
    const [rankings, setRankings] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ member_id: '', period: '', score: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: r } = await supabase.from('performance_rankings').select('*, member:members(id,full_name,email)').order('score', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        setRankings(r || [])
        setMembers(m || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, score: parseFloat(form.score) }
        if (editId) {
            await supabase.from('performance_rankings').update(payload).eq('id', editId)
        } else {
            await supabase.from('performance_rankings').insert(payload)
        }
        setShowModal(false); setEditId(null); setForm({ member_id: '', period: '', score: '', notes: '' }); loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus data ranking ini?')) { await supabase.from('performance_rankings').delete().eq('id', id); loadData() }
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        for (const row of rows) {
            const member = members.find((m: any) => m.full_name.toLowerCase() === (row.member_name || '').toLowerCase())
            if (member) await supabase.from('performance_rankings').insert({ member_id: member.id, period: row.period || '', score: parseFloat(row.score) || 0, notes: row.notes || null })
        }
        loadData()
    }

    const perfPdfCols = [
        { header: 'Anggota', key: 'member_name' },
        { header: 'Periode', key: 'period' },
        { header: 'Score', key: 'score' },
        { header: 'Catatan', key: 'notes' },
    ]

    const filtered = rankings.filter((r: any) =>
        r.member?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.period?.toLowerCase().includes(search.toLowerCase())
    )

    const perfData = filtered.map((r: any) => ({ member_name: r.member?.full_name || '-', period: r.period, score: r.score, notes: r.notes || '' }))

    function getScoreColor(score: number) {
        if (score >= 90) return 'var(--color-success)'
        if (score >= 75) return 'var(--color-info)'
        if (score >= 60) return 'var(--color-warning)'
        return 'var(--color-danger)'
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Performance Ranking</div></div>
            <div className="page-container">
                <h1 className="page-title">Ranking Performansi</h1>
                <p className="page-subtitle">Evaluasi dan ranking performa setiap anggota CSC</p>
                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <Search />
                            <input className="form-input" placeholder="Cari anggota atau periode..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(perfPdfCols, perfData, `CSC_Performance_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Ranking Performansi CSC', subtitle: `Total: ${perfData.length} data`, columns: perfPdfCols, data: perfData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ member_id: '', period: '', score: '', notes: '' }); setShowModal(true) }}>
                            <Plus size={16} /> Tambah Ranking
                        </button>
                    </div>
                </div>

                {/* Top 3 Podium */}
                {filtered.length >= 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {filtered.slice(0, 3).map((r: any, i: number) => (
                            <div key={r.id} className="card" style={{ textAlign: 'center', borderTop: `3px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32'}` }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{r.member?.full_name}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: getScoreColor(r.score), margin: '0.5rem 0' }}>{r.score}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Periode: {r.period}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>#</th><th>Anggota</th><th>Periode</th><th>Score</th><th>Progress</th><th>Catatan</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><Trophy size={48} /><h3>Belum ada data ranking</h3><p>Tambahkan data ranking performansi anggota.</p></div></td></tr>
                            ) : filtered.map((r: any, i: number) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--color-text-tertiary)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{r.member?.full_name || '-'}</td>
                                    <td>{r.period}</td>
                                    <td><span style={{ fontWeight: 700, color: getScoreColor(r.score), fontSize: '1.125rem' }}>{r.score}</span></td>
                                    <td style={{ width: 140 }}>
                                        <div className="progress-bar">
                                            <div className={`progress-bar-fill ${r.score >= 75 ? 'success' : r.score >= 50 ? 'warning' : 'danger'}`} style={{ width: `${r.score}%` }} />
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ member_id: r.member_id, period: r.period, score: r.score.toString(), notes: r.notes || '' }); setEditId(r.id); setShowModal(true) }}>Edit</button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(r.id)}>Hapus</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit Ranking' : 'Tambah Ranking'}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Anggota *</label>
                                        <select className="form-select" required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}>
                                            <option value="">Pilih Anggota</option>
                                            {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Periode *</label><input className="form-input" required placeholder="e.g. Q1 2026" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Score (0-100) *</label><input className="form-input" type="number" required min="0" max="100" step="0.1" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} /></div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={[{ key: 'member_name', label: 'Nama Anggota', required: true }, { key: 'period', label: 'Periode', required: true }, { key: 'score', label: 'Score', required: true }, { key: 'notes', label: 'Catatan' }]}
                    existingData={perfData} matchFields={['member_name', 'period']} title="Import Data Performansi" />
            </div>
        </div>
    )
}

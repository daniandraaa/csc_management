'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { ClipboardCheck, Plus, X, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'summary', label: 'Ringkasan', required: true },
    { key: 'strengths', label: 'Strengths' },
    { key: 'weaknesses', label: 'Weaknesses' },
    { key: 'recommendations', label: 'Rekomendasi' },
    { key: 'overall_score', label: 'Score' },
]
const PDF_COLUMNS = [
    { header: 'Program', key: '_program' },
    { header: 'Ringkasan', key: 'summary' },
    { header: 'Score', key: 'overall_score' },
    { header: 'Tanggal', key: 'evaluation_date' },
    { header: 'Evaluator', key: '_evaluator' },
]

export default function EvaluationsPage() {
    const [evals, setEvals] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ program_id: '', summary: '', strengths: '', weaknesses: '', recommendations: '', overall_score: '', evaluated_by: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('program_evaluations').select('*, program:programs(name), evaluator:members!program_evaluations_evaluated_by_fkey(full_name)').order('evaluation_date', { ascending: false })
        const { data: p } = await supabase.from('programs').select('id,name')
        const { data: m } = await supabase.from('members').select('id,full_name')
        setEvals(data || []); setPrograms(p || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, overall_score: form.overall_score ? parseFloat(form.overall_score) : null, evaluated_by: form.evaluated_by || null }
        if (editId) { await supabase.from('program_evaluations').update(payload).eq('id', editId) } else { await supabase.from('program_evaluations').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ program_id: '', summary: '', strengths: '', weaknesses: '', recommendations: '', overall_score: '', evaluated_by: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ summary: r.summary, strengths: r.strengths || null, weaknesses: r.weaknesses || null, recommendations: r.recommendations || null, overall_score: r.overall_score ? parseFloat(r.overall_score) : null, program_id: programs[0]?.id || null }))
        await supabase.from('program_evaluations').insert(payload)
    }

    const exportData = evals.map((ev: any) => ({ ...ev, _program: ev.program?.name || '-', _evaluator: ev.evaluator?.full_name || '-' }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Evaluasi Program</div></div>
            <div className="page-container">
                <h1 className="page-title">Evaluasi Program Kerja</h1>
                <p className="page-subtitle">Hasil evaluasi setiap program kerja</p>
                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_Evaluasi_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Evaluasi Program CSC', subtitle: `Total: ${evals.length} evaluasi`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ program_id: '', summary: '', strengths: '', weaknesses: '', recommendations: '', overall_score: '', evaluated_by: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Evaluasi</button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : evals.length === 0 ? <div className="card"><div className="empty-state"><ClipboardCheck size={48} /><h3>Belum ada evaluasi</h3></div></div> :
                        evals.map((ev: any) => (
                            <div key={ev.id} className="card" onClick={() => { setForm({ program_id: ev.program_id, summary: ev.summary, strengths: ev.strengths || '', weaknesses: ev.weaknesses || '', recommendations: ev.recommendations || '', overall_score: ev.overall_score?.toString() || '', evaluated_by: ev.evaluated_by || '' }); setEditId(ev.id); setShowModal(true) }} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span className="badge badge-info">{ev.program?.name}</span>
                                    {ev.overall_score && <span style={{ fontSize: '1.25rem', fontWeight: 700, color: ev.overall_score >= 75 ? 'var(--color-success)' : 'var(--color-warning)' }}>{ev.overall_score}</span>}
                                </div>
                                <p style={{ fontSize: '0.875rem', marginBottom: 8, lineHeight: 1.5 }}>{ev.summary}</p>
                                {ev.strengths && <div style={{ fontSize: '0.8125rem', marginBottom: 4 }}><strong style={{ color: 'var(--color-success)' }}>Strengths:</strong> {ev.strengths}</div>}
                                {ev.weaknesses && <div style={{ fontSize: '0.8125rem', marginBottom: 4 }}><strong style={{ color: 'var(--color-danger)' }}>Weaknesses:</strong> {ev.weaknesses}</div>}
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 8 }}>{formatDateShort(ev.evaluation_date)} — {ev.evaluator?.full_name || 'Unknown'}</div>
                            </div>
                        ))}
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={evals} matchFields={['summary']} title="Import Evaluasi" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Evaluasi</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Program *</label><select className="form-select" required value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}><option value="">Pilih</option>{programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Score</label><input className="form-input" type="number" min="0" max="100" value={form.overall_score} onChange={e => setForm({ ...form, overall_score: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Ringkasan *</label><textarea className="form-textarea" required value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Strengths</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Weaknesses</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={form.weaknesses} onChange={e => setForm({ ...form, weaknesses: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Rekomendasi</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Evaluator</label><select className="form-select" value={form.evaluated_by} onChange={e => setForm({ ...form, evaluated_by: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { BarChart3, Plus, X, Upload, FileText, Download } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'indicator', label: 'Indikator', required: true },
    { key: 'target_value', label: 'Target', required: true },
    { key: 'current_value', label: 'Aktual' },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'Status' },
]
const PDF_COLUMNS = [
    { header: 'Indikator', key: 'indicator' },
    { header: 'Target', key: 'target_value' },
    { header: 'Aktual', key: 'current_value' },
    { header: 'Unit', key: 'unit' },
    { header: 'Progress', key: '_progress' },
    { header: 'Status', key: 'status' },
]

export default function KPIPage() {
    const [kpis, setKpis] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [form, setForm] = useState({ program_id: '', indicator: '', target_value: '', current_value: '', unit: '', weight: '1', status: 'on_track' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('program_kpis').select('*, program:programs(id,name)').order('created_at', { ascending: false })
        const { data: p } = await supabase.from('programs').select('id,name').order('name')
        setKpis(data || []); setPrograms(p || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, target_value: parseFloat(form.target_value), current_value: parseFloat(form.current_value || '0'), weight: parseFloat(form.weight) }
        if (editId) { await supabase.from('program_kpis').update(payload).eq('id', editId) } else { await supabase.from('program_kpis').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ program_id: '', indicator: '', target_value: '', current_value: '', unit: '', weight: '1', status: 'on_track' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ indicator: r.indicator, target_value: parseFloat(r.target_value) || 0, current_value: parseFloat(r.current_value) || 0, unit: r.unit || null, status: r.status || 'on_track', weight: 1, program_id: programs[0]?.id || null }))
        await supabase.from('program_kpis').insert(payload)
    }

    async function handleDelete(id: string) { if (confirm('Hapus KPI?')) { await supabase.from('program_kpis').delete().eq('id', id); loadData() } }

    const chartData = kpis.slice(0, 8).map((k: any) => ({ name: k.indicator?.slice(0, 15), progress: k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0 }))
    const exportData = kpis.map((k: any) => ({ ...k, _progress: k.target_value > 0 ? `${Math.round((k.current_value / k.target_value) * 100)}%` : '0%' }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">KPI Program</div></div>
            <div className="page-container">
                <h1 className="page-title">KPI Program Kerja</h1>
                <p className="page-subtitle">Pantau Key Performance Indicators setiap program</p>

                {chartData.length > 0 && (
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Overview KPI Progress (%)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                                {chartData.map((d, i) => <Cell key={i} fill={d.progress >= 75 ? '#22c55e' : d.progress >= 50 ? '#f59e0b' : '#ef4444'} />)}
                            </Bar></BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, exportData, `CSC_KPI_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'KPI Program Kerja CSC', subtitle: `Total: ${kpis.length} KPI`, columns: PDF_COLUMNS, data: exportData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ program_id: '', indicator: '', target_value: '', current_value: '', unit: '', weight: '1', status: 'on_track' }); setShowModal(true) }}><Plus size={16} /> Tambah KPI</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Program</th><th>Indikator</th><th>Target</th><th>Aktual</th><th>Progress</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                kpis.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><BarChart3 size={48} /><h3>Belum ada KPI</h3></div></td></tr> :
                                    kpis.map((k: any) => {
                                        const pct = k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0
                                        return (<tr key={k.id}>
                                            <td style={{ fontWeight: 500 }}>{k.program?.name || '-'}</td>
                                            <td>{k.indicator}</td>
                                            <td>{k.target_value} {k.unit}</td>
                                            <td>{k.current_value} {k.unit}</td>
                                            <td style={{ width: 140 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="progress-bar" style={{ flex: 1 }}><div className={`progress-bar-fill ${pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 35 }}>{pct}%</span></div></td>
                                            <td><span className={`badge badge-${getStatusColor(k.status)}`}>{getStatusLabel(k.status)}</span></td>
                                            <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => { setForm({ program_id: k.program_id, indicator: k.indicator, target_value: k.target_value.toString(), current_value: k.current_value.toString(), unit: k.unit || '', weight: k.weight.toString(), status: k.status }); setEditId(k.id); setShowModal(true) }}>Edit</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(k.id)}>Hapus</button></div></td>
                                        </tr>)
                                    })}
                        </tbody>
                    </table>
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={kpis} matchFields={['indicator']} title="Import KPI" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} KPI</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Program *</label><select className="form-select" required value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}><option value="">Pilih</option>{programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Indikator *</label><input className="form-input" required value={form.indicator} onChange={e => setForm({ ...form, indicator: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                    <div className="form-group"><label className="form-label">Target *</label><input className="form-input" type="number" required value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Aktual</label><input className="form-input" type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="behind">Behind</option><option value="completed">Completed</option></select></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { Trophy, Plus, Search, X, Upload, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_QUARTER = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`

function getYears() {
    const years = []
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 3; y--) years.push(y)
    return years
}

export default function PerformancePage() {
    const { currentUser } = useCurrentUser()
    const canCreate = canPerformAction(currentUser, '/hr/performance', 'create')

    const [rankings, setRankings] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')

    // Quarter/Year filter
    const [selectedQuarter, setSelectedQuarter] = useState(CURRENT_QUARTER)
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)

    // Form state - structured quarter picker
    const [form, setForm] = useState({ member_id: '', quarter: CURRENT_QUARTER, year: String(CURRENT_YEAR), score: '', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data: r, error: rErr } = await supabase.from('performance_rankings')
            .select('*, member:members!performance_rankings_member_id_fkey(id,full_name,email,department,role)')
            .order('score', { ascending: false })
        const { data: m } = await supabase.from('members')
            .select('id,full_name')
            .neq('role', 'Business Partner')
            .order('full_name')
        if (rErr) console.error('Load rankings error:', rErr)
        console.log('Rankings loaded:', r?.length, 'rows', r)
        setRankings(r || [])
        setMembers(m || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const period = `${form.quarter} ${form.year}`
        const payload = { member_id: form.member_id, period, score: parseFloat(form.score), notes: form.notes || null }
        console.log('Submitting payload:', payload)
        let error
        if (editId) {
            const res = await supabase.from('performance_rankings').update(payload).eq('id', editId)
            error = res.error
        } else {
            const res = await supabase.from('performance_rankings').insert(payload)
            error = res.error
        }
        if (error) {
            console.error('Submit error:', error)
            alert(`Gagal menyimpan data: ${error.message}`)
            return
        }
        setShowModal(false)
        setEditId(null)
        setForm({ member_id: '', quarter: selectedQuarter, year: String(selectedYear), score: '', notes: '' })
        loadData()
    }

    async function handleDelete(id: string) {
        if (confirm('Hapus data ranking ini?')) {
            await supabase.from('performance_rankings').delete().eq('id', id)
            loadData()
        }
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        for (const row of rows) {
            const member = members.find((m: any) => m.full_name.toLowerCase() === (row.member_name || '').toLowerCase())
            if (member) {
                await supabase.from('performance_rankings').insert({
                    member_id: member.id,
                    period: row.period || `${selectedQuarter} ${selectedYear}`,
                    score: parseFloat(row.score) || 0,
                    notes: row.notes || null,
                })
            }
        }
        loadData()
    }

    // Filter by selected quarter + year
    const currentPeriod = `${selectedQuarter} ${selectedYear}`
    const filteredByPeriod = rankings.filter((r: any) => r.period === currentPeriod)
    const filtered = filteredByPeriod.filter((r: any) =>
        r.member?.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    // All unique periods for nav
    const allPeriods = Array.from(new Set(rankings.map((r: any) => r.period))).sort((a, b) => {
        const [qa, ya] = (a as string).split(' ')
        const [qb, yb] = (b as string).split(' ')
        return Number(yb) - Number(ya) || QUARTERS.indexOf(qb) - QUARTERS.indexOf(qa)
    })

    const perfPdfCols = [
        { header: 'Anggota', key: 'member_name' },
        { header: 'Bidang', key: 'department' },
        { header: 'Periode', key: 'period' },
        { header: 'Score', key: 'score' },
        { header: 'Catatan', key: 'notes' },
    ]
    const perfData = filtered.map((r: any) => ({
        member_name: r.member?.full_name || '-',
        department: r.member?.department || '-',
        period: r.period,
        score: r.score,
        notes: r.notes || '',
    }))

    function getScoreColor(score: number) {
        if (score >= 90) return '#16a34a'
        if (score >= 75) return '#2563eb'
        if (score >= 60) return '#d97706'
        return '#dc2626'
    }

    function getScoreBg(score: number) {
        if (score >= 90) return '#dcfce7'
        if (score >= 75) return '#dbeafe'
        if (score >= 60) return '#fef3c7'
        return '#fee2e2'
    }

    function navigateQuarter(dir: 'prev' | 'next') {
        const qi = QUARTERS.indexOf(selectedQuarter)
        if (dir === 'next') {
            if (qi === 3) { setSelectedQuarter('Q1'); setSelectedYear(y => y + 1) }
            else setSelectedQuarter(QUARTERS[qi + 1])
        } else {
            if (qi === 0) { setSelectedQuarter('Q4'); setSelectedYear(y => y - 1) }
            else setSelectedQuarter(QUARTERS[qi - 1])
        }
    }

    return (
        <div>
            <div className="page-container">
                <h1 className="page-title">Ranking Performansi</h1>
                <p className="page-subtitle">Evaluasi dan ranking performa setiap anggota CSC per kuartal</p>

                {/* Quarter Navigation */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    marginBottom: '1.5rem', flexWrap: 'wrap',
                }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'white', border: '1px solid #e2e8f0',
                        borderRadius: 12, padding: '0.375rem 0.5rem',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}>
                        <button
                            onClick={() => navigateQuarter('prev')}
                            style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex' }}
                        ><ChevronLeft size={16} /></button>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {QUARTERS.map(q => (
                                <button key={q}
                                    onClick={() => setSelectedQuarter(q)}
                                    style={{
                                        padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none',
                                        background: selectedQuarter === q ? 'linear-gradient(135deg, #9A3412, #7C2D12)' : 'transparent',
                                        color: selectedQuarter === q ? 'white' : '#57534e',
                                        fontWeight: selectedQuarter === q ? 700 : 500,
                                        fontSize: '0.8125rem', cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >{q}</button>
                            ))}
                        </div>
                        <select
                            value={selectedYear || ''}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            style={{
                                border: 'none', background: 'transparent', fontWeight: 600,
                                fontSize: '0.875rem', cursor: 'pointer', outline: 'none',
                                color: '#292524', paddingRight: '0.25rem',
                            }}
                        >
                            {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={() => navigateQuarter('next')}
                            style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex' }}
                        ><ChevronRight size={16} /></button>
                    </div>

                    {/* Period exists indicator */}
                    <div style={{ fontSize: '0.8125rem', color: '#78716c' }}>
                        {filteredByPeriod.length > 0
                            ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {filteredByPeriod.length} anggota dinilai</span>
                            : <span style={{ color: '#94a3b8' }}>Belum ada data untuk {currentPeriod}</span>
                        }
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                className="form-input"
                                placeholder="Cari anggota..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '2rem', width: 180 }}
                            />
                        </div>
                        {canCreate && (
                            <>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(perfPdfCols, perfData, `CSC_Performance_${currentPeriod.replace(' ', '_')}.csv`)}><Download size={14} /> CSV</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: `Ranking Performansi ${currentPeriod}`, subtitle: `CSC Management`, columns: perfPdfCols, data: perfData })}><FileText size={14} /> PDF</button>
                                <button className="btn btn-primary" onClick={() => {
                                    setEditId(null)
                                    setForm({ member_id: '', quarter: selectedQuarter, year: String(selectedYear), score: '', notes: '' })
                                    setShowModal(true)
                                }}>
                                    <Plus size={16} /> Tambah
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Podium Top 3 */}
                {!loading && filtered.length >= 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[filtered[1], filtered[0], filtered[2]].map((r: any, i: number) => {
                            const medals = [{ emoji: '🥈', color: '#94a3b8', height: 80 }, { emoji: '🥇', color: '#f59e0b', height: 100 }, { emoji: '🥉', color: '#cd7f32', height: 60 }]
                            const medal = medals[i]
                            if (!r) return <div key={i} />
                            return (
                                <div key={r.id} className="card" style={{
                                    textAlign: 'center',
                                    borderTop: `3px solid ${medal.color}`,
                                    paddingBottom: '1.25rem',
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{medal.emoji}</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#292524' }}>{r.member?.full_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#78716c', marginBottom: '0.75rem' }}>{r.member?.department}</div>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 64, height: 64, borderRadius: '50%',
                                        background: getScoreBg(r.score),
                                        margin: '0 auto 0.5rem',
                                    }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(r.score) }}>{r.score}</span>
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>dari 100 poin</div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Rankings Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Anggota</th>
                                <th>Bidang</th>
                                <th>Score</th>
                                <th>Progress</th>
                                <th>Catatan</th>
                                {canCreate && <th>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canCreate ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={canCreate ? 7 : 6}>
                                    <div className="empty-state">
                                        <Trophy size={48} />
                                        <h3>Belum ada data untuk {currentPeriod}</h3>
                                        <p>{canCreate ? 'Klik "+ Tambah" untuk menambahkan ranking kuartal ini.' : 'Data ranking performansi belum tersedia.'}</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map((r: any, i: number) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 700, color: i < 3 ? getScoreColor(r.score) : '#a8a29e', width: 40 }}>{i + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#292524' }}>{r.member?.full_name || '-'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#78716c' }}>{r.member?.role}</div>
                                    </td>
                                    <td style={{ fontSize: '0.8125rem', color: '#57534e' }}>{r.member?.department || '-'}</td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '0.2rem 0.625rem', borderRadius: 99,
                                            fontWeight: 700, fontSize: '0.875rem',
                                            background: getScoreBg(r.score),
                                            color: getScoreColor(r.score),
                                        }}>{r.score}</span>
                                    </td>
                                    <td style={{ width: 160 }}>
                                        <div className="progress-bar">
                                            <div className={`progress-bar-fill ${r.score >= 75 ? 'success' : r.score >= 50 ? 'warning' : 'danger'}`} style={{ width: `${r.score}%` }} />
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: '#78716c' }}>{r.notes || '-'}</td>
                                    {canCreate && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                                    const [q, y] = r.period.split(' ')
                                                    setForm({ member_id: r.member_id, quarter: q, year: y, score: r.score.toString(), notes: r.notes || '' })
                                                    setEditId(r.id)
                                                    setShowModal(true)
                                                }}>Edit</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(r.id)}>Hapus</button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Other periods quick access */}
                {allPeriods.length > 1 && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a8a29e', fontWeight: 600 }}>Periode lain:</span>
                        {allPeriods.filter(p => p !== currentPeriod).slice(0, 6).map((p: any) => {
                            const [q, y] = p.split(' ')
                            const count = rankings.filter((r: any) => r.period === p).length
                            return (
                                <button key={p}
                                    onClick={() => { setSelectedQuarter(q); setSelectedYear(Number(y)) }}
                                    style={{
                                        padding: '0.2rem 0.625rem', borderRadius: 99,
                                        border: '1px solid #e2e8f0', background: 'white',
                                        fontSize: '0.75rem', cursor: 'pointer', color: '#57534e',
                                        transition: 'all 0.15s',
                                    }}
                                >{p} <span style={{ color: '#a8a29e' }}>({count})</span></button>
                            )
                        })}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editId ? 'Edit Ranking' : 'Tambah Ranking'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Anggota *</label>
                                        <select className="form-select" required value={form.member_id || ''} onChange={e => setForm({ ...form, member_id: e.target.value })}>
                                            <option value="">Pilih Anggota</option>
                                            {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Kuartal *</label>
                                            <select className="form-select" required value={form.quarter || ''} onChange={e => setForm({ ...form, quarter: e.target.value })}>
                                                {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tahun *</label>
                                            <select className="form-select" required value={form.year || ''} onChange={e => setForm({ ...form, year: e.target.value })}>
                                                {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Score (0-100) *</label>
                                            <input className="form-input" type="number" required min="0" max="100" step="0.1" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Catatan</label>
                                        <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan evaluasi (opsional)..." />
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.8125rem', color: '#64748b' }}>
                                        📅 Periode: <strong>{form.quarter} {form.year}</strong>
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

                <CsvImportModal
                    isOpen={showCsvImport}
                    onClose={() => { setShowCsvImport(false); loadData() }}
                    onImport={handleCsvImport}
                    columns={[
                        { key: 'member_name', label: 'Nama Anggota', required: true },
                        { key: 'period', label: 'Periode (e.g. Q1 2026)', required: true },
                        { key: 'score', label: 'Score', required: true },
                        { key: 'notes', label: 'Catatan' },
                    ]}
                    existingData={perfData}
                    matchFields={['member_name', 'period']}
                    title="Import Data Performansi"
                />
            </div>
        </div>
    )
}

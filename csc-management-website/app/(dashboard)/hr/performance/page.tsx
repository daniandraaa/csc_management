'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { Trophy, Plus, Search, X, Upload, Download, FileText, ChevronLeft, ChevronRight, Calculator } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH_IDX = new Date().getMonth()
const CURRENT_QUARTER = `Q${Math.ceil((CURRENT_MONTH_IDX + 1) / 3)}`
const CURRENT_MONTH = MONTHS[CURRENT_MONTH_IDX]

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

    // Period filter
    const [viewType, setViewType] = useState<'quarter' | 'month'>('month')
    const [selectedQuarter, setSelectedQuarter] = useState(CURRENT_QUARTER)
    const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)

    // Form state - restricted to month only as per new integrated logic
    const [form, setForm] = useState({ 
        member_id: '', 
        type: 'month' as 'month',
        month: CURRENT_MONTH,
        year: String(selectedYear || CURRENT_YEAR), 
        score: '', 
        notes: '' 
    })
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
        const period = `${form.month} ${form.year}`
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
        setForm({ 
            member_id: '', 
            type: 'month',
            month: selectedMonth,
            year: String(selectedYear), 
            score: '', 
            notes: '' 
        })
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

    // Integrated Logic: Quarterly is an aggregation of Monthly data
    const filteredByPeriod = useMemo(() => {
        if (viewType === 'month') {
            const periodStr = `${selectedMonth} ${selectedYear}`
            return rankings.filter((r: any) => r.period === periodStr)
        } else {
            const qMonths = {
                'Q1': ['Januari', 'Februari', 'Maret'],
                'Q2': ['April', 'Mei', 'Juni'],
                'Q3': ['Juli', 'Agustus', 'September'],
                'Q4': ['Oktober', 'November', 'Desember']
            }[selectedQuarter] || []
            
            const monthPeriods = qMonths.map(m => `${m} ${selectedYear}`)
            const relevantRankings = rankings.filter((r: any) => monthPeriods.includes(r.period))
            
            const grouped = new Map<string, any>()
            relevantRankings.forEach(r => {
                const mid = r.member_id
                if (!grouped.has(mid)) {
                    grouped.set(mid, { ...r, scoreSum: 0, count: 0, notesList: [] })
                }
                const g = grouped.get(mid)
                g.scoreSum += r.score
                g.count += 1
                if (r.notes) g.notesList.push(`${r.period.split(' ')[0]}: ${r.notes}`)
            })
            
            return Array.from(grouped.values()).map(g => ({
                ...g,
                score: parseFloat((g.scoreSum / g.count).toFixed(1)),
                notes: g.notesList.join(' | '),
                isAggregate: true,
                count: g.count
            })).sort((a, b) => b.score - a.score)
        }
    }, [viewType, selectedMonth, selectedQuarter, selectedYear, rankings])

    const filtered = filteredByPeriod.filter((r: any) =>
        r.member?.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    const currentPeriod = viewType === 'quarter' ? `${selectedQuarter} ${selectedYear}` : `${selectedMonth} ${selectedYear}`

    // All unique periods for nav
    const allPeriods = Array.from(new Set(rankings.map((r: any) => r.period))).sort((a, b) => {
        const partsA = (a as string).split(' ')
        const partsB = (b as string).split(' ')
        if (partsA[1] !== partsB[1]) return Number(partsB[1]) - Number(partsA[1])
        
        // Same year, check if quarter or month
        const isQA = partsA[0].startsWith('Q')
        const isQB = partsB[0].startsWith('Q')
        if (isQA && isQB) return QUARTERS.indexOf(partsB[0]) - QUARTERS.indexOf(partsA[0])
        if (!isQA && !isQB) return MONTHS.indexOf(partsB[0]) - MONTHS.indexOf(partsA[0])
        return isQA ? -1 : 1 // Quarters after months or vice versa
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

    function navigatePeriod(dir: 'prev' | 'next') {
        if (viewType === 'quarter') {
            const qi = QUARTERS.indexOf(selectedQuarter)
            if (dir === 'next') {
                if (qi === 3) { setSelectedQuarter('Q1'); setSelectedYear(y => y + 1) }
                else setSelectedQuarter(QUARTERS[qi + 1])
            } else {
                if (qi === 0) { setSelectedQuarter('Q4'); setSelectedYear(y => y - 1) }
                else setSelectedQuarter(QUARTERS[qi - 1])
            }
        } else {
            const mi = MONTHS.indexOf(selectedMonth)
            if (dir === 'next') {
                if (mi === 11) { setSelectedMonth(MONTHS[0]); setSelectedYear(y => y + 1) }
                else setSelectedMonth(MONTHS[mi + 1])
            } else {
                if (mi === 0) { setSelectedMonth(MONTHS[11]); setSelectedYear(y => y - 1) }
                else setSelectedMonth(MONTHS[mi - 1])
            }
        }
    }

    return (
        <div>
            <div className="page-container">
                <h1 className="page-title">Ranking Performansi</h1>
                <p className="page-subtitle">Evaluasi dan ranking performa setiap anggota CSC per kuartal</p>

                {/* Period Type Toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button 
                        onClick={() => setViewType('quarter')}
                        className={`btn btn-sm ${viewType === 'quarter' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ borderRadius: 99 }}
                    >Kuartal</button>
                    <button 
                        onClick={() => setViewType('month')}
                        className={`btn btn-sm ${viewType === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ borderRadius: 99 }}
                    >Bulanan</button>
                </div>

                {/* Period Navigation */}
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
                            onClick={() => navigatePeriod('prev')}
                            style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex' }}
                        ><ChevronLeft size={16} /></button>
                        
                        {viewType === 'quarter' ? (
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
                        ) : (
                            <select 
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{
                                    border: 'none', background: 'transparent', fontWeight: 600,
                                    fontSize: '0.875rem', cursor: 'pointer', outline: 'none',
                                    color: '#292524', padding: '0 0.5rem'
                                }}
                            >
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        )}

                        <select
                            value={selectedYear || ''}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            style={{
                                border: 'none', background: 'transparent', fontWeight: 600,
                                fontSize: '0.875rem', cursor: 'pointer', outline: 'none',
                                color: '#292524', paddingRight: '0.25rem',
                                borderLeft: '1px solid #e2e8f0',
                                paddingLeft: '0.5rem'
                            }}
                        >
                            {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={() => navigatePeriod('next')}
                            style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex' }}
                        ><ChevronRight size={16} /></button>
                    </div>

                    {/* Period exists indicator */}
                    <div style={{ fontSize: '0.8125rem', color: '#78716c' }}>
                        {filteredByPeriod.length > 0
                            ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {viewType === 'month' ? `${filteredByPeriod.length} anggota dinilai` : `Data agregat dari ${filteredByPeriod.length} anggota`}</span>
                            : <span style={{ color: '#94a3b8' }}>Belum ada data untuk {viewType === 'month' ? `${selectedMonth} ${selectedYear}` : `${selectedQuarter} ${selectedYear}`}</span>
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
                                    setForm({ member_id: '', type: 'month', month: selectedMonth, year: String(selectedYear), score: '', notes: '' })
                                    setShowModal(true)
                                }}>
                                    <Plus size={16} /> Tambah Nilai
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
                                        <h3>Belum ada data untuk {viewType === 'month' ? `${selectedMonth} ${selectedYear}` : `${selectedQuarter} ${selectedYear}`}</h3>
                                        <p>{canCreate ? 'Klik "+ Tambah Nilai" untuk memasukkan penilaian bulan ini.' : 'Data ranking belum tersedia.'}</p>
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
                                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                            padding: '0.2rem 0.625rem', borderRadius: 99,
                                            fontWeight: 700, fontSize: '0.875rem',
                                            background: getScoreBg(r.score),
                                            color: getScoreColor(r.score),
                                        }}>
                                            {r.score}
                                            {r.isAggregate && <Calculator size={12} title={`Rata-rata dari ${r.count} bulan`} />}
                                        </span>
                                    </td>
                                    <td style={{ width: 160 }}>
                                        <div className="progress-bar">
                                            <div className={`progress-bar-fill ${r.score >= 75 ? 'success' : r.score >= 50 ? 'warning' : 'danger'}`} style={{ width: `${r.score}%` }} />
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: '#78716c' }}>{r.notes || '-'}</td>
                                    {canCreate && (
                                        <td>
                                            {!r.isAggregate ? (
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => {
                                                        const parts = r.period.split(' ')
                                                        setForm({ 
                                                            member_id: r.member_id, 
                                                            type: 'month',
                                                            month: parts[0],
                                                            year: parts[1], 
                                                            score: r.score.toString(), 
                                                            notes: r.notes || '' 
                                                        })
                                                        setEditId(r.id)
                                                        setShowModal(true)
                                                    }}>Edit</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(r.id)}>Hapus</button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ganti ke mode Bulanan untuk edit</span>
                                            )}
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
                            const parts = p.split(' ')
                            const isQ = parts[0].startsWith('Q')
                            const count = rankings.filter((r: any) => r.period === p).length
                            return (
                                <button key={p}
                                    onClick={() => { 
                                        setViewType(isQ ? 'quarter' : 'month')
                                        if (isQ) setSelectedQuarter(parts[0])
                                        else setSelectedMonth(parts[0])
                                        setSelectedYear(Number(parts[1])) 
                                    }}
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Bulan *</label>
                                            <select className="form-select" required value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tahun *</label>
                                            <select className="form-select" required value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                                                {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Score (0-100) *</label>
                                        <input className="form-input" type="number" required min="0" max="100" step="0.1" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Catatan</label>
                                        <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan evaluasi (opsional)..." />
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.8125rem', color: '#64748b' }}>
                                        📅 Periode: <strong>{form.month} {form.year}</strong>
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

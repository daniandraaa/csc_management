'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileSpreadsheet, Check, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'

type RowStatus = 'new' | 'duplicate' | 'similar'

interface CsvImportModalProps {
    isOpen: boolean
    onClose: () => void
    onImport: (rows: Record<string, string>[]) => Promise<void>
    columns: { key: string; label: string; required?: boolean }[]
    existingData: Record<string, any>[]
    matchFields: string[]  // Fields to check for duplicate/similar
    title?: string
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return { headers: [], rows: [] }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes }
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
            else { current += char }
        }
        result.push(current.trim())
        return result
    }).filter(row => row.some(cell => cell.length > 0))
    return { headers, rows }
}

function similarity(a: string, b: string): number {
    if (!a || !b) return 0
    const aa = a.toLowerCase().trim()
    const bb = b.toLowerCase().trim()
    if (aa === bb) return 1
    const longer = aa.length > bb.length ? aa : bb
    const shorter = aa.length > bb.length ? bb : aa
    if (longer.includes(shorter)) return shorter.length / longer.length
    let matches = 0
    const minLen = Math.min(aa.length, bb.length)
    for (let i = 0; i < minLen; i++) { if (aa[i] === bb[i]) matches++ }
    return matches / longer.length
}

export default function CsvImportModal({ isOpen, onClose, onImport, columns, existingData, matchFields, title = 'Import CSV' }: CsvImportModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload')
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [csvRows, setCsvRows] = useState<string[][]>([])
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [mappedData, setMappedData] = useState<{ row: Record<string, string>; status: RowStatus; matchInfo?: string; selected: boolean }[]>([])
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ success: number; skipped: number } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const text = ev.target?.result as string
            const { headers, rows } = parseCSV(text)
            setCsvHeaders(headers)
            setCsvRows(rows)

            // Auto-map columns by similarity
            const autoMap: Record<string, string> = {}
            columns.forEach(col => {
                const best = headers.reduce((acc, h, i) => {
                    const sim = Math.max(similarity(h, col.key), similarity(h, col.label))
                    return sim > acc.sim ? { idx: i, sim, header: h } : acc
                }, { idx: -1, sim: 0, header: '' })
                if (best.sim > 0.5) autoMap[col.key] = best.header
            })
            setMapping(autoMap)
            setStep('mapping')
        }
        reader.readAsText(file)
    }

    function processMapping() {
        const mapped = csvRows.map(row => {
            const obj: Record<string, string> = {}
            columns.forEach(col => {
                const csvHeader = mapping[col.key]
                if (csvHeader) {
                    const idx = csvHeaders.indexOf(csvHeader)
                    if (idx !== -1) obj[col.key] = row[idx] || ''
                }
            })
            return obj
        })

        // Detect duplicates/similar
        const withStatus = mapped.map(row => {
            let status: RowStatus = 'new'
            let matchInfo = ''
            let foundDup = false

            for (const existing of existingData) {
                for (const field of matchFields) {
                    const rowVal = (row[field] || '').toLowerCase().trim()
                    const existVal = (String(existing[field] || '')).toLowerCase().trim()
                    if (!rowVal) continue
                    if (rowVal === existVal) {
                        status = 'duplicate'
                        matchInfo = `Duplikat: ${field} "${row[field]}" sudah ada`
                        foundDup = true
                        break
                    }
                    const sim = similarity(rowVal, existVal)
                    if (sim > 0.7 && !foundDup) {
                        status = 'similar'
                        matchInfo = `Mirip: ${field} "${row[field]}" ≈ "${existing[field]}" (${Math.round(sim * 100)}%)`
                    }
                }
                if (foundDup) break
            }
            return { row, status, matchInfo, selected: status === 'new' }
        })

        setMappedData(withStatus)
        setStep('preview')
    }

    async function handleImport() {
        setImporting(true)
        const toImport = mappedData.filter(d => d.selected).map(d => d.row)
        try {
            await onImport(toImport)
            setResult({ success: toImport.length, skipped: mappedData.length - toImport.length })
        } catch (e) {
            setResult({ success: 0, skipped: mappedData.length })
        }
        setImporting(false)
        setStep('importing')
    }

    function reset() {
        setStep('upload'); setCsvHeaders([]); setCsvRows([]); setMapping({}); setMappedData([]); setResult(null)
    }

    if (!isOpen) return null

    const statusIcon = (s: RowStatus) => {
        if (s === 'new') return <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
        if (s === 'duplicate') return <XCircle size={14} style={{ color: '#ef4444' }} />
        return <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
    }

    const statusLabel = (s: RowStatus) => {
        if (s === 'new') return 'Baru'
        if (s === 'duplicate') return 'Duplikat'
        return 'Mirip'
    }

    const statusBg = (s: RowStatus) => {
        if (s === 'new') return '#f0fdf4'
        if (s === 'duplicate') return '#fef2f2'
        return '#fffbeb'
    }

    const newCount = mappedData.filter(d => d.status === 'new').length
    const dupCount = mappedData.filter(d => d.status === 'duplicate').length
    const simCount = mappedData.filter(d => d.status === 'similar').length

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileSpreadsheet size={20} /> {title}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={() => { reset(); onClose() }}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* Progress Steps */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                        {['Upload File', 'Mapping Kolom', 'Preview & Import'].map((s, i) => {
                            const stepNum = ['upload', 'mapping', 'preview', 'importing']
                            const currentIdx = stepNum.indexOf(step)
                            const isActive = i <= currentIdx
                            return (
                                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: isActive ? '#dc2626' : '#e8dada', color: isActive ? 'white' : '#9c8888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}</div>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#991b1b' : '#9c8888' }}>{s}</span>
                                    {i < 2 && <span style={{ color: '#d4c2c2', margin: '0 0.25rem' }}>→</span>}
                                </div>
                            )
                        })}
                    </div>

                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ border: '2px dashed var(--color-border-secondary)', borderRadius: 'var(--radius-lg)', padding: '3rem 2rem', cursor: 'pointer', transition: 'all 0.15s' }} onClick={() => fileRef.current?.click()}>
                                <Upload size={36} style={{ color: '#dc2626', margin: '0 auto 1rem' }} />
                                <p style={{ fontWeight: 600, marginBottom: 4 }}>Klik atau drop file CSV</p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Format: .csv (comma-separated)</p>
                            </div>
                            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-surface-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8 }}>📋 Kolom yang diharapkan:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {columns.map(c => (
                                        <span key={c.key} className="badge" style={{ background: c.required ? '#fef2f2' : '#f5f0f0', color: c.required ? '#991b1b' : '#5c4444' }}>
                                            {c.label}{c.required ? ' *' : ''}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Mapping */}
                    {step === 'mapping' && (
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                Cocokkan kolom CSV dengan kolom database. Ditemukan <strong>{csvHeaders.length}</strong> kolom dan <strong>{csvRows.length}</strong> baris.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                {columns.map(col => (
                                    <div key={col.key} style={{ display: 'contents' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{col.label}{col.required && <span style={{ color: '#dc2626' }}> *</span>}</div>
                                        <span style={{ color: 'var(--color-text-tertiary)' }}>←</span>
                                        <select className="form-select" value={mapping[col.key] || ''} onChange={e => setMapping({ ...mapping, [col.key]: e.target.value })}>
                                            <option value="">-- Lewati --</option>
                                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="modal-footer" style={{ borderTop: 'none', paddingRight: 0 }}>
                                <button className="btn btn-secondary" onClick={() => setStep('upload')}>Kembali</button>
                                <button className="btn btn-primary" onClick={processMapping}>Lanjut Preview</button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 'preview' && !result && (
                        <div>
                            {/* Status summary */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: 'var(--radius-md)', flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, color: '#15803d' }}>{newCount}</div><div style={{ fontSize: '0.75rem', color: '#15803d' }}>Baru</div>
                                </div>
                                <div style={{ padding: '0.5rem 1rem', background: '#fef2f2', borderRadius: 'var(--radius-md)', flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, color: '#dc2626' }}>{dupCount}</div><div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Duplikat</div>
                                </div>
                                <div style={{ padding: '0.5rem 1rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, color: '#b45309' }}>{simCount}</div><div style={{ fontSize: '0.75rem', color: '#b45309' }}>Mirip</div>
                                </div>
                            </div>

                            {/* Preview table */}
                            <div style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)' }}>
                                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 36 }}><input type="checkbox" checked={mappedData.every(d => d.selected)} onChange={e => setMappedData(mappedData.map(d => ({ ...d, selected: e.target.checked })))} /></th>
                                            <th>Status</th>
                                            {columns.filter(c => mapping[c.key]).map(c => <th key={c.key}>{c.label}</th>)}
                                            <th>Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mappedData.map((d, i) => (
                                            <tr key={i} style={{ background: statusBg(d.status) }}>
                                                <td><input type="checkbox" checked={d.selected} onChange={e => { const n = [...mappedData]; n[i] = { ...n[i], selected: e.target.checked }; setMappedData(n) }} /></td>
                                                <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{statusIcon(d.status)} {statusLabel(d.status)}</span></td>
                                                {columns.filter(c => mapping[c.key]).map(c => <td key={c.key}>{d.row[c.key] || '-'}</td>)}
                                                <td style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', maxWidth: 200 }}>{d.matchInfo || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="modal-footer" style={{ borderTop: 'none', paddingRight: 0 }}>
                                <button className="btn btn-secondary" onClick={() => setStep('mapping')}>Kembali</button>
                                <button className="btn btn-primary" disabled={importing || mappedData.filter(d => d.selected).length === 0} onClick={handleImport}>
                                    {importing ? 'Mengimpor...' : `Import ${mappedData.filter(d => d.selected).length} Data`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === 'importing' && result && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <CheckCircle2 size={48} style={{ color: '#22c55e', margin: '0 auto 1rem' }} />
                            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Import Selesai!</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                <strong style={{ color: '#22c55e' }}>{result.success}</strong> data berhasil diimport,{' '}
                                <strong style={{ color: '#9c8888' }}>{result.skipped}</strong> data dilewati
                            </p>
                            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => { reset(); onClose() }}>Tutup</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

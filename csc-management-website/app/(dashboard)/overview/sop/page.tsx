'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText as FileTextIcon } from 'lucide-react'

export default function OverviewSOPPage() {
    const [sops, setSops] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterDept, setFilterDept] = useState('')
    const [selectedSop, setSelectedSop] = useState<any>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('sop_guides').select('*, department:departments(name)').eq('is_active', true).order('title')
        const { data: d } = await supabase.from('departments').select('id,name')
        setSops(data || [])
        setDepartments(d || [])
        setLoading(false)
    }

    const filtered = sops.filter((s: any) => !filterDept || s.department_id === filterDept)

    return (
        <div>
            <div className="topbar"><div className="topbar-title">SOP Guide</div></div>
            <div className="page-container">
                <h1 className="page-title">Panduan SOP</h1>
                <p className="page-subtitle">Standard Operating Procedure untuk setiap bidang</p>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <select className="form-select" style={{ width: 'auto' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                            <option value="">Semua Bidang</option>
                            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}>
                    <div className="card" style={{ padding: '0.5rem', maxHeight: 600, overflowY: 'auto' }}>
                        {loading ? <p style={{ padding: '1rem' }}>Memuat...</p> : filtered.length === 0 ? <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Belum ada SOP</p> :
                            filtered.map((s: any) => (
                                <div key={s.id} onClick={() => setSelectedSop(s)} style={{
                                    padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: 'var(--radius-md)',
                                    background: selectedSop?.id === s.id ? 'var(--color-brand-50)' : 'transparent',
                                    borderLeft: selectedSop?.id === s.id ? '3px solid var(--color-brand-500)' : '3px solid transparent',
                                    marginBottom: 2
                                }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{s.department?.name} · v{s.version}</div>
                                </div>
                            ))}
                    </div>
                    <div className="card">
                        {selectedSop ? (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedSop.title}</h2>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>{selectedSop.department?.name} · Versi {selectedSop.version}</p>
                                </div>
                                <div style={{ fontSize: '0.9375rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selectedSop.content}</div>
                            </div>
                        ) : (
                            <div className="empty-state"><FileTextIcon size={48} /><h3>Pilih SOP</h3><p>Pilih SOP dari daftar di samping untuk melihat detailnya.</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

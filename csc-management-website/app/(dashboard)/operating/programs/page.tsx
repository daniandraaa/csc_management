'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort, formatCurrency } from '@/lib/utils'
import { FolderKanban, Plus, X, Search, Eye, Upload, Download, FileText } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

export default function ProgramsPage() {
    const [programs, setPrograms] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [showDetail, setShowDetail] = useState<any>(null)
    const [partners, setPartners] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ name: '', description: '', objectives: '', start_date: '', end_date: '', status: 'planned', budget: '', department_id: '', pic_id: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [partnerForm, setPartnerForm] = useState({ partner_name: '', contact_person: '', contact_email: '', role_description: '' })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('programs').select('*, department:departments(name), pic:members!programs_pic_id_fkey(full_name)').order('created_at', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name').order('full_name')
        const { data: d } = await supabase.from('departments').select('id,name').order('name')
        setPrograms(data || []); setMembers(m || []); setDepartments(d || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, budget: form.budget ? parseFloat(form.budget) : 0, pic_id: form.pic_id || null, department_id: form.department_id || null, start_date: form.start_date || null, end_date: form.end_date || null }
        if (editId) { await supabase.from('programs').update(payload).eq('id', editId) } else { await supabase.from('programs').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ name: '', description: '', objectives: '', start_date: '', end_date: '', status: 'planned', budget: '', department_id: '', pic_id: '' }); loadData()
    }

    async function handleDelete(id: string) { if (confirm('Hapus proker?')) { await supabase.from('programs').delete().eq('id', id); loadData() } }

    async function viewDetail(p: any) {
        const { data } = await supabase.from('program_partners').select('*').eq('program_id', p.id)
        setPartners(data || []); setShowDetail(p)
    }

    async function addPartner(programId: string) {
        await supabase.from('program_partners').insert({ ...partnerForm, program_id: programId })
        setPartnerForm({ partner_name: '', contact_person: '', contact_email: '', role_description: '' })
        const { data } = await supabase.from('program_partners').select('*').eq('program_id', programId)
        setPartners(data || [])
    }

    const filtered = programs.filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()))

    async function handleCsvImport(rows: Record<string, string>[]) {
        for (const row of rows) { await supabase.from('programs').insert({ name: row.name, description: row.description || null, objectives: row.objectives || null, status: row.status || 'planned', budget: parseFloat(row.budget) || 0 }) }
        loadData()
    }
    const progPdfCols = [{ header: 'Nama', key: 'name' }, { header: 'Bidang', key: 'dept' }, { header: 'PIC', key: 'pic' }, { header: 'Budget', key: 'budget_str' }, { header: 'Status', key: 'status' }]
    const progData = filtered.map((p: any) => ({ name: p.name, dept: p.department?.name || '-', pic: p.pic?.full_name || '-', budget_str: formatCurrency(p.budget || 0), status: getStatusLabel(p.status) }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Program Kerja</div></div>
            <div className="page-container">
                <h1 className="page-title">Program Kerja (Proker)</h1>
                <p className="page-subtitle">CRUD program kerja lengkap beserta mitra</p>

                <div className="toolbar">
                    <div className="toolbar-left"><div className="search-input"><Search /><input className="form-input" placeholder="Cari proker..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div></div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(progPdfCols, progData, `CSC_Programs_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Program Kerja CSC', subtitle: `Total: ${progData.length} program`, columns: progPdfCols, data: progData })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', description: '', objectives: '', start_date: '', end_date: '', status: 'planned', budget: '', department_id: '', pic_id: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Proker</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr><th>Nama</th><th>Bidang</th><th>PIC</th><th>Budget</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><FolderKanban size={48} /><h3>Belum ada proker</h3></div></td></tr> :
                                    filtered.map((p: any) => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                                            <td>{p.department?.name || '-'}</td>
                                            <td>{p.pic?.full_name || '-'}</td>
                                            <td>{formatCurrency(p.budget || 0)}</td>
                                            <td style={{ fontSize: '0.8125rem' }}>{p.start_date ? formatDateShort(p.start_date) : '-'} → {p.end_date ? formatDateShort(p.end_date) : '-'}</td>
                                            <td><span className={`badge badge-${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(p)}><Eye size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name: p.name, description: p.description || '', objectives: p.objectives || '', start_date: p.start_date || '', end_date: p.end_date || '', status: p.status, budget: p.budget?.toString() || '', department_id: p.department_id || '', pic_id: p.pic_id || '' }); setEditId(p.id); setShowModal(true) }}>Edit</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}>Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {/* Form Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Program Kerja</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Nama *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Objectives</label><textarea className="form-textarea" value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Mulai</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Selesai</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Bidang</label><select className="form-select" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}><option value="">Pilih</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                        <div className="form-group"><label className="form-label">PIC</label><select className="form-select" value={form.pic_id} onChange={e => setForm({ ...form, pic_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Budget</label><input className="form-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                                    </div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {showDetail && (
                    <div className="modal-overlay" onClick={() => setShowDetail(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <div className="modal-header"><h2>{showDetail.name}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <div style={{ marginBottom: '1rem' }}><span className={`badge badge-${getStatusColor(showDetail.status)}`}>{getStatusLabel(showDetail.status)}</span></div>
                                {showDetail.description && <div style={{ marginBottom: '1rem' }}><h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Deskripsi</h4><p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{showDetail.description}</p></div>}
                                {showDetail.objectives && <div style={{ marginBottom: '1rem' }}><h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Objectives</h4><p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{showDetail.objectives}</p></div>}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div><h4 style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Budget</h4><p>{formatCurrency(showDetail.budget || 0)}</p></div>
                                    <div><h4 style={{ fontSize: '0.8125rem', fontWeight: 600 }}>PIC</h4><p>{showDetail.pic?.full_name || '-'}</p></div>
                                </div>
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Mitra</h4>
                                {partners.map((pt: any) => (
                                    <div key={pt.id} style={{ padding: '0.5rem', background: 'var(--color-surface-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        <strong>{pt.partner_name}</strong> {pt.contact_person && `— ${pt.contact_person}`} {pt.role_description && <span style={{ color: 'var(--color-text-secondary)' }}>({pt.role_description})</span>}
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input className="form-input" placeholder="Nama Mitra" value={partnerForm.partner_name} onChange={e => setPartnerForm({ ...partnerForm, partner_name: e.target.value })} style={{ flex: 1 }} />
                                    <button className="btn btn-secondary btn-sm" onClick={() => partnerForm.partner_name && addPartner(showDetail.id)} type="button">+ Mitra</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={[{ key: 'name', label: 'Nama Program', required: true }, { key: 'description', label: 'Deskripsi' }, { key: 'objectives', label: 'Objectives' }, { key: 'status', label: 'Status' }, { key: 'budget', label: 'Budget' }]}
                    existingData={programs} matchFields={['name']} title="Import Program Kerja" />
            </div>
        </div>
    )
}

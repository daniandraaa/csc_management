'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { getStatusColor, getStatusLabel, formatDateShort, formatCurrency } from '@/lib/utils'
import { FolderKanban, Plus, X, Search, Eye, Upload, Download, FileText, CalendarDays, CheckCircle2 } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

export default function ProgramsPage() {
    const router = useRouter()
    const { currentUser } = useCurrentUser()
    const [programs, setPrograms] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [showDetail, setShowDetail] = useState<any>(null)
    const [partners, setPartners] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ 
        name: '', description: '', objectives: '', start_date: '', end_date: '', 
        status: 'on_track', budget: '', department_id: '', pic_id: '',
        completion_percentage: 0, sop_sent: false
    })
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
        const payload = { 
            ...form, 
            budget: form.budget ? parseFloat(form.budget) : 0, 
            pic_id: form.pic_id || null, 
            department_id: form.department_id || null, 
            start_date: form.start_date || null, 
            end_date: form.end_date || null,
            completion_percentage: parseInt(form.completion_percentage.toString()) || 0
        }
        if (editId) { await supabase.from('programs').update(payload).eq('id', editId) } else { await supabase.from('programs').insert(payload) }
        setShowModal(false); setEditId(null); resetForm(); loadData()
    }

    function resetForm() {
        setForm({ 
            name: '', description: '', objectives: '', start_date: '', end_date: '', 
            status: 'on_track', budget: '', department_id: '', pic_id: '',
            completion_percentage: 0, sop_sent: false
        })
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
        for (const row of rows) { await supabase.from('programs').insert({ name: row.name, description: row.description || null, objectives: row.objectives || null, status: row.status || 'on_track', budget: parseFloat(row.budget) || 0 }) }
        loadData()
    }
    const progPdfCols = [{ header: 'Nama', key: 'name' }, { header: 'Bidang', key: 'dept' }, { header: 'PIC', key: 'pic' }, { header: 'Progress', key: 'progress' }, { header: 'Status', key: 'status' }]
    const progData = filtered.map((p: any) => ({ name: p.name, dept: p.department?.name || '-', pic: p.pic?.full_name || '-', progress: `${p.completion_percentage || 0}%`, status: getStatusLabel(p.status) }))

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Program Kerja</div></div>
            <div className="page-container">
                <h1 className="page-title">Program Kerja Tracker</h1>
                <p className="page-subtitle">Monitoring progres pelaksanaan program kerja dan kepatuhan SOP</p>

                <div className="toolbar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="toolbar-left" style={{ flex: '1 1 300px' }}><div className="search-input"><Search /><input className="form-input" placeholder="Cari proker..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} /></div></div>
                    <div className="toolbar-right" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm hidden md:flex" onClick={() => setShowCsvImport(true)}><Upload size={14} /> <span className="hidden lg:inline">Import CSV</span></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(progPdfCols, progData, `CSC_Programs_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> <span className="hidden sm:inline">CSV</span></button>
                        <button className="btn btn-secondary btn-sm hidden sm:flex" onClick={() => exportToPdf({ title: 'Daftar Program Kerja CSC', subtitle: `Total: ${progData.length} program`, columns: progPdfCols, data: progData })}><FileText size={14} /> <span className="hidden lg:inline">Export PDF</span></button>
                        <button className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }} onClick={() => { setEditId(null); resetForm(); setShowModal(true) }}><Plus size={16} /> <span className="hidden sm:inline">Tambah Proker</span><span className="sm:hidden">Tambah</span></button>
                    </div>
                </div>

                <div className="data-table-container">
                    <table className="data-table">
                        <thead><tr><th>Program</th><th>Bidang</th><th>PIC</th><th>Completion</th><th>SOP Sent?</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><FolderKanban size={48} /><h3>Belum ada proker</h3></div></td></tr> :
                                    filtered.map((p: any) => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td>{p.department?.name || '-'}</td>
                                            <td>{p.pic?.full_name || '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, minWidth: 60 }}>
                                                        <div style={{ height: '100%', width: `${p.completion_percentage || 0}%`, background: p.status === 'on_track' ? '#22c55e' : p.status === 'at_risk' ? '#f59e0b' : '#ef4444', borderRadius: 3 }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, width: 32 }}>{p.completion_percentage || 0}%</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {p.sop_sent ? <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}><CheckCircle2 size={14} /> YES</span> : <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>NO</span>}
                                            </td>
                                            <td><span className={`badge badge-${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" title="Lihat Detail" onClick={() => viewDetail(p)}><Eye size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name: p.name, description: p.description || '', objectives: p.objectives || '', start_date: p.start_date || '', end_date: p.end_date || '', status: p.status, budget: p.budget?.toString() || '', department_id: p.department_id || '', pic_id: p.pic_id || '', completion_percentage: p.completion_percentage || 0, sop_sent: p.sop_sent || false }); setEditId(p.id); setShowModal(true) }}>Edit</button>
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
                                    <div className="form-group"><label className="form-label">Nama Program *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Bidang</label><select className="form-select" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}><option value="">Pilih</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                        <div className="form-group"><label className="form-label">PIC</label><select className="form-select" value={form.pic_id} onChange={e => setForm({ ...form, pic_id: e.target.value })}><option value="">Pilih</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Progress (%)</label><input className="form-input" type="number" min="0" max="100" value={form.completion_percentage} onChange={e => setForm({ ...form, completion_percentage: parseInt(e.target.value) || 0 })} /></div>
                                        <div className="form-group">
                                            <label className="form-label">SOP Sent?</label>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
                                                    <input type="radio" checked={form.sop_sent} onChange={() => setForm({ ...form, sop_sent: true })} /> YES
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
                                                    <input type="radio" checked={!form.sop_sent} onChange={() => setForm({ ...form, sop_sent: false })} /> NO
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="delayed">Delayed</option></select></div>
                                        <div className="form-group"><label className="form-label">Budget</label><input className="form-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Mulai</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Selesai</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
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
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <span className={`badge badge-${getStatusColor(showDetail.status)}`}>{getStatusLabel(showDetail.status)}</span>
                                    <span className={`badge ${showDetail.sop_sent ? 'badge-success' : 'badge-danger'}`}>SOP: {showDetail.sop_sent ? 'SENT' : 'NOT SENT'}</span>
                                    <span className="badge badge-info">{showDetail.completion_percentage || 0}% Complete</span>
                                </div>
                                {showDetail.description && <div style={{ marginBottom: '1rem' }}><h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Deskripsi</h4><p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{showDetail.description}</p></div>}
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
                    columns={[{ key: 'name', label: 'Nama Program', required: true }, { key: 'description', label: 'Deskripsi' }, { key: 'status', label: 'Status' }, { key: 'budget', label: 'Budget' }]}
                    existingData={programs} matchFields={['name']} title="Import Program Kerja" />
            </div>
        </div>
    )
}

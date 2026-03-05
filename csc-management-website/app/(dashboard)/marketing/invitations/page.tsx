'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getStatusColor, getStatusLabel, formatDateShort, getInitials } from '@/lib/utils'
import { UserCheck, Plus, X, Users, Upload, FileText, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const CSV_COLUMNS = [
    { key: 'event_name', label: 'Nama Event', required: true },
    { key: 'organizer', label: 'Organizer' },
    { key: 'event_date', label: 'Tanggal' },
    { key: 'event_location', label: 'Lokasi' },
    { key: 'invitation_status', label: 'Status Undangan' },
    { key: 'attendance_status', label: 'Status Kehadiran' },
]
const PDF_COLUMNS = [
    { header: 'Nama Event', key: 'event_name' },
    { header: 'Organizer', key: 'organizer' },
    { header: 'Tanggal', key: 'event_date' },
    { header: 'Lokasi', key: 'event_location' },
    { header: 'Status Undangan', key: 'invitation_status' },
    { header: 'Kehadiran', key: 'attendance_status' },
]

export default function InvitationsPage() {
    const [invitations, setInvitations] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [showPics, setShowPics] = useState<any>(null)
    const [pics, setPics] = useState<any[]>([])
    const [form, setForm] = useState({ event_name: '', organizer: '', event_date: '', event_location: '', description: '', invitation_status: 'pending', attendance_status: 'pending', notes: '' })
    const [editId, setEditId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('guest_invitations').select('*').order('event_date', { ascending: false })
        const { data: m } = await supabase.from('members').select('id,full_name')
        setInvitations(data || []); setMembers(m || []); setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { ...form, event_date: form.event_date || null }
        if (editId) { await supabase.from('guest_invitations').update(payload).eq('id', editId) } else { await supabase.from('guest_invitations').insert(payload) }
        setShowModal(false); setEditId(null); setForm({ event_name: '', organizer: '', event_date: '', event_location: '', description: '', invitation_status: 'pending', attendance_status: 'pending', notes: '' }); loadData()
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        const payload = rows.map(r => ({ event_name: r.event_name, organizer: r.organizer || null, event_date: r.event_date || null, event_location: r.event_location || null, invitation_status: r.invitation_status || 'pending', attendance_status: r.attendance_status || 'pending' }))
        await supabase.from('guest_invitations').insert(payload)
    }

    async function loadPics(inv: any) {
        const { data } = await supabase.from('guest_invitation_pics').select('*, member:members(id,full_name)').eq('invitation_id', inv.id)
        setPics(data || []); setShowPics(inv)
    }

    async function addPic(invId: string, memberId: string) {
        await supabase.from('guest_invitation_pics').insert({ invitation_id: invId, member_id: memberId })
        loadPics(showPics)
    }

    async function toggleConfirm(id: string, current: boolean) {
        await supabase.from('guest_invitation_pics').update({ is_confirmed: !current }).eq('id', id)
        loadPics(showPics)
    }

    async function removePic(id: string) {
        await supabase.from('guest_invitation_pics').delete().eq('id', id)
        loadPics(showPics)
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Tamu Undangan</div></div>
            <div className="page-container">
                <h1 className="page-title">Status Tamu Undangan</h1>
                <p className="page-subtitle">Kelola undangan dan PIC yang hadir</p>
                <div className="toolbar">
                    <div className="toolbar-left" />
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, invitations, `CSC_Undangan_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Undangan CSC', subtitle: `Total: ${invitations.length} undangan`, columns: PDF_COLUMNS, data: invitations })}><FileText size={14} /> Export PDF</button>
                        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ event_name: '', organizer: '', event_date: '', event_location: '', description: '', invitation_status: 'pending', attendance_status: 'pending', notes: '' }); setShowModal(true) }}><Plus size={16} /> Tambah Undangan</button>
                    </div>
                </div>

                <div className="cards-grid">
                    {loading ? <p>Memuat...</p> : invitations.length === 0 ? <div className="card"><div className="empty-state"><UserCheck size={48} /><h3>Belum ada undangan</h3></div></div> :
                        invitations.map((inv: any) => (
                            <div key={inv.id} className="card">
                                <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{inv.event_name}</h3>
                                {inv.organizer && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Oleh: {inv.organizer}</p>}
                                <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
                                    <span className={`badge badge-${getStatusColor(inv.invitation_status)}`}>Undangan: {getStatusLabel(inv.invitation_status)}</span>
                                    <span className={`badge badge-${getStatusColor(inv.attendance_status)}`}>{getStatusLabel(inv.attendance_status)}</span>
                                </div>
                                {inv.event_date && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>📅 {formatDateShort(inv.event_date)}</p>}
                                {inv.event_location && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>📍 {inv.event_location}</p>}
                                <div style={{ display: 'flex', gap: 4, marginTop: 12, borderTop: '1px solid var(--color-border-primary)', paddingTop: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => loadPics(inv)}><Users size={14} /> PIC</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ event_name: inv.event_name, organizer: inv.organizer || '', event_date: inv.event_date || '', event_location: inv.event_location || '', description: inv.description || '', invitation_status: inv.invitation_status, attendance_status: inv.attendance_status, notes: inv.notes || '' }); setEditId(inv.id); setShowModal(true) }}>Edit</button>
                                </div>
                            </div>
                        ))}
                </div>

                <CsvImportModal isOpen={showCsvImport} onClose={() => { setShowCsvImport(false); loadData() }} onImport={handleCsvImport}
                    columns={CSV_COLUMNS} existingData={invitations} matchFields={['event_name', 'event_date']} title="Import Undangan" />

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>{editId ? 'Edit' : 'Tambah'} Undangan</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                            <form onSubmit={handleSubmit}><div className="modal-body">
                                <div className="form-group"><label className="form-label">Nama Event *</label><input className="form-input" required value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Organizer</label><input className="form-input" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Tanggal</label><input className="form-input" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Lokasi</label><input className="form-input" value={form.event_location} onChange={e => setForm({ ...form, event_location: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Status Undangan</label><select className="form-select" value={form.invitation_status} onChange={e => setForm({ ...form, invitation_status: e.target.value })}><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></div>
                                    <div className="form-group"><label className="form-label">Status Kehadiran</label><select className="form-select" value={form.attendance_status} onChange={e => setForm({ ...form, attendance_status: e.target.value })}><option value="pending">Pending</option><option value="can_attend">Dapat Hadir</option><option value="cannot_attend">Tidak Hadir</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="btn btn-primary">{editId ? 'Simpan' : 'Tambah'}</button></div></form>
                        </div>
                    </div>
                )}

                {showPics && (
                    <div className="modal-overlay" onClick={() => setShowPics(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2>PIC - {showPics.event_name}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowPics(null)}><X size={18} /></button></div>
                            <div className="modal-body">
                                <div style={{ marginBottom: '1rem' }}>
                                    <select className="form-select" onChange={e => { if (e.target.value) { addPic(showPics.id, e.target.value); e.target.value = '' } }}>
                                        <option value="">+ Tambah PIC...</option>
                                        {members.filter(m => !pics.find(p => p.member_id === m.id)).map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                    </select>
                                </div>
                                {pics.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Belum ada PIC</p> :
                                    pics.map((p: any) => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-primary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className="avatar avatar-sm">{getInitials(p.member?.full_name || 'UN')}</div>
                                                <span style={{ fontWeight: 500 }}>{p.member?.full_name}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <button className={`btn btn-sm ${p.is_confirmed ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleConfirm(p.id, p.is_confirmed)}>{p.is_confirmed ? '✓ Confirmed' : 'Confirm'}</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => removePic(p.id)}>×</button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

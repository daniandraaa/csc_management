'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { canPerformAction } from '@/lib/rbac'
import { getInitials } from '@/lib/utils'
import { hashPassword } from '@/lib/password'
import { Users, Plus, X, Search, Upload, Download, FileText, KeyRound } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import DeleteMemberModal from '@/components/DeleteMemberModal'
import { exportToPdf, exportToCsv } from '@/lib/export'

const DEPARTMENTS = ['Executive', 'Marketing', 'Business', 'Operating', 'Human Resource', 'Financial']
const ROLES = ['BOE', 'C Level', 'Secretary', 'Staff', 'Administration', 'Business Partner', 'Manager']

const roleColors: Record<string, { bg: string; text: string }> = {
    'BOE': { bg: '#fef2f2', text: '#991b1b' },
    'C Level': { bg: '#fff7ed', text: '#9a3412' },
    'Secretary': { bg: '#eff6ff', text: '#1d4ed8' },
    'Staff': { bg: '#f0fdf4', text: '#15803d' },
    'Manager': { bg: '#faf5ff', text: '#7e22ce' },
    'Administration': { bg: '#f1f5f9', text: '#475569' },
}

const deptColors: Record<string, string> = {
    'Executive': '#991b1b',
    'Marketing': '#9333ea',
    'Business': '#0d9488',
    'Operating': '#2563eb',
    'Human Resource': '#ea580c',
    'Financial': '#ca8a04',
}

const CSV_COLUMNS = [
    { key: 'full_name', label: 'Nama Lengkap', required: true },
    { key: 'nim', label: 'NIM', required: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telepon' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'department', label: 'Bidang' },
    { key: 'role', label: 'Role' },
    { key: 'position', label: 'Jabatan' },
]

const PDF_COLUMNS = [
    { header: 'Nama', key: 'full_name' },
    { header: 'NIM', key: 'nim' },
    { header: 'Bidang', key: 'department' },
    { header: 'Role', key: 'role' },
    { header: 'Jabatan', key: 'position' },
    { header: 'Email', key: 'email' },
    { header: 'Telepon', key: 'phone' },
    { header: 'WhatsApp', key: 'whatsapp' },
]

export default function MembersPage() {
    const { currentUser } = useCurrentUser()
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCsvImport, setShowCsvImport] = useState(false)
    const [search, setSearch] = useState('')
    const [filterDept, setFilterDept] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [form, setForm] = useState({ full_name: '', nim: '', email: '', phone: '', whatsapp: '', department: '', role: '', position: '' })
    const [editId, setEditId] = useState<string | null>(null)
    const [deleteMember, setDeleteMember] = useState<{ id: string, full_name: string } | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const canCreate = canPerformAction(currentUser, '/members', 'create')
    const canDeleteMember = canPerformAction(currentUser, '/members', 'delete')
    // HR or Executive can reset passwords
    const canResetPassword = currentUser?.role === 'BOE' || currentUser?.role === 'C Level' ||
        (currentUser?.role === 'C Level' && currentUser?.department === 'Human Resource')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const { data } = await supabase.from('members').select('*').order('full_name').limit(5000)
        setMembers(data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editId) { await supabase.from('members').update(form).eq('id', editId) }
        else { await supabase.from('members').insert(form) }
        setShowModal(false); setEditId(null)
        setForm({ full_name: '', nim: '', email: '', phone: '', whatsapp: '', department: '', role: '', position: '' })
        loadData()
    }

    async function handleDelete(m: any) {
        setDeleteMember({ id: m.id, full_name: m.full_name })
        setShowDeleteModal(true)
    }

    async function handleResetPassword(id: string, name: string) {
        if (confirm(`Reset password untuk ${name}?\n\nPassword akan dihapus dan user wajib set password baru saat login berikutnya.`)) {
            const { error } = await supabase.from('members').update({ password_hash: null, has_set_password: false }).eq('id', id)
            if (error) {
                alert("Gagal reset password: " + error.message)
            } else {
                alert(`Password ${name} berhasil direset. User akan diminta set password baru saat login.`)
            }
        }
    }

    async function handleCsvImport(rows: Record<string, string>[]) {
        if (rows.length === 0) return
        
        const toInsert = rows.map(row => {
            // Normalize Role (e.g. C-Level -> C Level)
            let role = row.role || 'Staff'
            if (role.toLowerCase() === 'c-level') role = 'C Level'
            if (role.toLowerCase() === 'c level') role = 'C Level'
            
            return {
                full_name: row.full_name,
                nim: row.nim || null,
                email: row.email || null,
                phone: row.phone || null,
                whatsapp: row.whatsapp || row.phone || null,
                department: row.department || null,
                role: role,
                position: row.position || null,
            }
        }).filter(r => r.full_name) // Ensure full_name is present

        const { error } = await supabase.from('members').insert(toInsert)
        
        if (error) {
            console.error('Import error:', error)
            alert(`Gagal mengimpor data: ${error.message}\n\nPastikan format data benar (misal: role harus sesuai)`)
        } else {
            alert(`${toInsert.length} anggota berhasil diimpor!`)
            loadData()
        }
    }

    const filtered = members.filter(m => {
        const matchSearch = m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.nim?.includes(search)
        const matchDept = !filterDept || m.department === filterDept
        const matchRole = !filterRole || m.role === filterRole
        return matchSearch && matchDept && matchRole
    })

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Direktori Anggota</div></div>
            <div className="page-container">
                <h1 className="page-title">Anggota CSC ({members.length})</h1>
                <p className="page-subtitle">Direktori anggota Community Support Center Telkom University</p>

                <div className="stats-grid">
                    {DEPARTMENTS.map(dept => {
                        const count = members.filter(m => m.department === dept).length
                        return (
                            <div key={dept} className="stat-card" style={{ borderLeft: `3px solid ${deptColors[dept]}` }}>
                                <div><div className="stat-value" style={{ color: deptColors[dept], fontSize: '1.5rem' }}>{count}</div><div className="stat-label">{dept}</div></div>
                            </div>
                        )
                    })}
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="search-input">
                            <Search /><input className="form-input" placeholder="Cari nama atau NIM..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
                        </div>
                        <select className="form-select" style={{ width: 'auto' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                            <option value="">Semua Bidang</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="form-select" style={{ width: 'auto' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                            <option value="">Semua Role</option>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(PDF_COLUMNS, filtered, `CSC_Anggota_${new Date().toISOString().split('T')[0]}.csv`)}><Download size={14} /> CSV</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => exportToPdf({ title: 'Daftar Anggota CSC', subtitle: `Total: ${filtered.length} anggota | Dicetak dari CSC Management System`, columns: PDF_COLUMNS, data: filtered })}><FileText size={14} /> Export PDF</button>
                        {canCreate && (
                            <>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvImport(true)}><Upload size={14} /> Import CSV</button>
                                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ full_name: '', nim: '', email: '', phone: '', whatsapp: '', department: '', role: '', position: '' }); setShowModal(true) }}>
                                    <Plus size={16} /> Tambah Anggota
                                </button>
                            </>)}

                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Anggota</th><th>NIM</th><th>Bidang</th><th>Role</th><th>Jabatan</th><th>Kontak</th><th>Aksi</th></tr>
                            </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Memuat...</td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Users size={48} /><h3>Belum ada anggota</h3><p>Tambahkan anggota baru ke direktori CSC.</p></div></td></tr> :
                                    filtered.map((m: any) => {
                                        const rc = roleColors[m.role] || { bg: '#f1f5f9', text: '#475569' }
                                        return (
                                            <tr key={m.id}>
                                                 <td data-label="Anggota">
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                         <div className="avatar">{getInitials(m.full_name)}</div>
                                                         <div>
                                                             <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                                                             <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{m.email}</div>
                                                         </div>
                                                     </div>
                                                 </td>
                                                 <td data-label="NIM" style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 500 }}>{m.nim || '-'}</td>
                                                 <td data-label="Bidang">
                                                     {m.department && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                                                         <span style={{ width: 8, height: 8, borderRadius: '50%', background: deptColors[m.department] || '#94a3b8' }} />
                                                         {m.department}
                                                     </span>}
                                                 </td>
                                                 <td data-label="Role"><span className="badge" style={{ background: rc.bg, color: rc.text }}>{m.role || '-'}</span></td>
                                                 <td data-label="Jabatan" style={{ fontSize: '0.8125rem' }}>{m.position || '-'}</td>
                                                 <td data-label="Kontak" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{m.phone || '-'}</td>
                                                 <td>
                                                     <div style={{ display: 'flex', gap: 4 }}>
                                                         {canCreate && <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ full_name: m.full_name, nim: m.nim || '', email: m.email || '', phone: m.phone || '', whatsapp: m.whatsapp || '', department: m.department || '', role: m.role || '', position: m.position || '' }); setEditId(m.id); setShowModal(true) }}>Edit</button>}
                                                         {canResetPassword && <button className="btn btn-ghost btn-sm" style={{ color: '#6d28d9' }} onClick={() => handleResetPassword(m.id, m.full_name)} title="Reset password"><KeyRound size={13} /></button>}
                                                         {canDeleteMember && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(m)}>Hapus</button>}
                                                     </div>
                                                 </td>
                                             </tr>
                                        )
                                    })}
                        </tbody>
                    </table>
                </div>
            </div>

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editId ? 'Edit' : 'Tambah'} Anggota</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group"><label className="form-label">Nama Lengkap *</label><input className="form-input" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">NIM *</label><input className="form-input" required value={form.nim} onChange={e => setForm({ ...form, nim: e.target.value })} placeholder="1301XXXXXXX" /></div>
                                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">Bidang *</label><select className="form-select" required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option value="">Pilih Bidang</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                                        <div className="form-group"><label className="form-label">Role *</label><select className="form-select" required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="">Pilih Role</option>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group"><label className="form-label">No. Telepon</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">No. WhatsApp</label><input className="form-input" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="628XXXXXXXXX" /></div>
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

                {/* CSV Import Modal */}
                <CsvImportModal
                    isOpen={showCsvImport}
                    onClose={() => { setShowCsvImport(false); loadData() }}
                    onImport={handleCsvImport}
                    columns={CSV_COLUMNS}
                    existingData={members}
                    matchFields={['nim', 'full_name', 'email']}
                    title="Import Data Anggota"
                />

                {/* Delete Confirmation Modal with Dependency Check */}
                <DeleteMemberModal
                    isOpen={showDeleteModal}
                    onClose={() => { setShowDeleteModal(false); setDeleteMember(null) }}
                    member={deleteMember}
                    onSuccess={() => { loadData() }}
                />
            </div>
        </div>
    )
}

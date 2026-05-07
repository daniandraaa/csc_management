'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2, CheckCircle2, AlertCircle, Trash2, ShieldAlert } from 'lucide-react'

interface DeleteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    member: { id: string, full_name: string } | null
    onSuccess: () => void
}

const DEPENDENCIES = [
    { table: 'performance_rankings', label: 'Penilaian Performansi', column: 'member_id', action: 'delete' },
    { table: 'advocacy_aspirations', label: 'Advokasi & Aspirasi', column: 'member_id', action: 'delete' },
    { table: 'counseling_requests', label: 'Permintaan Konseling', column: 'member_id', action: 'delete' },
    { table: 'logbook_entries', label: 'Logbook Anggota', column: 'member_id', action: 'delete' },
    { table: 'event_attendees', label: 'Kehadiran Event', column: 'member_id', action: 'delete' },
    { table: 'attendance_session_members', label: 'Kehadiran Absensi', column: 'member_id', action: 'delete' },
    { table: 'reimbursements', label: 'Data Reimbursement', column: 'member_id', action: 'delete' },
    { table: 'programs', label: 'PIC Program Kerja', column: 'pic_id', action: 'null' },
    { table: 'programs_created', label: 'Pembuat Program', column: 'created_by', action: 'null', overrideTable: 'programs' },
    { table: 'documents', label: 'Penanggung Jawab Dokumen', column: 'handled_by', action: 'null' },
    { table: 'documents_created', label: 'Pembuat Dokumen', column: 'created_by', action: 'null', overrideTable: 'documents' },
    { table: 'admin_reviews_sub', label: 'Pengaju Review Admin', column: 'submitted_by', action: 'delete', overrideTable: 'admin_reviews' },
    { table: 'admin_reviews_sec', label: 'Reviewer Sekretaris', column: 'secretary_reviewed_by', action: 'null', overrideTable: 'admin_reviews' },
    { table: 'admin_reviews_adm', label: 'Reviewer Admin', column: 'admin_reviewed_by', action: 'null', overrideTable: 'admin_reviews' },
    { table: 'content_requests_req', label: 'Pengaju Konten', column: 'requester_id', action: 'null', overrideTable: 'content_requests' },
    { table: 'content_requests_hnd', label: 'Pengelola Konten', column: 'handled_by', action: 'null', overrideTable: 'content_requests' },
    { table: 'attendance_sessions', label: 'Pembuat Sesi Absensi', column: 'created_by', action: 'null' },
    { table: 'guest_invitation_pics', label: 'PIC Undangan', column: 'member_id', action: 'delete' },
    { table: 'sop_guides_created', label: 'Pembuat SOP', column: 'created_by', action: 'null', overrideTable: 'sop_guides' },
    { table: 'sop_guides_updated', label: 'Pengupdate SOP', column: 'updated_by', action: 'null', overrideTable: 'sop_guides' },
    { table: 'media_partners', label: 'Pembuat Media Partner', column: 'created_by', action: 'null' },
    { table: 'guest_invitations', label: 'Pembuat Undangan', column: 'created_by', action: 'null' },
    { table: 'pr_requests_req', label: 'Pengaju Request PR', column: 'requester_id', action: 'null', overrideTable: 'pr_requests' },
    { table: 'pr_requests_hnd', label: 'Pengelola Request PR', column: 'handled_by', action: 'null', overrideTable: 'pr_requests' },
    { table: 'pr_jobdesk', label: 'PIC Jobdesk PR', column: 'pic_id', action: 'null' }
]

export default function DeleteMemberModal({ isOpen, onClose, member, onSuccess }: DeleteMemberModalProps) {
    const [checks, setChecks] = useState<Record<string, { count: number, status: 'idle' | 'checking' | 'found' | 'clearing' | 'cleared' | 'error' }>>({})
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && member) {
            runChecks()
        } else {
            setChecks({})
            setError(null)
            setIsDeleting(false)
        }
    }, [isOpen, member])

    async function runChecks() {
        if (!member) return
        
        const initialChecks: any = {}
        DEPENDENCIES.forEach(d => {
            initialChecks[d.table] = { count: 0, status: 'checking' }
        })
        setChecks(initialChecks)

        for (const dep of DEPENDENCIES) {
            try {
                const tableName = (dep as any).overrideTable || dep.table
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true })
                    .eq(dep.column, member.id)
                
                setChecks(prev => ({
                    ...prev,
                    [dep.table]: { count: count || 0, status: (count || 0) > 0 ? 'found' : 'cleared' }
                }))
            } catch (err) {
                setChecks(prev => ({ ...prev, [dep.table]: { count: 0, status: 'error' } }))
            }
        }
    }

    async function cleanDependency(dep: typeof DEPENDENCIES[0]) {
        if (!member) return
        
        setChecks(prev => ({ ...prev, [dep.table]: { ...prev[dep.table], status: 'clearing' } }))
        
        try {
            let result;
            const tableName = (dep as any).overrideTable || dep.table
            if (dep.action === 'delete') {
                result = await supabase.from(tableName).delete().eq(dep.column, member.id)
            } else {
                result = await supabase.from(tableName).update({ [dep.column]: null }).eq(dep.column, member.id)
            }

            if (result.error) throw result.error

            setChecks(prev => ({ ...prev, [dep.table]: { count: 0, status: 'cleared' } }))
        } catch (err: any) {
            setChecks(prev => ({ ...prev, [dep.table]: { ...prev[dep.table], status: 'error' } }))
            setError(`Gagal membersihkan ${dep.label}: ${err.message}`)
        }
    }

    async function handleDeleteAll() {
        if (!member) return
        setIsDeleting(true)
        setError(null)

        // Clean all remaining
        for (const dep of DEPENDENCIES) {
            if (checks[dep.table]?.status === 'found') {
                await cleanDependency(dep)
            }
        }

        // Final delete
        const { error: delErr } = await supabase.from('members').delete().eq('id', member.id)
        
        if (delErr) {
            setError(`Gagal menghapus anggota: ${delErr.message}`)
            setIsDeleting(false)
        } else {
            onSuccess()
            onClose()
        }
    }

    if (!isOpen) return null

    const canDeleteFinal = Object.values(checks).every(c => c.status === 'cleared')
    const totalFound = Object.values(checks).reduce((acc, c) => acc + c.count, 0)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
                        <Trash2 size={20} /> Hapus Anggota
                    </h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                        <p style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: 600, marginBottom: 4 }}>Konfirmasi Penghapusan</p>
                        <p style={{ fontSize: '0.8125rem', color: '#b91c1c' }}>
                            Anda akan menghapus <strong>{member?.full_name}</strong>. Sistem sedang mengekspor dependensi data untuk memastikan penghapusan bersih.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 300, overflowY: 'auto', padding: '0.5rem' }}>
                        {DEPENDENCIES.map(dep => {
                            const check = checks[dep.table]
                            return (
                                <div key={dep.table} style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.75rem', background: 'white', borderRadius: 8,
                                    border: '1px solid #e2e8f0', fontSize: '0.8125rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {check?.status === 'checking' && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-brand-500)' }} />}
                                        {check?.status === 'cleared' && <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />}
                                        {check?.status === 'found' && <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />}
                                        {check?.status === 'clearing' && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-brand-500)' }} />}
                                        {check?.status === 'error' && <ShieldAlert size={14} style={{ color: 'var(--color-danger)' }} />}
                                        <span style={{ fontWeight: 500, color: '#475569' }}>{dep.label}</span>
                                    </div>
                                    <div>
                                        {check?.status === 'found' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{check.count} data</span>
                                                <button 
                                                    className="btn btn-ghost btn-xs" 
                                                    style={{ fontSize: '0.7rem', height: 24, padding: '0 0.5rem' }}
                                                    onClick={() => cleanDependency(dep)}
                                                >Bersihkan</button>
                                            </div>
                                        )}
                                        {check?.status === 'cleared' && <span style={{ color: 'var(--color-success)', fontSize: '0.75rem' }}>Bersih</span>}
                                        {check?.status === 'checking' && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Mengecek...</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {error && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: '0.8125rem', display: 'flex', gap: 8 }}>
                            <ShieldAlert size={16} /> {error}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={isDeleting}>Batal</button>
                    <button 
                        className="btn btn-primary" 
                        style={{ background: canDeleteFinal ? 'var(--color-danger)' : '#94a3b8' }}
                        disabled={!canDeleteFinal || isDeleting}
                        onClick={handleDeleteAll}
                    >
                        {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
                    </button>
                </div>
            </div>
        </div>
    )
}

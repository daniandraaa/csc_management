'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, Bell, Clock, BarChart3, RefreshCw, Mail, Send, AlertTriangle, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import '../admin-responsive.css'

export default function PengaturanAdministrasiPage() {
    const [settings, setSettings] = useState({
        late_tolerance_days: 3, max_revisions: 5, target_compliance_score: 80,
        auto_remind_overdue: true, remind_days_before: '7,3,1', reminder_email_to: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [sendingReminders, setSendingReminders] = useState(false)
    const [reminderResult, setReminderResult] = useState<any>(null)
    const [deadlineStatus, setDeadlineStatus] = useState<any>(null)
    const [notifications, setNotifications] = useState<any[]>([])
    const [loadingStatus, setLoadingStatus] = useState(false)

    useEffect(() => { loadSettings(); loadDeadlineStatus() }, [])

    async function loadSettings() {
        setLoading(true)
        const { data } = await supabase.from('admin_settings').select('*').eq('id', 1).single()
        if (data) setSettings({
            late_tolerance_days: data.late_tolerance_days, max_revisions: data.max_revisions,
            target_compliance_score: data.target_compliance_score, auto_remind_overdue: data.auto_remind_overdue,
            remind_days_before: data.remind_days_before || '7,3,1', reminder_email_to: data.reminder_email_to || ''
        })
        setLoading(false)
    }

    async function loadDeadlineStatus() {
        setLoadingStatus(true)
        try {
            const res = await fetch('/api/admin-reminders')
            const data = await res.json()
            setDeadlineStatus(data.deadlines || [])
            setNotifications(data.recent_notifications || [])
        } catch { setDeadlineStatus([]) }
        setLoadingStatus(false)
    }

    async function handleSave() {
        setSaving(true); setSaved(false)
        const { error } = await supabase.from('admin_settings').upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
        setSaving(false)
        if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
        else alert('Gagal menyimpan. Pastikan tabel admin_settings sudah diupdate.')
    }

    async function sendReminders() {
        setSendingReminders(true); setReminderResult(null)
        try {
            const res = await fetch('/api/admin-reminders', { method: 'POST' })
            const data = await res.json()
            setReminderResult(data)
            loadDeadlineStatus()
        } catch (err: any) {
            setReminderResult({ error: err.message })
        }
        setSendingReminders(false)
    }

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Memuat pengaturan...</div>

    const scoreColor = settings.target_compliance_score >= 80 ? '#10b981' : settings.target_compliance_score >= 60 ? '#f59e0b' : '#ef4444'

    const urgencyColor: Record<string, { bg: string, text: string, label: string }> = {
        overdue: { bg: '#fef2f2', text: '#ef4444', label: 'Terlambat' },
        today: { bg: '#fffbeb', text: '#d97706', label: 'Hari Ini' },
        urgent: { bg: '#fff7ed', text: '#ea580c', label: 'Mendesak' },
        upcoming: { bg: '#eff6ff', text: '#3b82f6', label: 'Segera' },
        normal: { bg: '#f0fdf4', text: '#16a34a', label: 'Normal' },
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Pengaturan Administrasi</div></div>
            <div className="page-container" style={{ maxWidth: 900 }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #64748b, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Settings size={20} /></div>
                        Pengaturan
                    </h1>
                    <p className="page-subtitle">Konfigurasi parameter, notifikasi email, dan pengingat deadline.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    {/* LEFT COLUMN: Settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Parameter</h3>

                        {/* Toleransi */}
                        <div className="card" style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Clock size={18} style={{ color: '#f59e0b' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Toleransi Keterlambatan</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Batas sebelum ditandai Overdue</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input type="number" className="form-input" style={{ width: 60, textAlign: 'center', fontWeight: 600, borderRadius: 8, padding: '4px' }} value={settings.late_tolerance_days} onChange={e => setSettings({ ...settings, late_tolerance_days: parseInt(e.target.value) || 0 })} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>hari</span>
                                </div>
                            </div>
                        </div>

                        {/* Max Revisi */}
                        <div className="card" style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <RefreshCw size={18} style={{ color: '#3b82f6' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Batas Revisi Maksimal</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Maks revisi per dokumen</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input type="number" className="form-input" style={{ width: 60, textAlign: 'center', fontWeight: 600, borderRadius: 8, padding: '4px' }} value={settings.max_revisions} onChange={e => setSettings({ ...settings, max_revisions: parseInt(e.target.value) || 0 })} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>kali</span>
                                </div>
                            </div>
                        </div>

                        {/* Target Score */}
                        <div className="card" style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <BarChart3 size={18} style={{ color: '#10b981' }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Target Compliance Score</div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Skor minimal per bidang</div>
                                </div>
                                <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '1.25rem', color: scoreColor }}>{settings.target_compliance_score}%</div>
                            </div>
                            <input type="range" min="0" max="100" style={{ width: '100%', accentColor: scoreColor }} value={settings.target_compliance_score} onChange={e => setSettings({ ...settings, target_compliance_score: parseInt(e.target.value) })} />
                        </div>

                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>📧 Email & Notifikasi</h3>

                        {/* Auto-remind toggle */}
                        <div className="card" style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Bell size={18} style={{ color: '#8b5cf6' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifikasi Email Otomatis</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Kirim pengingat deadline via email</div>
                                    </div>
                                </div>
                                <label style={{ position: 'relative', width: 44, height: 24, display: 'inline-block', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.auto_remind_overdue} onChange={e => setSettings({ ...settings, auto_remind_overdue: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, background: settings.auto_remind_overdue ? '#8b5cf6' : '#cbd5e1', transition: 'background 0.3s' }}>
                                        <span style={{ position: 'absolute', left: settings.auto_remind_overdue ? 22 : 3, top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>

                            {settings.auto_remind_overdue && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8, borderTop: '1px solid var(--color-border-primary)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Kirim reminder pada H-</label>
                                        <input className="form-input" value={settings.remind_days_before} onChange={e => setSettings({ ...settings, remind_days_before: e.target.value })} placeholder="7,3,1" style={{ borderRadius: 8, fontSize: '0.8125rem' }} />
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Pisahkan dengan koma (cth: 7,3,1 = H-7, H-3, H-1)</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Email Tujuan (Override)</label>
                                        <input className="form-input" type="email" value={settings.reminder_email_to} onChange={e => setSettings({ ...settings, reminder_email_to: e.target.value })} placeholder="Kosongkan = email PIC masing-masing" style={{ borderRadius: 8, fontSize: '0.8125rem' }} />
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Jika kosong, email dikirim ke PIC/pengaju dokumen</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {saved && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 500, padding: '4px 12px', background: '#ecfdf5', borderRadius: 8 }}><CheckCircle size={14} /> Tersimpan!</span>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 6, padding: '8px 20px' }}>
                                <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Deadline Monitor & Notifications */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 Monitor Deadline</h3>
                            <button className="btn btn-sm" onClick={sendReminders} disabled={sendingReminders} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {sendingReminders ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                {sendingReminders ? 'Mengirim...' : 'Kirim Reminder'}
                            </button>
                        </div>

                        {/* Result banner */}
                        {reminderResult && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.8125rem', background: reminderResult.error ? '#fef2f2' : '#ecfdf5', color: reminderResult.error ? '#ef4444' : '#10b981', border: `1px solid ${reminderResult.error ? '#fecaca' : '#a7f3d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {reminderResult.error ? <AlertTriangle size={14} /> : <Mail size={14} />}
                                    {reminderResult.error ? `Error: ${reminderResult.error}` : `${reminderResult.sent || 0} email reminder terkirim`}
                                </div>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setReminderResult(null)}><X size={14} /></button>
                            </div>
                        )}

                        {/* Deadline list */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border-primary)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Deadline Aktif</span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{(deadlineStatus || []).length} dokumen</span>
                            </div>
                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {loadingStatus ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>Memuat...</div>
                                ) : !deadlineStatus || deadlineStatus.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>✅ Tidak ada deadline aktif</div>
                                ) : (
                                    deadlineStatus.map((d: any) => {
                                        const u = urgencyColor[d.urgency] || urgencyColor.normal
                                        return (
                                            <div key={d.id} style={{ padding: '8px 1rem', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{d.doc_type} • {d.submitter || '-'}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: u.text }}>{d.days_remaining < 0 ? `+${Math.abs(d.days_remaining)}` : `H-${d.days_remaining}`}</span>
                                                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: u.bg, color: u.text }}>{u.label}</span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Recent Notifications */}
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📨 Riwayat Notifikasi</h3>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>Belum ada notifikasi terkirim</div>
                                ) : (
                                    notifications.map((n: any) => (
                                        <div key={n.id} style={{ padding: '8px 1rem', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: n.notification_type === 'overdue_alert' ? '#fef2f2' : '#f5f3ff', color: n.notification_type === 'overdue_alert' ? '#ef4444' : '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                                <Mail size={13} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.subject}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: 6 }}>
                                                    <span>→ {n.recipient_email}</span>
                                                    <span>•</span>
                                                    <span>{new Date(n.sent_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: n.status === 'sent' ? '#ecfdf5' : '#fef2f2', color: n.status === 'sent' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {n.status === 'sent' ? <Check size={10} /> : <X size={10} />}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

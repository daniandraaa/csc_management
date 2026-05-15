'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, Shield, Bell, Clock, BarChart3, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PengaturanAdministrasiPage() {
    const [settings, setSettings] = useState({ late_tolerance_days: 3, max_revisions: 5, target_compliance_score: 80, auto_remind_overdue: true })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => { loadSettings() }, [])

    async function loadSettings() {
        setLoading(true)
        const { data } = await supabase.from('admin_settings').select('*').eq('id', 1).single()
        if (data) setSettings({ late_tolerance_days: data.late_tolerance_days, max_revisions: data.max_revisions, target_compliance_score: data.target_compliance_score, auto_remind_overdue: data.auto_remind_overdue })
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true); setSaved(false)
        const { error } = await supabase.from('admin_settings').upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
        setSaving(false)
        if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
        else alert('Gagal menyimpan pengaturan. Pastikan tabel admin_settings sudah dibuat di Supabase.')
    }

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Memuat pengaturan...</div>

    const scoreColor = settings.target_compliance_score >= 80 ? '#10b981' : settings.target_compliance_score >= 60 ? '#f59e0b' : '#ef4444'

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Pengaturan Administrasi</div></div>
            <div className="page-container" style={{ maxWidth: 800 }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #64748b, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Settings size={20} /></div>
                        Pengaturan
                    </h1>
                    <p className="page-subtitle">Konfigurasi parameter dan batasan untuk modul administrasi.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Toleransi Keterlambatan */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ width: 56, background: 'linear-gradient(180deg, #fef3c7, #fffbeb)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-primary)', flexShrink: 0 }}>
                                <Clock size={22} color="#f59e0b" />
                            </div>
                            <div style={{ flex: 1, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 4 }}>Toleransi Keterlambatan</h4>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>Batas waktu maksimal keterlambatan penyerahan dokumen sebelum ditandai Overdue.</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="number" className="form-input" style={{ width: 72, textAlign: 'center', fontWeight: 600, borderRadius: 10 }} value={settings.late_tolerance_days} onChange={e => setSettings({...settings, late_tolerance_days: parseInt(e.target.value) || 0})} />
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>hari</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Batas Revisi */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ width: 56, background: 'linear-gradient(180deg, #dbeafe, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-primary)', flexShrink: 0 }}>
                                <RefreshCw size={22} color="#3b82f6" />
                            </div>
                            <div style={{ flex: 1, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 4 }}>Batas Revisi Maksimal</h4>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>Jumlah maksimal revisi yang diizinkan untuk satu dokumen.</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="number" className="form-input" style={{ width: 72, textAlign: 'center', fontWeight: 600, borderRadius: 10 }} value={settings.max_revisions} onChange={e => setSettings({...settings, max_revisions: parseInt(e.target.value) || 0})} />
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>kali</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Target Compliance */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ width: 56, background: 'linear-gradient(180deg, #ecfdf5, #f0fdf4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-primary)', flexShrink: 0 }}>
                                <BarChart3 size={22} color="#10b981" />
                            </div>
                            <div style={{ flex: 1, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, marginRight: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 4 }}>Target Compliance Score</h4>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: '0 0 12px 0' }}>Skor minimal kepatuhan administrasi yang harus dicapai oleh setiap bidang.</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <input type="range" min="0" max="100" style={{ flex: 1, accentColor: scoreColor }} value={settings.target_compliance_score} onChange={e => setSettings({...settings, target_compliance_score: parseInt(e.target.value)})} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}><span>0</span><span>50</span><span>100</span></div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 12, background: `${scoreColor}10`, border: `1px solid ${scoreColor}30`, minWidth: 64 }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: scoreColor }}>{settings.target_compliance_score}</div>
                                        <div style={{ fontSize: '0.6875rem', color: scoreColor, fontWeight: 500 }}>%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifikasi */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ width: 56, background: 'linear-gradient(180deg, #f5f3ff, #faf5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-primary)', flexShrink: 0 }}>
                                <Bell size={22} color="#8b5cf6" />
                            </div>
                            <div style={{ flex: 1, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 4 }}>Notifikasi Otomatis</h4>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>Kirim pengingat otomatis untuk dokumen yang melewati deadline.</p>
                                    </div>
                                    <label style={{ position: 'relative', width: 48, height: 26, display: 'inline-block', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={settings.auto_remind_overdue} onChange={e => setSettings({...settings, auto_remind_overdue: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 13, background: settings.auto_remind_overdue ? '#8b5cf6' : '#cbd5e1', transition: 'background 0.3s' }}>
                                            <span style={{ position: 'absolute', left: settings.auto_remind_overdue ? 24 : 3, top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                    {saved && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 500, padding: '6px 14px', background: '#ecfdf5', borderRadius: 8, animation: 'fadeIn 0.3s ease' }}><CheckCircle size={16} /> Pengaturan tersimpan!</span>}
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 6, padding: '10px 24px' }}>
                        <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </div>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}`}</style>
        </div>
    )
}

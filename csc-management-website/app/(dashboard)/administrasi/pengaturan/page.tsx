'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PengaturanAdministrasiPage() {
    const [settings, setSettings] = useState({
        late_tolerance_days: 3,
        max_revisions: 5,
        target_compliance_score: 80,
        auto_remind_overdue: true
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        setLoading(true)
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .eq('id', 1)
            .single()
        
        if (data) {
            setSettings({
                late_tolerance_days: data.late_tolerance_days,
                max_revisions: data.max_revisions,
                target_compliance_score: data.target_compliance_score,
                auto_remind_overdue: data.auto_remind_overdue
            })
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setSaved(false)
        const { error } = await supabase
            .from('admin_settings')
            .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
        
        setSaving(false)
        if (!error) {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } else {
            alert('Gagal menyimpan pengaturan. Pastikan tabel admin_settings sudah dibuat di Supabase.')
        }
    }

    if (loading) {
        return <div style={{ padding: '3rem', textAlign: 'center' }}>Memuat pengaturan...</div>
    }

    return (
        <div>
            <div className="topbar">
                <div className="topbar-title">Pengaturan Administrasi</div>
            </div>
            <div className="page-container" style={{ maxWidth: 800 }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="page-title">Pengaturan Administrasi</h1>
                    <p className="page-subtitle">Konfigurasi parameter dan batasan untuk modul administrasi.</p>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={20} /> Parameter Umum
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label">Toleransi Keterlambatan (Hari)</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={settings.late_tolerance_days} 
                                onChange={e => setSettings({...settings, late_tolerance_days: parseInt(e.target.value) || 0})}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>Batas waktu maksimal keterlambatan penyerahan dokumen sebelum ditandai Overdue.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Batas Revisi Maksimal</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={settings.max_revisions}
                                onChange={e => setSettings({...settings, max_revisions: parseInt(e.target.value) || 0})}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>Jumlah maksimal revisi yang diizinkan untuk satu dokumen.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Target Compliance Score Minimal (%)</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={settings.target_compliance_score}
                                onChange={e => setSettings({...settings, target_compliance_score: parseInt(e.target.value) || 0})}
                            />
                        </div>
                        
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                id="auto-remind" 
                                checked={settings.auto_remind_overdue}
                                onChange={e => setSettings({...settings, auto_remind_overdue: e.target.checked})}
                            />
                            <label htmlFor="auto-remind" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>Aktifkan Notifikasi Otomatis untuk Dokumen Overdue</label>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        {saved && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}><CheckCircle size={16} /> Tersimpan</span>}
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

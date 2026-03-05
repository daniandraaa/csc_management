'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, Heart, CalendarClock, CheckCircle2 } from 'lucide-react'

export default function OverviewAdvocacyPage() {
    const [activeTab, setActiveTab] = useState<'advocacy' | 'counseling'>('advocacy')
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Advocacy form
    const [advForm, setAdvForm] = useState({ title: '', description: '', category: 'advocacy' as 'advocacy' | 'aspiration' })

    // Counseling form
    const [counselForm, setCounselForm] = useState({ subject: '', description: '', preferred_date: '', preferred_time: '' })

    async function handleAdvocacySubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        await supabase.from('advocacy_aspirations').insert({
            member_id: null, // anonymous
            title: advForm.title,
            description: advForm.description,
            category: advForm.category,
            status: 'pending',
        })
        setSubmitting(false)
        setSubmitted(true)
        setAdvForm({ title: '', description: '', category: 'advocacy' })
    }

    async function handleCounselingSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        await supabase.from('counseling_requests').insert({
            member_id: null, // anonymous
            subject: counselForm.subject,
            description: counselForm.description || null,
            preferred_date: counselForm.preferred_date || null,
            preferred_time: counselForm.preferred_time || null,
            status: 'pending',
        })
        setSubmitting(false)
        setSubmitted(true)
        setCounselForm({ subject: '', description: '', preferred_date: '', preferred_time: '' })
    }

    if (submitted) {
        return (
            <div>
                <div className="topbar"><div className="topbar-title">Pengaduan</div></div>
                <div className="page-container">
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        minHeight: '60vh', textAlign: 'center',
                    }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1.5rem',
                        }}>
                            <CheckCircle2 size={40} style={{ color: '#16a34a' }} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                            Terima Kasih! 🙏
                        </h2>
                        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', maxWidth: 420, lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            Pengaduan Anda telah berhasil dikirim secara anonim. Tim Human Resources akan meninjau dan menindaklanjuti pengaduan Anda.
                        </p>
                        <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
                            Kirim Pengaduan Lain
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="topbar"><div className="topbar-title">Pengaduan</div></div>
            <div className="page-container">
                <h1 className="page-title">Pengaduan Anonim</h1>
                <p className="page-subtitle">Sampaikan advokasi, aspirasi, atau permintaan konseling secara anonim. Identitas Anda tidak akan diketahui.</p>

                {/* Info Banner */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '1rem', borderRadius: 12,
                    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                    border: '1px solid #bfdbfe',
                    marginBottom: '1.5rem',
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <MessageCircle size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e40af' }}>Pengaduan ini bersifat anonim</div>
                        <div style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>Nama dan identitas Anda tidak akan terlihat oleh siapapun.</div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                        className={`btn ${activeTab === 'advocacy' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('advocacy')}
                    >
                        <Heart size={16} /> Advokasi & Aspirasi
                    </button>
                    <button
                        className={`btn ${activeTab === 'counseling' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('counseling')}
                    >
                        <CalendarClock size={16} /> Konseling
                    </button>
                </div>

                <div className="card" style={{ maxWidth: 640 }}>
                    {activeTab === 'advocacy' ? (
                        <form onSubmit={handleAdvocacySubmit}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Formulir Advokasi & Aspirasi</h3>

                            <div className="form-group">
                                <label className="form-label">Kategori *</label>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input type="radio" name="category" value="advocacy" checked={advForm.category === 'advocacy'} onChange={() => setAdvForm({ ...advForm, category: 'advocacy' })} />
                                        Advokasi
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input type="radio" name="category" value="aspiration" checked={advForm.category === 'aspiration'} onChange={() => setAdvForm({ ...advForm, category: 'aspiration' })} />
                                        Aspirasi
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Judul *</label>
                                <input className="form-input" required value={advForm.title} onChange={e => setAdvForm({ ...advForm, title: e.target.value })} placeholder="Judul singkat pengaduan" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Deskripsi *</label>
                                <textarea className="form-textarea" required style={{ minHeight: 150 }} value={advForm.description} onChange={e => setAdvForm({ ...advForm, description: e.target.value })} placeholder="Jelaskan secara detail..." />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                                <Send size={16} /> {submitting ? 'Mengirim...' : 'Kirim Anonim'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleCounselingSubmit}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Formulir Permintaan Konseling</h3>

                            <div className="form-group">
                                <label className="form-label">Subjek / Topik *</label>
                                <input className="form-input" required value={counselForm.subject} onChange={e => setCounselForm({ ...counselForm, subject: e.target.value })} placeholder="Topik yang ingin dibicarakan" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Deskripsi</label>
                                <textarea className="form-textarea" style={{ minHeight: 120 }} value={counselForm.description} onChange={e => setCounselForm({ ...counselForm, description: e.target.value })} placeholder="Deskripsi tambahan (opsional)" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Preferensi</label>
                                    <input className="form-input" type="date" value={counselForm.preferred_date} onChange={e => setCounselForm({ ...counselForm, preferred_date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Waktu Preferensi</label>
                                    <input className="form-input" type="time" value={counselForm.preferred_time} onChange={e => setCounselForm({ ...counselForm, preferred_time: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                                <Send size={16} /> {submitting ? 'Mengirim...' : 'Kirim Anonim'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

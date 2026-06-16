'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, CheckCircle2, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const FAKULTAS = [
    'Fakultas Teknik Elektro',
    'Fakultas Rekayasa Industri', 
    'Fakultas Informatika',
    'Fakultas Ekonomi dan Bisnis',
    'Fakultas Komunikasi dan Bisnis',
    'Fakultas Industri Kreatif',
    'Fakultas Ilmu Terapan',
]

const LINGKAR_OPTIONS = ['Mahasiswa', 'UMKM', 'Komunitas', 'Umum']

export default function DaftarMitraPage() {
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({
        nama: '', nim: '', fakultas: '', prodi: '', whatsapp: '', angkatan: '',
        domisili: '', pengalaman_bisnis: '', lingkar_pertemanan: [] as string[],
        komunitas_aktif: '', estimasi_market: '', kategori_bisnis: '', portfolio_link: '', portfolio_description: '',
        consent_agreed: false,
    })

    function toggleLingkar(val: string) {
        setForm(prev => ({
            ...prev,
            lingkar_pertemanan: prev.lingkar_pertemanan.includes(val)
                ? prev.lingkar_pertemanan.filter(v => v !== val)
                : [...prev.lingkar_pertemanan, val]
        }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.consent_agreed) {
            alert('Anda harus menyetujui pernyataan persetujuan sebelum mendaftar.')
            return
        }
        setSubmitting(true)

        const { error } = await supabase.from('agent_applications').insert({
            nama: form.nama,
            nim: form.nim,
            fakultas: form.fakultas,
            prodi: form.prodi,
            whatsapp: form.whatsapp,
            angkatan: form.angkatan,
            domisili: form.domisili,
            pengalaman_bisnis: form.pengalaman_bisnis,
            lingkar_pertemanan: form.lingkar_pertemanan,
            komunitas_aktif: form.komunitas_aktif || null,
            estimasi_market: form.estimasi_market ? parseInt(form.estimasi_market) : null,
            kategori_bisnis: form.kategori_bisnis,
            portfolio_link: form.portfolio_link || null,
            portfolio_description: form.portfolio_description || null,
            consent_agreed: form.consent_agreed,
        })

        if (error) {
            console.error('Submit error:', error)
            alert('Gagal mengirim pendaftaran. Silakan coba lagi.')
            setSubmitting(false)
            return
        }

        setSubmitted(true)
        setSubmitting(false)
    }

    const inputStyle = {
        width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb',
        fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
    }

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #FFFCF8 0%, #F5EEDC 50%, #EFE5D1 100%)',
                padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif',
            }}>
                <div style={{ position: 'fixed', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 2px 2px, #9A3412 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                <div style={{ position: 'relative', width: '100%', maxWidth: 500, textAlign: 'center' }}>
                    <div style={{
                        background: 'white', borderRadius: 28, padding: '3rem 2rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                        }}>
                            <CheckCircle2 size={40} color="white" />
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                            Pendaftaran Terkirim! 🎉
                        </h1>
                        <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
                            Terima kasih atas minat Anda untuk menjadi Mitra Bisnis CSC. 
                            Tim Bidang Bisnis akan meninjau pendaftaran Anda dan menghubungi via WhatsApp.
                        </p>
                        <Link href="/" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '0.875rem 2rem', borderRadius: 12,
                            background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white',
                            fontWeight: 700, textDecoration: 'none',
                        }}>
                            <ArrowLeft size={16} /> Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFCF8 0%, #F5EEDC 50%, #EFE5D1 100%)',
            padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{ position: 'fixed', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 2px 2px, #9A3412 1px, transparent 0)', backgroundSize: '40px 40px' }} />

            <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem', border: '1px solid #F5EEDC',
                        boxShadow: '0 10px 25px -5px rgba(154, 52, 18, 0.15)',
                    }}><UserPlus size={32} color="#9A3412" /></div>
                    <h1 style={{ color: '#431407', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
                        Pendaftaran Mitra Bisnis CSC
                    </h1>
                    <p style={{ color: '#78350f', fontSize: '0.9375rem', maxWidth: 500, margin: '0 auto' }}>
                        Bergabunglah menjadi mitra bisnis Community Support Center Telkom University
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit}>
                    <div style={{
                        background: 'white', borderRadius: 24, padding: '2rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.04)',
                    }}>
                        {/* Section: Data Pribadi */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
                                Data Pribadi
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nama Lengkap *</label>
                                    <input required value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap sesuai KTM" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>NIM *</label>
                                        <input required value={form.nim} onChange={e => setForm({ ...form, nim: e.target.value })} placeholder="1301XXXXXXX" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Angkatan *</label>
                                        <input required value={form.angkatan} onChange={e => setForm({ ...form, angkatan: e.target.value })} placeholder="2024" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fakultas *</label>
                                        <select required value={form.fakultas} onChange={e => setForm({ ...form, fakultas: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
                                            <option value="">Pilih Fakultas</option>
                                            {FAKULTAS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Program Studi *</label>
                                        <input required value={form.prodi} onChange={e => setForm({ ...form, prodi: e.target.value })} placeholder="S1 Informatika" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>No. WhatsApp Aktif *</label>
                                        <input required type="tel" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="628XXXXXXXXX" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Domisili Saat Ini *</label>
                                        <input required value={form.domisili} onChange={e => setForm({ ...form, domisili: e.target.value })} placeholder="Bandung / Kost sekitar kampus" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '2px dashed #f1f5f9', margin: '2rem 0' }} />

                        {/* Section: Pengalaman & Jaringan */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
                                Pengalaman & Jaringan
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                        Apakah Anda pernah terjun di dunia bisnis/penjualan? *
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {['Ya', 'Tidak'].map(opt => (
                                            <label key={opt} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '0.625rem 1.25rem', borderRadius: 12,
                                                border: form.pengalaman_bisnis === opt.toLowerCase() ? '2px solid #9A3412' : '2px solid #e5e7eb',
                                                background: form.pengalaman_bisnis === opt.toLowerCase() ? '#FFFCF8' : 'white',
                                                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                                                transition: 'all 0.2s',
                                            }}>
                                                <input type="radio" name="pengalaman" value={opt.toLowerCase()} checked={form.pengalaman_bisnis === opt.toLowerCase()} onChange={e => setForm({ ...form, pengalaman_bisnis: e.target.value })} style={{ accentColor: '#9A3412' }} />
                                                {opt}
                                            </label>
                                        ))}
                                        <div style={{ flex: 1, minWidth: 180 }}>
                                            <input
                                                placeholder="Lainnya (ketik di sini)"
                                                value={!['ya', 'tidak'].includes(form.pengalaman_bisnis) ? form.pengalaman_bisnis : ''}
                                                onChange={e => setForm({ ...form, pengalaman_bisnis: e.target.value })}
                                                style={{ ...inputStyle, padding: '0.625rem 1rem' }}
                                                onFocus={e => e.target.style.borderColor = '#9A3412'}
                                                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                        Lingkar Pertemanan Dominan (pilih yang sesuai) *
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {LINGKAR_OPTIONS.map(opt => (
                                            <label key={opt} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '0.625rem 1rem', borderRadius: 10,
                                                border: form.lingkar_pertemanan.includes(opt) ? '2px solid #9A3412' : '2px solid #e5e7eb',
                                                background: form.lingkar_pertemanan.includes(opt) ? '#FFFCF8' : 'white',
                                                cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
                                                transition: 'all 0.2s',
                                            }}>
                                                <input type="checkbox" checked={form.lingkar_pertemanan.includes(opt)} onChange={() => toggleLingkar(opt)} style={{ accentColor: '#9A3412' }} />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Aktif di komunitas apa?</label>
                                    <input value={form.komunitas_aktif} onChange={e => setForm({ ...form, komunitas_aktif: e.target.value })} placeholder="cth: BEM, HMIF, UKM Olahraga, dll" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Estimasi calon market yang bisa Anda hubungi dalam 7 hari pertama (jumlah orang) *</label>
                                    <input required type="number" min="0" value={form.estimasi_market} onChange={e => setForm({ ...form, estimasi_market: e.target.value })} placeholder="cth: 50" style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Kategori Bisnis yang Diminati / Dijalankan *</label>
                                    <select required value={form.kategori_bisnis} onChange={e => setForm({ ...form, kategori_bisnis: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
                                        <option value="">Pilih Kategori Bisnis</option>
                                        {['Fashion', 'F&B (Food & Beverage)', 'Service (Jasa)', 'Digital Tech', 'Lainnya'].map(k => (
                                            <option key={k} value={k}>{k}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '2px dashed #f1f5f9', margin: '2rem 0' }} />

                        {/* Section: Portofolio */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</span>
                                Portofolio Mitra Bisnis
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>
                                Upload link dokumen portofolio Anda (Dokumen, link, screenshot, konten, CV, hasil penjualan sebelumnya, dll). 
                                Bisa menggunakan Google Drive, Notion, atau platform lainnya.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Link Portofolio</label>
                                    <input type="url" value={form.portfolio_link} onChange={e => setForm({ ...form, portfolio_link: e.target.value })} placeholder="https://drive.google.com/..." style={inputStyle} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Jelaskan singkat isi portofolio</label>
                                    <textarea value={form.portfolio_description} onChange={e => setForm({ ...form, portfolio_description: e.target.value })} placeholder="Jelaskan apa saja yang ada di portofolio Anda..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#9A3412'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '2px dashed #f1f5f9', margin: '2rem 0' }} />

                        {/* Consent */}
                        <div style={{
                            background: 'linear-gradient(135deg, #FFFCF8, #fef3c7)', borderRadius: 16,
                            padding: '1.5rem', border: '1px solid #fde68a', marginBottom: '1.5rem',
                        }}>
                            <h3 style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.75rem', fontSize: '0.9375rem' }}>
                                ⚠️ Pernyataan Persetujuan
                            </h3>
                            <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.7, marginBottom: '1rem' }}>
                                Dengan mengisi formulir ini, saya menyatakan bahwa:
                            </p>
                            <ul style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.7, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
                                <li>Data yang saya berikan adalah benar dan dapat dipertanggungjawabkan</li>
                                <li>Saya bersedia untuk mengikuti proses seleksi dan wawancara jika diperlukan</li>
                                <li>Saya memahami bahwa data pribadi saya akan dikelola sesuai kebijakan privasi CSC Telkom University</li>
                                <li>Saya berkomitmen untuk menjalankan tugas sebagai mitra bisnis dengan penuh tanggung jawab</li>
                                <li>Saya bersedia mematuhi aturan dan SOP yang berlaku di CSC</li>
                            </ul>
                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#92400e',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={form.consent_agreed}
                                    onChange={e => setForm({ ...form, consent_agreed: e.target.checked })}
                                    style={{ accentColor: '#9A3412', marginTop: 3 }}
                                />
                                Saya menyetujui semua pernyataan di atas
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || !form.consent_agreed || !form.nama || !form.nim || !form.fakultas || !form.prodi || !form.whatsapp || !form.angkatan || !form.domisili || !form.pengalaman_bisnis || form.lingkar_pertemanan.length === 0 || !form.kategori_bisnis}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '1rem', borderRadius: 14, border: 'none',
                                background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white',
                                fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(154, 52, 18, 0.3)',
                                transition: 'all 0.2s',
                                opacity: (submitting || !form.consent_agreed || !form.nama || !form.nim) ? 0.5 : 1,
                            }}
                        >
                            {submitting ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran'} <Sparkles size={18} />
                        </button>
                    </div>
                </form>

                <p style={{ textAlign: 'center', color: '#78350f', opacity: 0.5, fontSize: '0.75rem', marginTop: '1.5rem' }}>
                    &copy; {new Date().getFullYear()} Community Support Center Telkom University
                </p>
            </div>
        </div>
    )
}

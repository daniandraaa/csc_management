'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, ArrowRight, Copy, ExternalLink, Zap, Briefcase } from 'lucide-react'
import Link from 'next/link'

const STEPS = ['Jenis Layanan', 'Pilih Layanan', 'Data Diri', 'Konfirmasi']

export default function OrderFormPage() {
    const [step, setStep] = useState(0)
    const [serviceType, setServiceType] = useState<'event_fulfilment' | 'business' | ''>('')
    const [services, setServices] = useState<any[]>([])
    const [selectedService, setSelectedService] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [trackingCode, setTrackingCode] = useState('')
    const [copied, setCopied] = useState(false)
    const [form, setForm] = useState({
        client_name: '', client_email: '', client_phone: '', client_org: '',
        project_title: '', description: ''
    })

    useEffect(() => {
        if (serviceType) loadServices()
    }, [serviceType])

    async function loadServices() {
        setLoading(true)
        const { data } = await supabase.from('service_categories')
            .select('*')
            .eq('type', serviceType)
            .eq('is_active', true)
            .order('name')
        setServices(data || [])
        setLoading(false)
    }

    async function handleSubmit() {
        setSubmitting(true)
        const code = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase()

        const { error } = await supabase.from('external_orders').insert({
            tracking_code: code,
            client_name: form.client_name,
            client_email: form.client_email,
            client_phone: form.client_phone,
            client_org: form.client_org,
            project_title: form.project_title || selectedService?.name,
            description: form.description,
            service_category_id: selectedService?.id || null,
            service_type: serviceType || null,
            status: 'pending',
            source: 'external_form',
        })

        if (error) {
            console.error('Submit error:', error)
            alert('Gagal mengirim pesanan. Silakan coba lagi.')
            setSubmitting(false)
            return
        }

        setTrackingCode(code)
        setStep(4) // success
        setSubmitting(false)
    }

    function copyCode() {
        navigator.clipboard.writeText(trackingCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const formatPrice = (price: number | null, note: string | null) => {
        if (!price) return note || 'Hubungi kami'
        return `Rp ${price.toLocaleString('id-ID')}${note ? ` / ${note}` : ''}`
    }

    // Success screen
    if (step === 4) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #FFFCF8 0%, #F5EEDC 50%, #EFE5D1 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                            animation: 'pulse 2s ease-in-out infinite',
                        }}>
                            <CheckCircle2 size={40} color="white" />
                        </div>

                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                            Pesanan Terkirim! 🎉
                        </h1>
                        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                            Pesanan Anda telah berhasil dikirim. Tim CSC akan segera meninjau pesanan Anda.
                        </p>

                        <div style={{
                            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                            borderRadius: 16, padding: '1.5rem',
                            border: '2px dashed #cbd5e1', marginBottom: '2rem',
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                                Kode Resi Anda
                            </div>
                            <div style={{
                                fontSize: '2rem', fontWeight: 900, color: '#9A3412',
                                fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '0.75rem',
                            }}>
                                {trackingCode}
                            </div>
                            <button
                                onClick={copyCode}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '0.5rem 1.25rem', borderRadius: 10,
                                    border: 'none', cursor: 'pointer',
                                    background: copied ? '#10b981' : '#9A3412', color: 'white',
                                    fontWeight: 600, fontSize: '0.875rem',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Copy size={14} /> {copied ? 'Tersalin!' : 'Salin Kode'}
                            </button>
                        </div>

                        <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                            Simpan kode resi ini untuk melacak status pesanan Anda
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Link href={`/order-monitoring`} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '0.875rem', borderRadius: 12,
                                background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white',
                                fontWeight: 700, textDecoration: 'none', fontSize: '0.9375rem',
                            }}>
                                Lacak Pesanan <ExternalLink size={16} />
                            </Link>
                            <Link href="/order" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '0.75rem', borderRadius: 12,
                                background: 'transparent', color: '#9A3412',
                                fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem',
                                border: '1px solid #e7e5e4',
                            }}>
                                Buat Pesanan Baru
                            </Link>
                        </div>
                    </div>

                    <p style={{ textAlign: 'center', color: '#78350f', opacity: 0.5, fontSize: '0.75rem', marginTop: '1.5rem' }}>
                        &copy; {new Date().getFullYear()} Community Support Center Telkom University
                    </p>
                </div>

                <style jsx global>{`
                    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                `}</style>
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

            <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem', border: '1px solid #F5EEDC',
                        boxShadow: '0 10px 25px -5px rgba(154, 52, 18, 0.15)',
                    }}><Package size={32} color="#9A3412" /></div>
                    <h1 style={{ color: '#431407', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
                        Pemesanan Layanan CSC
                    </h1>
                    <p style={{ color: '#78350f', fontSize: '0.9375rem' }}>
                        Pesan layanan Community Support Center Telkom University
                    </p>
                </div>

                {/* Stepper */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
                    marginBottom: '2rem', padding: '0 1rem',
                }}>
                    {STEPS.map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: i <= step ? 'linear-gradient(135deg, #9A3412, #7C2D12)' : '#e7e5e4',
                                    color: i <= step ? 'white' : '#a8a29e',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8125rem', fontWeight: 700,
                                    transition: 'all 0.3s ease',
                                    boxShadow: i <= step ? '0 4px 10px rgba(154, 52, 18, 0.25)' : 'none',
                                }}>
                                    {i < step ? '✓' : i + 1}
                                </div>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 600,
                                    color: i <= step ? '#431407' : '#a8a29e',
                                    display: i === step ? 'block' : 'none',
                                }}>{s}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{
                                    width: 40, height: 2, margin: '0 6px',
                                    background: i < step ? '#9A3412' : '#e7e5e4',
                                    borderRadius: 1, transition: 'all 0.3s ease',
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Main Card */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: '2rem',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.04)',
                }}>
                    {/* Step 0: Service Type */}
                    {step === 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                Pilih Jenis Layanan
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                CSC menyediakan dua kategori layanan utama
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => { setServiceType('event_fulfilment'); setSelectedService(null); setStep(1) }}
                                    style={{
                                        padding: '1.75rem 1.5rem', borderRadius: 20, border: '2px solid #f1f5f9',
                                        background: 'linear-gradient(135deg, #fef7ff 0%, #f5f3ff 100%)',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s ease',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(139, 92, 246, 0.12)' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                                >
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 16,
                                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: '1rem', boxShadow: '0 6px 12px rgba(109, 40, 217, 0.25)',
                                    }}>
                                        <Zap size={24} color="white" />
                                    </div>
                                    <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem', fontSize: '1.0625rem' }}>
                                        Event Fulfilment
                                    </h3>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                                        Jasa MC, dokumentasi, desain, dekorasi, live streaming, dll.
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '1rem', color: '#8b5cf6', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        Pilih <ArrowRight size={14} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => { setServiceType('business'); setSelectedService(null); setStep(1) }}
                                    style={{
                                        padding: '1.75rem 1.5rem', borderRadius: 20, border: '2px solid #f1f5f9',
                                        background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s ease',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#14b8a6'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(20, 184, 166, 0.12)' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                                >
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 16,
                                        background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: '1rem', boxShadow: '0 6px 12px rgba(13, 148, 136, 0.25)',
                                    }}>
                                        <Briefcase size={24} color="white" />
                                    </div>
                                    <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem', fontSize: '1.0625rem' }}>
                                        Business
                                    </h3>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                                        Titip jual, sponsorship, kerjasama branding UKM, dll.
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '1rem', color: '#14b8a6', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        Pilih <ArrowRight size={14} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                Pilih Layanan {serviceType === 'event_fulfilment' ? 'Event Fulfilment' : 'Business'}
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Pilih layanan yang sesuai dengan kebutuhan Anda
                            </p>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat layanan...</div>
                            ) : services.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Belum ada layanan tersedia untuk kategori ini.</p>
                                    <button className="btn btn-secondary" onClick={() => setStep(0)}>Kembali</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {services.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setSelectedService(s); setForm(f => ({ ...f, project_title: s.name })) }}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '1rem 1.25rem', borderRadius: 14,
                                                border: selectedService?.id === s.id ? '2px solid #9A3412' : '2px solid #f1f5f9',
                                                background: selectedService?.id === s.id ? '#FFFCF8' : 'white',
                                                cursor: 'pointer', textAlign: 'left',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{s.name}</div>
                                                {s.description && <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{s.description}</div>}
                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem', fontWeight: 700,
                                                color: s.price ? '#9A3412' : '#64748b',
                                                whiteSpace: 'nowrap', marginLeft: '1rem',
                                            }}>
                                                {formatPrice(s.price, s.price_note)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Client Data */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                Data Pemesan
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Lengkapi informasi Anda untuk pemesanan
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nama Lengkap *</label>
                                    <input
                                        type="text" required value={form.client_name}
                                        onChange={e => setForm({ ...form, client_name: e.target.value })}
                                        placeholder="Nama lengkap Anda"
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#9A3412'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email *</label>
                                        <input
                                            type="email" required value={form.client_email}
                                            onChange={e => setForm({ ...form, client_email: e.target.value })}
                                            placeholder="email@contoh.com"
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                            onFocus={e => e.target.style.borderColor = '#9A3412'}
                                            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>No. WhatsApp *</label>
                                        <input
                                            type="tel" required value={form.client_phone}
                                            onChange={e => setForm({ ...form, client_phone: e.target.value })}
                                            placeholder="628XXXXXXXXX"
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                            onFocus={e => e.target.style.borderColor = '#9A3412'}
                                            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Organisasi / Instansi</label>
                                    <input
                                        type="text" value={form.client_org}
                                        onChange={e => setForm({ ...form, client_org: e.target.value })}
                                        placeholder="Nama organisasi, UKM, atau instansi"
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#9A3412'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Deskripsi Kebutuhan *</label>
                                    <textarea
                                        required value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Jelaskan secara detail kebutuhan Anda, termasuk tanggal, lokasi, dan spesifikasi lainnya..."
                                        rows={4}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        onFocus={e => e.target.style.borderColor = '#9A3412'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                Konfirmasi Pesanan
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Pastikan semua informasi sudah benar sebelum mengirim
                            </p>

                            <div style={{
                                background: '#f8fafc', borderRadius: 16, padding: '1.5rem',
                                border: '1px solid #e2e8f0', marginBottom: '1.5rem',
                            }}>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jenis Layanan</div>
                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                                            {serviceType === 'event_fulfilment' ? '⚡ Event Fulfilment' : '💼 Business'}
                                        </div>
                                    </div>
                                    {selectedService && (
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Layanan</div>
                                            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                                                {selectedService.name}
                                                {selectedService.price && <span style={{ color: '#9A3412', marginLeft: 8 }}>{formatPrice(selectedService.price, selectedService.price_note)}</span>}
                                            </div>
                                        </div>
                                    )}
                                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b', marginTop: 2 }}>{form.client_name}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b', marginTop: 2 }}>{form.client_email}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b', marginTop: 2 }}>{form.client_phone}</div>
                                        </div>
                                        {form.client_org && (
                                            <div>
                                                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organisasi</div>
                                                <div style={{ fontWeight: 500, color: '#1e293b', marginTop: 2 }}>{form.client_org}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi</div>
                                        <div style={{ fontWeight: 500, color: '#475569', marginTop: 2, fontSize: '0.875rem', lineHeight: 1.6 }}>{form.description}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {step < 4 && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9',
                        }}>
                            <button
                                onClick={() => setStep(Math.max(0, step - 1))}
                                disabled={step === 0}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '0.75rem 1.25rem', borderRadius: 12,
                                    border: '1px solid #e7e5e4', background: 'white', color: '#57534e',
                                    fontWeight: 600, fontSize: '0.875rem', cursor: step === 0 ? 'not-allowed' : 'pointer',
                                    opacity: step === 0 ? 0.4 : 1, transition: 'all 0.2s',
                                }}
                            >
                                <ChevronLeft size={16} /> Kembali
                            </button>

                            {step === 3 ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '0.75rem 2rem', borderRadius: 12, border: 'none',
                                        background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white',
                                        fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                                        boxShadow: '0 6px 15px rgba(154, 52, 18, 0.3)',
                                        transition: 'all 0.2s', opacity: submitting ? 0.7 : 1,
                                    }}
                                >
                                    {submitting ? 'Mengirim...' : 'Kirim Pesanan'} <Sparkles size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={
                                        (step === 0 && !serviceType) ||
                                        (step === 1 && !selectedService) ||
                                        (step === 2 && (!form.client_name || !form.client_email || !form.client_phone || !form.description))
                                    }
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none',
                                        background: 'linear-gradient(135deg, #9A3412, #7C2D12)', color: 'white',
                                        fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: (
                                            (step === 0 && !serviceType) ||
                                            (step === 1 && !selectedService) ||
                                            (step === 2 && (!form.client_name || !form.client_email || !form.client_phone || !form.description))
                                        ) ? 0.4 : 1,
                                    }}
                                >
                                    Lanjut <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Links */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <Link href="/order-monitoring" style={{ color: '#78350f', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Sudah punya kode resi? Lacak di sini <ChevronRight size={14} />
                    </Link>
                </div>

                <p style={{ textAlign: 'center', color: '#78350f', opacity: 0.5, fontSize: '0.75rem', marginTop: '1rem' }}>
                    &copy; {new Date().getFullYear()} Community Support Center Telkom University
                </p>
            </div>
        </div>
    )
}

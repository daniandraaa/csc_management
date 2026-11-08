'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/auth'
import { Season } from '@/lib/types'
import { 
    CalendarClock, 
    Plus, 
    CheckCircle2, 
    Archive, 
    ShieldAlert, 
    Building2, 
    Users, 
    Settings2, 
    ArrowRight, 
    Layers, 
    Sliders,
    Sparkles,
    Lock
} from 'lucide-react'

export default function SeasonsManagementPage() {
    const { currentUser, currentSeason, availableSeasons, switchSeason } = useCurrentUser()
    const [seasons, setSeasons] = useState<Season[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Form State
    const [name, setName] = useState('')
    const [cabinetName, setCabinetName] = useState('')
    const [motto, setMotto] = useState('')
    const [yearStart, setYearStart] = useState<number>(new Date().getFullYear())
    const [yearEnd, setYearEnd] = useState<number>(new Date().getFullYear() + 1)
    const [themeColor, setThemeColor] = useState('#991b1b')

    const isBOEOrAdmin = currentUser?.role === 'BOE' || currentUser?.role === 'Administration'

    async function loadSeasons() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('seasons')
                .select('*')
                .order('year_start', { ascending: false })

            if (!error && data) {
                setSeasons(data as Season[])
            } else {
                setSeasons(availableSeasons)
            }
        } catch (e) {
            console.error('Error loading seasons:', e)
            setSeasons(availableSeasons)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadSeasons()
    }, [])

    async function handleCreateSeason(e: React.FormEvent) {
        e.preventDefault()
        setErrorMsg('')
        setSuccessMsg('')
        setCreating(true)

        if (!name.trim() || !cabinetName.trim()) {
            setErrorMsg('Nama periode dan nama kabinet wajib diisi!')
            setCreating(false)
            return
        }

        try {
            const newSeasonPayload = {
                name: name.trim(),
                cabinet_name: cabinetName.trim(),
                motto: motto.trim() || null,
                year_start: Number(yearStart),
                year_end: Number(yearEnd),
                theme_color: themeColor,
                is_active: false,
                status: 'planning',
                feature_flags: {
                    counseling: true,
                    advocacy: true,
                    kpi: true,
                    logbook: true,
                    finance: true,
                    mitra_portal: true,
                    content_request: true,
                    pr_request: true,
                    operating_systems: true,
                    sop_ai: true
                }
            }

            const { data, error } = await supabase
                .from('seasons')
                .insert([newSeasonPayload])
                .select()
                .single()

            if (error) throw error

            setSuccessMsg(`Kabinet "${cabinetName}" berhasil dibuat!`)
            setShowCreateModal(false)
            setName('')
            setCabinetName('')
            setMotto('')
            await loadSeasons()
        } catch (err: any) {
            setErrorMsg(err.message || 'Gagal membuat periode season baru')
        }
        setCreating(false)
    }

    async function handleSetActive(seasonId: string, cName: string) {
        if (!confirm(`Apakah Anda yakin ingin menetapkan "${cName}" sebagai KABINET AKTIF utama organisasi?`)) return

        try {
            // 1. Set all to false
            await supabase.from('seasons').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
            // 2. Set chosen to true
            await supabase.from('seasons').update({ is_active: true, status: 'active' }).eq('id', seasonId)
            
            await switchSeason(seasonId)
            await loadSeasons()
            alert(`Kabinet "${cName}" sekarang aktif sebagai kepengurusan resmi!`)
        } catch (e: any) {
            alert('Gagal mengubah kabinet aktif: ' + e.message)
        }
    }

    async function handleToggleArchive(seasonId: string, currentStatus: string, cName: string) {
        const nextStatus = currentStatus === 'archived' ? 'active' : 'archived'
        if (!confirm(`Ubah status "${cName}" menjadi ${nextStatus.toUpperCase()}?`)) return

        try {
            await supabase
                .from('seasons')
                .update({ 
                    status: nextStatus,
                    archived_at: nextStatus === 'archived' ? new Date().toISOString() : null,
                    is_active: nextStatus === 'archived' ? false : undefined
                })
                .eq('id', seasonId)

            await loadSeasons()
        } catch (e: any) {
            alert('Gagal update status arsip: ' + e.message)
        }
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                gap: '1rem', marginBottom: '2rem',
                borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #991b1b, #b91c1c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                        }}>
                            <CalendarClock size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                Manajemen Periode & Seasons
                            </h1>
                            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                                Tata kelola multi-season kepengurusan & pergantian kabinet berkelanjutan CSC Telkom University
                            </p>
                        </div>
                    </div>
                </div>

                {isBOEOrAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.625rem 1.25rem', borderRadius: '0.75rem',
                            background: '#991b1b', color: '#fff', border: 'none',
                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(153, 27, 27, 0.25)'
                        }}
                    >
                        <Plus size={18} />
                        Buka Kabinet / Season Baru
                    </button>
                )}
            </div>

            {/* Notification */}
            {successMsg && (
                <div style={{
                    padding: '0.875rem 1rem', background: '#dcfce7', border: '1px solid #86efac',
                    borderRadius: '0.75rem', color: '#15803d', marginBottom: '1.5rem',
                    fontSize: '0.875rem', fontWeight: 600
                }}>
                    ✓ {successMsg}
                </div>
            )}

            {/* Current Active Season Highlight Card */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '1.25rem', padding: '1.75rem', color: '#fff',
                marginBottom: '2.5rem', position: 'relative', overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)'
            }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '9999px',
                            background: '#22c55e', color: '#fff', fontSize: '0.75rem', fontWeight: 700
                        }}>
                            KABINET AKTIF SAAT INI
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                            Tahun Bakti {currentSeason?.year_start} — {currentSeason?.year_end}
                        </span>
                    </div>

                    <h2 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                        {currentSeason?.cabinet_name || 'Kabinet Dormant Sparks'}
                    </h2>
                    <p style={{ fontSize: '1rem', color: '#cbd5e1', fontStyle: 'italic', margin: '0 0 1.5rem 0' }}>
                        "{currentSeason?.motto || 'The Dormants of Impactful Sparks Ecosystem'}"
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 size={16} color="#38bdf8" />
                            <span>Status: <strong style={{ color: '#fff' }}>Operasional Penuh</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sliders size={16} color="#f59e0b" />
                            <span>Isolasi Data: <strong style={{ color: '#fff' }}>Terenkapsulasi Aktif</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List of All Seasons */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#334155', marginBottom: '1rem' }}>
                    Daftar Semua Periode Kepengurusan (Arsip & Aktif)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                    {seasons.map((s) => {
                        const isSelected = currentSeason?.id === s.id
                        return (
                            <div
                                key={s.id}
                                style={{
                                    border: isSelected ? '2px solid #991b1b' : '1px solid #e2e8f0',
                                    borderRadius: '1rem', padding: '1.25rem', background: '#fff',
                                    boxShadow: isSelected ? '0 8px 20px rgba(153, 27, 27, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                            {s.year_start}/{s.year_end} • {s.name}
                                        </span>
                                        {s.is_active ? (
                                            <span style={{
                                                padding: '0.2rem 0.5rem', borderRadius: '9999px',
                                                background: '#dcfce7', color: '#16a34a', fontSize: '0.6875rem', fontWeight: 700
                                            }}>
                                                Aktif
                                            </span>
                                        ) : s.status === 'archived' ? (
                                            <span style={{
                                                padding: '0.2rem 0.5rem', borderRadius: '9999px',
                                                background: '#f1f5f9', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600
                                            }}>
                                                Arsip Historis
                                            </span>
                                        ) : (
                                            <span style={{
                                                padding: '0.2rem 0.5rem', borderRadius: '9999px',
                                                background: '#fef3c7', color: '#d97706', fontSize: '0.6875rem', fontWeight: 600
                                            }}>
                                                Persiapan
                                            </span>
                                        )}
                                    </div>

                                    <h4 style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                                        {s.cabinet_name}
                                    </h4>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0', minHeight: '2.4rem' }}>
                                        {s.motto || 'Tidak ada motto resmi'}
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => switchSeason(s.id)}
                                            style={{
                                                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                                                background: isSelected ? '#991b1b' : '#f8fafc',
                                                color: isSelected ? '#fff' : '#334155',
                                                border: isSelected ? 'none' : '1px solid #cbd5e1',
                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            {isSelected ? '✓ Sedang Dilihat' : 'Masuk ke Periode Ini'}
                                        </button>

                                        {isBOEOrAdmin && !s.is_active && (
                                            <button
                                                onClick={() => handleSetActive(s.id, s.cabinet_name)}
                                                title="Jadikan kabinet aktif utama"
                                                style={{
                                                    padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                                                    background: '#ecfdf5', color: '#059669',
                                                    border: '1px solid #a7f3d0', fontSize: '0.75rem',
                                                    fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                Jadikan Aktif
                                            </button>
                                        )}

                                        {isBOEOrAdmin && !s.is_active && (
                                            <button
                                                onClick={() => handleToggleArchive(s.id, s.status, s.cabinet_name)}
                                                title="Ubah status arsip"
                                                style={{
                                                    padding: '0.5rem 0.6rem', borderRadius: '0.5rem',
                                                    background: '#f8fafc', color: '#64748b',
                                                    border: '1px solid #cbd5e1', fontSize: '0.75rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Archive size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modal Create New Season */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: 520,
                        padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                                Buka Kabinet / Season Baru
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        {errorMsg && (
                            <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateSeason}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                    Nama Kabinet Baru *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Kabinet Sinergi / Kabinet Akselerasi"
                                    value={cabinetName}
                                    onChange={(e) => setCabinetName(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                        border: '1px solid #cbd5e1', fontSize: '0.875rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                    Nama Periode (Tahun) *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Periode 2026/2027"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                        border: '1px solid #cbd5e1', fontSize: '0.875rem'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                        Tahun Mulai
                                    </label>
                                    <input
                                        type="number"
                                        value={yearStart}
                                        onChange={(e) => setYearStart(Number(e.target.value))}
                                        required
                                        style={{
                                            width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1', fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                        Tahun Selesai
                                    </label>
                                    <input
                                        type="number"
                                        value={yearEnd}
                                        onChange={(e) => setYearEnd(Number(e.target.value))}
                                        required
                                        style={{
                                            width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1', fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                    Motto / Visi Kepengurusan
                                </label>
                                <textarea
                                    placeholder="Contoh: Bersama Mewujudkan Ekosistem Bisnis Terdepan"
                                    value={motto}
                                    onChange={(e) => setMotto(e.target.value)}
                                    rows={2}
                                    style={{
                                        width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                        border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{
                                        padding: '0.625rem 1rem', borderRadius: '0.5rem',
                                        background: '#f1f5f9', color: '#475569', border: 'none',
                                        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    style={{
                                        padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                                        background: '#991b1b', color: '#fff', border: 'none',
                                        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                                        opacity: creating ? 0.7 : 1
                                    }}
                                >
                                    {creating ? 'Menyimpan...' : 'Simpan Kabinet Baru'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

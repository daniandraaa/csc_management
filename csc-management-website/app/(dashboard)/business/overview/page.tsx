'use client'

import { Handshake, TrendingUp, Users, Globe } from 'lucide-react'

export default function BusinessOverviewPage() {
    return (
        <div>
            <div className="topbar"><div className="topbar-title">Business Overview</div></div>
            <div className="page-container">
                <h1 className="page-title">Business Overview</h1>
                <p className="page-subtitle">Gambaran keseluruhan bisnis CSC Telkom University</p>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><Handshake size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>6</div><div className="stat-label">Mitra Aktif</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}><TrendingUp size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-info)' }}>3</div><div className="stat-label">Prospek Baru</div></div></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}><Globe size={20} /></div><div><div className="stat-value" style={{ color: 'var(--color-warning)' }}>12</div><div className="stat-label">Total Partnership</div></div></div>
                </div>

                <div className="card" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Tentang CSC Business</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                        Community Support Center (CSC) Telkom University merupakan organisasi yang berfokus pada pengembangan komunitas dan dukungan mahasiswa.
                        Divisi Business bertanggung jawab untuk mengelola seluruh kemitraan bisnis, mengembangkan peluang bisnis baru,
                        dan memastikan keberlanjutan finansial organisasi melalui kolaborasi strategis dengan berbagai pihak.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>🎯 Fokus Utama</h3>
                        <ul style={{ fontSize: '0.875rem', lineHeight: 2, color: 'var(--color-text-secondary)', paddingLeft: '1.25rem' }}>
                            <li>Pengembangan kemitraan strategis</li>
                            <li>Event sponsorship management</li>
                            <li>Business development & outreach</li>
                            <li>Revenue generation untuk organisasi</li>
                        </ul>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>📊 Target Semester Ini</h3>
                        <ul style={{ fontSize: '0.875rem', lineHeight: 2, color: 'var(--color-text-secondary)', paddingLeft: '1.25rem' }}>
                            <li>Menambah 5 mitra bisnis baru</li>
                            <li>Mempertahankan mitra yang ada</li>
                            <li>Meningkatkan revenue 20%</li>
                            <li>Ekspansi ke sektor baru</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

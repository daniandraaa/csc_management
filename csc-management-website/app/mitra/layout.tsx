'use client'

import { MitraAuthProvider } from '@/lib/mitra-auth'
import { LayoutDashboard, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentMitra } from '@/lib/mitra-auth'

function MitraSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { currentMitra, logout } = useCurrentMitra()

    function handleLogout() {
        logout()
        router.push('/mitra/login')
    }

    if (!currentMitra) return null

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">M</div>
                <div>
                    <h1>Mitra Bisnis</h1>
                    <span>CSC Telkom University</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Menu Utama</div>
                    <Link href="/mitra/dashboard" className={`sidebar-link ${pathname === '/mitra/dashboard' ? 'active' : ''}`}>
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </nav>

            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--color-sidebar-border)', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {currentMitra.full_name.charAt(0)}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentMitra.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{currentMitra.role}</div>
                    </div>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: '#fee2e2', background: '#fff5f5' }} onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </aside>
    )
}

export default function MitraLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/mitra/login'

    return (
        <MitraAuthProvider>
            {isLoginPage ? (
                children
            ) : (
                <div className="layout">
                    <MitraSidebar />
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            )}
        </MitraAuthProvider>
    )
}

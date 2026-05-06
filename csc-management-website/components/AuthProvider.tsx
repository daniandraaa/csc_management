'use client'

import { useState, useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthContext, CurrentUser, getStoredUser, loginUser, logoutUser } from '@/lib/auth'

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        const stored = getStoredUser()
        setCurrentUser(stored)
        setLoading(false)
    }, [])

    useEffect(() => {
        if (!loading && !currentUser && pathname !== '/login' && pathname !== '/check-in' && pathname !== '/track') {
            router.push('/login')
        }
    }, [loading, currentUser, pathname, router])

    async function login(memberId: string) {
        const user = await loginUser(memberId)
        if (user) {
            setCurrentUser(user)
            router.push('/dashboard')
        }
    }

    function logout() {
        logoutUser()
        setCurrentUser(null)
        router.push('/login')
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: '#f8fafc',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <img src="/logo.png" alt="CSC Logo" style={{
                        width: 48, height: 48, objectFit: 'contain',
                        margin: '0 auto 1rem',
                    }} />
                    <p style={{ color: '#64748b', fontSize: 14 }}>Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

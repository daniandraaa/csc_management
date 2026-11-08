'use client'

import { useState, useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
    AuthContext, 
    CurrentUser, 
    getStoredUser, 
    getStoredSeason, 
    fetchSeasons, 
    loginUser, 
    logoutUser 
} from '@/lib/auth'
import { Season } from '@/lib/types'

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
    const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
    const [availableSeasons, setAvailableSeasons] = useState<Season[]>([])
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        async function initAuth() {
            const storedUser = getStoredUser()
            const storedSeason = getStoredSeason()
            const { active, all } = await fetchSeasons()

            setAvailableSeasons(all)
            setCurrentSeason(storedSeason || active)
            setCurrentUser(storedUser)
            setLoading(false)
        }
        initAuth()
    }, [])

    useEffect(() => {
        if (!loading && !currentUser && 
            pathname !== '/login' && 
            !pathname.startsWith('/check-in') && 
            !pathname.startsWith('/track') &&
            !pathname.startsWith('/order-monitoring') &&
            !pathname.startsWith('/mitra') &&
            !pathname.startsWith('/daftar-agen')
        ) {
            router.push('/login')
        }
    }, [loading, currentUser, pathname, router])

    async function login(memberId: string, seasonId?: string) {
        const targetSeasonId = seasonId || currentSeason?.id
        const user = await loginUser(memberId, targetSeasonId)
        if (user) {
            setCurrentUser(user)
            if (targetSeasonId && targetSeasonId !== currentSeason?.id) {
                const s = availableSeasons.find((item: Season) => item.id === targetSeasonId)
                if (s) setCurrentSeason(s)
            }
            router.push('/dashboard')
        }
    }

    async function switchSeason(seasonId: string) {
        const s = availableSeasons.find((item: Season) => item.id === seasonId)
        if (!s) return

        setCurrentSeason(s)
        localStorage.setItem('csc_current_season', JSON.stringify(s))

        // If user is logged in, reload their membership profile under the new season
        if (currentUser) {
            const updatedUser = await loginUser(currentUser.id, seasonId)
            if (updatedUser) {
                setCurrentUser(updatedUser)
            }
        }
        // Refresh router so current page data re-queries with new season scope
        router.refresh()
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
                    <p style={{ color: '#64748b', fontSize: 14 }}>Loading Multi-Season CSC...</p>
                </div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ 
            currentUser, 
            currentSeason, 
            availableSeasons, 
            loading, 
            login, 
            logout, 
            switchSeason 
        }}>
            {children}
        </AuthContext.Provider>
    )
}

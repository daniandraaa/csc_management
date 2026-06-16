'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

export interface MitraUser {
    id: string
    full_name: string
    email: string | null
    role: string
    department: string
    position: string | null
    photo_url: string | null
    whatsapp: string | null
    kas_monthly_amount: number | null
}

interface MitraAuthContextType {
    currentMitra: MitraUser | null
    loading: boolean
    login: (memberId: string) => Promise<void>
    logout: () => void
}

const MitraAuthContext = createContext<MitraAuthContextType>({
    currentMitra: null,
    loading: true,
    login: async () => { },
    logout: () => { },
})

export function useCurrentMitra() {
    return useContext(MitraAuthContext)
}

export { MitraAuthContext }

export async function loginMitraUser(memberId: string): Promise<MitraUser | null> {
    const { data } = await supabase
        .from('members')
        .select('id, full_name, email, role, department, position, photo_url, whatsapp, kas_monthly_amount')
        .eq('id', memberId)
        .single()

    if (data && data.role === 'Business Partner') {
        const user: MitraUser = {
            id: data.id,
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            department: data.department,
            position: data.position,
            photo_url: data.photo_url,
            whatsapp: data.whatsapp,
            kas_monthly_amount: data.kas_monthly_amount,
        }
        localStorage.setItem('csc_mitra_current_user', JSON.stringify(user))
        return user
    }
    return null
}

export function logoutMitraUser() {
    localStorage.removeItem('csc_mitra_current_user')
}

export function getStoredMitraUser(): MitraUser | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('csc_mitra_current_user')
    if (stored) {
        try {
            return JSON.parse(stored) as MitraUser
        } catch {
            return null
        }
    }
    return null
}

import { useRouter, usePathname } from 'next/navigation'

export function MitraAuthProvider({ children }: { children: ReactNode }) {
    const [currentMitra, setCurrentMitra] = useState<MitraUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const stored = getStoredMitraUser()
        if (stored) {
            setCurrentMitra(stored)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        if (!loading) {
            if (!currentMitra && pathname !== '/mitra/login') {
                router.push('/mitra/login')
            } else if (currentMitra && pathname === '/mitra/login') {
                router.push('/mitra/dashboard')
            }
        }
    }, [loading, currentMitra, pathname, router])

    const login = async (memberId: string) => {
        const user = await loginMitraUser(memberId)
        if (user) {
            setCurrentMitra(user)
            router.push('/mitra/dashboard')
        } else {
            throw new Error('Akun tidak ditemukan atau bukan Business Partner')
        }
    }

    const logout = () => {
        logoutMitraUser()
        setCurrentMitra(null)
        router.push('/mitra/login')
    }

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Mitra...</div>
    }

    return (
        <MitraAuthContext.Provider value={{ currentMitra, loading, login, logout }}>
            {children}
        </MitraAuthContext.Provider>
    )
}

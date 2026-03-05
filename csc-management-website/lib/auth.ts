'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

export interface CurrentUser {
    id: string
    full_name: string
    email: string | null
    role: string
    department: string
    position: string | null
    photo_url: string | null
}

interface AuthContextType {
    currentUser: CurrentUser | null
    loading: boolean
    login: (memberId: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    loading: true,
    login: async () => { },
    logout: () => { },
})

export function useCurrentUser() {
    const ctx = useContext(AuthContext)
    return ctx
}

export { AuthContext }

export async function loginUser(memberId: string): Promise<CurrentUser | null> {
    const { data } = await supabase
        .from('members')
        .select('id, full_name, email, role, department, position, photo_url')
        .eq('id', memberId)
        .single()

    if (data) {
        const user: CurrentUser = {
            id: data.id,
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            department: data.department,
            position: data.position,
            photo_url: data.photo_url,
        }
        localStorage.setItem('csc_current_user', JSON.stringify(user))
        return user
    }
    return null
}

export function logoutUser() {
    localStorage.removeItem('csc_current_user')
}

export function getStoredUser(): CurrentUser | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('csc_current_user')
    if (stored) {
        try {
            return JSON.parse(stored) as CurrentUser
        } catch {
            return null
        }
    }
    return null
}

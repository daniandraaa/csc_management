'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'
import { Season } from './types'

export interface CurrentUser {
    id: string
    full_name: string
    email: string | null
    role: string
    department: string
    position: string | null
    photo_url: string | null
    whatsapp: string | null
    kas_monthly_amount: number | null
    season_id?: string | null
    season_name?: string | null
    cabinet_name?: string | null
}

interface AuthContextType {
    currentUser: CurrentUser | null
    currentSeason: Season | null
    availableSeasons: Season[]
    loading: boolean
    login: (memberId: string, seasonId?: string) => Promise<void>
    logout: () => void
    switchSeason: (seasonId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    currentSeason: null,
    availableSeasons: [],
    loading: true,
    login: async () => { },
    logout: () => { },
    switchSeason: async () => { },
})

export function useCurrentUser() {
    const ctx = useContext(AuthContext)
    return ctx
}

export { AuthContext }

export async function fetchSeasons(): Promise<{ active: Season | null; all: Season[] }> {
    try {
        const { data, error } = await supabase
            .from('seasons')
            .select('*')
            .order('year_start', { ascending: false })

        if (!error && data && data.length > 0) {
            const active = (data as Season[]).find((s: Season) => s.is_active) || (data[0] as Season)
            return { active, all: data as Season[] }
        }
    } catch (e) {
        console.warn('Could not fetch seasons, using fallback season:', e)
    }

    // Default Fallback Season if migration has not been applied yet
    const fallback: Season = {
        id: 'default-season-2025-2026',
        name: 'Periode 2025/2026',
        cabinet_name: 'Kabinet Dormant Sparks',
        motto: 'The Dormants of Impactful Sparks Ecosystem',
        year_start: 2025,
        year_end: 2026,
        theme_color: '#991b1b',
        logo_url: '/logo.png',
        is_active: true,
        status: 'active',
        feature_flags: {},
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
    return { active: fallback, all: [fallback] }
}

export async function loginUser(memberId: string, seasonId?: string): Promise<CurrentUser | null> {
    const { data: memberData } = await supabase
        .from('members')
        .select('id, full_name, email, role, department, position, photo_url, whatsapp, kas_monthly_amount, current_season_id')
        .eq('id', memberId)
        .single()

    if (!memberData) return null

    // Check specific season membership if seasons are active
    let effectiveRole = memberData.role
    let effectiveDept = memberData.department
    let effectivePos = memberData.position
    let targetSeasonId = seasonId || memberData.current_season_id

    let seasonDetails: Season | null = null

    if (targetSeasonId) {
        // Try to get season details
        const { data: sData } = await supabase
            .from('seasons')
            .select('*')
            .eq('id', targetSeasonId)
            .single()
        if (sData) seasonDetails = sData

        // Check if there is an explicit season membership override
        const { data: membership } = await supabase
            .from('season_memberships')
            .select('role, department, position, is_active')
            .eq('member_id', memberId)
            .eq('season_id', targetSeasonId)
            .single()

        if (membership) {
            effectiveRole = membership.role || effectiveRole
            effectiveDept = membership.department || effectiveDept
            effectivePos = membership.position || effectivePos
        }
    }

    const user: CurrentUser = {
        id: memberData.id,
        full_name: memberData.full_name,
        email: memberData.email,
        role: effectiveRole,
        department: effectiveDept,
        position: effectivePos,
        photo_url: memberData.photo_url,
        whatsapp: memberData.whatsapp,
        kas_monthly_amount: memberData.kas_monthly_amount,
        season_id: targetSeasonId || null,
        season_name: seasonDetails?.name || null,
        cabinet_name: seasonDetails?.cabinet_name || null,
    }

    localStorage.setItem('csc_current_user', JSON.stringify(user))
    if (seasonDetails) {
        localStorage.setItem('csc_current_season', JSON.stringify(seasonDetails))
    }
    return user
}

export function logoutUser() {
    localStorage.removeItem('csc_current_user')
    localStorage.removeItem('csc_current_season')
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

export function getStoredSeason(): Season | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('csc_current_season')
    if (stored) {
        try {
            return JSON.parse(stored) as Season
        } catch {
            return null
        }
    }
    return null
}

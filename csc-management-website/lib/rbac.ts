import { CurrentUser } from './auth'

// Role hierarchy: BOE > C Level > Secretary > Administration > Staff > Business Partner
const ROLE_LEVEL: Record<string, number> = {
    'BOE': 100,
    'C Level': 80,
    'Secretary': 60,
    'Administration': 50,
    'Staff': 30,
    'Business Partner': 10,
}

// Pages accessible by role + department
// 'all' means all departments can access
// Specific department means only that department
interface PagePermission {
    path: string
    roles: string[]       // which roles can access
    departments: string[] // which departments can access ('all' = everyone)
    actions?: {
        create?: string[]   // roles that can create
        approve?: string[]  // roles that can approve/update status
        delete?: string[]   // roles that can delete
    }
}

const PAGE_PERMISSIONS: PagePermission[] = [
    // Overview — everyone
    { path: '/dashboard', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    {
        path: '/members', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary'], delete: ['BOE'] }
    },
    {
        path: '/timeline', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], delete: ['BOE', 'C Level', 'Secretary'] }
    },
    // Overview — shared pages
    { path: '/overview/sop', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/overview/performance', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    {
        path: '/overview/logbook', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], delete: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/overview/advocacy', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/overview/content-request', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/overview/my-attendance', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'] }
    },

    // Human Resources
    {
        path: '/hr/performance', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], approve: ['BOE', 'C Level'], delete: ['BOE', 'C Level'] }
    },
    {
        path: '/hr/advocacy', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], approve: ['BOE', 'C Level'] }
    },
    {
        path: '/hr/counseling', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], approve: ['BOE', 'C Level'] }
    },
    {
        path: '/hr/logbook', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'] }
    },
    {
        path: '/hr/attendance', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], approve: ['BOE', 'C Level'] }
    },

    // Operating
    {
        path: '/operating/programs', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], approve: ['BOE', 'C Level'], delete: ['BOE', 'C Level'] }
    },
    {
        path: '/operating/kpi', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], approve: ['BOE', 'C Level'] }
    },
    {
        path: '/operating/evaluations', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], approve: ['BOE', 'C Level'] }
    },
    {
        path: '/operating/sop', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary'], delete: ['BOE', 'C Level'] }
    },

    // Finance
    {
        path: '/finance/reimbursement', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], approve: ['BOE', 'C Level'] }
    },
    {
        path: '/finance/transactions', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], delete: ['BOE', 'C Level'] }
    },

    // Business
    {
        path: '/business/partners', roles: ['BOE', 'C Level', 'Secretary', 'Staff', 'Business Partner'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], delete: ['BOE', 'C Level'] }
    },
    { path: '/business/overview', roles: ['BOE', 'C Level', 'Secretary', 'Staff', 'Business Partner'], departments: ['all'] },

    // Marketing
    {
        path: '/marketing/content', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], approve: ['BOE', 'C Level'], delete: ['BOE', 'C Level'] }
    },
    {
        path: '/marketing/media-partners', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level'], delete: ['BOE', 'C Level'] }
    },
    {
        path: '/marketing/mail', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'] }
    },
    {
        path: '/marketing/invitations', roles: ['BOE', 'C Level', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], approve: ['BOE', 'C Level'] }
    },

    // Administrasi
    {
        path: '/documents', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/admin-review', roles: ['BOE', 'C Level', 'Secretary', 'Administration', 'Staff', 'Business Partner'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Secretary', 'Staff'], approve: ['BOE', 'Secretary', 'Administration'] }
    },
]

/**
 * Check if user can access a page
 */
export function canAccess(user: CurrentUser | null, path: string): boolean {
    if (!user) return false
    // BOE can access everything
    if (user.role === 'BOE') return true

    const perm = PAGE_PERMISSIONS.find(p => path.startsWith(p.path))
    if (!perm) return false

    const roleAllowed = perm.roles.includes(user.role)
    const deptAllowed = perm.departments.includes('all') || perm.departments.includes(user.department)

    return roleAllowed && deptAllowed
}

/**
 * Check if user can perform a specific action on a page
 */
export function canPerformAction(user: CurrentUser | null, path: string, action: 'create' | 'approve' | 'delete'): boolean {
    if (!user) return false
    // BOE can do everything
    if (user.role === 'BOE') return true

    const perm = PAGE_PERMISSIONS.find(p => path.startsWith(p.path))
    if (!perm || !perm.actions) return false

    const allowedRoles = perm.actions[action]
    if (!allowedRoles) return false

    // C Level can approve in their own department section or if page is in their department
    if (action === 'approve' && user.role === 'C Level') {
        const isDeptPage = isDepartmentPage(path, user.department)
        return allowedRoles.includes('C Level') && isDeptPage
    }

    return allowedRoles.includes(user.role)
}

/**
 * Check if a page belongs to a user's department
 */
function isDepartmentPage(path: string, department: string): boolean {
    const deptMap: Record<string, string[]> = {
        'Human Resource': ['/hr/'],
        'Operating': ['/operating/'],
        'Financial': ['/finance/'],
        'Business': ['/business/'],
        'Marketing': ['/marketing/'],
        'Executive': ['/'], // BOE sees everything, handled separately
    }
    const paths = deptMap[department] || []
    return paths.some(p => path.startsWith(p)) || department === 'Executive'
}

/**
 * Get the role level for comparison
 */
export function getRoleLevel(role: string): number {
    return ROLE_LEVEL[role] || 0
}

/**
 * Check if user is a department head (C Level or above)
 */
export function isDepartmentHead(user: CurrentUser | null): boolean {
    if (!user) return false
    return getRoleLevel(user.role) >= ROLE_LEVEL['C Level']
}

/**
 * Check if user is BOE (can manage members)
 */
export function isBOE(user: CurrentUser | null): boolean {
    if (!user) return false
    return user.role === 'BOE'
}

/**
 * Check if user is Administration role
 */
export function isAdministration(user: CurrentUser | null): boolean {
    if (!user) return false
    return user.role === 'Administration' || user.role === 'BOE'
}

/**
 * Check if user is Secretary 
 */
export function isSecretary(user: CurrentUser | null): boolean {
    if (!user) return false
    return user.role === 'Secretary' || user.role === 'BOE'
}

/**
 * Get visible nav sections for user
 */
export function getVisibleSections(user: CurrentUser | null): string[] {
    if (!user) return []
    if (user.role === 'BOE') return ['Overview', 'Human Resources', 'Operating', 'Finance', 'Business', 'Marketing', 'Administrasi']

    const sections: string[] = ['Overview'] // Everyone sees overview

    // C Level / Secretary / Staff see their department + some cross-department
    const deptSectionMap: Record<string, string> = {
        'Human Resource': 'Human Resources',
        'Operating': 'Operating',
        'Financial': 'Finance',
        'Business': 'Business',
        'Marketing': 'Marketing',
        'Executive': 'all',
    }

    if (user.department === 'Executive') {
        return ['Overview', 'Human Resources', 'Operating', 'Finance', 'Business', 'Marketing', 'Administrasi']
    }

    const deptSection = deptSectionMap[user.department]
    if (deptSection) sections.push(deptSection)

    // Secretary always sees Administrasi
    if (user.role === 'Secretary') {
        sections.push('Administrasi')
    }

    // Administration role sees Administrasi
    if (user.role === 'Administration') {
        sections.push('Administrasi')
    }

    // Staff can see HR (for their own submissions like advocacy, counseling, logbook)
    if (user.role === 'Staff') {
        if (!sections.includes('Human Resources')) sections.push('Human Resources')
        sections.push('Administrasi') // they can submit reviews
    }

    // C Level sees cross-department for coordination
    if (user.role === 'C Level') {
        if (!sections.includes('Administrasi')) sections.push('Administrasi')
    }

    // Business Partner sees limited Business section
    if (user.role === 'Business Partner') {
        return ['Business', 'Administrasi']
    }

    return sections
}

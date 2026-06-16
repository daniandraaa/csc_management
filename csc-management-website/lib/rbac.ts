import { CurrentUser } from './auth'

// Role hierarchy: BOE > C Level > Secretary > Administration > Staff > Business Partner
const ROLE_LEVEL: Record<string, number> = {
    'BOE': 100,
    'C Level': 80,
    'Manager': 70,
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
    { path: '/dashboard', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    {
        path: '/members', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary'], delete: ['BOE'] }
    },
    {
        path: '/timeline', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], delete: ['BOE', 'C Level', 'Manager', 'Secretary'] }
    },
    // Overview — shared pages
    { path: '/overview/sop', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/overview/performance', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    {
        path: '/overview/logbook', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], delete: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'] }
    },
    { path: '/overview/evaluations', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/overview/kpi', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    {
        path: '/overview/advocacy', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/overview/content-request', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/overview/my-attendance', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'] }
    },
    { path: '/overview/my-finance', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },

    // Human Resources
    {
        path: '/hr/performance', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/hr/advocacy', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/hr/counseling', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/hr/logbook', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'] }
    },
    {
        path: '/hr/attendance', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], approve: ['BOE', 'C Level', 'Manager'] }
    },

    {
        path: '/operating/programs', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Staff'], approve: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/broadcasts', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Staff'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/editorial', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Staff'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/directory', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Staff'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/kpi', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], approve: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/evaluations', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], approve: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/sop', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/operating/orders', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },

    // Finance
    {
        path: '/finance/reimbursement', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/finance/transactions', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/finance/kas', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },

    // Business
    {
        path: '/business/partners', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/business/agents', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], approve: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    { path: '/business/overview', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'] },

    // Marketing
    {
        path: '/marketing/content', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/marketing/media-partners', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/marketing/mail', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'] }
    },
    {
        path: '/marketing/invitations', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'C Level', 'Manager'] }
    },

    // Administrasi
    { path: '/administrasi', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/administrasi/templates', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/administrasi/penilaian', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/administrasi/laporan', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'] },
    { path: '/administrasi/pengaturan', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration'], departments: ['all'] },
    {
        path: '/documents', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff'] }
    },
    {
        path: '/overview/pr-request', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'] }
    },
    {
        path: '/marketing/pr-tasks', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], delete: ['BOE', 'C Level', 'Manager'] }
    },
    {
        path: '/admin-review', roles: ['BOE', 'C Level', 'Manager', 'Secretary', 'Administration', 'Staff', 'Business Partner'], departments: ['all'],
        actions: { create: ['BOE', 'C Level', 'Manager', 'Secretary', 'Staff'], approve: ['BOE', 'Manager', 'Administration'], delete: ['BOE', 'Manager', 'Administration'] }
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

    // Manager/C Level can approve in their own department section or if page is in their department
    if (action === 'approve' && (user.role === 'C Level' || user.role === 'Manager')) {
        let isDeptPage = isDepartmentPage(path, user.department)
        
        // Special case: HR managers can approve on /admin-review
        if (path.startsWith('/admin-review') && user.department === 'Human Resource') {
            isDeptPage = true
        }
        
        return allowedRoles.includes(user.role) && isDeptPage
    }

    // Special case for Administration "role"
    if (allowedRoles.includes('Administration')) {
        const isAdministrationStaff = user.department === 'Human Resource' && user.position?.includes('Administration')
        if (isAdministrationStaff) return true
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
 * Check if user is Administration role or position
 */
export function isAdministration(user: CurrentUser | null): boolean {
    if (!user) return false
    const isAdministrationStaff = user.department === 'Human Resource' && user.position?.includes('Administration')
    return user.role === 'Administration' || isAdministrationStaff || user.role === 'BOE'
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
    if (user.role === 'BOE' || user.department === 'Executive' || user.role === 'Secretary' || user.role === 'Manager') {
        return ['Overview', 'Human Resources', 'Operating', 'Finance', 'Business', 'Marketing & Branding', 'Public Relation', 'Administrasi']
    }

    // C Level from any department can see HR section (for attendance generation)
    if (user.role === 'C Level') {
        return ['Overview', 'Human Resources', 'Operating', 'Finance', 'Business', 'Marketing & Branding', 'Public Relation', 'Administrasi']
    }

    const sections: string[] = ['Overview'] // Everyone sees overview

    // Map department to section
    const deptSectionMap: Record<string, string> = {
        'Human Resource': 'Human Resources',
        'Operating': 'Operating',
        'Financial': 'Finance',
        'Business': 'Business',
        'Marketing': 'Marketing',
    }

    const deptSection = deptSectionMap[user.department]
    if (deptSection) {
        if (deptSection === 'Marketing') {
            const pos = user.position?.toLowerCase() || ''
            const isManager = user.role === 'C Level' || user.role === 'Manager' || user.role === 'Secretary' || user.role === 'BOE'
            
            if (isManager || pos.includes('marketing & brand')) {
                sections.push('Marketing & Branding')
            }
            if (isManager || pos.includes('public relation')) {
                sections.push('Public Relation')
            }
        } else {
            sections.push(deptSection)
        }
    }

    // Roles like Secretary and Administration get access to Administrasi
    if (user.role === 'Secretary' || user.role === 'Administration' || isAdministration(user)) {
        if (!sections.includes('Administrasi')) {
            sections.push('Administrasi')
        }
    }

    // Business Partner only sees Business
    if (user.role === 'Business Partner') {
        return ['Overview', 'Business']
    }

    return sections
}

/**
 * Check if user is the "Owner" of a specific module (e.g. Finance owns Reimbursement)
 * or if they are Executive/C-Level/Secretary who has global management access.
 */
export function canManageModule(user: CurrentUser | null, moduleName: string): boolean {
    if (!user) return false
    
    // Global managers can manage everything
    if (user.role === 'BOE' || user.role === 'C Level' || user.role === 'Manager' || user.role === 'Secretary') {
        return true
    }

    // Map modules to their owning departments
    const MODULE_OWNERS: Record<string, string[]> = {
        'logbook': ['Human Resource'],
        'advocacy': ['Human Resource'],
        'attendance': ['Human Resource'],
        'reimbursement': ['Financial'],
        'content': ['Marketing'],
        'administrasi': ['Secretary', 'Administration'] // handled mostly by roles, but good for completeness
    }

    const owners = MODULE_OWNERS[moduleName]
    if (!owners) return false // if module not defined, default to false

    // Administration role might be considered part of the owner for 'administrasi'
    if (moduleName === 'administrasi' && isAdministration(user)) return true

    return owners.includes(user.department)
}

import clsx from 'clsx'

export function cn(...inputs: (string | undefined | null | false)[]) {
    return clsx(inputs)
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount)
}

export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export function formatDateShort(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export function formatTime(time: string): string {
    return time.slice(0, 5)
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'warning',
        in_review: 'info',
        approved: 'success',
        rejected: 'danger',
        resolved: 'success',
        completed: 'success',
        cancelled: 'danger',
        scheduled: 'info',
        draft: 'default',
        published: 'success',
        active: 'success',
        inactive: 'default',
        prospective: 'info',
        planned: 'info',
        in_progress: 'warning',
        on_track: 'success',
        at_risk: 'warning',
        behind: 'danger',
        paid: 'success',
        present: 'success',
        absent: 'danger',
        excused: 'warning',
        registered: 'info',
        unread: 'warning',
        read: 'info',
        responded: 'success',
        archived: 'default',
        accepted: 'success',
        declined: 'danger',
        can_attend: 'success',
        cannot_attend: 'danger',
        sent: 'success',
        received: 'info',
        revision_needed: 'warning',
        income: 'success',
        expense: 'danger',
    }
    return colors[status] || 'default'
}

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending: 'Pending',
        in_review: 'In Review',
        approved: 'Approved',
        rejected: 'Rejected',
        resolved: 'Resolved',
        completed: 'Completed',
        cancelled: 'Cancelled',
        scheduled: 'Scheduled',
        draft: 'Draft',
        published: 'Published',
        active: 'Active',
        inactive: 'Inactive',
        prospective: 'Prospective',
        planned: 'Planned',
        in_progress: 'In Progress',
        on_track: 'On Track',
        at_risk: 'At Risk',
        behind: 'Behind',
        paid: 'Paid',
        present: 'Present',
        absent: 'Absent',
        excused: 'Excused',
        registered: 'Registered',
        unread: 'Unread',
        read: 'Read',
        responded: 'Responded',
        archived: 'Archived',
        accepted: 'Accepted',
        declined: 'Declined',
        can_attend: 'Can Attend',
        cannot_attend: "Can't Attend",
        sent: 'Sent',
        received: 'Received',
        revision_needed: 'Needs Revision',
        income: 'Income',
        expense: 'Expense',
    }
    return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

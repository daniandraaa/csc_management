// ============================================
// CSC Management Website - TypeScript Types
// ============================================

export interface Department {
    id: string
    name: string
    slug: string
    description: string | null
    created_at: string
}

export interface Member {
    id: string
    auth_user_id: string | null
    full_name: string
    email: string
    phone: string | null
    photo_url: string | null
    department: string | null
    nim: string | null
    role: 'BOE' | 'C Level' | 'Secretary' | 'Staff' | 'Administration' | 'Business Partner'
    position: string | null
    is_active: boolean
    joined_at: string
    created_at: string
    updated_at: string
}

export interface PerformanceRanking {
    id: string
    member_id: string
    member?: Member
    period: string
    score: number
    rank: number | null
    notes: string | null
    evaluated_by: string | null
    evaluator?: Member
    created_at: string
    updated_at: string
}

export interface AdvocacyAspiration {
    id: string
    member_id: string
    member?: Member
    title: string
    description: string
    category: 'advocacy' | 'aspiration'
    status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'resolved'
    response: string | null
    responded_by: string | null
    responder?: Member
    created_at: string
    updated_at: string
}

export interface CounselingRequest {
    id: string
    member_id: string
    member?: Member
    subject: string
    description: string | null
    preferred_date: string | null
    preferred_time: string | null
    status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
    scheduled_date: string | null
    scheduled_time: string | null
    counselor_id: string | null
    counselor?: Member
    notes: string | null
    created_at: string
    updated_at: string
}

export interface LogbookEntry {
    id: string
    member_id: string
    member?: Member
    date: string
    title: string
    description: string
    category: string | null
    hours_spent: number | null
    attachments: string[] | null
    created_at: string
    updated_at: string
}

export interface Event {
    id: string
    title: string
    description: string | null
    event_date: string
    start_time: string | null
    end_time: string | null
    location: string | null
    type: 'general' | 'meeting' | 'training' | 'social' | 'other'
    created_by: string | null
    creator?: Member
    created_at: string
    updated_at: string
}

export interface EventAttendee {
    id: string
    event_id: string
    member_id: string
    member?: Member
    status: 'registered' | 'present' | 'absent' | 'excused'
    check_in_time: string | null
    notes: string | null
}

export interface Program {
    id: string
    name: string
    description: string | null
    objectives: string | null
    start_date: string | null
    end_date: string | null
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
    budget: number
    department_id: string | null
    department?: Department
    pic_id: string | null
    pic?: Member
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface ProgramKPI {
    id: string
    program_id: string
    program?: Program
    indicator: string
    target_value: number
    current_value: number
    unit: string | null
    weight: number
    status: 'on_track' | 'at_risk' | 'behind' | 'completed'
    created_at: string
    updated_at: string
}

export interface ProgramEvaluation {
    id: string
    program_id: string
    program?: Program
    evaluation_date: string
    summary: string
    strengths: string | null
    weaknesses: string | null
    recommendations: string | null
    overall_score: number | null
    evaluated_by: string | null
    evaluator?: Member
    created_at: string
}

export interface ProgramPartner {
    id: string
    program_id: string
    partner_name: string
    contact_person: string | null
    contact_email: string | null
    contact_phone: string | null
    role_description: string | null
    created_at: string
}

export interface SOPGuide {
    id: string
    department_id: string
    department?: Department
    title: string
    content: string
    version: string
    is_active: boolean
    created_by: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
}

export interface Reimbursement {
    id: string
    member_id: string
    member?: Member
    program_id: string | null
    program?: Program
    title: string
    description: string | null
    amount: number
    receipt_url: string | null
    status: 'pending' | 'approved' | 'rejected' | 'paid'
    approved_by: string | null
    approver?: Member
    approved_at: string | null
    paid_at: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface FinancialTransaction {
    id: string
    program_id: string | null
    program?: Program
    type: 'income' | 'expense'
    category: string | null
    description: string
    amount: number
    transaction_date: string
    receipt_url: string | null
    recorded_by: string | null
    recorder?: Member
    created_at: string
    updated_at: string
}

export interface BusinessPartner {
    id: string
    company_name: string
    description: string | null
    contact_person: string | null
    contact_email: string | null
    contact_phone: string | null
    website: string | null
    partnership_type: string | null
    status: 'active' | 'inactive' | 'prospective'
    start_date: string | null
    end_date: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface ContentPlan {
    id: string
    title: string
    platform: string
    content_type: 'post' | 'story' | 'reel' | 'article' | 'video' | 'other'
    description: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    status: 'draft' | 'in_review' | 'approved' | 'published' | 'cancelled'
    assigned_to: string | null
    assignee?: Member
    content_url: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface MediaPartner {
    id: string
    name: string
    type: string | null
    contact_person: string | null
    contact_email: string | null
    contact_phone: string | null
    social_media: string | null
    status: 'active' | 'inactive'
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface IncomingMail {
    id: string
    sender: string
    subject: string
    description: string | null
    received_date: string
    mail_type: 'general' | 'invitation' | 'proposal' | 'official' | 'other'
    file_url: string | null
    status: 'unread' | 'read' | 'responded' | 'archived'
    handled_by: string | null
    handler?: Member
    notes: string | null
    created_at: string
    updated_at: string
}

export interface GuestInvitation {
    id: string
    event_name: string
    organizer: string | null
    event_date: string | null
    event_location: string | null
    description: string | null
    invitation_status: 'pending' | 'accepted' | 'declined'
    attendance_status: 'pending' | 'can_attend' | 'cannot_attend'
    notes: string | null
    created_by: string | null
    pics?: GuestInvitationPIC[]
    created_at: string
    updated_at: string
}

export interface GuestInvitationPIC {
    id: string
    invitation_id: string
    member_id: string
    member?: Member
    is_confirmed: boolean
}

export interface Document {
    id: string
    document_number: string | null
    title: string
    type: 'incoming' | 'outgoing'
    category: string | null
    description: string | null
    file_url: string | null
    sender: string | null
    recipient: string | null
    document_date: string
    status: 'draft' | 'sent' | 'received' | 'archived'
    handled_by: string | null
    handler?: Member
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface AdminReview {
    id: string
    title: string
    description: string | null
    submitted_by: string
    submitter?: Member
    file_url: string | null
    link_url: string | null
    secretary_status: 'pending' | 'approved' | 'revision_needed' | 'rejected'
    secretary_reviewed_by: string | null
    secretary_reviewer?: Member
    secretary_reviewed_at: string | null
    secretary_notes: string | null
    admin_status: 'pending' | 'approved' | 'revision_needed' | 'rejected'
    admin_reviewed_by: string | null
    admin_reviewer?: Member
    admin_reviewed_at: string | null
    admin_notes: string | null
    change_description: string | null
    revision_count: number
    created_at: string
    updated_at: string
}

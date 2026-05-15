import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
    try {
        const resendApiKey = process.env.RESEND_API_KEY
        if (!resendApiKey) {
            return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
        }
        const resend = new Resend(resendApiKey)

        // 1. Fetch settings
        const { data: settings } = await supabase.from('admin_settings').select('*').eq('id', 1).single()
        if (!settings?.auto_remind_overdue) {
            return NextResponse.json({ message: 'Auto-remind is disabled' })
        }

        const remindDays = (settings.remind_days_before || '7,3,1').split(',').map((d: string) => parseInt(d.trim()))
        const recipientOverride = settings.reminder_email_to

        // 2. Fetch admin reviews with deadlines
        const { data: reviews } = await supabase
            .from('admin_reviews')
            .select('id, title, deadline, doc_type, admin_status, submitted_by, submitter:members!admin_reviews_submitted_by_fkey(full_name, email)')
            .not('deadline', 'is', null)
            .neq('admin_status', 'approved')

        if (!reviews || reviews.length === 0) {
            return NextResponse.json({ message: 'No pending documents with deadlines', sent: 0 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let sentCount = 0
        const results: any[] = []

        for (const review of reviews) {
            const deadlineDate = new Date(review.deadline)
            deadlineDate.setHours(0, 0, 0, 0)
            const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            // Check if this is a reminder day
            const shouldRemind = remindDays.includes(diffDays) || diffDays < 0

            if (!shouldRemind) continue

            const submitter = review.submitter as any
            const recipientEmail = recipientOverride || submitter?.email
            if (!recipientEmail) continue

            // Check if already sent today for this review + day combo
            const todayStr = today.toISOString().split('T')[0]
            const { data: existing } = await supabase
                .from('admin_notifications')
                .select('id')
                .eq('review_id', review.id)
                .eq('days_before_deadline', diffDays)
                .gte('sent_at', `${todayStr}T00:00:00`)
                .limit(1)

            if (existing && existing.length > 0) continue

            // Build email
            const isOverdue = diffDays < 0
            const urgencyLabel = isOverdue
                ? `⚠️ TERLAMBAT ${Math.abs(diffDays)} HARI`
                : diffDays === 0
                    ? '🔴 HARI INI'
                    : diffDays <= 3
                        ? `🟡 H-${diffDays}`
                        : `📅 H-${diffDays}`

            const subject = isOverdue
                ? `[TERLAMBAT] Deadline ${review.doc_type}: ${review.title}`
                : diffDays === 0
                    ? `[HARI INI] Deadline ${review.doc_type}: ${review.title}`
                    : `[Reminder H-${diffDays}] Deadline ${review.doc_type}: ${review.title}`

            const deadlineFormatted = new Date(review.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

            const body = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;">
<div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <div style="background:linear-gradient(135deg,${isOverdue ? '#ef4444,#dc2626' : diffDays === 0 ? '#f59e0b,#d97706' : '#8b5cf6,#6366f1'});padding:28px 32px;color:white;">
    <div style="font-size:13px;font-weight:600;opacity:0.9;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;">CSC Administration</div>
    <div style="font-size:22px;font-weight:700;line-height:1.3;">${urgencyLabel}</div>
    <div style="font-size:14px;margin-top:8px;opacity:0.85;">Deadline Administrasi Dokumen</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Halo <strong>${submitter?.full_name || 'Tim Administrasi'}</strong>,
    </p>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      ${isOverdue
        ? `Dokumen administrasi berikut telah <strong style="color:#ef4444">melewati deadline ${Math.abs(diffDays)} hari yang lalu</strong>. Harap segera diselesaikan.`
        : diffDays === 0
            ? 'Dokumen administrasi berikut memiliki <strong style="color:#f59e0b">deadline hari ini</strong>. Pastikan sudah dikirimkan.'
            : `Ini adalah pengingat bahwa dokumen administrasi berikut memiliki <strong>deadline ${diffDays} hari lagi</strong>.`
    }
    </p>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;border-left:4px solid ${isOverdue ? '#ef4444' : '#8b5cf6'};">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:110px;">Dokumen</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#1e293b;">${review.title}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Jenis</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${review.doc_type || 'Dokumen'}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Deadline</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:${isOverdue ? '#ef4444' : '#1e293b'};">${deadlineFormatted}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Status</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${review.admin_status === 'pending' ? '⏳ Pending Review' : review.admin_status === 'revision_needed' ? '🔄 Perlu Revisi' : review.admin_status}</td></tr>
      </table>
    </div>
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5;">
      Silakan login ke dashboard CSC Management untuk mengecek dan menyelesaikan dokumen ini.
    </p>
  </div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Dikirim otomatis oleh CSC Management System</p>
  </div>
</div>
</body>
</html>`

            try {
                await resend.emails.send({
                    from: 'CSC Admin <noreply@resend.dev>',
                    to: recipientEmail,
                    subject: subject,
                    html: body,
                })

                // Log notification
                await supabase.from('admin_notifications').insert({
                    review_id: review.id,
                    recipient_email: recipientEmail,
                    recipient_name: submitter?.full_name || null,
                    notification_type: isOverdue ? 'overdue_alert' : 'deadline_reminder',
                    subject: subject,
                    body: `Reminder for ${review.title} - ${urgencyLabel}`,
                    days_before_deadline: diffDays,
                })

                sentCount++
                results.push({ review_id: review.id, title: review.title, to: recipientEmail, days: diffDays, status: 'sent' })
            } catch (emailErr: any) {
                results.push({ review_id: review.id, title: review.title, to: recipientEmail, days: diffDays, status: 'failed', error: emailErr.message })
            }
        }

        return NextResponse.json({ message: `Processed ${reviews.length} reviews, sent ${sentCount} reminders`, sent: sentCount, results })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET: Check upcoming deadlines status (no email sent)
export async function GET() {
    const { data: reviews } = await supabase
        .from('admin_reviews')
        .select('id, title, deadline, doc_type, admin_status, submitter:members!admin_reviews_submitted_by_fkey(full_name, email)')
        .not('deadline', 'is', null)
        .neq('admin_status', 'approved')
        .order('deadline', { ascending: true })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deadlines = (reviews || []).map(r => {
        const d = new Date(r.deadline)
        d.setHours(0, 0, 0, 0)
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
            id: r.id, title: r.title, doc_type: r.doc_type,
            deadline: r.deadline, days_remaining: diff,
            status: r.admin_status,
            submitter: (r.submitter as any)?.full_name,
            urgency: diff < 0 ? 'overdue' : diff === 0 ? 'today' : diff <= 3 ? 'urgent' : diff <= 7 ? 'upcoming' : 'normal'
        }
    })

    // Fetch recent notifications
    const { data: recentNotifs } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20)

    return NextResponse.json({ deadlines, recent_notifications: recentNotifs || [] })
}
